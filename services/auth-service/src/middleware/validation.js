// =============================================================================
// VALIDATION MIDDLEWARE - JOI
// =============================================================================
// Lý thuyết: Input Validation
// - NEVER trust user input!
// - Validate TRƯỚC KHI xử lý logic
// - Defense against: SQL Injection, XSS, Invalid data
// =============================================================================

const Joi = require('joi');
const logger = require('../config/logger');

// =============================================================================
// Lý thuyết: Schema-based Validation
// - Định nghĩa schema cho mỗi endpoint
// - Joi: Schema builder cho JavaScript objects
// - Declarative validation (khai báo, không code if/else)
// =============================================================================

// Register schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc',
      'string.max': 'Email tối đa 255 ký tự'
    }),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    // Lý thuyết: Password Complexity
    // - Ít nhất 1 chữ hoa, 1 chữ thường, 1 số
    // - Regex pattern matching
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'))
    .messages({
      'string.min': 'Password phải có ít nhất 8 ký tự',
      'string.max': 'Password tối đa 100 ký tự',
      'any.required': 'Password là bắt buộc',
      'string.pattern.base': 'Password phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số'
    }),

  fullName: Joi.string()
    .min(2)
    .max(255)
    .required()
    .trim()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên tối đa 255 ký tự',
      'any.required': 'Họ tên là bắt buộc'
    }),

  avatarUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': 'Avatar URL không hợp lệ'
    })
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Email không hợp lệ',
      'any.required': 'Email là bắt buộc'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password là bắt buộc'
    })
});

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// Lý thuyết: Higher-order Function
// - Function returns function
// - Tái sử dụng validation logic
// - DRY principle (Don't Repeat Yourself)
// =============================================================================
const validate = (schema) => {
  return (req, res, next) => {
    // Lý thuyết: Joi Validation Options
    // - abortEarly: false = validate tất cả fields, trả về tất cả errors
    // - stripUnknown: true = loại bỏ fields không có trong schema
    // - convert: true = tự động convert types (string -> number)
    const options = {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // Lý thuyết: Error Response Format
      // - Structured error response
      // - Array of field errors
      // - Client có thể hiển thị errors cho từng field
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed:', errors);

      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors
      });
    }

    // Lý thuyết: Data Sanitization
    // - Replace req.body với validated & sanitized value
    // - stripUnknown đã loại bỏ extra fields
    // - trim, lowercase đã được apply
    req.body = value;

    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema
};
