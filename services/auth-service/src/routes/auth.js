// =============================================================================
// AUTHENTICATION ROUTES - CÁC API XÁC THỰC (ĐƠN GIẢN HÓA)
// =============================================================================
// Giải thích cho sinh viên:
// Routes = Định nghĩa các endpoint API (URL mà client có thể gọi)
//
// API trong file này:
// - POST /auth/register - Đăng ký tài khoản mới
// - POST /auth/login    - Đăng nhập
// - POST /auth/logout   - Đăng xuất
// - GET  /auth/me       - Lấy thông tin user hiện tại
// - GET  /auth/verify   - Kiểm tra token có hợp lệ không
// =============================================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, blacklistToken, verifyToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const logger = require('../config/logger');

// =============================================================================
// API 1: POST /auth/register - ĐĂNG KÝ TÀI KHOẢN MỚI
// =============================================================================
// Giải thích: Tạo tài khoản user mới
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi: { email, password, fullName, avatarUrl }
// 2. Middleware validateRegister kiểm tra dữ liệu hợp lệ
// 3. Kiểm tra email đã tồn tại chưa
// 4. Tạo user mới trong database (password tự động hash)
// 5. Tạo JWT token
// 6. Trả về user + token
//
// REQUEST BODY:
// {
//   "email": "user@test.com",
//   "password": "MyPassword123",
//   "fullName": "Nguyen Van A",
//   "avatarUrl": "https://..."  // Optional
// }
//
// RESPONSE:
// {
//   "success": true,
//   "message": "Đăng ký thành công",
//   "data": {
//     "user": { id, email, fullName, ... },
//     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//   }
// }

router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, fullName, avatarUrl } = req.body;

    // ===== BƯỚC 1: KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA =====
    // Giải thích: Tránh tạo 2 tài khoản cùng email
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng',
        code: 'EMAIL_EXISTS'
      });
    }

    // ===== BƯỚC 2: TẠO USER MỚI =====
    // Giải thích: Lưu user vào database
    // Password sẽ tự động hash trong beforeCreate hook của User model
    const user = await User.create({
      email,
      password,
      fullName,
      avatarUrl
    });

    // ===== BƯỚC 3: TẠO JWT TOKEN =====
    // Giải thích: Token để user đăng nhập sau này
    const token = generateToken(user);

    logger.info(`User đã đăng ký: ${email}`);

    // ===== BƯỚC 4: TRẢ VỀ KẾT QUẢ =====
    // HTTP 201 Created = Tạo mới thành công
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: user.toJSON(), // Loại bỏ password
        token
      }
    });

  } catch (error) {
    logger.error('Lỗi đăng ký:', { error: error.message });

    // Xử lý lỗi database (email trùng)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }

    // Lỗi server khác
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký tài khoản'
    });
  }
});

// =============================================================================
// API 2: POST /auth/login - ĐĂNG NHẬP
// =============================================================================
// Giải thích: Đăng nhập vào hệ thống
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi: { email, password }
// 2. Middleware validateLogin kiểm tra dữ liệu hợp lệ
// 3. Tìm user theo email
// 4. Kiểm tra password có đúng không (bcrypt compare)
// 5. Kiểm tra user có bị vô hiệu hóa không
// 6. Tạo JWT token
// 7. Trả về user + token
//
// REQUEST BODY:
// {
//   "email": "user@test.com",
//   "password": "MyPassword123"
// }
//
// RESPONSE:
// {
//   "success": true,
//   "message": "Đăng nhập thành công",
//   "data": {
//     "user": { id, email, fullName, ... },
//     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//   }
// }

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // ===== BƯỚC 1: TÌM USER THEO EMAIL =====
    const user = await User.findByEmail(email);

    if (!user) {
      // Giải thích: Không nói "Email không tồn tại" vì lý do bảo mật
      // Tránh hacker biết email nào có trong hệ thống
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // ===== BƯỚC 2: KIỂM TRA PASSWORD =====
    // Giải thích: So sánh password nhập vào với password hash trong DB
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // ===== BƯỚC 3: KIỂM TRA USER CÓ BỊ VÔ HIỆU HÓA KHÔNG =====
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // ===== BƯỚC 4: TẠO JWT TOKEN =====
    const token = generateToken(user);

    logger.info(`User đã đăng nhập: ${email}`);

    // ===== BƯỚC 5: TRẢ VỀ KẾT QUẢ =====
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    logger.error('Lỗi đăng nhập:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
});

