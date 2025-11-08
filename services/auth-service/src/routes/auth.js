// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================
// Lý thuyết: RESTful API Design
// - REST = Representational State Transfer
// - Resource-based URLs: /auth/register, /auth/login
// - HTTP Methods: GET (read), POST (create), PUT (update), DELETE (delete)
// - Stateless: Mỗi request độc lập, không phụ thuộc vào request trước
// =============================================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, blacklistToken, verifyToken } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const logger = require('../config/logger');

// =============================================================================
// POST /auth/register - Đăng ký tài khoản mới
// =============================================================================
// Lý thuyết: User Registration Flow
// 1. Validate input (email, password, fullName)
// 2. Check email đã tồn tại chưa
// 3. Hash password (bcrypt - trong User model hook)
// 4. Insert vào database
// 5. Generate JWT token
// 6. Return user info + token
// =============================================================================
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, fullName, avatarUrl } = req.body;

    // Lý thuyết: Duplicate Check
    // - Check trước khi INSERT để tránh database error
    // - Race condition: 2 requests cùng lúc có thể vẫn xảy ra
    // - Database UNIQUE constraint là line of defense cuối cùng
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng',
        code: 'EMAIL_EXISTS'
      });
    }

    // Lý thuyết: Database Transaction
    // - Nếu có nhiều operations, dùng transaction
    // - All or nothing: Tất cả thành công hoặc tất cả rollback
    // - ACID properties
    const user = await User.create({
      email,
      password, // Sẽ được hash trong beforeCreate hook
      fullName,
      avatarUrl
    });

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`New user registered: ${email}`);

    // Lý thuyết: HTTP Status Codes
    // - 201 Created: Resource mới được tạo thành công
    // - 200 OK: Request thành công (general)
    // - 400 Bad Request: Invalid input
    // - 401 Unauthorized: Chưa authenticate
    // - 403 Forbidden: Không có quyền
    // - 404 Not Found: Resource không tồn tại
    // - 409 Conflict: Conflict với existing resource (duplicate)
    // - 500 Internal Server Error: Server error
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: user.toJSON(), // Remove password via toJSON()
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);

    // Lý thuyết: Error Handling
    // - Catch database errors (unique constraint violation)
    // - Don't expose internal errors to client
    // - Log detailed error for debugging
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký tài khoản'
    });
  }
});

// =============================================================================
// POST /auth/login - Đăng nhập
// =============================================================================
// Lý thuyết: Authentication Flow
// 1. Validate input (email, password)
// 2. Find user by email
// 3. Verify password (bcrypt compare)
// 4. Check user active & verified
// 5. Generate JWT token
// 6. Return token
// =============================================================================
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      // Lý thuyết: Security - Don't leak information
      // - Không nói "Email không tồn tại" (tiết lộ thông tin)
      // - Nói chung chung: "Email hoặc password không đúng"
      // - Chống enumeration attack (đoán email có trong hệ thống)
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      // Lý thuyết: Rate Limiting
      // - Cần implement rate limiting để chống brute force
      // - Express-rate-limit middleware
      // - Lockout account sau N failed attempts
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Generate token
    const token = generateToken(user);

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
});

// =============================================================================
// POST /auth/logout - Đăng xuất
// =============================================================================
// Lý thuyết: JWT Logout
// - JWT là stateless, không thể "logout" trực tiếp
// - Workaround: Blacklist token
// - Client phải xóa token khỏi localStorage
// =============================================================================
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Blacklist current token
    await blacklistToken(req.token);

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    logger.error('Logout error:', error);

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng xuất'
    });
  }
});

// =============================================================================
// GET /auth/me - Lấy thông tin user hiện tại
// =============================================================================
// Lý thuyết: Protected Route
// - Yêu cầu authentication (verifyToken middleware)
// - Return user info từ token
// =============================================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Find user by ID from token
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
});

// =============================================================================
// GET /auth/verify - Verify token validity
// =============================================================================
// Lý thuyết: Token Validation Endpoint
// - Client có thể check token còn valid không
// - Useful cho session management
// =============================================================================
router.get('/verify', verifyToken, (req, res) => {
  // If we reach here, token is valid (verifyToken middleware passed)
  res.json({
    success: true,
    message: 'Token hợp lệ',
    data: {
      user: req.user
    }
  });
});

module.exports = router;
