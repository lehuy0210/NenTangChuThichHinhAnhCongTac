// =============================================================================
// AUTHENTICATION MIDDLEWARE - XÁC THỰC NGƯỜI DÙNG (ĐƠN GIẢN HÓA)
// =============================================================================
// Giải thích cho sinh viên:
// Middleware = Hàm chạy GIỮA request và controller
// Authentication = Xác định "Bạn là ai?"
//
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi request + JWT token (trong header Authorization)
// 2. Middleware này chặn request, kiểm tra token
// 3. Nếu token hợp lệ -> cho phép tiếp tục (next())
// 4. Nếu token không hợp lệ -> trả về lỗi 401 Unauthorized
// =============================================================================

const jwt = require('jsonwebtoken'); // Thư viện JWT
const { createClient } = require('redis'); // Thư viện Redis
const logger = require('../config/logger');

// =============================================================================
// KHÁI NIỆM: JWT (JSON WEB TOKEN)
// =============================================================================
// JWT = Chuỗi mã hóa chứa thông tin user
//
// CẤU TRÚC JWT: Header.Payload.Signature
// - Header: { "alg": "HS256", "typ": "JWT" }
// - Payload: { "userId": "123", "email": "user@test.com", "exp": 1234567890 }
// - Signature: HMAC(Header + Payload, SECRET_KEY)
//
// VÍ DỤ JWT:
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20ifQ.xyz123abc
//
// ƯU ĐIỂM:
// - Stateless: Server không cần lưu session
// - Scalable: Nhiều server có thể verify cùng 1 token
// - Mobile-friendly: Dễ dùng cho app mobile
//
// NHƯỢC ĐIỂM:
// - Không thể thu hồi token (cần dùng blacklist)
// - Token size lớn hơn session ID
// =============================================================================

// =============================================================================
// BƯỚC 1: KẾT NỐI REDIS
// =============================================================================
// Giải thích: Redis = Database trong RAM (cực nhanh)
// Dùng để lưu blacklist (danh sách token bị vô hiệu hóa khi logout)

let redisClient;

async function initRedis() {
  // Tạo Redis client
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD
  });

  // Xử lý sự kiện
  redisClient.on('error', (err) => logger.error('Redis lỗi:', { error: err }));
  redisClient.on('connect', () => logger.info('✅ Redis đã kết nối'));

  // Kết nối
  await redisClient.connect();
}

// Khởi tạo Redis
initRedis().catch(logger.error);

// =============================================================================
// BƯỚC 2: MIDDLEWARE VERIFY TOKEN (KIỂM TRA TOKEN)
// =============================================================================
// Giải thích: Middleware này kiểm tra token có hợp lệ không
// Cách dùng: app.get('/protected', verifyToken, controller)

const verifyToken = async (req, res, next) => {
  try {
    // ===== BƯỚC 2.1: LẤY TOKEN TỪ HEADER =====
    // Giải thích: Token được gửi trong header Authorization
    // Format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5..."

    const authHeader = req.headers.authorization;

    // Kiểm tra có header Authorization không
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy token. Vui lòng đăng nhập.'
      });
    }

    // Cắt bỏ "Bearer " để lấy token
    // "Bearer xyz123" -> "xyz123"
    const token = authHeader.substring(7);

    // ===== BƯỚC 2.2: KIỂM TRA BLACKLIST =====
    // Giải thích: Khi user logout, token được thêm vào blacklist
    // Nếu token trong blacklist -> từ chối

    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại.'
      });
    }

    // ===== BƯỚC 2.3: VERIFY TOKEN =====
    // Giải thích: Kiểm tra token có hợp lệ không
    // - Signature có đúng không? (chống giả mạo)
    // - Token đã hết hạn chưa? (check expiration)

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Token hợp lệ -> Lưu thông tin user vào req.user
    // Controller sau này có thể dùng req.user
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    req.token = token; // Lưu token cho các middleware sau

    // ===== BƯỚC 2.4: CHO PHÉP TIẾP TỤC =====
    // Giải thích: next() = chuyển sang middleware/controller tiếp theo
    next();

  } catch (error) {
    logger.error('Lỗi khi verify token:', { error: error.message });

    // ===== XỬ LÝ CÁC LOẠI LỖI JWT =====

    // Lỗi 1: Token hết hạn
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Lỗi 2: Token không hợp lệ (signature sai)
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ.',
        code: 'INVALID_TOKEN'
      });
    }

    // Lỗi khác
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực token.'
    });
  }
};

