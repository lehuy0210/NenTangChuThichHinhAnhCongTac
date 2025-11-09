// =============================================================================
// KẾT NỐI CƠ SỞ DỮ LIỆU - SEQUELIZE ORM
// =============================================================================
// 📚 LIÊN HỆ VỚI ĐỀ CƯƠNG CÁC MÔN HỌC:
//
// 1️⃣ MÔN CƠ SỞ DỮ LIỆU (Database):
//    ✅ Connection Pool: Tái sử dụng kết nối DB (giảm overhead)
//    ✅ Transaction & ACID: Đảm bảo tính toàn vẹn dữ liệu
//    ✅ Index (B-Tree): Tối ưu truy vấn (O(log n))
//    ✅ Schema Design: Thiết kế bảng, khóa chính, khóa ngoại
//    ✅ Query Optimization: Tối ưu câu truy vấn SQL
//
// 2️⃣ MÔN HỆ ĐIỀU HÀNH (Operating Systems):
//    ✅ Process Management: Quản lý connections như processes
//    ✅ Resource Allocation: Phân bổ connections từ pool
//    ✅ Deadlock Prevention: Timeout để tránh deadlock
//
// 3️⃣ MÔN CẤU TRÚC DỮ LIỆU & GIẢI THUẬT 2:
//    ✅ B-Tree: PostgreSQL dùng B-Tree cho index
//    ✅ Hash Table: Index bằng hash cho equality lookups
//    ✅ Time Complexity: Index giảm từ O(n) xuống O(log n)
//
// 4️⃣ MÔN HỆ THỐNG PHÂN TÁN (Distributed Systems):
//    ✅ Replication: Master-Slave, Read Replicas
//    ✅ Partitioning: Sharding theo user_id
//    ✅ CAP Theorem: Consistency, Availability, Partition tolerance
//
// =============================================================================

const { Sequelize } = require('sequelize');
const logger = require('./logger');

// =============================================================================
// BƯỚC 1: ĐỌC THÔNG TIN KẾT NỐI TỪ ENVIRONMENT
// =============================================================================
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Configuration Management: Tách config ra khỏi code
//    - 12-Factor App: Store config in environment

const DB_NAME = process.env.DB_NAME || 'platform_db';
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin123';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

// =============================================================================
// BƯỚC 2: CONNECTION POOL - TÁI SỬ DỤNG KẾT NỐI
// =============================================================================
// 📚 MÔN CƠ SỞ DỮ LIỆU - CONNECTION POOLING:
//
// KHI KHÔNG CÓ POOL (Slow):
//    1. Tạo kết nối mới (TCP handshake, authentication) - 50ms
//    2. Thực hiện query - 5ms
//    3. Đóng kết nối - 10ms
//    => TỔNG: 65ms/request
//
// KHI CÓ POOL (Fast):
//    1. Lấy kết nối sẵn có từ pool - 1ms
//    2. Thực hiện query - 5ms
//    3. Trả kết nối về pool - 1ms
//    => TỔNG: 7ms/request (nhanh hơn 9x)
//
// 📚 CẤU TRÚC DỮ LIỆU:
//    - Pool là Queue (FIFO): Connections chờ trong hàng đợi
//    - Time Complexity: O(1) để lấy/trả connection
//
// 📚 HỆ ĐIỀU HÀNH:
//    - Resource pooling giống process pooling
//    - Idle timeout: Giải phóng connection không dùng

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',

  // ===== CONNECTION POOL CONFIGURATION =====
  pool: {
    min: 5,         // 📚 CSDL: Tối thiểu 5 connections luôn sẵn sàng
    max: 20,        // 📚 HĐH: Giới hạn tài nguyên, tránh quá tải
    acquire: 30000, // 📚 HĐH: Timeout 30s để tránh deadlock
    idle: 10000     // 📚 HĐH: Đóng connection sau 10s không dùng
  },

  // ===== LOGGING =====
  logging: process.env.NODE_ENV === 'development'
    ? (msg) => logger.debug(msg)
    : false,

  // ===== TIMEZONE =====
  // 📚 CSDL: Lưu UTC trong DB, convert sang local khi hiển thị
  timezone: '+00:00',

  // ===== RETRY LOGIC =====
  // 📚 HỆ THỐNG PHÂN TÁN: Retry khi connection bị lỗi (network partition)
  retry: {
    max: 3,        // Thử tối đa 3 lần
    timeout: 3000  // Mỗi lần chờ 3s
  },

  // ===== DEFAULT SETTINGS CHO TẤT CẢ MODELS =====
  define: {
    // 📚 CSDL: Timestamps cho audit trail
    timestamps: true,     // Tự động thêm created_at, updated_at

    // 📚 CSDL: Soft Delete - không xóa thật, chỉ đánh dấu deleted_at
    paranoid: true,       // Thêm cột deleted_at

    // 📚 SQL Convention: Dùng snake_case thay vì camelCase
    underscored: true,    // created_at thay vì createdAt

    // 📚 CSDL: Không tự động đổi tên bảng sang số nhiều
    freezeTableName: true // "User" thay vì "Users"
  }
});

