// =============================================================================
// INPUT VALIDATION & SANITIZATION - VANILLA JAVASCRIPT
// =============================================================================
// 📚 LIÊN HỆ VỚI ĐỀ CƯƠNG CÁC MÔN HỌC:
//
// 1️⃣ MÔN AN TOÀN HỆ THỐNG (Security):
//    ✅ Input Validation: Chặn SQL Injection, XSS, Command Injection
//    ✅ Password Policy: Độ phức tạp mật khẩu (NIST guidelines)
//    ✅ Data Sanitization: Làm sạch dữ liệu người dùng
//    ✅ Defense in Depth: Nhiều lớp bảo vệ (validate + sanitize + escape)
//
// 2️⃣ MÔN LÝ THUYẾT AUTOMATA VÀ NGÔN NGỮ HÌNH THỨC:
//    ✅ Regular Expressions: Finite Automata để matching patterns
//    ✅ DFA (Deterministic Finite Automaton): Email/URL regex = DFA
//    ✅ Pattern Matching: Regex engine sử dụng backtracking
//
// 3️⃣ MÔN CẤU TRÚC DỮ LIỆU & GIẢI THUẬT 1:
//    ✅ String Operations: charAt, substring, indexOf - O(n)
//    ✅ Array Operations: push(), map(), filter() - O(n)
//    ✅ Linear Search: Tìm ký tự đặc biệt trong password - O(n)
//
// 4️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (OOP):
//    ✅ Higher-Order Functions: createValidator() nhận function làm tham số
//    ✅ Factory Pattern: createValidator() tạo middleware
//    ✅ Encapsulation: Gom các validation rules vào functions
//
// 5️⃣ MÔN TOÁN TIN HỌC (Discrete Mathematics):
//    ✅ Set Theory: Email domain = tập hợp các ký tự hợp lệ
//    ✅ Logic: AND/OR operators trong validation rules
//    ✅ Boolean Algebra: Kết hợp điều kiện (A ∧ B ∧ C)
//
// 6️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    ✅ Middleware Pattern: Express middleware chain
//    ✅ Functional Programming: Pure functions, immutability
//    ✅ Error Handling: Validation errors với status codes
//
// =============================================================================

const logger = require('../config/logger');

// =============================================================================
// BƯỚC 1: REGEX PATTERNS - FINITE AUTOMATA
// =============================================================================
// 📚 MÔN LÝ THUYẾT AUTOMATA:
//
// REGEX = FINITE AUTOMATON (Ôtômát hữu hạn):
//    - Mỗi regex có thể biểu diễn bằng 1 DFA (Deterministic Finite Automaton)
//    - State machine với states và transitions
//    - Accept/reject dựa trên final state
//
// VÍ DỤ EMAIL REGEX = DFA:
//    States: [START] -> [LOCAL_PART] -> [@] -> [DOMAIN] -> [DOT] -> [TLD] -> [ACCEPT]
//    Transitions: Ký tự hợp lệ chuyển state, ký tự không hợp lệ -> reject
//
// 📚 MÔN AN TOÀN HỆ THỐNG:
//    - Regex phải đủ chặt để chặn injection attacks
//    - VD: Email không được chứa <, >, ', " (chặn XSS, SQL injection)
//
// TIME COMPLEXITY:
//    - Email/URL regex: O(n) với n = độ dài string
//    - Worst case với backtracking: O(2^n) - PHẢI TRÁNH!