// =============================================================================
// BƯỚC 3: MIDDLEWARE REQUIRE ROLE (KIỂM TRA QUYỀN)
// =============================================================================
// Giải thích: Middleware này kiểm tra user có quyền truy cập không
// Cách dùng: app.delete('/users/:id', verifyToken, requireRole('admin'), controller)

const requireRole = (...allowedRoles) => {
  // Trả về middleware function
  return (req, res, next) => {
    // Kiểm tra đã authenticated chưa
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Chưa xác thực. Vui lòng đăng nhập.'
      });
    }

    // Kiểm tra role có trong allowedRoles không
    // VÍ DỤ: allowedRoles = ['admin', 'editor']
    //        req.user.role = 'user'
    //        -> Không có quyền -> 403 Forbidden
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền truy cập tài nguyên này.',
        code: 'FORBIDDEN'
      });
    }

    // Có quyền -> cho phép tiếp tục
    next();
  };
};

// =============================================================================
// BƯỚC 4: HÀM BLACKLIST TOKEN (VÔ HIỆU HÓA TOKEN KHI LOGOUT)
// =============================================================================
// Giải thích: Khi user logout, thêm token vào blacklist
// Token trong blacklist sẽ bị từ chối khi verify

const blacklistToken = async (token) => {
  try {
    // Decode token để lấy expiration time
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      throw new Error('Token không hợp lệ');
    }

    // Tính TTL (Time To Live) - Thời gian còn lại của token
    // exp = Unix timestamp (giây)
    const now = Math.floor(Date.now() / 1000); // Thời gian hiện tại (giây)
    const ttl = decoded.exp - now; // Thời gian còn lại (giây)

    // Nếu token còn hạn -> thêm vào blacklist
    if (ttl > 0) {
      // Lưu vào Redis với TTL
      // Sau TTL giây, Redis tự động xóa key này
      await redisClient.setEx(`blacklist:${token}`, ttl, 'true');
      logger.info(`Token đã được blacklist trong ${ttl} giây`);
    }

    return true;
  } catch (error) {
    logger.error('Lỗi khi blacklist token:', { error: error.message });
    throw error;
  }
};

// =============================================================================
// BƯỚC 5: HÀM GENERATE TOKEN (TẠO TOKEN MỚI)
// =============================================================================
// Giải thích: Tạo JWT token mới khi user đăng nhập
// Input: User object
// Output: JWT token string

const generateToken = (user) => {
  // ===== BƯỚC 5.1: TẠO PAYLOAD =====
  // Giải thích: Payload = Thông tin user lưu trong token
  // LƯU Ý: KHÔNG lưu thông tin nhạy cảm (password, credit card)
  // Vì payload có thể decode dễ dàng (chỉ base64)

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user'
  };

  // ===== BƯỚC 5.2: TẠO OPTIONS =====
  // Giải thích: Các tùy chọn khi tạo token
  // - expiresIn: Thời gian token hết hạn ('24h', '7d', '30m')
  // - algorithm: Thuật toán mã hóa (HS256 = HMAC SHA256)

  const options = {
    expiresIn: process.env.JWT_EXPIRY || '24h', // Mặc định 24 giờ
    algorithm: 'HS256'
  };

  // ===== BƯỚC 5.3: TẠO TOKEN =====
  // Giải thích: jwt.sign() tạo token từ payload + secret + options
  // Secret key PHẢI giữ bí mật! (lưu trong .env)

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

// =============================================================================
// EXPORT
// =============================================================================
// Giải thích: Export các hàm để dùng ở các file khác

module.exports = {
  verifyToken,     // Middleware verify token
  requireRole,     // Middleware check role
  blacklistToken,  // Hàm blacklist token
  generateToken,   // Hàm tạo token
  redisClient      // Redis client
};

// =============================================================================
// VÍ DỤ SỬ DỤNG
// =============================================================================
// const { verifyToken, requireRole, generateToken } = require('./middleware/auth');
//
// // Route không cần authentication
// app.get('/public', (req, res) => { ... });
//
// // Route cần authentication (phải đăng nhập)
// app.get('/profile', verifyToken, (req, res) => {
//   console.log(req.user); // { id: '123', email: 'user@test.com', role: 'user' }
// });
//
// // Route cần authentication + authorization (phải là admin)
// app.delete('/users/:id', verifyToken, requireRole('admin'), (req, res) => {
//   // Chỉ admin mới vào được đây
// });
//
// // Tạo token khi đăng nhập
// app.post('/login', async (req, res) => {
//   const user = await User.findByEmail(req.body.email);
//   const token = generateToken(user);
//   res.json({ token });
// });
