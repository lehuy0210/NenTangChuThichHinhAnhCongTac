// =============================================================================
// WINSTON LOGGER CONFIGURATION
// =============================================================================
// Lý thuyết: Structured Logging
// - Log với format chuẩn (JSON)
// - Dễ parse và analyze (ELK stack, Splunk)
// - Log levels: error, warn, info, debug
// =============================================================================

const winston = require('winston');

// Lý thuyết: Log Levels (theo thứ tự nghiêm trọng)
// - error (0): Errors cần xử lý ngay
// - warn (1): Cảnh báo, có thể gây vấn đề
// - info (2): Thông tin quan trọng
// - http (3): HTTP requests
// - debug (4): Chi tiết cho development
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Lý thuyết: Environment-based Configuration
// - Production: Chỉ log info trở lên
// - Development: Log tất cả (debug)
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Lý thuyết: Log Format
// - timestamp: Khi nào xảy ra
// - level: Mức độ nghiêm trọng
// - message: Nội dung log
// - metadata: Context bổ sung
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

  // Add error stack trace
  winston.format.errors({ stack: true }),

  // Lý thuyết: Colorize trong console
  // - Dễ đọc khi debug
  // - Chỉ enable cho console, không cho file
  winston.format.colorize({ all: true }),

  // Lý thuyết: Printf format
  // - Custom format string
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      return `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    }
  )
);

// Lý thuyết: Multiple Transports
// - Console: Development debugging
// - File: Production logging (error.log, combined.log)
// - External: Sentry, Datadog, CloudWatch (trong production thực tế)
const transports = [
  // Console transport
  new winston.transports.Console(),

  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;
