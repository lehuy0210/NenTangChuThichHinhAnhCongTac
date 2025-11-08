// =============================================================================
// USER MODEL - VERSION ĐƠN GIẢN
// =============================================================================
// Lý thuyết: ORM Model
// - Model = Class đại diện cho 1 table trong database
// - Mỗi instance = 1 row trong table
// - Methods = Các hành động có thể làm với data
// =============================================================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

// =============================================================================
// Định nghĩa User Model
// =============================================================================
const User = sequelize.define('users', {
  // ==========================================================================
  // PRIMARY KEY - ID duy nhất cho mỗi user
  // ==========================================================================
  id: {
    type: DataTypes.INTEGER,        // Kiểu số nguyên
    primaryKey: true,                // Khóa chính
    autoIncrement: true              // Tự động tăng (1, 2, 3, ...)
  },

  // ==========================================================================
  // EMAIL - Địa chỉ email (dùng để đăng nhập)
  // ==========================================================================
  email: {
    type: DataTypes.STRING,          // Kiểu chuỗi
    allowNull: false,                // Bắt buộc phải có (NOT NULL)
    unique: true,                    // Không được trùng
    validate: {
      isEmail: true,                 // Phải đúng format email
      notEmpty: true                 // Không được rỗng
    }
  },

  // ==========================================================================
  // PASSWORD - Mật khẩu (đã được hash bằng bcrypt)
  // Lý thuyết: KHÔNG BAO GIỜ lưu plain password!
  // - Hash = Mã hóa một chiều (không thể reverse)
  // - Bcrypt tự động thêm salt (chuỗi random)
  // ==========================================================================
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 100],                 // Độ dài 8-100 ký tự
      notEmpty: true
    }
  },

  // ==========================================================================
  // FULL NAME - Họ và tên
  // ==========================================================================
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 255],                 // Độ dài 2-255 ký tự
      notEmpty: true
    }
  },

  // ==========================================================================
  // TIMESTAMPS - Thời gian tạo và cập nhật
  // - createdAt: Khi user được tạo
  // - updatedAt: Khi user được cập nhật lần cuối
  // - Sequelize tự động quản lý 2 fields này
  // ==========================================================================
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  // ==========================================================================
  // MODEL OPTIONS
  // ==========================================================================
  timestamps: true,  // Tự động thêm createdAt, updatedAt

  // ==========================================================================
  // HOOKS - Functions chạy trước/sau các operations
  // ==========================================================================
  hooks: {
    // Lý thuyết: beforeCreate Hook
    // - Chạy TRƯỚC KHI tạo user mới (INSERT)
    // - Dùng để hash password trước khi lưu vào database
    beforeCreate: async (user) => {
      if (user.password) {
        // Lý thuyết: Bcrypt Hashing
        // - genSalt(10): Tạo salt với độ phức tạp 10
        // - hash(password, salt): Hash password với salt
        // - Kết quả: $2b$10$... (60 ký tự)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        console.log('🔒 Password đã được hash!');
      }
    },

    // Hook chạy trước khi update
    beforeUpdate: async (user) => {
      // Chỉ hash nếu password thay đổi
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        console.log('🔒 Password đã được hash lại!');
      }
    }
  }
});

// =============================================================================
// INSTANCE METHODS - Methods trên từng user
// =============================================================================

// Lý thuyết: So sánh password
// - Khi user đăng nhập, gửi plain password
// - So sánh plain password với hashed password trong database
// - bcrypt.compare() tự động extract salt và compare
User.prototype.comparePassword = async function(plainPassword) {
  try {
    // Lý thuyết: Constant-time Comparison
    // - bcrypt.compare() so sánh an toàn (chống timing attacks)
    // - Return true nếu khớp, false nếu không
    return await bcrypt.compare(plainPassword, this.password);
  } catch (error) {
    console.error('Lỗi so sánh password:', error);
    return false;
  }
};

// Lý thuyết: Chuyển sang JSON (loại bỏ password)
// - Khi return user cho client, KHÔNG được return password!
// - Override toJSON() để tự động xóa password
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;  // Xóa password khỏi response
  return values;
};

// =============================================================================
// CLASS METHODS - Static methods trên User class
// =============================================================================

// Tìm user theo email
User.findByEmail = async function(email) {
  return await this.findOne({
    where: { email: email.toLowerCase() }
  });
};

module.exports = User;
