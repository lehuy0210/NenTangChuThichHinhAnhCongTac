// =============================================================================
// USER MODEL - MODEL NGƯỜI DÙNG (ĐƠN GIẢN HÓA)
// =============================================================================
// Giải thích cho sinh viên:
// Model = Định nghĩa cấu trúc dữ liệu của User trong database
// Giống như "bản thiết kế" của bảng users trong PostgreSQL
//
// Model này định nghĩa:
// - User có những trường gì? (id, email, password, ...)
// - Mỗi trường có kiểu dữ liệu gì? (string, number, boolean, ...)
// - Có ràng buộc gì? (không được null, phải unique, ...)
// - Có xử lý gì trước khi lưu? (hash password, ...)
// =============================================================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs'); // Thư viện hash password (bảo mật)
const { sequelize } = require('../config/database');

// =============================================================================
// ĐỊNH NGHĨA MODEL USER
// =============================================================================
// Giải thích: Tạo model User với Sequelize
// - Tham số 1: Tên bảng trong database ('users')
// - Tham số 2: Định nghĩa các cột (fields/columns)
// - Tham số 3: Các tùy chọn (options)

const User = sequelize.define('users', {

  // ===========================================================================
  // TRƯỜNG 1: ID (KHÓA CHÍNH)
  // ===========================================================================
  // Giải thích: ID duy nhất cho mỗi user
  // - Kiểu UUID (Universal Unique Identifier): Chuỗi random 36 ký tự
  // - Ví dụ: "550e8400-e29b-41d4-a716-446655440000"
  // - Lợi ích: Không đoán được, không bị trùng (dù có nhiều server)
  // - primaryKey: Đây là khóa chính (mỗi user có 1 ID duy nhất)

  id: {
    type: DataTypes.UUID,           // Kiểu dữ liệu: UUID
    defaultValue: DataTypes.UUIDV4, // Tự động tạo UUID version 4
    primaryKey: true,               // Đây là khóa chính
    allowNull: false                // Không được null (bắt buộc)
  },

  // ===========================================================================
  // TRƯỜNG 2: EMAIL
  // ===========================================================================
  // Giải thích: Email của user (dùng để đăng nhập)
  // - Kiểu STRING(255): Chuỗi tối đa 255 ký tự
  // - unique: Không được trùng (mỗi email chỉ đăng ký 1 lần)
  // - allowNull: false = bắt buộc phải có

  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'Email đã được sử dụng' // Thông báo lỗi nếu trùng
    }
  },

  // ===========================================================================
  // TRƯỜNG 3: PASSWORD
  // ===========================================================================
  // Giải thích: Password đã được hash (mã hóa)
  // QUAN TRỌNG: KHÔNG BAO GIỜ lưu password dạng text thuần!
  //
  // VÍ DỤ:
  // - Password gốc: "MyPassword123"
  // - Password hash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  // - Hash là 1 chiều: Không thể chuyển ngược từ hash về password gốc
  // - Khi login: Hash password nhập vào rồi so sánh với hash trong DB

  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  // ===========================================================================
  // TRƯỜNG 4: FULL NAME (HỌ TÊN)
  // ===========================================================================
  // Giải thích: Họ tên đầy đủ của user

  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  // ===========================================================================
  // TRƯỜNG 5: AVATAR URL (ẢNH ĐẠI DIỆN)
  // ===========================================================================
  // Giải thích: Link đến ảnh đại diện của user
  // - allowNull: true = không bắt buộc (user có thể không có avatar)

  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true // Không bắt buộc
  },

  // ===========================================================================
  // TRƯỜNG 6: IS ACTIVE (TRẠNG THÁI HOẠT ĐỘNG)
  // ===========================================================================
  // Giải thích: User có đang hoạt động không?
  // - true: User bình thường, có thể đăng nhập
  // - false: User bị vô hiệu hóa (banned), không thể đăng nhập
  // - Lợi ích: Không cần xóa user, chỉ cần set isActive = false

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // Mặc định là đang hoạt động
  },

  // ===========================================================================
  // TRƯỜNG 7: IS VERIFIED (ĐÃ XÁC THỰC EMAIL CHƯA)
  // ===========================================================================
  // Giải thích: User đã xác thực email chưa?
  // - true: Đã click vào link xác thực trong email
  // - false: Chưa xác thực
  // - Có thể dùng để yêu cầu verify trước khi dùng đầy đủ tính năng

  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Mặc định chưa xác thực
  },

  // ===========================================================================
  // TRƯỜNG 8-9: CREATED AT, UPDATED AT (TIMESTAMPS)
  // ===========================================================================
  // Giải thích: Tự động lưu thời gian tạo và cập nhật
  // - createdAt: Thời điểm user được tạo (đăng ký)
  // - updatedAt: Thời điểm user được cập nhật lần cuối
  // - Sequelize tự động quản lý 2 trường này

  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Mặc định là thời điểm hiện tại
  },

  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  // ==========================================================================
  // OPTIONS (TÙY CHỌN)
  // ==========================================================================

  timestamps: true,     // Tự động quản lý createdAt, updatedAt
  underscored: true,    // Dùng snake_case trong DB (created_at)

  // ==========================================================================
  // HOOKS (LIFECYCLE CALLBACKS)
  // ==========================================================================
  // Giải thích: Hooks = Các hàm chạy tự động trước/sau các thao tác
  // - beforeCreate: Chạy TRƯỚC KHI tạo user mới
  // - beforeUpdate: Chạy TRƯỚC KHI cập nhật user
  //
  // Dùng để: Hash password trước khi lưu vào database

  hooks: {

    // Hook 1: TRƯỚC KHI TẠO USER MỚI
    beforeCreate: async (user) => {
      // Nếu có password -> hash nó
      if (user.password) {
        // Bước 1: Tạo salt (chuỗi random thêm vào password)
        const salt = await bcrypt.genSalt(10); // 10 = độ phức tạp

        // Bước 2: Hash password với salt
        user.password = await bcrypt.hash(user.password, salt);

        // VÍ DỤ:
        // - Input: "MyPassword123"
        // - Output: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
      }
    },

    // Hook 2: TRƯỚC KHI CẬP NHẬT USER
    beforeUpdate: async (user) => {
      // Chỉ hash nếu password được thay đổi
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// =============================================================================
// INSTANCE METHODS (PHƯƠNG THỨC CỦA OBJECT USER)
// =============================================================================
// Giải thích: Các hàm có thể gọi trên mỗi user instance
// VÍ DỤ: const user = await User.findByPk(id);
//        const isValid = await user.validatePassword('MyPassword123');

// ===== METHOD 1: VALIDATE PASSWORD =====
// Giải thích: Kiểm tra password nhập vào có đúng không
// - Input: Password dạng text thuần
// - Output: true (đúng) hoặc false (sai)
// - Cách hoạt động: Hash password nhập vào và so sánh với hash trong DB

User.prototype.validatePassword = async function(password) {
  try {
    // bcrypt.compare() tự động hash password và so sánh
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error('Lỗi khi kiểm tra password');
  }
};

// ===== METHOD 2: TO JSON =====
// Giải thích: Chuyển user thành JSON, LOẠI BỎ password (bảo mật)
// Khi trả về user cho client, KHÔNG được trả về password!

User.prototype.toJSON = function() {
  // Lấy tất cả giá trị của user
  const values = { ...this.get() };

  // Xóa password khỏi object
  delete values.password;

  // Trả về object không có password
  return values;
};

// =============================================================================
// CLASS METHODS (PHƯƠNG THỨC STATIC CỦA CLASS USER)
// =============================================================================
// Giải thích: Các hàm có thể gọi trực tiếp trên User class
// VÍ DỤ: const user = await User.findByEmail('test@test.com');

// ===== METHOD 1: TÌM USER THEO EMAIL =====
// Giải thích: Tìm user bằng email (dùng khi đăng nhập)

User.findByEmail = async function(email) {
  return await this.findOne({
    where: { email: email.toLowerCase() } // Chuyển về chữ thường
  });
};

// ===== METHOD 2: TÌM USER ĐANG HOẠT ĐỘNG =====
// Giải thích: Lấy danh sách user có isActive = true

User.findActive = async function(limit = 10, offset = 0) {
  return await this.findAndCountAll({
    where: { isActive: true },
    limit,  // Lấy tối đa bao nhiêu users
    offset, // Bỏ qua bao nhiêu users (cho phân trang)
    order: [['createdAt', 'DESC']] // Sắp xếp theo thời gian tạo (mới nhất trước)
  });
};

// =============================================================================
// EXPORT MODEL
// =============================================================================
// Giải thích: Export User model để dùng ở các file khác

module.exports = User;

// =============================================================================
// VÍ DỤ SỬ DỤNG
// =============================================================================
// const User = require('./models/User');
//
// // Tạo user mới
// const user = await User.create({
//   email: 'test@test.com',
//   password: 'MyPassword123', // Sẽ tự động hash
//   fullName: 'Nguyen Van A'
// });
//
// // Tìm user theo email
// const foundUser = await User.findByEmail('test@test.com');
//
// // Kiểm tra password
// const isValid = await foundUser.validatePassword('MyPassword123');
// console.log(isValid); // true
