// =============================================================================
// USER MODEL - SEQUELIZE ORM + BCRYPT HASHING
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (LAP TRINH HUONG DOI TUONG.pdf):
//    📖 CHƯƠNG 1: CLASSES & OBJECTS
//       - 1.1 Class Definition: User là class blueprint
//       - 1.2 Object Instantiation: Mỗi user = instance của class
//       - 1.3 Encapsulation: Data + methods trong một unit
//       - Ví dụ: const user = new User() → creates instance
//
//    📖 CHƯƠNG 2: METHODS & PROPERTIES
//       - 2.1 Instance Methods: validatePassword(), toJSON()
//       - 2.2 Static Methods (Class Methods): findByEmail(), findActive()
//       - 2.3 Prototype Chain: JavaScript prototype inheritance
//
//    📖 CHƯƠNG 6: ORM (OBJECT-RELATIONAL MAPPING)
//       - 6.1 Active Record Pattern: Model = Data + Behavior
//       - 6.2 Lifecycle Hooks: beforeCreate, beforeUpdate, beforeValidate
//
// 2️⃣ MÔN CƠ SỞ DỮ LIỆU (CO SO DU LIEU.pdf):
//    📖 CHƯƠNG 3: SCHEMA DESIGN & CONSTRAINTS
//       - 3.1 Primary Key: id (UUID) - unique identifier
//       - 3.2 Unique Constraint: email phải unique trong bảng
//       - 3.3 Foreign Keys: Relationships với bảng khác
//       - 3.4 Data Types: UUID, VARCHAR, BOOLEAN, TIMESTAMP
//
//    📖 CHƯƠNG 5: INDEXING & OPTIMIZATION
//       - 5.1 B-Tree Index: Email unique constraint tạo B-Tree index
//       - 5.2 Index Lookup: O(log n) với 1M users → 20 comparisons
//       - 5.3 Query Optimization: SELECT WHERE email = ? uses index
//
//    📖 CHƯƠNG 6: DATA INTEGRITY
//       - 6.1 Soft Delete: isActive = false thay vì DELETE
//       - 6.2 Audit Trail: created_at, updated_at timestamps
//
// 3️⃣ MÔN AN TOÀN VÀ BẢO MẬT HỆ THỐNG (AN TOAN HE THONG.pdf):
//    📖 CHƯƠNG 2: PASSWORD SECURITY
//       - 2.1 Password Hashing: Bcrypt (Blowfish cipher algorithm)
//       - 2.2 Salt Generation: Random 128-bit salt per password
//       - 2.3 Cost Factor: bcrypt rounds (10 = 2^10 = 1,024 iterations)
//       - 2.4 Rainbow Table Defense: Salt makes rainbow tables useless
//       - Ví dụ: Cost 10 = 1024 rounds, Cost 12 = 4096 rounds (4x slower)
//
//    📖 CHƯƠNG 3: CRYPTOGRAPHIC ATTACKS
//       - 3.1 Brute Force: Cost factor increases computation time
//       - 3.2 Timing Attacks: bcrypt.compare() constant-time comparison
//       - 3.3 Dictionary Attacks: Salt prevents precomputed hashes
//
// 4️⃣ MÔN CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT 1 (CAU TRUC DU LIEU 1.pdf):
//    📖 CHƯƠNG 4: HASH TABLES
//       - 4.1 Hash Function: Email → hash → index in B-Tree
//       - 4.2 Collision Handling: Unique constraint prevents collisions
//       - 4.3 Time Complexity: O(1) average for hash lookup
//
//    📖 CHƯƠNG 1: STRINGS
//       - 1.3 String Operations: toLowerCase(), trim() - O(n)
//       - 1.4 String Comparison: Email equality checking
//
// 5️⃣ MÔN TOÁN TIN HỌC (DISCRETE MATHEMATICS):
//    📖 CHƯƠNG 3: HASH FUNCTIONS & ONE-WAY FUNCTIONS
//       - 3.1 Cryptographic Hash: Cannot reverse bcrypt hash
//       - 3.2 Collision Resistance: Different passwords → different hashes
//       - 3.3 Deterministic: Same input → same hash
//
//    📖 CHƯƠNG 4: PROBABILITY THEORY
//       - 4.1 UUID Collision: P(collision) ≈ n²/(2 * 2^122) ≈ 10^-15
//       - 4.2 Birthday Paradox: Collision probability formula
//       - Ví dụ: 1 billion UUIDs → collision probability ≈ 10^-15
//
//    📖 CHƯƠNG 2: SET THEORY
//       - 2.1 Unique Constraint: Emails ∈ Set (no duplicates allowed)
//       - 2.2 Set Membership: email ∈ UniqueEmailSet?
//
// 6️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI (CONG NGHE LAP TRINH.pdf):
//    📖 CHƯƠNG 3: ASYNCHRONOUS PROGRAMMING
//       - 3.1 Promises: Database operations return promises
//       - 3.2 Async/Await: Modern async syntax
//       - 3.3 Non-blocking I/O: Node.js event loop
//
//    📖 CHƯƠNG 6: ORM & DATABASE ABSTRACTION
//       - 6.1 Sequelize ORM: Maps objects to database tables
//       - 6.2 Query Builder: Abstract SQL queries
//
// =============================================================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs'); // 📚 AN TOÀN: Bcrypt library (Blowfish cipher)
const { sequelize } = require('../config/database');