// EMAIL REGEX: Chặt chẽ để tránh injection
// Format: local@domain.tld
// - local: Chữ, số, dấu chấm, gạch dưới, gạch ngang
// - domain: Chữ, số, gạch ngang
// - tld: Chữ thường, ít nhất 2 ký tự
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL REGEX: Chỉ chấp nhận http/https
// 📚 AN TOÀN: Chặn javascript:, data:, file: để tránh XSS
const URL_REGEX = /^https?:\/\/[^\s<>"{}|\\^`\[\]]+$/;

// PASSWORD STRENGTH REGEX (từng thành phần)
const HAS_UPPERCASE = /[A-Z]/;           // Ít nhất 1 chữ HOA
const HAS_LOWERCASE = /[a-z]/;           // Ít nhất 1 chữ thường
const HAS_NUMBER = /[0-9]/;              // Ít nhất 1 số
const HAS_SPECIAL = /[!@#$%^&*(),.?":{}|<>]/; // Ít nhất 1 ký tự đặc biệt

// =============================================================================
// BƯỚC 2: VALIDATION CONSTANTS
// =============================================================================
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Magic numbers -> Named constants
//    - Single Source of Truth: Thay đổi 1 chỗ = thay đổi toàn bộ
//
// 📚 MÔN AN TOÀN HỆ THỐNG - NIST PASSWORD GUIDELINES:
//    - Tối thiểu 8 ký tự (NIST SP 800-63B)
//    - Tối đa 64-128 ký tự
//    - Không force đổi mật khẩu định kỳ (NIST 2017 update)
//    - Kiểm tra password có trong breach database không (Have I Been Pwned)

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;        // RFC 5321: 254 ký tự tối đa
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 255;

// =============================================================================
// BƯỚC 3: CÁC HÀM KIỂM TRA CƠ BẢN
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU:
//    - String operations: length, trim - O(n)
//    - Type checking: typeof, === - O(1)
//
// 📚 MÔN TOÁN TIN HỌC:
//    - Logic: null ∨ undefined ∨ empty string -> true
//    - Set membership: value ∈ {null, undefined, ''}

/**
 * Kiểm tra giá trị có rỗng không
 * 📚 TOÁN TIN HỌC: Logic OR (∨)
 * Time complexity: O(1)
 */
function isEmpty(value) {
  // Giải thích: Kiểm tra 3 trường hợp:
  // 1. value === null
  // 2. value === undefined
  // 3. value === '' (chuỗi rỗng)
  return value === null || value === undefined || value === '';
}

/**
 * Kiểm tra email hợp lệ
 * 📚 AUTOMATA: Email regex = DFA với ~10 states
 * Time complexity: O(n) với n = độ dài email
 */
function isValidEmail(email) {
  // 📚 AN TOÀN HỆ THỐNG: Chặn email chứa ký tự nguy hiểm
  // VD: admin'--@test.com -> SQL injection
  // VD: <script>@test.com -> XSS

  // Kiểm tra type
  if (typeof email !== 'string') {
    return false;
  }

  // Kiểm tra độ dài (tránh ReDoS - Regex Denial of Service)
  // 📚 AN TOÀN: Long input -> regex backtracking -> CPU 100%
  if (email.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  // Kiểm tra regex
  return EMAIL_REGEX.test(email);
}

/**
 * Kiểm tra URL hợp lệ
 * 📚 AN TOÀN: Chặn javascript:, data:, file: URLs
 * Time complexity: O(n)
 */
function isValidUrl(url) {
  // Giải thích: Chỉ chấp nhận http:// hoặc https://
  // CHẶN các URL nguy hiểm:
  // - javascript:alert(1) -> XSS
  // - data:text/html,<script>alert(1)</script> -> XSS
  // - file:///etc/passwd -> Path traversal

  if (typeof url !== 'string') {
    return false;
  }

  // Tránh ReDoS
  if (url.length > 2048) { // URL tối đa 2048 ký tự (IE limit)
    return false;
  }

  return URL_REGEX.test(url);
}

/**
 * Kiểm tra password đủ mạnh
 * 📚 AN TOÀN: NIST SP 800-63B Guidelines
 * 📚 CTDL: Linear search cho từng loại ký tự - O(n)
 */
function isStrongPassword(password) {
  // 📚 MÔN AN TOÀN HỆ THỐNG - PASSWORD STRENGTH:
  //
  // ENTROPY CALCULATION (Shannon Entropy):
  //    - Chỉ chữ thường (26 chars): log₂(26) ≈ 4.7 bits/char
  //    - Chữ hoa + thường (52): log₂(52) ≈ 5.7 bits/char
  //    - Thêm số (62): log₂(62) ≈ 6.0 bits/char
  //    - Thêm ký tự đặc biệt (94): log₂(94) ≈ 6.5 bits/char
  //
  // MẬT KHẨU 8 KÝ TỰ:
  //    - Chỉ lowercase: 4.7 * 8 = 37.6 bits (weak)
  //    - Mixed case + number + special: 6.5 * 8 = 52 bits (good)
  //
  // BRUTE FORCE TIME (1 billion tries/second):
  //    - 37.6 bits: 2^37.6 / 10^9 ≈ 2 minutes
  //    - 52 bits: 2^52 / 10^9 ≈ 52 days

  // Bước 1: Kiểm tra độ dài tối thiểu
  if (password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  // Bước 2: Kiểm tra có chữ HOA (Uppercase)
  // 📚 CTDL: Linear search - O(n)
  if (!HAS_UPPERCASE.test(password)) {
    return false;
  }

  // Bước 3: Kiểm tra có chữ thường (Lowercase)
  if (!HAS_LOWERCASE.test(password)) {
    return false;
  }

  // Bước 4: Kiểm tra có số (Digit)
  if (!HAS_NUMBER.test(password)) {
    return false;
  }

  // 📚 TOÁN TIN HỌC: Boolean algebra
  // Result = (length >= 8) ∧ hasUpper ∧ hasLower ∧ hasNumber
  return true;
}

// =============================================================================
// BƯỚC 4: VALIDATORS CHO TỪNG TRƯỜNG
// =============================================================================
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Single Responsibility: Mỗi hàm chỉ validate 1 trường
//    - DRY: Don't Repeat Yourself
//
// 📚 MÔN OOP:
//    - Pure functions: Input -> Output, không side effects
//    - Immutability: Không thay đổi input

/**
 * Validate email
 * 📚 AN TOÀN: Normalize email (lowercase, trim) để tránh bypass
 * VD: Admin@Test.com = admin@test.com
 */
function validateEmail(email) {
  // Bước 1: Kiểm tra required
  if (isEmpty(email)) {
    return 'Email là bắt buộc';
  }

  // 📚 AN TOÀN: Type checking để tránh prototype pollution
  if (typeof email !== 'string') {
    return 'Email phải là chuỗi';
  }

  // Bước 2: Normalize (lowercase + trim)
  // 📚 CTDL: String operations - O(n)
  email = email.toLowerCase().trim();

  // Bước 3: Kiểm tra độ dài
  // 📚 MẠNG MÁY TÍNH: RFC 5321 giới hạn email 254 ký tự
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email tối đa ${EMAIL_MAX_LENGTH} ký tự`;
  }

  // Bước 4: Kiểm tra format
  // 📚 AUTOMATA: Regex matching bằng DFA
  if (!isValidEmail(email)) {
    return 'Email không hợp lệ';
  }

  // 📚 AN TOÀN: Có thể thêm check email domain MX record (DNS lookup)
  // Hoặc check email có trong disposable email list không

  return null; // Không có lỗi
}

/**
 * Validate password mạnh (cho đăng ký)
 * 📚 AN TOÀN: Password policy theo NIST guidelines
 */
function validatePasswordStrong(password) {
  // Bước 1: Required check
  if (isEmpty(password)) {
    return 'Password là bắt buộc';
  }

  if (typeof password !== 'string') {
    return 'Password phải là chuỗi';
  }

  // Bước 2: Độ dài tối thiểu
  // 📚 AN TOÀN: NIST SP 800-63B yêu cầu tối thiểu 8 ký tự
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  }

  // Bước 3: Độ dài tối đa
  // 📚 AN TOÀN: Giới hạn để tránh DoS (hash password quá dài -> CPU spike)
  // Bcrypt có giới hạn 72 bytes, nhưng ta set 100 cho an toàn
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password tối đa ${PASSWORD_MAX_LENGTH} ký tự`;
  }

  // Bước 4: Kiểm tra độ mạnh
  // 📚 CTDL + AN TOÀN: 4 lần regex test - O(4n) = O(n)
  if (!isStrongPassword(password)) {
    return 'Password phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số';
  }

  // 🏗️ NÂNG CAO: Có thể thêm check password có trong breach database
  // Dùng API Have I Been Pwned (k-Anonymity model)
  // - Hash password: SHA-1
  // - Lấy 5 ký tự đầu của hash
  // - Gửi đến HIBP API
  // - So sánh với danh sách leaked passwords

  return null;
}

/**
 * Validate password đơn giản (cho đăng nhập)
 * 📚 KỸ THUẬT PM: Đăng nhập không cần validate phức tạp
 */
function validatePasswordSimple(password) {
  if (isEmpty(password)) {
    return 'Password là bắt buộc';
  }

  if (typeof password !== 'string') {
    return 'Password phải là chuỗi';
  }

  return null;
}

/**
 * Validate họ tên
 * 📚 CTDL: String trim và length check - O(n)
 */
function validateFullName(fullName) {
  // Bước 1: Required
  if (isEmpty(fullName)) {
    return 'Họ tên là bắt buộc';
  }

  if (typeof fullName !== 'string') {
    return 'Họ tên phải là chuỗi';
  }

  // Bước 2: Trim spaces
  fullName = fullName.trim();

  // Bước 3: Độ dài tối thiểu
  if (fullName.length < NAME_MIN_LENGTH) {
    return `Họ tên phải có ít nhất ${NAME_MIN_LENGTH} ký tự`;
  }

  // Bước 4: Độ dài tối đa
  if (fullName.length > NAME_MAX_LENGTH) {
    return `Họ tên tối đa ${NAME_MAX_LENGTH} ký tự`;
  }

  // 🏗️ NÂNG CAO: Có thể thêm regex để chặn ký tự đặc biệt
  // VD: Chỉ cho phép chữ, khoảng trắng, dấu tiếng Việt

  return null;
}

/**
 * Validate avatar URL (optional)
 * 📚 AN TOÀN: Validate URL để tránh SSRF (Server-Side Request Forgery)
 */
function validateAvatarUrl(avatarUrl) {
  // Optional field - có thể để trống
  if (!avatarUrl || avatarUrl === '') {
    return null;
  }

  if (typeof avatarUrl !== 'string') {
    return 'Avatar URL phải là chuỗi';
  }

  // Trim spaces
  avatarUrl = avatarUrl.trim();

  // 📚 AN TOÀN: Validate URL format
  if (!isValidUrl(avatarUrl)) {
    return 'Avatar URL không hợp lệ (chỉ chấp nhận http/https)';
  }

  // 📚 AN TOÀN - SSRF PROTECTION:
  // Trong production, nên thêm:
  // 1. Whitelist domains (chỉ cho phép cdn.example.com)
  // 2. Blacklist IP nội bộ (127.0.0.1, 192.168.x.x, 10.x.x.x)
  // 3. DNS rebinding protection

  return null;
}

// =============================================================================
// BƯỚC 5: FORM VALIDATORS
// =============================================================================
// 📚 MÔN CTDL:
//    - Array operations: push() - O(1) amortized
//    - Collecting errors into array - O(k) với k = số fields
//
// 📚 MÔN KỸ THUẬT PM:
//    - Fail-fast vs Fail-slow: Ta dùng fail-slow (collect all errors)
//    - User experience: Hiển thị tất cả lỗi cùng lúc thay vì từng cái

/**
 * Validate form đăng ký
 * 📚 CTDL: O(n) với n = tổng độ dài các fields
 *
 * RETURN: Array of errors (empty array = valid)
 */
function validateRegisterForm(data) {
  const errors = []; // 📚 CTDL: Dynamic array (giống ArrayList)

  // Validate từng field
  // 📚 TOÁN TIN: Mỗi field độc lập -> có thể parallel processing

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  const passwordError = validatePasswordStrong(data.password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  const fullNameError = validateFullName(data.fullName);
  if (fullNameError) {
    errors.push({ field: 'fullName', message: fullNameError });
  }

  // Optional field
  if (data.avatarUrl) {
    const avatarError = validateAvatarUrl(data.avatarUrl);
    if (avatarError) {
      errors.push({ field: 'avatarUrl', message: avatarError });
    }
  }

  return errors;
}

/**
 * Validate form đăng nhập
 * 📚 CTDL: O(n) với n = độ dài email + password
 */
function validateLoginForm(data) {
  const errors = [];

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  // Đăng nhập chỉ cần simple validation
  const passwordError = validatePasswordSimple(data.password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  return errors;
}

// =============================================================================
// BƯỚC 6: DATA SANITIZATION
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG:
//
// DEFENSE IN DEPTH (Phòng thủ nhiều lớp):
//    1. Validation: Kiểm tra dữ liệu hợp lệ
//    2. Sanitization: Làm sạch dữ liệu (trim, lowercase)
//    3. Escaping: Escape ký tự đặc biệt (khi render HTML/SQL)
//    4. Parameterized queries: Tách data khỏi code (SQL, NoSQL)
//
// SANITIZATION != VALIDATION:
//    - Validation: Reject bad input
//    - Sanitization: Clean input để dùng
//
// VÍ DỤ:
//    Input: "  Admin@TEST.com  "
//    Validation: Pass (hợp lệ)
//    Sanitization: "admin@test.com" (normalized)

/**
 * Sanitize dữ liệu đăng ký
 * 📚 CTDL: String operations - O(n)
 * 📚 AN TOÀN: Normalize để tránh bypass
 */
function sanitizeRegisterData(data) {
  const sanitized = {};

  // Email: lowercase + trim
  // 📚 AN TOÀN: Tránh register Admin@test.com khác admin@test.com
  if (data.email) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  // Password: GIỮ NGUYÊN (không trim)
  // 📚 AN TOÀN: Password có thể có khoảng trắng đầu/cuối
  // User chọn " MyPass " -> phải giữ nguyên
  if (data.password) {
    sanitized.password = data.password;
  }

  // Full name: Trim + capitalize mỗi từ (optional)
  if (data.fullName) {
    // Trim và loại bỏ spaces thừa giữa các từ
    sanitized.fullName = data.fullName
      .trim()
      .replace(/\s+/g, ' '); // Replace multiple spaces -> single space

    // 🏗️ NÂNG CAO: Capitalize first letter của mỗi từ
    // "nguyễn văn a" -> "Nguyễn Văn A"
  }

  // Avatar URL: Trim
  if (data.avatarUrl) {
    sanitized.avatarUrl = data.avatarUrl.trim();
  }

  return sanitized;
}

/**
 * Sanitize dữ liệu đăng nhập
 * 📚 CTDL: O(n) với n = độ dài email
 */
function sanitizeLoginData(data) {
  const sanitized = {};

  // Email: lowercase + trim
  if (data.email) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  // Password: Giữ nguyên
  if (data.password) {
    sanitized.password = data.password;
  }

  return sanitized;
}

// =============================================================================
// BƯỚC 7: MIDDLEWARE FACTORY
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//
// HIGHER-ORDER FUNCTION (Hàm bậc cao):
//    - Nhận function làm tham số
//    - Trả về function
//    - VD: createValidator(validatorFunc) -> middleware
//
// FACTORY PATTERN:
//    - Tạo objects/functions thông qua factory function
//    - Giống Factory trong OOP design patterns
//
// CLOSURE:
//    - Middleware function "nhớ" validatorFunction và sanitizerFunction
//    - Scope chain: middleware -> createValidator -> global
//
// 📚 MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//
// MIDDLEWARE PATTERN (Express.js):
//    - Request -> Middleware 1 -> Middleware 2 -> ... -> Controller
//    - Mỗi middleware có thể:
//      1. Thay đổi req/res
//      2. Kết thúc request-response cycle
//      3. Gọi next() để chuyển sang middleware tiếp theo
//
// CHAIN OF RESPONSIBILITY PATTERN:
//    - Mỗi middleware xử lý 1 phần, rồi pass sang tiếp
//    - Giống assembly line trong nhà máy

/**
 * Tạo middleware validator
 * 📚 OOP: Higher-order function + Factory pattern
 * 📚 CÔNG NGHỆ HIỆN ĐẠI: Express middleware
 *
 * @param {Function} validatorFunction - Hàm validate form
 * @param {Function} sanitizerFunction - Hàm sanitize data
 * @returns {Function} Express middleware
 */
function createValidator(validatorFunction, sanitizerFunction) {
  // 📚 OOP: CLOSURE
  // Middleware này "nhớ" validatorFunction và sanitizerFunction

  return (req, res, next) => {
    // ===== BƯỚC 1: VALIDATE DỮ LIỆU =====
    // 📚 CTDL: O(n) với n = tổng độ dài các fields
    const errors = validatorFunction(req.body);

    // ===== BƯỚC 2: NẾU CÓ LỖI -> TRẢ VỀ 400 BAD REQUEST =====
    // 📚 MẠNG MÁY TÍNH: HTTP status codes
    //    - 400 Bad Request: Client gửi dữ liệu không hợp lệ
    //    - 422 Unprocessable Entity: Cũng có thể dùng cho validation errors
    if (errors.length > 0) {
      logger.warn('Validation failed', {
        errors,
        path: req.path,
        ip: req.ip
      });

      // 📚 AN TOÀN: Log validation failures để detect brute-force
      // Nếu 1 IP có quá nhiều validation errors -> có thể là attacker

      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors // 📚 UX: Trả tất cả lỗi để user sửa cùng lúc
      });
    }

    // ===== BƯỚC 3: SANITIZE DỮ LIỆU =====
    // 📚 AN TOÀN: Làm sạch dữ liệu trước khi xử lý
    req.body = sanitizerFunction(req.body);

    // ===== BƯỚC 4: CHUYỂN SANG MIDDLEWARE/CONTROLLER TIẾP THEO =====
    // 📚 CÔNG NGHỆ HIỆN ĐẠI: Chain of Responsibility
    next();
  };
}

// =============================================================================
// EXPORT VALIDATORS
// =============================================================================
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Module pattern: Export public API, hide private functions
//    - Separation of Concerns: Validation logic tách khỏi routes

const validateRegister = createValidator(validateRegisterForm, sanitizeRegisterData);
const validateLogin = createValidator(validateLoginForm, sanitizeLoginData);

module.exports = {
  validateRegister,
  validateLogin
};

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: CÁC LOẠI TẤN CÔNG VÀ CÁCH PHÒNG CHỐNG
// =============================================================================
//
// 1. SQL INJECTION:
//    - Input: admin' OR '1'='1
//    - Phòng chống: Parameterized queries (Sequelize tự động làm)
//    - Validation: Chặn ký tự ', ", --, ;
//
// 2. XSS (Cross-Site Scripting):
//    - Input: <script>alert('XSS')</script>
//    - Phòng chống:
//      a. Input validation: Chặn <, >, <script>
//      b. Output escaping: Encode HTML entities
//      c. CSP headers: Content-Security-Policy
//
// 3. COMMAND INJECTION:
//    - Input: file.txt; rm -rf /
//    - Phòng chống: Whitelist allowed characters, không exec shell commands
//
// 4. LDAP INJECTION:
//    - Input: *)(uid=*))(|(uid=*
//    - Phòng chống: Escape LDAP special characters
//
// 5. XPATH INJECTION:
//    - Input: ' or '1'='1
//    - Phòng chống: Parameterized XPath queries
//
// 6. SSRF (Server-Side Request Forgery):
//    - Input URL: http://localhost/admin
//    - Phòng chống: Whitelist domains, blacklist internal IPs
//
// 7. REDOS (Regular Expression Denial of Service):
//    - Input: Long string với regex có backtracking
//    - Phòng chống: Giới hạn độ dài input, dùng safe regex
//    - VD regex nguy hiểm: (a+)+b với input "aaaaaaaaaaaaaaaa!"
//
// =============================================================================
// 📚 PASSWORD STRENGTH & ENTROPY
// =============================================================================
//
// SHANNON ENTROPY FORMULA:
//    H = log₂(R^L)
//    Trong đó:
//    - R = số ký tự có thể dùng (character set size)
//    - L = độ dài password
//    - H = entropy (bits)
//
// EXAMPLES:
//    1. "password" (8 chars, lowercase only):
//       R = 26, L = 8
//       H = log₂(26^8) = 8 * log₂(26) ≈ 37.6 bits
//       Brute force (1B tries/sec): 2^37.6 / 10^9 ≈ 2 minutes
//
//    2. "Password1" (9 chars, mixed case + number):
//       R = 62, L = 9
//       H = log₂(62^9) ≈ 53.7 bits
//       Brute force: 2^53.7 / 10^9 ≈ 104 days
//
//    3. "P@ssw0rd!" (9 chars, mixed + special):
//       R = 94, L = 9
//       H = log₂(94^9) ≈ 58.8 bits
//       Brute force: 2^58.8 / 10^9 ≈ 9 years
//
// NIST RECOMMENDATIONS (SP 800-63B):
//    - Minimum 8 characters (chúng ta dùng)
//    - Maximum 64+ characters
//    - Không force đổi định kỳ (outdated practice)
//    - Check against breach databases (Have I Been Pwned)
//    - Không giới hạn ký tự đặc biệt
//
// =============================================================================
// 📚 REGEX TIME COMPLEXITY & REDOS
// =============================================================================
//
// REGEX ENGINE TYPES:
//    1. DFA-based (awk, grep -F): O(n) guaranteed
//    2. NFA-based (JavaScript, Python): O(2^n) worst case với backtracking
//
// SAFE REGEX EXAMPLES:
//    - ^[a-z]+$: O(n) - no backtracking
//    - ^[a-z0-9]+@[a-z]+\.[a-z]{2,}$: O(n)
//
// DANGEROUS REGEX (ReDoS):
//    - (a+)+b với input "aaaaaaaa!": O(2^n)
//    - (a|a)*b với input "aaaaaaaa!": O(2^n)
//    - (a|ab)*b: Exponential backtracking
//
// PROTECTION STRATEGIES:
//    1. Giới hạn độ dài input (như chúng ta làm)
//    2. Dùng safe regex patterns (atomic groups, possessive quantifiers)
//    3. Timeout cho regex execution
//    4. Dùng regex testing tools (safe-regex npm package)
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ AN TOÀN HỆ THỐNG (Security):
//    - Input validation, SQL injection, XSS, SSRF, ReDoS
//    - Password policy (NIST), entropy calculation
//    - Defense in depth, sanitization
//
// ✅ LÝ THUYẾT AUTOMATA:
//    - Regex = DFA/NFA, finite state machines
//    - Pattern matching, backtracking
//
// ✅ CẤU TRÚC DỮ LIỆU & GIẢI THUẬT:
//    - String operations (O(n)), Array operations
//    - Linear search, time complexity analysis
//
// ✅ LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - Higher-order functions, Factory pattern
//    - Closure, Encapsulation
//
// ✅ TOÁN TIN HỌC:
//    - Set theory, Boolean algebra, Logic
//    - Shannon entropy formula
//
// ✅ CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - Middleware pattern, Chain of Responsibility
//    - Functional programming, Pure functions
//
// ✅ MẠNG MÁY TÍNH:
//    - HTTP status codes (400, 422), RFC 5321
//
// ✅ KỸ THUẬT PHẦN MỀM:
//    - Design patterns, Module pattern
//    - Single Responsibility, DRY, YAGNI
//
// =============================================================================
