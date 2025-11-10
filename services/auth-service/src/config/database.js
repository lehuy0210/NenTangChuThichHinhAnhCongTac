// =============================================================================
// KẾT NỐI CƠ SỞ DỮ LIỆU - SEQUELIZE ORM
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN CƠ SỞ DỮ LIỆU (CO SO DU LIEU.pdf):
//    📖 CHƯƠNG 3: DATABASE NORMALIZATION & SCHEMA DESIGN
//       - 3.1 Normalization: 1NF, 2NF, 3NF để tránh redundancy
//       - 3.2 Primary Key, Foreign Key constraints
//       - 3.3 Referential Integrity: CASCADE, SET NULL
//       - Ví dụ: User → Roles (many-to-many) qua junction table
//
//    📖 CHƯƠNG 5: QUERY OPTIMIZATION & INDEXING
//       - 5.1 B-Tree Index: PostgreSQL default index type
//       - 5.2 Index Selection: O(log n) vs O(n) full table scan
//       - 5.3 Query Plans: EXPLAIN ANALYZE
//       - Ví dụ: 1M records → 20 comparisons với B-Tree, 1M without index
//
//    📖 CHƯƠNG 6: TRANSACTION MANAGEMENT
//       - 6.1 ACID Properties: Atomicity, Consistency, Isolation, Durability
//       - 6.2 Isolation Levels: READ COMMITTED (PostgreSQL default)
//       - 6.3 Deadlock Detection & Prevention
//       - 6.4 Two-Phase Commit: Distributed transactions
//
//    📖 CHƯƠNG 7: DATABASE PERFORMANCE
//       - 7.1 Connection Pooling: Reuse connections (65ms → 7ms)
//       - 7.2 Query Caching: Prepared statements
//       - 7.3 Index Strategies: Composite index, Partial index
//
// 2️⃣ MÔN HỆ ĐIỀU HÀNH (HE DIEU HANH.pdf):
//    📖 CHƯƠNG 2: PROCESS & THREAD MANAGEMENT
//       - 2.1 Resource Pooling: Connections như processes trong pool
//       - 2.2 Context Switching: Cost of creating new connections
//       - 2.3 Process Signals: SIGTERM, SIGINT cho graceful shutdown
//       - Ví dụ: Pool min=5, max=20 → giống process pool
//
//    📖 CHƯƠNG 3: DEADLOCK HANDLING
//       - 3.1 Deadlock Detection: Timeout mechanisms
//       - 3.2 Resource Allocation Graph
//       - 3.3 Prevention: acquire timeout = 30s
//
//    📖 CHƯƠNG 5: FILE SYSTEMS & I/O
//       - 5.1 I/O Operations: Database writes to disk
//       - 5.2 Buffering: WAL (Write-Ahead Logging) in PostgreSQL
//
// 3️⃣ MÔN CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT 2 (CAU TRUC DU LIEU 2.pdf):
//    📖 CHƯƠNG 4: B-TREES & BALANCED TREES
//       - 4.1 B-Tree Structure: Self-balancing, multi-way tree
//       - 4.2 Time Complexity: Search O(log n), Insert O(log n)
//       - 4.3 PostgreSQL Implementation: B+ Tree variant
//       - Ví dụ: log₂(1,000,000) ≈ 20 comparisons
//
//    📖 CHƯƠNG 5: HASH TABLES
//       - 5.1 Hash Index: O(1) for equality lookups
//       - 5.2 Collision Handling: Chaining vs Open Addressing
//       - 5.3 PostgreSQL Hash Index: For = operator only
//
//    📖 CHƯƠNG 6: QUEUES
//       - 6.1 FIFO Queue: Connection pool implements queue
//       - 6.2 Enqueue/Dequeue: O(1) operations
//
// 4️⃣ MÔN HỆ THỐNG PHÂN TÁN (HE THONG PHAN TAN.pdf):
//    📖 CHƯƠNG 3: CAP THEOREM
//       - 3.1 Consistency: PostgreSQL prioritizes C
//       - 3.2 Availability: Read replicas for high availability
//       - 3.3 Partition Tolerance: Network partition handling
//       - Trade-off: PostgreSQL = CP system (not Cassandra's AP)
//
//    📖 CHƯƠNG 4: REPLICATION & CONSISTENCY
//       - 4.1 Master-Slave Replication: Write to master, read from slaves
//       - 4.2 Streaming Replication: PostgreSQL built-in
//       - 4.3 Consistency Models: Strong consistency vs Eventually consistent
//
//    📖 CHƯƠNG 5: DATA PARTITIONING (SHARDING)
//       - 5.1 Horizontal Partitioning: Split rows across nodes
//       - 5.2 Partition Key Selection: user_id, tenant_id
//       - 5.3 Hash-based vs Range-based partitioning
//
// 5️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (LAP TRINH HUONG DOI TUONG.pdf):
//    📖 CHƯƠNG 6: ORM (OBJECT-RELATIONAL MAPPING)
//       - 6.1 Active Record Pattern: Sequelize models
//       - 6.2 Data Mapper: Abstract database operations
//       - 6.3 Lazy Loading vs Eager Loading
//       - Ví dụ: User.findAll() maps to SELECT * FROM users
//
// 6️⃣ MÔN KỸ THUẬT PHẦN MỀM (KY THUAT PHAN MEM.pdf):
//    📖 CHƯƠNG 3: CONFIGURATION MANAGEMENT
//       - 3.1 Environment Variables: 12-Factor App methodology
//       - 3.2 Separation of Concerns: Config separate from code
//       - Ví dụ: DB_HOST, DB_PASSWORD from process.env
//
//    📖 CHƯƠNG 5: DESIGN PATTERNS
//       - 5.1 Singleton Pattern: Single database instance
//       - 5.2 Factory Pattern: Sequelize creates model instances
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
