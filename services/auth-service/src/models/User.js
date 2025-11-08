// =============================================================================
// USER MODEL - Sequelize Model
// =============================================================================
// Lý thuyết: MVC Pattern (Model-View-Controller)
// - Model: Định nghĩa data structure và business logic
// - View: Presentation layer (Frontend)
// - Controller: Xử lý requests và responses
// =============================================================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

// =============================================================================
// Lý thuyết: ORM Model Definition
// - DataTypes: Ánh xạ SQL types sang JavaScript types
// - Validations: Data validation trước khi lưu vào DB
// - Hooks: Functions chạy trước/sau các operations (beforeCreate, afterUpdate)
// - Instance methods: Functions trên từng instance
// - Class methods: Static functions trên model
// =============================================================================

const User = sequelize.define('users', {
  // ==========================================================================
  // PRIMARY KEY
  // Lý thuyết: UUID vs Auto-increment Integer
  // - UUID: Globally unique, không đoán được, tốt cho distributed systems
  // - Integer: Nhỏ hơn, nhanh hơn, nhưng có thể bị enumerate attack
  // ==========================================================================
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },

  // ==========================================================================
  // EMAIL
  // Lý thuyết: Data Validation
  // - validate.isEmail: Format validation
  // - unique: Database constraint (không trùng)
  // - allowNull: false = NOT NULL constraint
  // ==========================================================================
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'Email đã được sử dụng'
    },
    validate: {
      isEmail: {
        msg: 'Email không hợp lệ'
      },
      notEmpty: {
        msg: 'Email không được để trống'
      }
    }
  },

  // ==========================================================================
  // PASSWORD
  // Lý thuyết: Password Security
  // - KHÔNG BAO GIỜ lưu plain password!
  // - Dùng bcrypt hash (one-way hashing)
  // - Salt: Random string thêm vào password trước khi hash
  // - Bcrypt automatically includes salt trong hash
  // - Cost factor (rounds): 10 = 2^10 iterations (cân bằng security vs performance)
  // ==========================================================================
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [8, 100],
        msg: 'Password phải từ 8-100 ký tự'
      },
      notEmpty: {
        msg: 'Password không được để trống'
      }
    }
  },

  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Họ tên không được để trống'
      },
      len: {
        args: [2, 255],
        msg: 'Họ tên phải từ 2-255 ký tự'
      }
    }
  },

  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Avatar URL không hợp lệ'
      }
    }
  },

  // ==========================================================================
  // FLAGS
  // Lý thuyết: Boolean Flags
  // - isActive: Soft disable user (không xóa hẳn)
  // - isVerified: Email verification status
  // ==========================================================================
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // ==========================================================================
  // TIMESTAMPS
  // Lý thuyết: Audit Trail
  // - createdAt: Khi nào user được tạo
  // - updatedAt: Khi nào user được cập nhật lần cuối
  // - Sequelize tự động manage nếu timestamps: true
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
  // Model options
  timestamps: true,
  underscored: true,

  // ==========================================================================
  // HOOKS (Lifecycle Callbacks)
  // Lý thuyết: Database Triggers ở application level
  // - beforeCreate: Chạy trước khi INSERT
  // - beforeUpdate: Chạy trước khi UPDATE
  // - afterCreate: Chạy sau khi INSERT
  // ==========================================================================
  hooks: {
    // Hash password trước khi tạo user mới
    beforeCreate: async (user) => {
      if (user.password) {
        // Lý thuyết: Bcrypt Hashing
        // - genSalt(10): Tạo random salt với cost factor 10
        // - hash(password, salt): Hash password với salt
        // - Result: $2b$10$salt$hash (60 characters)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },

    // Hash password trước khi update (nếu password thay đổi)
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// =============================================================================
// INSTANCE METHODS
// Lý thuyết: Object-Oriented Programming
// - Methods trên từng instance của User
// - this = instance hiện tại
// =============================================================================

// Lý thuyết: Password Verification
// - So sánh plain password với hashed password
// - bcrypt.compare() tự động extract salt từ hash và compare
// - Constant-time comparison (chống timing attacks)
User.prototype.validatePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error('Password validation failed');
  }
};

// Convert user to JSON (loại bỏ sensitive data)
// Lý thuyết: Data Sanitization
// - Không bao giờ return password ra ngoài
// - Principle of Least Privilege
User.prototype.toJSON = function() {
  const values = { ...this.get() };

  // Remove sensitive fields
  delete values.password;

  return values;
};

// =============================================================================
// CLASS METHODS (Static Methods)
// Lý thuyết: Factory Pattern
// - Static methods trên User class
// - Không cần instance
// =============================================================================

// Find user by email
User.findByEmail = async function(email) {
  return await this.findOne({
    where: { email: email.toLowerCase() }
  });
};

// Find active users only
User.findActive = async function(limit = 10, offset = 0) {
  return await this.findAndCountAll({
    where: { isActive: true },
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
};

// =============================================================================
// ASSOCIATIONS
// Lý thuyết: Foreign Key Relationships
// - hasMany: One-to-Many (1 user có nhiều images)
// - belongsTo: Many-to-One (nhiều images thuộc 1 user)
// - belongsToMany: Many-to-Many (users <-> roles qua user_roles)
// =============================================================================

// User.hasMany(Image, { foreignKey: 'userId', as: 'images' });
// User.belongsToMany(Role, { through: 'user_roles', as: 'roles' });

// Export model
module.exports = User;
