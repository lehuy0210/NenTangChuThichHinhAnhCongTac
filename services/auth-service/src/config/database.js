// =============================================================================
// DATABASE CONNECTION - Sequelize ORM
// =============================================================================
// Lý thuyết: ORM (Object-Relational Mapping)
// - Ánh xạ giữa Objects (JavaScript) và Relational Tables (PostgreSQL)
// - Abstraction layer: Viết code bằng JS thay vì SQL
// - Query Builder: Tự động generate SQL queries
// - Migration & Seeding support
// =============================================================================

const { Sequelize } = require('sequelize');
const logger = require('./logger');

// =============================================================================
// Lý thuyết: Connection Pooling
// - Tái sử dụng database connections
// - Giảm overhead của creating/closing connections
// - Pool size: min = 5 (luôn giữ sẵn), max = 20 (tối đa)
// - idle: 10s (connection không dùng bị close sau 10s)
// - acquire: 30s (timeout khi không lấy được connection)
// =============================================================================
const sequelize = new Sequelize(
  process.env.DB_NAME || 'platform_db',
  process.env.DB_USER || 'admin',
  process.env.DB_PASSWORD || 'admin123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',

    // Connection pool configuration
    pool: {
      max: 20,        // Maximum connections in pool
      min: 5,         // Minimum connections in pool
      acquire: 30000, // Maximum time (ms) to get connection
      idle: 10000     // Maximum idle time before releasing
    },

    // Logging
    logging: process.env.NODE_ENV === 'development'
      ? (msg) => logger.debug(msg)
      : false,

    // Lý thuyết: Timezone Handling
    // - Store UTC in database (best practice)
    // - Convert to local timezone in application
    timezone: '+00:00',

    // Lý thuyết: Connection Retry
    // - Retry khi connection fails
    // - Quan trọng trong distributed systems
    retry: {
      max: 3,
      timeout: 3000
    },

    // Performance optimization
    define: {
      // Lý thuyết: Timestamps
      // - Tự động thêm createdAt, updatedAt
      // - Audit trail: Biết khi nào record được tạo/sửa
      timestamps: true,

      // Lý thuyết: Soft Delete (Paranoid)
      // - Không xóa thật, chỉ đánh dấu deletedAt
      // - Có thể restore data
      // - Compliance: Giữ data history
      paranoid: true,

      // Use snake_case in database
      underscored: true,

      // Prevent Sequelize from pluralizing table names
      freezeTableName: true
    }
  }
);

// =============================================================================
// Lý thuyết: Database Connection Testing
// - Verify connection before starting server
// - Fail fast: Crash nếu không connect được
// =============================================================================
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    // Lý thuyết: Database Synchronization
    // - sync(): Tạo tables nếu chưa có
    // - alter: true: Cập nhật schema nếu thay đổi model
    // - CẢNH BÁO: Không dùng sync() trong production!
    // - Production dùng migrations (Sequelize CLI)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database synchronized');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    // Lý thuyết: Fail Fast Principle
    // - Nếu không có database, service không thể hoạt động
    // - Crash ngay để orchestrator (Docker/K8s) restart
    process.exit(1);
  }
};

// =============================================================================
// Lý thuyết: Graceful Shutdown
// - Đóng connection khi process kết thúc
// - Tránh leaked connections
// =============================================================================
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Database connection closed');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeConnection);
process.on('SIGTERM', closeConnection);

module.exports = {
  sequelize,
  testConnection,
  closeConnection
};
