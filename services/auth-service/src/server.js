// =============================================================================
// AUTHENTICATION SERVICE - MAIN SERVER (ĐƠN GIẢN HÓA)
// =============================================================================
// Giải thích cho sinh viên:
// File này là TRUNG TÂM của server - khởi tạo Express app và chạy server
//
// CẤU TRÚC:
// 1. Import các thư viện cần thiết
// 2. Setup các middleware (helmet, cors, rate-limit, body-parser, ...)
// 3. Định nghĩa các routes (endpoint APIs)
// 4. Xử lý lỗi (error handling)
// 5. Khởi động server
// =============================================================================

// ===== BƯỚC 1: IMPORT DEPENDENCIES =====
require('dotenv').config(); // Đọc file .env để lấy biến môi trường
const express = require('express'); // Framework web
const helmet = require('helmet'); // Bảo mật headers
const cors = require('cors'); // Cho phép frontend gọi API
const rateLimit = require('express-rate-limit'); // Chống spam/brute-force
const { testConnection } = require('./config/database'); // Kiểm tra DB
const logger = require('./config/logger'); // Logger
const authRoutes = require('./routes/auth'); // Auth routes

// ===== BƯỚC 2: KHỞI TẠO EXPRESS APP =====
const app = express();
const PORT = process.env.PORT || 3001; // Port server (mặc định 3001)

// =============================================================================
// BƯỚC 3: SETUP MIDDLEWARE
// =============================================================================
// Giải thích: Middleware = Hàm chạy TRƯỚC KHI request đến route handler
// Thứ tự middleware QUAN TRỌNG! (chạy từ trên xuống dưới)

// ===== 3.1: HELMET - BẢO MẬT HEADERS =====
// Giải thích: Thêm các HTTP headers để bảo vệ app
// - X-Frame-Options: Chống clickjacking
// - X-Content-Type-Options: Chống MIME sniffing
// - Strict-Transport-Security: Bắt buộc dùng HTTPS
app.use(helmet());

// ===== 3.2: CORS - CHO PHÉP FRONTEND GỌI API =====
// Giải thích: Mặc định, browser chặn requests từ domain khác (Same-Origin Policy)
// CORS cho phép frontend (ví dụ: http://localhost:3000) gọi API (http://localhost:3001)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', // Domains được phép
  credentials: true, // Cho phép gửi cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== 3.3: RATE LIMITING - GIỚI HẠN SỐ REQUEST =====
// Giải thích: Chống spam và brute-force attacks
// Nếu 1 IP gửi quá nhiều requests -> chặn tạm thời

// Rate limit chung (cho tất cả routes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 requests / 15 phút
  message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút'
});
app.use(limiter); // Áp dụng cho tất cả routes

// Rate limit đặc biệt (cho auth routes - nghiêm ngặt hơn)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Chỉ cho 5 lần login/register / 15 phút
  message: 'Quá nhiều lần đăng nhập/đăng ký, vui lòng thử lại sau 15 phút',
  skipSuccessfulRequests: true // Không đếm request thành công
});

// ===== 3.4: BODY PARSER - PARSE REQUEST BODY =====
// Giải thích: Chuyển đổi request body từ JSON/form sang JavaScript object
app.use(express.json({ limit: '10mb' })); // Parse JSON (giới hạn 10MB)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse form data

// ===== 3.5: REQUEST LOGGING - GHI LOG MỖI REQUEST =====
// Giải thích: Log mọi request để debug và monitor
app.use((req, res, next) => {
  const start = Date.now(); // Thời điểm bắt đầu

  // Log sau khi response được gửi
  res.on('finish', () => {
    const duration = Date.now() - start; // Thời gian xử lý
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next(); // Chuyển sang middleware tiếp theo
});

// =============================================================================
// BƯỚC 4: ĐỊNH NGHĨA ROUTES (ENDPOINT APIs)
// =============================================================================

// ===== 4.1: HEALTH CHECK - KIỂM TRA SERVER SỐNG CHƯA =====
// Giải thích: Endpoint để Docker/Kubernetes check container còn hoạt động không
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime() // Thời gian server đã chạy (giây)
  });
});

// ===== 4.2: ROOT ENDPOINT - TRANG CHỦ =====
// Giải thích: Hiển thị thông tin service và danh sách endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Authentication Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      me: 'GET /auth/me',
      verify: 'GET /auth/verify'
    }
  });
});

// ===== 4.3: AUTH ROUTES - CÁC API XÁC THỰC =====
// Giải thích: Mount auth routes với prefix /auth
// - /auth/register -> authRoutes (POST /register)
// - /auth/login -> authRoutes (POST /login)
// - ...
app.use('/auth', authLimiter, authRoutes);

// =============================================================================
// BƯỚC 5: XỬ LÝ LỖI (ERROR HANDLING)
// =============================================================================

// ===== 5.1: 404 NOT FOUND - ENDPOINT KHÔNG TỒN TẠI =====
// Giải thích: Nếu không route nào khớp -> trả về 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint không tồn tại',
    path: req.path
  });
});

// ===== 5.2: GLOBAL ERROR HANDLER - XỬ LÝ TẤT CẢ LỖI =====
// Giải thích: Middleware với 4 tham số (err, req, res, next)
// Catch tất cả errors từ async routes
app.use((err, req, res, next) => {
  logger.error('Lỗi không xử lý được:', { error: err.message });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Lỗi server' // Production: Không expose chi tiết lỗi
      : err.message, // Development: Hiển thị lỗi để debug
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// BƯỚC 6: KHỞI ĐỘNG SERVER
// =============================================================================
// Giải thích: Kiểm tra database trước, sau đó mới start server

async function startServer() {
  try {
    // Bước 1: Kiểm tra kết nối database
    await testConnection();

    // Bước 2: Start server listening
    app.listen(PORT, () => {
      logger.info(`🚀 Auth Service đang chạy trên port ${PORT}`);
      logger.info(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    });

  } catch (error) {
    logger.error('❌ Không thể khởi động server:', { error: error.message });
    process.exit(1); // Exit với code 1 = có lỗi
  }
}

// =============================================================================
// BƯỚC 7: XỬ LÝ TẮT SERVER (GRACEFUL SHUTDOWN)
// =============================================================================
// Giải thích: Khi nhận tín hiệu tắt (SIGTERM/SIGINT), đóng connections trước khi thoát

function gracefulShutdown(signal) {
  logger.info(`\n${signal} nhận được. Đang tắt server...`);

  // Đóng database connection
  const { closeConnection } = require('./config/database');
  closeConnection().then(() => {
    logger.info('✅ Đã đóng kết nối database');
    logger.info('👋 Server đã tắt thành công');
    process.exit(0); // Exit code 0 = thoát bình thường
  });

  // Force shutdown sau 30 giây nếu chưa tắt được
  setTimeout(() => {
    logger.error('⚠️  Buộc tắt server sau 30 giây timeout');
    process.exit(1);
  }, 30000);
}

// Lắng nghe tín hiệu tắt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker stop
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C

// =============================================================================
// BƯỚC 8: XỬ LÝ LỖI KHÔNG CATCH ĐƯỢC
// =============================================================================
// Giải thích: Nếu có lỗi không được catch -> log và crash
// Orchestrator (Docker/K8s) sẽ tự động restart

// Uncaught Exception: Lỗi đồng bộ không được catch
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', { error: error.message });
  process.exit(1);
});

// Unhandled Rejection: Promise rejection không được catch
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection:', { reason });
  process.exit(1);
});

// =============================================================================
// KHỞI ĐỘNG SERVER
// =============================================================================
startServer();

// Export app cho testing
module.exports = app;