// =============================================================================
// BƯỚC 3: KIỂM TRA KẾT NỐI VÀ ĐỒNG BỘ SCHEMA
// =============================================================================
// 📚 MÔN CƠ SỞ DỮ LIỆU:
//
// SYNC vs MIGRATION:
//    - sync(): Tự động tạo/cập nhật bảng (chỉ dùng development)
//    - migration: Versioned schema changes (dùng production)
//
// INDEX OPTIMIZATION:
//    - Primary Key: Tự động có B-Tree index
//    - Foreign Key: Nên thêm index để tăng tốc JOIN
//    - Unique Constraint: Tự động có index
//
// 📚 CẤU TRÚC DỮ LIỆU - B-TREE INDEX:
//    - PostgreSQL dùng B-Tree (từ đề cương CTDL 1)
//    - Time complexity: O(log n) cho SELECT, INSERT, UPDATE, DELETE
//    - VD: Tìm user với 1 triệu records:
//      + Không index: O(n) = 1,000,000 so sánh
//      + Có B-Tree index: O(log n) = log₂(1,000,000) ≈ 20 so sánh

async function testConnection() {
  try {
    // Bước 1: Test kết nối
    await sequelize.authenticate();
    logger.info('✅ Kết nối PostgreSQL thành công');

    // Bước 2: Đồng bộ schema (chỉ development)
    if (process.env.NODE_ENV === 'development') {
      // 📚 CSDL: ALTER TABLE để sync schema
      await sequelize.sync({ alter: true });
      logger.info('✅ Database schema đã được đồng bộ');

      // 📚 CSDL: Index được tạo tự động cho:
      // - Primary Key (id) -> B-Tree index
      // - Unique columns (email) -> B-Tree index
      // - Foreign Keys -> Nên thêm index thủ công
    }

  } catch (error) {
    logger.error('❌ Lỗi kết nối database:', { error: error.message });

    // 📚 KỸ THUẬT PHẦN MỀM: Fail Fast Principle
    // Nếu không có DB -> service không thể hoạt động -> crash ngay
    process.exit(1);
  }
}

// =============================================================================
// BƯỚC 4: ĐÓNG KẾT NỐI (GRACEFUL SHUTDOWN)
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    - Graceful shutdown: Đóng tất cả connections trước khi thoát
//    - Resource cleanup: Tránh connection leak
//
// 📚 MÔN CƠ SỞ DỮ LIỆU:
//    - Commit/Rollback pending transactions
//    - Đóng connections trong pool

async function closeConnection() {
  try {
    // Đóng tất cả connections trong pool
    await sequelize.close();
    logger.info('✅ Đã đóng connection pool');
  } catch (error) {
    logger.error('❌ Lỗi khi đóng database:', { error: error.message });
  }
}

