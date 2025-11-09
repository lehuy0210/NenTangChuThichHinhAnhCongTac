// =============================================================================
// LOGGER - GHI LOG HỆ THỐNG (VANILLA JAVASCRIPT)
// =============================================================================
// 📚 LIÊN HỆ VỚI CÁC MÔN HỌC:
//
// 1️⃣ MÔN HỆ ĐIỀU HÀNH (Operating Systems):
//    - File I/O operations: appendFileSync(), mkdirSync()
//    - Process management: process.env.NODE_ENV
//    - System calls: fs operations là wrapper của system calls
//
// 2️⃣ MÔN KỸ THUẬT PHẦN MỀM (Software Engineering):
//    - Logging pattern: Ghi lại hoạt động hệ thống để debug và audit
//    - Separation of Concerns: Tách logging logic ra file riêng
//    - DRY principle: Tái sử dụng hàm log()
//
// 3️⃣ MÔN HỆ THỐNG PHÂN TÁN (Distributed Systems):
//    - Centralized Logging: Trong microservices, cần tập trung log từ nhiều services
//    - Log aggregation: File log này sẽ được gửi đến ELK stack (Elasticsearch, Logstash, Kibana)
//    - Traceability: Theo dõi request qua nhiều services
//
// 🏗️ TRONG KIẾN TRÚC MICROSERVICES:
//    - Mỗi service có logger riêng
//    - Logs được gửi đến central logging system (ELK, Grafana Loki)
//    - Log format chuẩn để dễ parse và filter
// =============================================================================

const fs = require('fs'); // Module File System - tương tác với hệ điều hành
const path = require('path'); // Module xử lý đường dẫn file

// =============================================================================
// BƯỚC 1: ĐỊNH NGHĨA LOG LEVELS (MỨC ĐỘ QUAN TRỌNG)
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU (Data Structures):
//    - Sử dụng Object để map level name -> priority number
//    - Priority càng thấp = càng quan trọng (ERROR = 0 quan trọng nhất)
//
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Logging levels theo chuẩn Syslog (RFC 5424)
//    - ERROR < WARN < INFO < DEBUG

const LOG_LEVELS = {
  ERROR: 0,  // Lỗi nghiêm trọng - phải xử lý ngay
  WARN: 1,   // Cảnh báo - có thể gây vấn đề
  INFO: 2,   // Thông tin bình thường
  DEBUG: 3   // Chi tiết cho developer (chỉ dùng khi development)
};

// =============================================================================
// BƯỚC 2: XÁC ĐỊNH MỨC ĐỘ LOG THEO ENVIRONMENT
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    - Environment variables: process.env (do OS cung cấp)
//    - Development vs Production environment
//
// 📚 MÔN KỸ THUẬT PHẦN MỀM:
//    - Configuration management
//    - Environment-based behavior

function getCurrentLogLevel() {
  const env = process.env.NODE_ENV || 'development';

  // Development: Log tất cả (DEBUG)
  // Production: Chỉ log INFO trở lên (bỏ DEBUG để giảm I/O)
  return env === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
}

// =============================================================================
// BƯỚC 3: TẠO TIMESTAMP
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU:
//    - String manipulation: padStart() để format số
//
// 📚 MÔN HỆ THỐNG PHÂN TÁN:
//    - Timestamp quan trọng để đồng bộ logs từ nhiều services
//    - UTC timezone để tránh timezone confusion

function getTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// =============================================================================
// BƯỚC 4: FORMAT MESSAGE
// =============================================================================
// 📚 MÔN LẬP TRÌNH WEB:
//    - JSON.stringify() để serialize object thành string
//    - Structured logging: Log có format chuẩn
//
// 📚 MÔN HỆ THỐNG PHÂN TÁN:
//    - Trong microservices, nên thêm: serviceId, requestId, userId
//    - Format chuẩn để ELK stack dễ parse

function formatMessage(level, message, metadata) {
  const timestamp = getTimestamp();

  let formattedMessage = `[${timestamp}] [${level}] ${message}`;

  // Thêm metadata nếu có (object chứa thông tin bổ sung)
  if (metadata && Object.keys(metadata).length > 0) {
    formattedMessage += ' ' + JSON.stringify(metadata);
  }

  return formattedMessage;
}

// =============================================================================
// BƯỚC 5: GHI LOG VÀO FILE
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    - File I/O: fs.appendFileSync() là synchronous system call
//    - Blocking I/O: Đợi ghi xong mới tiếp tục (trade-off: đơn giản nhưng chậm)
//    - Best practice: Dùng async I/O (fs.appendFile) để non-blocking
//
// 📚 MÔN KIẾN TRÚC MÁY TÍNH:
//    - Disk I/O là bottleneck (chậm hơn RAM 10000x)
//    - Buffer: OS sẽ buffer data trước khi ghi xuống disk
//
// 🏗️ TRONG PRODUCTION:
//    - Dùng log rotation để tránh file quá lớn
//    - Gửi logs đến central logging (Kafka -> Logstash -> Elasticsearch)

