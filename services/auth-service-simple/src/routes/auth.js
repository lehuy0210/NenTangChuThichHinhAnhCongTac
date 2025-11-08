// =============================================================================
// AUTHENTICATION ROUTES - VERSION ĐƠN GIẢN
// =============================================================================
// Lý thuyết: REST API
// - REST = Representational State Transfer
// - HTTP Methods: GET (đọc), POST (tạo), PUT (sửa), DELETE (xóa)
// - Endpoints: /auth/register, /auth/login, etc.
// =============================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

// JWT Secret (nên lưu trong .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-change-this-in-production';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================
// Lý thuyết: Input Validation
// - NEVER trust user input!
// - Validate TRƯỚC KHI xử lý
// - Joi: Schema-based validation library
// =============================================================================

const registerSchema = Joi.object({
  email: Joi.string()
    .email()                         // Phải đúng format email
    .required()                      // Bắt buộc
    .lowercase()                     // Chuyển thành chữ thường
    .trim()                          // Xóa khoảng trắng đầu/cuối
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc'
    }),

  password: Joi.string()
    .min(8)                          // Tối thiểu 8 ký tự
    .required()
    .messages({
      'string.min': 'Password phải có ít nhất 8 ký tự',
      'any.required': 'Password là bắt buộc'
    }),

  fullName: Joi.string()
    .min(2)
    .required()
    .trim()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'any.required': 'Họ tên là bắt buộc'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// =============================================================================
// HELPER FUNCTION: Generate JWT Token
// =============================================================================
// Lý thuyết: JWT (JSON Web Token)
// - Cấu trúc: Header.Payload.Signature
// - Stateless: Không cần lưu session trên server
// - Payload chứa user info (id, email)
// - Signature đảm bảo token không bị sửa
// =============================================================================
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email
  };

  // Lý thuyết: Sign Token
  // - jwt.sign(payload, secret, options)
  // - expiresIn: Token hết hạn sau 24 giờ
  // - Secret phải giữ bí mật!
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// =============================================================================
// MIDDLEWARE: Verify JWT Token
// =============================================================================
// Lý thuyết: Authentication Middleware
// - Chạy TRƯỚC route handler
// - Verify token trong header
// - Nếu valid: cho phép tiếp tục (next())
// - Nếu invalid: reject (return error)
// =============================================================================
function verifyToken(req, res, next) {
  try {
    // Lý thuyết: Bearer Token
    // - Format: "Authorization: Bearer <token>"
    // - Bearer = người mang token này có quyền truy cập
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy token. Vui lòng đăng nhập.'
      });
    }

    const token = authHeader.substring(7);  // Bỏ "Bearer "

    // Lý thuyết: Verify Signature
    // - jwt.verify() kiểm tra signature với secret
    // - Nếu token bị sửa → signature không khớp → Error
    // - Nếu token hết hạn → Error
    const decoded = jwt.verify(token, JWT_SECRET);

    // Lưu user info vào request để dùng ở route handler
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();  // Cho phép tiếp tục
  } catch (error) {
    console.error('Lỗi verify token:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Token không hợp lệ.'
    });
  }
}

// =============================================================================
// POST /auth/register - ĐĂNG KÝ
// =============================================================================
// Flow:
// 1. Validate input
// 2. Check email đã tồn tại chưa
// 3. Tạo user mới (password tự động hash trong beforeCreate hook)
// 4. Generate JWT token
// 5. Return user + token
// =============================================================================
router.post('/register', async (req, res) => {
  try {
    console.log('\n📝 Bắt đầu đăng ký...');

    // Bước 1: Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation failed:', error.details[0].message);
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password, fullName } = value;
    console.log('✅ Input hợp lệ:', { email, fullName });

    // Bước 2: Check email đã tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ Email đã được sử dụng');
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }

    // Bước 3: Tạo user mới
    console.log('➕ Đang tạo user mới...');
    const user = await User.create({
      email,
      password,  // Sẽ được hash trong beforeCreate hook
      fullName
    });
    console.log('✅ User đã được tạo:', user.id);

    // Bước 4: Generate token
    const token = generateToken(user);
    console.log('🎫 Token đã được tạo');

    // Bước 5: Return response
    console.log('✅ Đăng ký thành công!\n');
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: user.toJSON(),  // toJSON() tự động xóa password
        token
      }
    });
  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký'
    });
  }
});

// =============================================================================
// POST /auth/login - ĐĂNG NHẬP
// =============================================================================
// Flow:
// 1. Validate input
// 2. Tìm user theo email
// 3. So sánh password
// 4. Generate token
// 5. Return user + token
// =============================================================================
router.post('/login', async (req, res) => {
  try {
    console.log('\n🔐 Bắt đầu đăng nhập...');

    // Bước 1: Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password } = value;
    console.log('✅ Input hợp lệ:', { email });

    // Bước 2: Tìm user
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User không tồn tại');
      // Lý thuyết: Security - Don't leak information
      // Không nói "Email không tồn tại" (tiết lộ thông tin)
      // Nói chung chung: "Email hoặc password không đúng"
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng'
      });
    }

    // Bước 3: So sánh password
    console.log('🔍 Đang kiểm tra password...');
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Password không đúng');
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng'
      });
    }

    // Bước 4: Generate token
    const token = generateToken(user);
    console.log('🎫 Token đã được tạo');

    // Bước 5: Return response
    console.log('✅ Đăng nhập thành công!\n');
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
});

// =============================================================================
// GET /auth/me - LẤY THÔNG TIN USER HIỆN TẠI
// =============================================================================
// Lý thuyết: Protected Route
// - Yêu cầu authentication (verifyToken middleware)
// - Client phải gửi token trong header
// - Server verify token → lấy userId → return user info
// =============================================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    console.log('\n👤 Lấy thông tin user:', req.user.id);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy user'
      });
    }

    console.log('✅ Tìm thấy user:', user.email);
    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('❌ Lỗi lấy user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
});

module.exports = router;
