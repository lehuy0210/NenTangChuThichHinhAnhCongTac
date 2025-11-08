// =============================================================================
// DATABASE CONNECTION - VERSION ĐỠN GIẢN
// =============================================================================
// Lý thuyết: Kết nối PostgreSQL với Sequelize ORM
//
// ORM (Object-Relational Mapping):
// - Ánh xạ giữa Objects (JavaScript) ↔ Tables (SQL)
// - Viết code bằng JavaScript thay vì SQL
// - Ví dụ: User.create() thay vì INSERT INTO users
// =============================================================================

const { Sequelize } = require('sequelize');

// =============================================================================
// Tạo kết nối database
// =============================================================================
const sequelize = new Sequelize(
  process.env.DB_NAME || 'platform_db',     // Database name
  process.env.DB_USER || 'admin',            // Username
  process.env.DB_PASSWORD || 'admin123',     // Password
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',                     // Database type

    // Lý thuyết: Connection Pool
    // - Tái sử dụng connections thay vì tạo mới mỗi lần
    // - max: Tối đa 5 connections cùng lúc
    // - min: Luôn giữ sẵn 1 connection
    pool: {
      max: 5,
      min: 1,
      idle: 10000  // 10 seconds
    },

    // Tắt logging để console sạch hơn
    logging: false
  }
);

// =============================================================================
// Test kết nối
// =============================================================================
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công!');

    // Lý thuyết: sync() - Tạo tables nếu chưa có
    // - Trong development: sync() tự động tạo tables
    // - Trong production: Dùng migrations thay vì sync()
    await sequelize.sync({ alter: true });
    console.log('✅ Database đã sẵn sàng!');
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
    process.exit(1);  // Thoát nếu không kết nối được
  }
};

module.exports = {
  sequelize,
  testConnection
};