function writeToFile(filename, message) {
  try {
    // Tạo thư mục logs nếu chưa có
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true }); // Tạo nested directories
    }

    const filePath = path.join(logsDir, filename);

    // Append vào file (không overwrite)
    fs.appendFileSync(filePath, message + '\n', 'utf8');

  } catch (error) {
    // Nếu không ghi được file -> chỉ log ra console
    // Tránh infinite loop nếu logger bị lỗi
    console.error('Logger error:', error.message);
  }
}

// =============================================================================
// BƯỚC 6: HÀM LOG CHÍNH
// =============================================================================
// 📚 MÔN GIẢI THUẬT:
//    - Filter algorithm: Chỉ log nếu level >= currentLevel
//    - Time complexity: O(1)
//
// 📚 MÔN HỆ THỐNG PHÂN TÁN:
//    - Trong microservices: Mỗi log nên có requestId để trace request qua nhiều services
//    - Correlation ID pattern

function log(level, levelName, message, metadata = {}) {
  const currentLevel = getCurrentLogLevel();

  // Filter: Chỉ log nếu mức độ quan trọng >= currentLevel
  if (level > currentLevel) {
    return; // Skip log này
  }

  const formattedMessage = formatMessage(levelName, message, metadata);

  // Output 1: Console (stdout/stderr)
  console.log(formattedMessage);

  // Output 2: File combined.log (tất cả logs)
  writeToFile('combined.log', formattedMessage);

  // Output 3: File error.log (chỉ errors)
  if (level === LOG_LEVELS.ERROR) {
    writeToFile('error.log', formattedMessage);
  }

  // 🏗️ TODO: Trong production, gửi logs đến Kafka
  // - Topic: 'auth-service-logs'
  // - Kafka consumer sẽ forward đến Elasticsearch
  // - Ví dụ: kafkaProducer.send({ topic: 'logs', messages: [formattedMessage] })
}

// =============================================================================
// BƯỚC 7: TẠO LOGGER OBJECT
// =============================================================================
// 📚 MÔN OOP (Object-Oriented Programming):
//    - Encapsulation: Gom các hàm log vào 1 object
//    - Interface: Cung cấp API đơn giản cho user

const logger = {
  error: (message, metadata) => {
    log(LOG_LEVELS.ERROR, 'ERROR', message, metadata);
  },

  warn: (message, metadata) => {
    log(LOG_LEVELS.WARN, 'WARN', message, metadata);
  },

  info: (message, metadata) => {
    log(LOG_LEVELS.INFO, 'INFO', message, metadata);
  },

  debug: (message, metadata) => {
    log(LOG_LEVELS.DEBUG, 'DEBUG', message, metadata);
  }
};

module.exports = logger;

// =============================================================================
// 🏗️ KIẾN TRÚC MICROSERVICES & LOGGING
// =============================================================================
//
// Trong hệ thống microservices lớn:
//
// 1. MỖI SERVICE CÓ LOGGER RIÊNG:
//    - Auth Service: logs/auth-service/
//    - Image Service: logs/image-service/
//    - Annotation Service: logs/annotation-service/
//
// 2. CENTRAL LOGGING PIPELINE:
//    ┌─────────────┐
//    │ Auth Service│──┐
//    └─────────────┘  │
//    ┌─────────────┐  │    ┌───────┐    ┌──────────┐    ┌──────────────┐
//    │Image Service│──┼───▶│ Kafka │───▶│ Logstash │───▶│Elasticsearch │
//    └─────────────┘  │    └───────┘    └──────────┘    └──────────────┘
//    ┌─────────────┐  │                                          │
//    │ Chat Service│──┘                                          ▼
//    └─────────────┘                                      ┌─────────┐
//                                                         │ Kibana  │
//                                                         │(Search) │
//                                                         └─────────┘
//
// 3. LOAD BALANCER & LOGGING:
//    - Load balancer (NGINX) cũng tạo access logs
//    - Dùng để phân tích traffic, detect DDoS
//
// 4. LOG AGGREGATION BENEFITS:
//    - Tìm kiếm logs từ tất cả services ở 1 nơi
//    - Trace request qua nhiều services (dùng correlation ID)
//    - Alerting: Tự động cảnh báo khi có nhiều errors
//
// =============================================================================
// 📚 TỔNG KẾT CÁC MÔN HỌC LIÊN QUAN
// =============================================================================
//
// ✅ HỆ ĐIỀU HÀNH: File I/O, Process, Environment variables
// ✅ KỸ THUẬT PHẦN MỀM: Design patterns, Separation of concerns
// ✅ HỆ THỐNG PHÂN TÁN: Central logging, Kafka, ELK stack
// ✅ CẤU TRÚC DỮ LIỆU: Object, String manipulation
// ✅ GIẢI THUẬT: Filter algorithm
// ✅ OOP: Encapsulation, Interface
// ✅ KIẾN TRÚC MÁY TÍNH: Disk I/O, Buffering
//
// =============================================================================
