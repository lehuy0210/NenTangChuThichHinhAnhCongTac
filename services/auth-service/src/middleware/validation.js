// =============================================================================
// VALIDATION MIDDLEWARE - VANILLA JAVASCRIPT (KHÔNG DÙNG JOI)
// =============================================================================
// Giải thích cho sinh viên:
// Validation = Kiểm tra dữ liệu người dùng gửi lên có đúng format không
// VÍ DỤ: Email phải có @, password phải đủ mạnh, tên không được để trống
// LÝ DO: Không bao giờ tin tưởng dữ liệu người dùng! (Security #1 Rule)
// =============================================================================

const logger = require('../config/logger');

// =============================================================================
// BƯỚC 1: CÁC HÀM KIỂM TRA CƠ BẢN (HELPER FUNCTIONS)
// =============================================================================
// Giải thích: Mỗi hàm kiểm tra 1 điều kiện đơn giản

// Kiểm tra có giá trị không (không null, undefined, chuỗi rỗng)
function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

// Kiểm tra email có hợp lệ không
function isValidEmail(email) {
  // Giải thích: Dùng regex (regular expression) để kiểm tra format email
  // Format: ten@domain.com
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Kiểm tra URL có hợp lệ không
function isValidUrl(url) {
  // Giải thích: Kiểm tra URL bắt đầu bằng http:// hoặc https://
  const urlRegex = /^https?:\/\/.+/;
  return urlRegex.test(url);
}

// Kiểm tra password có đủ mạnh không
function isStrongPassword(password) {
  // Giải thích: Password mạnh phải có:
  // - Ít nhất 8 ký tự
  // - Ít nhất 1 chữ HOA (A-Z)
  // - Ít nhất 1 chữ thường (a-z)
  // - Ít nhất 1 số (0-9)

  if (password.length < 8) {
    return false; // Quá ngắn
  }

  // Kiểm tra có chữ HOA không
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Kiểm tra có chữ thường không
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Kiểm tra có số không
  if (!/[0-9]/.test(password)) {
    return false;
  }

  return true; // Đủ mạnh
}

// =============================================================================
// BƯỚC 2: HÀM VALIDATE TỪNG TRƯỜNG (FIELD VALIDATORS)
// =============================================================================
// Giải thích: Mỗi hàm validate 1 trường cụ thể và trả về lỗi nếu có

// Validate email
function validateEmail(email) {
  // Kiểm tra rỗng
  if (isEmpty(email)) {
    return 'Email là bắt buộc';
  }

  // Chuyển về chữ thường và bỏ khoảng trắng
  email = email.toLowerCase().trim();

  // Kiểm tra độ dài
  if (email.length > 255) {
    return 'Email tối đa 255 ký tự';
  }

  // Kiểm tra format
  if (!isValidEmail(email)) {
    return 'Email không hợp lệ';
  }

  return null; // Không có lỗi
}

// Validate password (cho đăng ký - yêu cầu mạnh)
function validatePasswordStrong(password) {
  // Kiểm tra rỗng
  if (isEmpty(password)) {
    return 'Password là bắt buộc';
  }

  // Kiểm tra độ dài tối thiểu
  if (password.length < 8) {
    return 'Password phải có ít nhất 8 ký tự';
  }

  // Kiểm tra độ dài tối đa
  if (password.length > 100) {
    return 'Password tối đa 100 ký tự';
  }

  // Kiểm tra độ mạnh
  if (!isStrongPassword(password)) {
    return 'Password phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số';
  }

  return null; // Không có lỗi
}

// Validate password (cho đăng nhập - chỉ cần có giá trị)
function validatePasswordSimple(password) {
  if (isEmpty(password)) {
    return 'Password là bắt buộc';
  }
  return null;
}

// Validate full name
function validateFullName(fullName) {
  // Kiểm tra rỗng
  if (isEmpty(fullName)) {
    return 'Họ tên là bắt buộc';
  }

  // Bỏ khoảng trắng thừa
  fullName = fullName.trim();

  // Kiểm tra độ dài tối thiểu
  if (fullName.length < 2) {
    return 'Họ tên phải có ít nhất 2 ký tự';
  }

  // Kiểm tra độ dài tối đa
  if (fullName.length > 255) {
    return 'Họ tên tối đa 255 ký tự';
  }

  return null; // Không có lỗi
}

// Validate avatar URL (optional - không bắt buộc)
function validateAvatarUrl(avatarUrl) {
  // Nếu không có hoặc là chuỗi rỗng -> OK (optional)
  if (!avatarUrl || avatarUrl === '') {
    return null;
  }

  // Nếu có giá trị -> kiểm tra URL hợp lệ
  if (!isValidUrl(avatarUrl)) {
    return 'Avatar URL không hợp lệ';
  }

  return null; // Không có lỗi
}

// =============================================================================
// BƯỚC 3: HÀM VALIDATE TOÀN BỘ FORM (FORM VALIDATORS)
// =============================================================================
// Giải thích: Validate tất cả các trường trong form và trả về danh sách lỗi

// Validate form đăng ký
function validateRegisterForm(data) {
  const errors = []; // Mảng chứa các lỗi

  // Validate email
  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  // Validate password
  const passwordError = validatePasswordStrong(data.password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  // Validate full name
  const fullNameError = validateFullName(data.fullName);
  if (fullNameError) {
    errors.push({ field: 'fullName', message: fullNameError });
  }

  // Validate avatar URL (optional)
  if (data.avatarUrl) {
    const avatarError = validateAvatarUrl(data.avatarUrl);
    if (avatarError) {
      errors.push({ field: 'avatarUrl', message: avatarError });
    }
  }

  return errors; // Trả về mảng lỗi (rỗng = không có lỗi)
}

// Validate form đăng nhập
function validateLoginForm(data) {
  const errors = []; // Mảng chứa các lỗi

  // Validate email
  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  // Validate password (đơn giản - chỉ cần có giá trị)
  const passwordError = validatePasswordSimple(data.password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  return errors; // Trả về mảng lỗi
}

// =============================================================================
// BƯỚC 4: HÀM SANITIZE DỮ LIỆU (LÀM SẠCH DỮ LIỆU)
// =============================================================================
// Giải thích: Sau khi validate, cần làm sạch dữ liệu:
// - Bỏ khoảng trắng thừa (trim)
// - Chuyển email về chữ thường
// - Loại bỏ các trường không cần thiết

function sanitizeRegisterData(data) {
  const sanitized = {};

  // Email: lowercase + trim
  if (data.email) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  // Password: giữ nguyên (không trim vì có thể có khoảng trắng)
  if (data.password) {
    sanitized.password = data.password;
  }

  // Full name: trim
  if (data.fullName) {
    sanitized.fullName = data.fullName.trim();
  }

  // Avatar URL: trim (optional)
  if (data.avatarUrl) {
    sanitized.avatarUrl = data.avatarUrl.trim();
  }

  return sanitized;
}

function sanitizeLoginData(data) {
  const sanitized = {};

  // Email: lowercase + trim
  if (data.email) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  // Password: giữ nguyên
  if (data.password) {
    sanitized.password = data.password;
  }

  return sanitized;
}

// =============================================================================
// BƯỚC 5: MIDDLEWARE FACTORY (TẠO MIDDLEWARE VALIDATE)
// =============================================================================
// Giải thích: Hàm này nhận vào 1 validator function và trả về middleware
// Middleware = hàm xử lý request trước khi đến controller

function createValidator(validatorFunction, sanitizerFunction) {
  // Trả về middleware function
  return (req, res, next) => {
    // Bước 1: Validate dữ liệu
    const errors = validatorFunction(req.body);

    // Bước 2: Nếu có lỗi -> trả về lỗi cho client
    if (errors.length > 0) {
      logger.warn('Validation failed', { errors });

      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors
      });
    }

    // Bước 3: Nếu không có lỗi -> sanitize dữ liệu
    req.body = sanitizerFunction(req.body);

    // Bước 4: Chuyển sang middleware/controller tiếp theo
    next();
  };
}

// =============================================================================
// EXPORT VALIDATORS
// =============================================================================
// Giải thích: Export các validator để dùng trong routes
// Cách dùng trong routes:
//   router.post('/register', validateRegister, registerController);

const validateRegister = createValidator(validateRegisterForm, sanitizeRegisterData);
const validateLogin = createValidator(validateLoginForm, sanitizeLoginData);

module.exports = {
  validateRegister,
  validateLogin
};

// =============================================================================
// VÍ DỤ SỬ DỤNG
// =============================================================================
// Trong routes/auth.js:
//
// const { validateRegister, validateLogin } = require('../middleware/validation');
//
// router.post('/register', validateRegister, async (req, res) => {
//   // req.body đã được validate và sanitize
//   const { email, password, fullName } = req.body;
//   // ... xử lý logic đăng ký
// });
//
// router.post('/login', validateLogin, async (req, res) => {
//   // req.body đã được validate và sanitize
//   const { email, password } = req.body;
//   // ... xử lý logic đăng nhập
// });
