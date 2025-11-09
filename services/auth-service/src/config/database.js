// =============================================================================
// KẾT NỐI DATABASE - SEQUELIZE ORM (ĐƠN GIẢN HÓA)
// =============================================================================
// Giải thích cho sinh viên:
// Sequelize = Thư viện giúp kết nối và thao tác với database bằng JavaScript
// Thay vì viết SQL thuần, ta viết code JavaScript (dễ hơn, ít lỗi hơn)
//
// VÍ DỤ:
// - SQL thuần: SELECT * FROM users WHERE email = 'test@test.com'
// - Sequelize:  User.findOne({ where: { email: 'test@test.com' } })
// =============================================================================

const { Sequelize } = require('sequelize');
const logger = require('./logger');

// =============================================================================
// BƯỚC 1: ĐỌC THÔNG TIN KẾT NỐI TỪ BIẾN MÔI TRƯỜNG
// =============================================================================
// Giải thích: Thông tin database (tên DB, user, password) được lưu trong .env
// Nếu không có -> dùng giá trị mặc định (cho development)

const DB_NAME = process.env.DB_NAME || 'platform_db';     // Tên database
const DB_USER = process.env.DB_USER || 'admin';           // Username
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin123'; // Password
const DB_HOST = process.env.DB_HOST || 'localhost';       // Địa chỉ server
const DB_PORT = process.env.DB_PORT || 5432;              // Port (PostgreSQL mặc định 5432)

// =============================================================================
// BƯỚC 2: TẠO KẾT NỐI DATABASE VỚI SEQUELIZE
// =============================================================================
// Giải thích: Tạo object sequelize để kết nối đến PostgreSQL

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres', // Loại database (PostgreSQL)

  // ===== CONNECTION POOL (BỂ KẾT NỐI) =====
  // Giải thích: Thay vì mỗi request tạo kết nối mới (chậm),
  // ta tạo sẵn 1 "bể" kết nối và tái sử dụng (nhanh hơn)
  //
  // HÌNH DUNG: Giống như bể bơi
  // - min: Luôn giữ sẵn ít nhất 5 kết nối (dự phòng)
  // - max: Tối đa 20 kết nối cùng lúc (không cho vượt quá)
  // - acquire: Nếu sau 30s không lấy được kết nối -> báo lỗi
  // - idle: Nếu kết nối không dùng quá 10s -> đóng lại (tiết kiệm tài nguyên)
  pool: {
    min: 5,         // Tối thiểu 5 kết nối luôn sẵn sàng
    max: 20,        // Tối đa 20 kết nối cùng lúc
    acquire: 30000, // Timeout 30 giây (30000 milliseconds)
    idle: 10000     // Đóng kết nối sau 10 giây không dùng
  },

  // ===== LOGGING (GHI LOG) =====
  // Giải thích: Có ghi log SQL queries ra console không?
  // - Development (đang code): Có, để debug
  // - Production (chạy thật): Không, để tăng hiệu năng
  logging: process.env.NODE_ENV === 'development'
    ? (msg) => logger.debug(msg) // Development: Ghi log SQL
    : false,                     // Production: Không ghi log

  // ===== TIMEZONE =====
  // Giải thích: Lưu thời gian trong database theo múi giờ nào?
  // Best practice: Lưu UTC (+00:00) trong DB, chuyển sang local khi hiển thị
  timezone: '+00:00',

  // ===== RETRY (THỬ LẠI KHI LỖI) =====
  // Giải thích: Nếu kết nối database bị lỗi, thử lại bao nhiêu lần?
  // - max: Thử tối đa 3 lần
  // - timeout: Mỗi lần thử, chờ 3 giây
  retry: {
    max: 3,        // Thử tối đa 3 lần
    timeout: 3000  // Mỗi lần thử chờ 3 giây
  },

  // ===== CẤU HÌNH MODELS (BẢNG) =====
  // Giải thích: Cấu hình mặc định cho tất cả các models (bảng)
  define: {
    // TIMESTAMPS: Tự động thêm 2 cột createdAt, updatedAt
    // Giúp biết record được tạo lúc nào, sửa lần cuối lúc nào
    timestamps: true,

    // PARANOID (SOFT DELETE): Không xóa thật, chỉ đánh dấu deletedAt
    // Khi xóa user -> không xóa khỏi DB, chỉ set deletedAt = thời gian hiện tại
    // Lợi ích: Có thể khôi phục dữ liệu nếu cần
    paranoid: true,

    // UNDERSCORED: Dùng snake_case trong DB (created_at thay vì createdAt)
    // JavaScript dùng camelCase, SQL dùng snake_case
    underscored: true,

    // FREEZE TABLE NAME: Không tự động đổi tên bảng sang số nhiều
    // Ví dụ: Model "User" -> Table "User" (không phải "Users")
    freezeTableName: true
  }
});

// =============================================================================
// BƯỚC 3: HÀM KIỂM TRA KẾT NỐI
// =============================================================================
// Giải thích: Trước khi chạy server, cần kiểm tra database có kết nối được không
// Nếu không kết nối được -> dừng luôn (fail fast)

async function testConnection() {
  try {
    // Bước 1: Thử kết nối đến database
    await sequelize.authenticate();
    logger.info('✅ Kết nối database thành công!');

    // Bước 2: Đồng bộ schema (chỉ trong development)
    // Giải thích: Tự động tạo/cập nhật bảng theo models
    // CẢNH BÁO: Không dùng trong production! Dùng migrations thay thế
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true }); // alter: cập nhật schema nếu thay đổi
      logger.info('✅ Database schema đã được đồng bộ');
    }

  } catch (error) {
    // Nếu không kết nối được -> crash chương trình
    logger.error('❌ Không thể kết nối database:', { error: error.message });

    // Giải thích: Fail Fast Principle
    // Nếu không có database -> service không thể hoạt động
    // Crash ngay để Docker/Kubernetes tự động restart
    process.exit(1); // Exit code 1 = có lỗi
  }
}

// =============================================================================
// BƯỚC 4: HÀM ĐÓNG KẾT NỐI (GRACEFUL SHUTDOWN)
// =============================================================================
// Giải thích: Khi tắt server, cần đóng kết nối database đúng cách
// Tránh "rò rỉ" kết nối (connection leak)

async function closeConnection() {
  try {
    await sequelize.close(); // Đóng tất cả kết nối trong pool
    logger.info('✅ Đã đóng kết nối database');
  } catch (error) {
    logger.error('❌ Lỗi khi đóng kết nối database:', { error: error.message });
  }
}

// =============================================================================
// BƯỚC 5: XỬ LÝ TẮT CHƯƠNG TRÌNH
// =============================================================================
// Giải thích: Khi nhấn Ctrl+C hoặc Docker stop -> đóng database trước khi thoát

// SIGINT = Ctrl+C
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0); // Exit code 0 = thoát bình thường
});

// SIGTERM = Docker stop / kill
process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

// =============================================================================
// EXPORT
// =============================================================================
// Giải thích: Export để dùng ở các file khác
// - sequelize: Object kết nối database
// - testConnection: Hàm kiểm tra kết nối
// - closeConnection: Hàm đóng kết nối

module.exports = {
  sequelize,
  testConnection,
  closeConnection
};

// =============================================================================
// VÍ DỤ SỬ DỤNG
// =============================================================================
// Trong server.js:
//
// const { testConnection } = require('./config/database');
//
// async function startServer() {
//   await testConnection(); // Kiểm tra DB trước
//   app.listen(3000);       // Sau đó mới start server
// }