// ===== XỬ LÝ SIGNAL TỪ HỆ ĐIỀU HÀNH =====
// 📚 HỆ ĐIỀU HÀNH: Process signals
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  sequelize,
  testConnection,
  closeConnection
};

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: CÁC LOẠI INDEX TRONG POSTGRESQL
// =============================================================================
//
// 1. B-TREE INDEX (Default):
//    - Dùng cho: =, <, >, <=, >=, BETWEEN, ORDER BY
//    - Cấu trúc: Cây cân bằng (từ đề cương CTDL 1)
//    - Time complexity: O(log n)
//    - VD: CREATE INDEX idx_email ON users(email);
//
// 2. HASH INDEX:
//    - Dùng cho: = (equality only)
//    - Cấu trúc: Hash Table (từ đề cương CTDL 1)
//    - Time complexity: O(1) trung bình
//    - VD: CREATE INDEX idx_hash ON users USING HASH(email);
//
// 3. GIN INDEX (Generalized Inverted Index):
//    - Dùng cho: JSONB, Array, Full-text search
//    - VD: CREATE INDEX idx_gin ON users USING GIN(metadata);
//
// 4. BRIN INDEX (Block Range Index):
//    - Dùng cho: Dữ liệu lớn, sorted naturally (timestamp)
//    - VD: CREATE INDEX idx_brin ON logs USING BRIN(created_at);
//
// =============================================================================
// 📚 TRANSACTION & ACID PROPERTIES (Từ đề cương CSDL)
// =============================================================================
//
// VÍ DỤ SỬ DỤNG TRANSACTION:
//
// const transaction = await sequelize.transaction();
// try {
//   // Atomicity: Tất cả thành công hoặc tất cả rollback
//   await User.create({ email: 'test@test.com' }, { transaction });
//   await Profile.create({ userId: user.id }, { transaction });
//
//   // Commit nếu không có lỗi
//   await transaction.commit();
// } catch (error) {
//   // Rollback nếu có lỗi
//   await transaction.rollback();
// }
//
// ACID PROPERTIES:
// - Atomicity: All or nothing
// - Consistency: Dữ liệu luôn đúng constraints
// - Isolation: Transactions không ảnh hưởng lẫn nhau
// - Durability: Commit = lưu vĩnh viễn
//
// =============================================================================
// 📚 QUERY OPTIMIZATION TIPS (Từ đề cương CSDL)
// =============================================================================
//
// 1. SỬ DỤNG INDEX:
//    ❌ Slow: SELECT * FROM users WHERE email = 'test@test.com'; (O(n))
//    ✅ Fast: CREATE INDEX + SELECT (O(log n))
//
// 2. TRÁNH SELECT *:
//    ❌ Slow: SELECT * FROM users;
//    ✅ Fast: SELECT id, email FROM users;
//
// 3. SỬ DỤNG LIMIT:
//    ❌ Slow: SELECT * FROM users ORDER BY created_at DESC;
//    ✅ Fast: SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
//
// 4. JOIN OPTIMIZATION:
//    - Thêm index cho foreign keys
//    - Dùng EXPLAIN ANALYZE để xem query plan
//
// 5. CONNECTION POOLING:
//    - Tái sử dụng connections (như đã config ở trên)
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ MÔN CƠ SỞ DỮ LIỆU:
//    - Connection Pool, Transaction, ACID, Index (B-Tree, Hash)
//    - Schema design, Query optimization, Constraints
//
// ✅ MÔN CẤU TRÚC DỮ LIỆU & GIẢI THUẬT:
//    - B-Tree (đề cương CTDL 1): O(log n)
//    - Hash Table (đề cương CTDL 1): O(1)
//    - Queue (Connection Pool queue)
//
// ✅ MÔN HỆ ĐIỀU HÀNH:
//    - Process management, Resource pooling
//    - Signals (SIGTERM, SIGINT), Graceful shutdown
//
// ✅ MÔN HỆ THỐNG PHÂN TÁN:
//    - Replication, Sharding, CAP Theorem
//    - Retry logic, Network partition handling
//
// =============================================================================