// =============================================================================
// API 3: POST /auth/logout - ĐĂNG XUẤT
// =============================================================================
// Giải thích: Đăng xuất khỏi hệ thống
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi request với token trong header Authorization
// 2. Middleware verifyToken kiểm tra token hợp lệ
// 3. Thêm token vào blacklist (Redis)
// 4. Client phải xóa token khỏi localStorage
//
// HEADERS:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// RESPONSE:
// {
//   "success": true,
//   "message": "Đăng xuất thành công"
// }

router.post('/logout', verifyToken, async (req, res) => {
  try {
    // ===== BƯỚC 1: THÊM TOKEN VÀO BLACKLIST =====
    // Giải thích: Token này sẽ không dùng được nữa
    await blacklistToken(req.token);

    logger.info(`User đã đăng xuất: ${req.user.email}`);

    // ===== BƯỚC 2: TRẢ VỀ KẾT QUẢ =====
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });

  } catch (error) {
    logger.error('Lỗi đăng xuất:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng xuất'
    });
  }
});

// =============================================================================
// API 4: GET /auth/me - LẤY THÔNG TIN USER HIỆN TẠI
// =============================================================================
// Giải thích: Lấy thông tin user từ token
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi request với token trong header
// 2. Middleware verifyToken kiểm tra token và lấy userId
// 3. Tìm user trong database theo userId
// 4. Trả về thông tin user
//
// HEADERS:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// RESPONSE:
// {
//   "success": true,
//   "data": {
//     "user": { id, email, fullName, ... }
//   }
// }

router.get('/me', verifyToken, async (req, res) => {
  try {
    // ===== BƯỚC 1: TÌM USER THEO ID =====
    // Giải thích: req.user.id lấy từ token (middleware verifyToken đã set)
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    // ===== BƯỚC 2: TRẢ VỀ THÔNG TIN USER =====
    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Lỗi lấy thông tin user:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
});

// =============================================================================
// API 5: GET /auth/verify - KIỂM TRA TOKEN CÒN HỢP LỆ KHÔNG
// =============================================================================
// Giải thích: Client có thể dùng API này để check token còn hợp lệ không
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi request với token
// 2. Middleware verifyToken kiểm tra token
// 3. Nếu đến được đây = token hợp lệ
// 4. Trả về thông báo token hợp lệ
//
// HEADERS:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// RESPONSE:
// {
//   "success": true,
//   "message": "Token hợp lệ",
//   "data": {
//     "user": { id, email, role }
//   }
// }

router.get('/verify', verifyToken, (req, res) => {
  // Nếu đến được đây = token hợp lệ (verifyToken middleware đã pass)
  res.json({
    success: true,
    message: 'Token hợp lệ',
    data: {
      user: req.user
    }
  });
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================
module.exports = router;

// =============================================================================
// VÍ DỤ TESTING VỚI CURL/POSTMAN
// =============================================================================
//
// 1. ĐĂNG KÝ:
// curl -X POST http://localhost:3000/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{"email":"test@test.com","password":"MyPassword123","fullName":"Nguyen Van A"}'
//
// 2. ĐĂNG NHẬP:
// curl -X POST http://localhost:3000/auth/login \
//   -H "Content-Type: application/json" \
//   -d '{"email":"test@test.com","password":"MyPassword123"}'
//
// 3. LẤY THÔNG TIN USER (cần token):
// curl -X GET http://localhost:3000/auth/me \
//   -H "Authorization: Bearer <YOUR_TOKEN>"
//
// 4. ĐĂNG XUẤT (cần token):
// curl -X POST http://localhost:3000/auth/logout \
//   -H "Authorization: Bearer <YOUR_TOKEN>"