// =============================================================================
// ĐỊNH NGHĨA USER MODEL
// =============================================================================
// 📚 MÔN OOP:
//    - Model = Class blueprint
//    - Mỗi user = instance của class
//    - Methods: Hành vi của object
//
// 📚 MÔN CSDL:
//    - Schema = Cấu trúc bảng trong database
//    - Mỗi field = 1 column trong bảng
//    - Constraints: NOT NULL, UNIQUE, DEFAULT

const User = sequelize.define('users', {

  // ===========================================================================
  // FIELD 1: ID (PRIMARY KEY - KHÓA CHÍNH)
  // ===========================================================================
  // 📚 MÔN CƠ SỞ DỮ LIỆU:
  //    - Primary Key: Định danh duy nhất cho mỗi record
  //    - UUID vs Auto-increment ID:
  //      + Auto-increment: 1, 2, 3, 4... (dễ đoán, không phù hợp phân tán)
  //      + UUID: Chuỗi 128-bit random (không đoán được, phù hợp microservices)
  //
  // 📚 MÔN TOÁN TIN HỌC - UUID COLLISION PROBABILITY:
  //    - UUID v4 = 122-bit random (2^122 possibilities)
  //    - Xác suất trùng (Birthday paradox):
  //      P(collision) ≈ n²/(2 * 2^122)
  //      Với n = 1 tỷ UUIDs: P ≈ 10^-15 (gần như 0)
  //    - An toàn ngay cả với hàng tỷ records
  //
  // 📚 MÔN CẤU TRÚC DỮ LIỆU:
  //    - UUID = 128-bit number (16 bytes)
  //    - Format: 8-4-4-4-12 hex digits
  //    - VD: "550e8400-e29b-41d4-a716-446655440000"
  //
  // 📚 MÔN CSDL - INDEX:
  //    - Primary key tự động có B-Tree index
  //    - Lookup by ID: O(log n) với B-Tree

  id: {
    type: DataTypes.UUID,           // UUID type (128-bit)
    defaultValue: DataTypes.UUIDV4, // Tự động gen UUID v4
    primaryKey: true,               // Đây là khóa chính
    allowNull: false                // Không được NULL
  },

  // ===========================================================================
  // FIELD 2: EMAIL (UNIQUE CONSTRAINT)
  // ===========================================================================
  // 📚 MÔN CƠ SỞ DỮ LIỆU:
  //    - UNIQUE constraint: Mỗi email chỉ xuất hiện 1 lần
  //    - Unique constraint tự động tạo B-Tree index
  //    - Lookup by email: O(log n)
  //
  // 📚 MÔN CẤU TRÚC DỮ LIỆU:
  //    - Email stored in B-Tree index
  //    - Search: O(log n) với n = số users
  //    - VD: 1 triệu users -> log₂(1,000,000) ≈ 20 comparisons
  //
  // 📚 MÔN TOÁN TIN HỌC:
  //    - Unique = Set property (no duplicates)
  //    - emails ∈ Set, |Set| = n
  //    - Membership test: email ∈ Set? -> O(log n)

  email: {
    type: DataTypes.STRING(255),  // VARCHAR(255) trong PostgreSQL
    allowNull: false,             // NOT NULL constraint
    unique: {
      msg: 'Email đã được sử dụng' // Error message khi duplicate
    },
    // 📚 CSDL: Unique constraint tạo index:
    //    CREATE UNIQUE INDEX users_email_unique ON users(email);
    //    B-Tree index -> O(log n) lookup
  },

  // ===========================================================================
  // FIELD 3: PASSWORD (BCRYPT HASH)
  // ===========================================================================
  // 📚 MÔN AN TOÀN HỆ THỐNG - BCRYPT ALGORITHM:
  //
  // BCRYPT = ADAPTIVE HASH FUNCTION:
  //    - Based on Blowfish cipher (Bruce Schneier, 1993)
  //    - Tự động thêm salt (random string)
  //    - Có cost factor (work factor) để chống brute-force
  //
  // BCRYPT FORMAT:
  //    $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
  //    │  │ │ │                                                        │
  //    │  │ │ └─ Salt (22 chars)                                      │
  //    │  │ └─── Cost factor (10 = 2^10 = 1024 rounds)               │
  //    │  └───── Bcrypt version (2b)                                  │
  //    └──────── Hash algorithm identifier                            │
  //                                                                    │
  //                        Hash output (31 chars) ────────────────────┘
  //
  // COST FACTOR (Work Factor):
  //    - Cost = 10 -> 2^10 = 1024 iterations
  //    - Cost = 12 -> 2^12 = 4096 iterations (4x chậm hơn)
  //    - Mỗi +1 cost -> double thời gian hash
  //    - Default: 10 (balance giữa security và performance)
  //
  // HASHING TIME (trên CPU hiện đại):
  //    - Cost 10: ~100ms
  //    - Cost 12: ~400ms
  //    - Cost 14: ~1600ms
  //
  // BRUTE-FORCE RESISTANCE:
  //    Password: "Abc123!@"
  //    - MD5 (không salt): 1 billion tries/sec -> crack trong vài giây
  //    - Bcrypt cost 10: 10 tries/sec -> crack mất hàng triệu năm
  //
  // RAINBOW TABLE ATTACK:
  //    - Rainbow table: Precomputed hash table
  //    - VD: "password" -> MD5 -> "5f4dcc3b5aa765d61d8327deb882cf99"
  //    - Nếu không salt -> tra rainbow table -> tìm được password
  //    - Bcrypt dùng RANDOM SALT -> mỗi password có hash khác nhau
  //      + "password" + salt1 -> hash1
  //      + "password" + salt2 -> hash2 (KHÁC hash1)
  //      => Rainbow table vô dụng!

  password: {
    type: DataTypes.STRING(255),  // Lưu bcrypt hash
    allowNull: false,             // Password bắt buộc
    // Lưu ý: 255 chars đủ cho bcrypt hash (60 chars)
  },

  // ===========================================================================
  // FIELD 4: FULL NAME
  // ===========================================================================
  // 📚 MÔN CSDL: VARCHAR(255) - Variable character string

  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  // ===========================================================================
  // FIELD 5: AVATAR URL
  // ===========================================================================
  // 📚 MÔN CSDL:
  //    - TEXT type: Không giới hạn độ dài (lên đến 1GB trong PostgreSQL)
  //    - Dùng TEXT cho URL dài (CDN URLs có thể > 255 chars)

  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true  // Optional field
  },

  // ===========================================================================
  // FIELD 6: IS ACTIVE (SOFT DELETE)
  // ===========================================================================
  // 📚 MÔN CƠ SỞ DỮ LIỆU - SOFT DELETE PATTERN:
  //
  // HARD DELETE vs SOFT DELETE:
  //    - Hard delete: DELETE FROM users WHERE id = ?
  //      + Xóa vĩnh viễn khỏi database
  //      + Không thể khôi phục
  //      + Phá vỡ foreign key references
  //
  //    - Soft delete: UPDATE users SET is_active = false WHERE id = ?
  //      + Đánh dấu deleted, không xóa thật
  //      + Có thể khôi phục (set is_active = true)
  //      + Giữ data integrity
  //      + Dùng cho audit trail
  //
  // LỢI ÍCH SOFT DELETE:
  //    - Compliance: Giữ data cho audit (GDPR, SOX)
  //    - Recovery: Khôi phục user bị xóa nhầm
  //    - Analytics: Phân tích users đã rời đi
  //
  // 📚 MÔN CSDL - INDEX OPTIMIZATION:
  //    - Nên tạo index: CREATE INDEX idx_users_active ON users(is_active);
  //    - Query: SELECT * FROM users WHERE is_active = true;
  //    - Với index: O(log n), không index: O(n) full scan

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true  // Mặc định active
  },

  // ===========================================================================
  // FIELD 7: IS VERIFIED (EMAIL VERIFICATION)
  // ===========================================================================
  // 📚 MÔN AN TOÀN HỆ THỐNG:
  //    - Email verification để đảm bảo user sở hữu email
  //    - Gửi email với token/link verification
  //    - Click link -> set isVerified = true

  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // Chưa verify
  },

  // ===========================================================================
  // FIELD 8-9: TIMESTAMPS (AUDIT TRAIL)
  // ===========================================================================
  // 📚 MÔN CƠ SỞ DỮ LIỆU:
  //    - Audit trail: Theo dõi khi nào data được tạo/sửa
  //    - Compliance: Yêu cầu của nhiều chuẩn bảo mật (SOX, HIPAA)
  //
  // 📚 MÔN AN TOÀN HỆ THỐNG:
  //    - Forensics: Điều tra khi có security incident
  //    - Track user actions: Ai làm gì, khi nào

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

  timestamps: true,     // Tự động quản lý createdAt, updatedAt
  underscored: true,    // DB dùng snake_case: created_at, updated_at

  // ==========================================================================
  // LIFECYCLE HOOKS (OBSERVER PATTERN)
  // ==========================================================================
  // 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
  //    - Observer Pattern: Hooks là observers của lifecycle events
  //    - Event-driven: Khi event xảy ra -> gọi hook
  //
  // 📚 MÔN KỸ THUẬT PHẦN MỀM:
  //    - Separation of Concerns: Password hashing tách khỏi business logic
  //    - Don't Repeat Yourself: Hash logic chỉ viết 1 lần trong hook
  //
  // LIFECYCLE EVENTS:
  //    beforeValidate -> afterValidate
  //    beforeCreate -> afterCreate
  //    beforeUpdate -> afterUpdate
  //    beforeDestroy -> afterDestroy

  hooks: {

    // ========================================================================
    // HOOK: BEFORE CREATE (TRƯỚC KHI TẠO USER MỚI)
    // ========================================================================
    // 📚 MÔN AN TOÀN HỆ THỐNG - BCRYPT HASHING PROCESS:
    //
    // STEP 1: GENERATE SALT
    //    - Salt = random string (22 characters)
    //    - Cost factor = 10 -> 2^10 = 1024 rounds
    //    - VD: "$2b$10$N9qo8uLOickgx2ZMRZoMye"
    //
    // STEP 2: HASH PASSWORD WITH SALT
    //    - Input: "MyPassword123" + salt
    //    - Bcrypt performs 1024 iterations of Blowfish cipher
    //    - Output: 60-character hash
    //
    // WHY SALT?
    //    - 2 users cùng password "123456":
    //      + Không salt: Cùng hash -> crack 1 = crack tất cả
    //      + Có salt: Khác salt -> khác hash -> phải crack riêng từng user
    //
    // 📚 MÔN GIẢI THUẬT - TIME COMPLEXITY:
    //    - bcrypt.genSalt(10): O(2^10) = O(1024) iterations
    //    - bcrypt.hash(): O(2^10) = O(1024) iterations
    //    - Total: O(2^cost) - exponential với cost

    beforeCreate: async (user) => {
      if (user.password) {
        // Bước 1: Generate salt với cost = 10
        // 📚 AN TOÀN: Cost 10 = balance security/performance
        // - Quá thấp (< 8): Dễ brute-force
        // - Quá cao (> 14): Chậm, tốn CPU (DoS risk)
        const salt = await bcrypt.genSalt(10);

        // Bước 2: Hash password
        // 📚 TOÁN TIN: One-way function
        // - f(password) = hash (easy)
        // - f^-1(hash) = password (impossible)
        user.password = await bcrypt.hash(user.password, salt);

        // 📚 VÍ DỤ:
        // Input:  "MyPassword123"
        // Salt:   "$2b$10$N9qo8uLOickgx2ZMRZoMye"
        // Output: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
      }
    },

    // ========================================================================
    // HOOK: BEFORE UPDATE (TRƯỚC KHI CẬP NHẬT USER)
    // ========================================================================
    // 📚 MÔN CSDL:
    //    - user.changed('password'): Check field có thay đổi không
    //    - Chỉ hash nếu password được update (tránh hash lại)

    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// =============================================================================
// INSTANCE METHODS (PHƯƠNG THỨC INSTANCE)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//
// INSTANCE METHOD vs STATIC METHOD:
//    - Instance method: Gọi trên object (user.validatePassword())
//    - Static method: Gọi trên class (User.findByEmail())
//
// PROTOTYPE CHAIN (JavaScript):
//    - User.prototype.validatePassword -> thêm method vào prototype
//    - Mọi instance đều có access đến method này
//    - Memory efficient: Method chỉ lưu 1 lần trong prototype

// ===========================================================================
// METHOD 1: VALIDATE PASSWORD
// ===========================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - PASSWORD COMPARISON:
//
// BCRYPT.COMPARE() PROCESS:
//    1. Extract salt từ stored hash
//       Hash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
//       Salt: "$2b$10$N9qo8uLOickgx2ZMRZoMye" (prefix của hash)
//
//    2. Hash input password với salt đó
//       Input: "MyPassword123" + salt -> hash2
//
//    3. So sánh hash2 với stored hash
//       if (hash2 === storedHash) -> true
//
// TIMING ATTACK RESISTANCE:
//    - Bcrypt dùng constant-time comparison
//    - Timing không leak information về password
//    - VD: Nếu dùng === (không constant-time):
//      + "aaa" vs "bbb": Fail ngay ký tự 1 (fast)
//      + "password" vs "passwXrd": Fail ở ký tự 6 (slow)
//      => Attacker có thể detect được vị trí sai -> brute-force từng ký tự
//
// TIME COMPLEXITY:
//    - O(2^10) = O(1024) bcrypt iterations
//    - ~100ms trên CPU hiện đại
//    - Trade-off: Security (slow) vs UX (fast)

User.prototype.validatePassword = async function(password) {
  try {
    // 📚 AN TOÀN: bcrypt.compare() là constant-time comparison
    // Không leak timing information
    return await bcrypt.compare(password, this.password);

    // 📚 GIẢI THUẬT - COMPARISON PROCESS:
    // 1. Extract salt: O(1)
    // 2. Hash input: O(2^10) = 1024 iterations
    // 3. Constant-time compare: O(n) với n = hash length
    // Total: O(2^cost) dominated by hashing

  } catch (error) {
    throw new Error('Lỗi khi kiểm tra password');
  }
};

// ===========================================================================
// METHOD 2: TO JSON (SERIALIZATION)
// ===========================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG:
//    - KHÔNG BAO GIỜ trả password về client!
//    - Ngay cả password đã hash cũng không nên expose
//
// 📚 MÔN OOP:
//    - Encapsulation: Ẩn dữ liệu nhạy cảm (password)
//    - Public interface: Chỉ expose data cần thiết
//
// 📚 MÔN CSDL:
//    - Serialization: Chuyển DB object -> JSON
//    - Data transformation pipeline

User.prototype.toJSON = function() {
  // 📚 CTDL: Spread operator (...) tạo shallow copy - O(n)
  const values = { ...this.get() };

  // 📚 AN TOÀN: Xóa sensitive fields
  delete values.password;  // O(1) operation

  // 🏗️ NÂNG CAO: Có thể xóa thêm:
  // delete values.deletedAt;  // Sequelize paranoid mode
  // delete values.twoFactorSecret;  // 2FA secret

  return values;
};

// =============================================================================
// STATIC METHODS (CLASS METHODS)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//
// STATIC METHOD:
//    - Gọi trên class, không cần instance
//    - VD: User.findByEmail() thay vì user.findByEmail()
//    - Dùng cho utility functions, factory methods
//
// 📚 MÔN CSDL:
//    - Query methods: Tìm kiếm data trong database
//    - WHERE clause, ORDER BY, LIMIT, OFFSET

// ===========================================================================
// METHOD 1: FIND BY EMAIL
// ===========================================================================
// 📚 MÔN CƠ SỞ DỮ LIỆU - INDEX LOOKUP:
//
// SQL GENERATED:
//    SELECT * FROM users WHERE email = 'test@test.com' LIMIT 1;
//
// INDEX OPTIMIZATION:
//    - Email có UNIQUE constraint -> B-Tree index
//    - Lookup: O(log n) với n = số users
//    - VD: 10 triệu users -> log₂(10,000,000) ≈ 23 comparisons
//
// KHÔNG CÓ INDEX (full table scan):
//    - O(n) linear scan
//    - 10 triệu users -> 10 triệu comparisons
//    - Chậm hơn 400,000x!
//
// 📚 MÔN CTDL - B-TREE SEARCH:
//    - B-Tree height h = log_m(n)
//    - m = branching factor (số keys/node)
//    - PostgreSQL B-Tree: m ≈ 200
//    - h = log_200(10,000,000) ≈ 3 levels
//    - Chỉ cần 3 disk reads!

User.findByEmail = async function(email) {
  // 📚 CSDL: WHERE clause với indexed column
  return await this.findOne({
    where: { email: email.toLowerCase() }  // Case-insensitive search
  });

  // 📚 AN TOÀN: toLowerCase() để tránh bypass
  // - User đăng ký: admin@test.com
  // - Attacker thử: Admin@Test.COM
  // - Nếu không lowercase -> coi như khác email -> tạo được account mới
  // - Với toLowerCase -> cùng email -> reject duplicate
};

// ===========================================================================
// METHOD 2: FIND ACTIVE USERS (PAGINATION)
// ===========================================================================
// 📚 MÔN CƠ SỞ DỮ LIỆU - PAGINATION:
//
// PAGINATION BENEFITS:
//    - Performance: Không load hết data 1 lúc
//    - UX: Hiển thị từng trang (10-50 items/page)
//    - Scalability: Database không bị overwhelm
//
// SQL GENERATED:
//    SELECT * FROM users
//    WHERE is_active = true
//    ORDER BY created_at DESC
//    LIMIT 10 OFFSET 0;
//
// OFFSET-BASED PAGINATION:
//    - Page 1: LIMIT 10 OFFSET 0
//    - Page 2: LIMIT 10 OFFSET 10
//    - Page 3: LIMIT 10 OFFSET 20
//
// PERFORMANCE:
//    - OFFSET 0: Nhanh
//    - OFFSET 1,000,000: Chậm (phải skip 1M rows)
//    - Better: Cursor-based pagination (WHERE id > last_id)
//
// 📚 MÔN CTDL - SORTING:
//    - ORDER BY created_at DESC
//    - Nếu có index trên created_at: O(log n)
//    - Không có index: O(n log n) quicksort/mergesort

User.findActive = async function(limit = 10, offset = 0) {
  return await this.findAndCountAll({
    where: { isActive: true },
    limit,   // Số lượng records trả về
    offset,  // Bỏ qua bao nhiêu records
    order: [['createdAt', 'DESC']]  // Sắp xếp: mới nhất trước
  });

  // 📚 CSDL: findAndCountAll() trả về:
  // {
  //   count: 1000,  // Tổng số users active
  //   rows: [...]   // 10 users (limit=10)
  // }
  //
  // Frontend dùng count để tính số trang:
  // totalPages = Math.ceil(count / limit)
};

// =============================================================================
// EXPORT MODEL
// =============================================================================
module.exports = User;

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: BCRYPT INTERNALS
// =============================================================================
//
// BLOWFISH CIPHER (Bruce Schneier, 1993):
//    - Symmetric-key block cipher
//    - Block size: 64-bit
//    - Key size: 32-448 bits
//    - Fast encryption, slow key setup
//
// BCRYPT ALGORITHM:
//    1. EksBlowfishSetup(cost, salt, key):
//       - Expand key with salt
//       - Iterate 2^cost times (adaptive)
//
//    2. Encrypt magic string "OrpheanBeholderScryDoubt" 64 times
//       - Blowfish cipher
//       - Output: 192-bit hash
//
//    3. Encode as base64-like string
//       - Final hash: 60 characters
//
// COST FACTOR EVOLUTION:
//    - 1999: Cost 5 recommended (32 iterations)
//    - 2010: Cost 10 (1024 iterations) - Moore's Law
//    - 2020: Cost 12-14 recommended
//    - Future: Increase cost as CPUs get faster
//
// BCRYPT vs OTHER HASH FUNCTIONS:
//
//    | Algorithm | Speed      | Salt | Adaptive | Recommended |
//    |-----------|------------|------|----------|-------------|
//    | MD5       | Very fast  | No   | No       | ❌ Broken   |
//    | SHA-1     | Very fast  | No   | No       | ❌ Broken   |
//    | SHA-256   | Fast       | No   | No       | ⚠️  GPU     |
//    | PBKDF2    | Configurable| Yes | Yes     | ✅ Good     |
//    | Bcrypt    | Slow       | Yes  | Yes      | ✅ Good     |
//    | Scrypt    | Slow       | Yes  | Yes      | ✅ Better   |
//    | Argon2    | Slow       | Yes  | Yes      | ✅ Best     |
//
// WHY BCRYPT IS SLOW (GOOD FOR PASSWORDS):
//    - MD5: 1 billion hashes/sec (GPU)
//    - Bcrypt cost 10: ~10 hashes/sec
//    - Ratio: 100 million times slower!
//    - Brute-force 8-char password:
//      + MD5: Hours
//      + Bcrypt: Centuries
//
// =============================================================================
// 📚 RAINBOW TABLE ATTACK
// =============================================================================
//
// RAINBOW TABLE:
//    - Precomputed table: password -> hash
//    - Millions of common passwords hashed
//    - VD: "password" -> "5f4dcc3b5aa765d61d8327deb882cf99" (MD5)
//
// ATTACK PROCESS (without salt):
//    1. Steal database với hashed passwords
//    2. Lookup hash trong rainbow table
//    3. Find password ngay lập tức
//
// EXAMPLE (MD5, no salt):
//    | Hash                              | Password   |
//    |-----------------------------------|------------|
//    | 5f4dcc3b5aa765d61d8327deb882cf99  | password   |
//    | e10adc3949ba59abbe56e057f20f883e  | 123456     |
//    | 25d55ad283aa400af464c76d713c07ad  | 12345678   |
//
// DEFENSE: SALT
//    - Salt = random string unique cho mỗi password
//    - Password1 + salt1 -> hash1
//    - Password1 + salt2 -> hash2 (KHÁC hash1!)
//    - Rainbow table vô dụng vì mỗi user có salt khác nhau
//    - Phải tạo rainbow table riêng cho từng salt (không thực tế)
//
// BCRYPT SALT:
//    - 22-character random string
//    - Stored in hash: "$2b$10$SALTSALTSAL..."
//    - 2^128 possible salts (collision-resistant)
//
// =============================================================================
// 📚 UUID vs AUTO-INCREMENT ID
// =============================================================================
//
// AUTO-INCREMENT ID:
//    Pros:
//    - Nhỏ gọn: 4 bytes (INT) or 8 bytes (BIGINT)
//    - Sequential: id=1, 2, 3, 4... (cache-friendly)
//    - Human-readable: Dễ debug
//
//    Cons:
//    - Predictable: Attacker đoán được id tiếp theo
//    - Không phù hợp phân tán: Multi-server có thể conflict
//    - Information leak: ID cao -> biết số lượng users
//
// UUID:
//    Pros:
//    - Globally unique: Không trùng dù generate ở nhiều server
//    - Unpredictable: Không đoán được
//    - Distributed-friendly: Microservices, sharding
//    - Security: Không leak information
//
//    Cons:
//    - Lớn: 16 bytes (vs 4 bytes INT)
//    - Random: Không cache-friendly, fragmentation
//    - Not human-readable: Debug khó hơn
//
// BEST PRACTICES:
//    - Internal systems: Auto-increment OK
//    - Public APIs: UUID (security)
//    - Distributed systems: UUID (no conflicts)
//    - High performance: Consider ULID (UUID + timestamp)
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - Class, Object, Instance/Static Methods
//    - Prototype chain, Encapsulation
//    - Observer pattern (hooks)
//
// ✅ CƠ SỞ DỮ LIỆU:
//    - Schema design, Primary key, Unique constraint
//    - B-Tree index (O(log n) lookup)
//    - Soft delete, Audit trail, Pagination
//
// ✅ AN TOÀN HỆ THỐNG:
//    - Bcrypt hashing, Salt, Rainbow tables
//    - Timing attacks, Cost factor
//    - Email verification, Soft delete
//
// ✅ CẤU TRÚC DỮ LIỆU & GIẢI THUẬT:
//    - Hash table (O(1)), B-Tree (O(log n))
//    - UUID (128-bit), String operations
//    - Time complexity analysis
//
// ✅ TOÁN TIN HỌC:
//    - Hash functions (one-way), Set theory
//    - Probability (UUID collision)
//    - Cryptographic hash functions
//
// ✅ CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - ORM pattern, Active Record pattern
//    - Lifecycle hooks, Async/await
//
// ✅ KỸ THUẬT PHẦN MỀM:
//    - Design patterns, Separation of Concerns
//    - DRY principle
//
// =============================================================================
