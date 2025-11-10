// =============================================================================
// LOGGER - GHI LOG HỆ THỐNG (SỬ DỤNG THƯ VIỆN WINSTON)
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN HỆ ĐIỀU HÀNH (HE DIEU HANH.pdf):
//    📖 CHƯƠNG 3: QUẢN LÝ FILE VÀ I/O
//       - 3.1 File System: Winston ghi log vào nhiều file (transports)
//       - 3.2 File Operations: Async I/O để không block event loop
//       - 3.3 System Calls: fs.createWriteStream() → write() system call
//       - Ví dụ: Winston dùng stream để ghi log asynchronously
//
//    📖 CHƯƠNG 2: QUẢN LÝ PROCESS
//       - 2.1 Process Environment: NODE_ENV quyết định log level
//       - 2.2 Environment Variables: Cấu hình logging từ .env
//
// 2️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 2: BỐN TÍNH CHẤT OOP
//       - 2.1 Encapsulation: Winston logger object đóng gói tất cả logic
//       - 2.2 Inheritance: Có thể extend Winston với custom transports
//       - 2.4 Abstraction: Ẩn đi complexity của file I/O, formatting
//
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.1 Singleton Pattern: Winston.createLogger() tạo 1 instance duy nhất
//       - 9.2 Factory Pattern: winston.format.combine() factory các formatters
//       - 9.4 Observer Pattern: Multiple transports subscribe to log events
//
// 3️⃣ MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    📖 CHƯƠNG 3: KIẾN TRÚC ĐA LỚP
//       - 3.2 Kiến trúc Multi-tier (Microservices):
//         + Winston cho phép gửi logs đến nhiều destinations (Console, File, HTTP)
//         + Production: Logs → Kafka → Logstash → Elasticsearch (ELK Stack)
//       - 3.3 Central Logging Pattern:
//         + HTTP transport: Gửi logs đến central logging server
//         + Correlation ID: Trace request qua nhiều services
//
// 4️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    📖 CHƯƠNG 1: XU HƯỚNG LẬP TRÌNH HIỆN ĐẠI
//       - 1.1 JSON Format: Winston.format.json() serialize logs
//       - 1.2 Structured Logging: Machine-readable log format
//       - 1.5 NPM Ecosystem: Sử dụng thư viện open-source Winston
//
// 🎯 MỤC ĐÍCH FILE NÀY:
//    - Sử dụng Winston library (industry standard) thay vì viết từ đầu
//    - Sinh viên học được cách dùng thư viện chuyên nghiệp
//    - Production-ready: Async I/O, multiple transports, log rotation
//    - Mapping chi tiết đến CHƯƠNG của đề cương môn học
//
// 🆚 SO SÁNH VANILLA VS WINSTON:
//    VANILLA (branch khác):
//    - ✅ Hiểu rõ cách hoạt động bên trong
//    - ✅ Không phụ thuộc thư viện
//    - ❌ Phức tạp khi scale (log rotation, multiple outputs)
//    - ❌ Blocking I/O (fs.appendFileSync)
//
//    WINSTON (branch này):
//    - ✅ Production-ready, battle-tested
//    - ✅ Async I/O (non-blocking)
//    - ✅ Nhiều tính năng: rotation, transports, formatting
//    - ❌ Phụ thuộc external library
//    - ❌ Phải học API của Winston
// =============================================================================

const winston = require('winston');
const path = require('path');

// =============================================================================
// BƯỚC 1: ĐỊNH NGHĨA LOG LEVELS (Winston built-in)
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU 1:
//    📖 CHƯƠNG 4: BẢNG BĂM (HASH TABLES)
//       - Winston levels = Object (Hash Table):
//         { error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6 }
//       - Truy cập O(1) để check priority
//
// 💡 WINSTON LEVELS (theo chuẩn npm):
//    - error: 0   (Lỗi nghiêm trọng - VD: database crash, payment failed)
//    - warn: 1    (Cảnh báo - VD: deprecated API, slow query)
//    - info: 2    (Thông tin - VD: user login, order created)
//    - http: 3    (HTTP requests - VD: GET /api/users 200 OK)
//    - verbose: 4 (Chi tiết - VD: config loaded, service started)
//    - debug: 5   (Debug - VD: variable values, function calls)
//    - silly: 6   (Rất chi tiết - VD: loop iterations)

// Winston đã có built-in levels, không cần define lại
// Nhưng có thể custom nếu cần:
// const customLevels = {
//   levels: { error: 0, warn: 1, info: 2, debug: 3 },
//   colors: { error: 'red', warn: 'yellow', info: 'green', debug: 'blue' }
// };

// =============================================================================
// BƯỚC 2: ĐỊNH NGHĨA LOG FORMATS (CÁC ĐỊNH DẠNG LOG)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.2 Factory Pattern: winston.format.combine() là factory
//         + Tạo ra formatter object từ nhiều format components
//         + Ví dụ: combine(timestamp, errors, json) → composite formatter
//
// 📚 MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    📖 CHƯƠNG 1: XU HƯỚNG LẬP TRÌNH HIỆN ĐẠI
//       - 1.1 JSON Format: Machine-readable, dễ parse
//       - 1.2 Timestamp: ISO 8601 standard (2025-11-10T14:30:45.123Z)

// Format cho file logs (JSON format - dễ parse bởi ELK stack)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Log stack trace cho errors
  winston.format.json() // Chuyển thành JSON string
);

// Format cho console (human-readable với màu sắc)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(), // Thêm màu sắc (error=red, warn=yellow, info=green)
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `[${timestamp}] [${level}] ${message}`;

    // Thêm metadata nếu có (VD: userId, requestId)
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// =============================================================================
// BƯỚC 3: ĐỊNH NGHĨA TRANSPORTS (CÁC ĐIỂM ĐẾN CỦA LOG)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.4 Observer Pattern: Transports = Observers
//         + Logger = Subject phát ra log events
//         + Transports = Observers nhận log events và xử lý
//         + VD: Console transport, File transport, HTTP transport
//
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    📖 CHƯƠNG 3: QUẢN LÝ FILE VÀ I/O
//       - 3.2 File Operations: Winston dùng fs.createWriteStream()
//         + Async I/O: Không block Node.js event loop
//         + Buffering: OS buffer data trước khi flush xuống disk
//       - 3.4 File Rotation: Tự động rotate logs khi file quá lớn
//
// 💡 WINSTON TRANSPORTS:
//    1. Console Transport: Ghi ra stdout/stderr (development)
//    2. File Transport: Ghi vào file (combined.log - tất cả logs)
//    3. File Transport: Ghi vào file (error.log - chỉ errors)
//    4. HTTP Transport (optional): Gửi logs đến remote server

const logsDir = path.join(__dirname, '..', '..', 'logs');

const transports = [
  // Transport 1: Console (stdout) - cho development
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }),

  // Transport 2: File combined.log (tất cả logs)
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    level: 'debug', // Log tất cả levels
    maxsize: 5242880, // 5MB (khi đạt size này, Winston tự động rotate)
    maxFiles: 5, // Giữ tối đa 5 files (combined.log, combined.log.1, ..., combined.log.4)
    tailable: true // File mới nhất luôn là combined.log
  }),

  // Transport 3: File error.log (chỉ errors)
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    format: fileFormat,
    level: 'error', // Chỉ log errors
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })

  // 🏗️ TODO: Thêm HTTP Transport cho production
  // new winston.transports.Http({
  //   host: 'logstash.example.com',
  //   port: 8080,
  //   path: '/logs',
  //   level: 'info'
  // })
];

// =============================================================================
// BƯỚC 4: TẠO WINSTON LOGGER INSTANCE
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.1 Singleton Pattern:
//         + winston.createLogger() tạo 1 instance duy nhất
//         + Tất cả module trong app dùng chung instance này
//         + Lợi ích: Consistent logging, centralized configuration
//
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    📖 CHƯƠNG 2: QUẢN LÝ PROCESS
//       - 2.2 Environment Variables: NODE_ENV quyết định log level
//
// 💡 WINSTON CONFIGURATION:
//    - level: Minimum level to log (debug < info < warn < error)
//    - format: Default format (có thể override bởi transport)
//    - transports: Array of output destinations
//    - exitOnError: false = không exit khi log error
//    - silent: true = tắt hết logs (dùng cho testing)

const logger = winston.createLogger({
  // Log level tùy theo environment
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  // Default format (transports có thể override)
  format: fileFormat,

  // Danh sách transports
  transports: transports,

  // Không exit khi có error trong logger
  exitOnError: false,

  // Silent mode cho testing
  silent: process.env.NODE_ENV === 'test'
});

// =============================================================================
// BƯỚC 5: THÊM HELPER METHODS (TÙY CHỌN)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 4: PROPERTIES VÀ METHODS
//       - Extension methods: Thêm methods vào object có sẵn
//       - Wrapper functions: Bọc Winston methods với logic bổ sung

// Helper: Log HTTP request
logger.logRequest = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

// Helper: Log với correlation ID (để trace request qua nhiều services)
logger.logWithCorrelation = (level, message, correlationId, metadata = {}) => {
  logger.log(level, message, { correlationId, ...metadata });
};

module.exports = logger;

// =============================================================================
// 🏗️ KIẾN TRÚC MICROSERVICES & CENTRAL LOGGING (WINSTON + ELK)
// =============================================================================
//
// 📚 MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    📖 CHƯƠNG 3.2: KIẾN TRÚC MULTI-TIER (MICROSERVICES)
//
// Trong production với microservices:
//
// 1️⃣ MỖI SERVICE CÓ WINSTON LOGGER:
//    - Auth Service: winston → combined.log, error.log
//    - Image Service: winston → combined.log, error.log
//    - Chat Service: winston → combined.log, error.log
//
// 2️⃣ WINSTON + ELK STACK PIPELINE:
//
//    ┌──────────────┐
//    │ Auth Service │ winston.transports.Http()
//    └──────────────┘          │
//    ┌──────────────┐          │    ┌────────┐    ┌──────────┐    ┌───────────────┐
//    │Image Service │──────────┼───▶│ Kafka  │───▶│ Logstash │───▶│ Elasticsearch │
//    └──────────────┘          │    │(Queue) │    │(Process) │    │   (Storage)   │
//    ┌──────────────┐          │    └────────┘    └──────────┘    └───────────────┘
//    │ Chat Service │          │                                           │
//    └──────────────┘          ▼                                           ▼
//                      ┌────────────────┐                          ┌───────────────┐
//                      │ Logstash HTTP  │                          │    Kibana     │
//                      │   Input API    │                          │(Visualization)│
//                      └────────────────┘                          └───────────────┘
//
// 3️⃣ WINSTON HTTP TRANSPORT (GỬI LOGS ĐẾN LOGSTASH):
//    ```javascript
//    new winston.transports.Http({
//      host: 'logstash.example.com',
//      port: 8080,
//      path: '/logs',
//      ssl: true,
//      auth: { bearer: process.env.LOGSTASH_TOKEN }
//    })
//    ```
//
// 4️⃣ LOGSTASH CONFIGURATION (PARSE VÀ ENRICH LOGS):
//    ```ruby
//    input {
//      http { port => 8080 }
//    }
//    filter {
//      json { source => "message" }
//      mutate {
//        add_field => { "service" => "auth-service" }
//        add_field => { "environment" => "${NODE_ENV}" }
//      }
//    }
//    output {
//      elasticsearch {
//        hosts => ["elasticsearch:9200"]
//        index => "logs-%{+YYYY.MM.dd}"
//      }
//    }
//    ```
//
// 5️⃣ ELASTICSEARCH QUERIES (TÌM KIẾM LOGS):
//    ```json
//    GET /logs-*/_search
//    {
//      "query": {
//        "bool": {
//          "must": [
//            { "match": { "level": "error" } },
//            { "match": { "service": "auth-service" } },
//            { "range": { "timestamp": { "gte": "now-1h" } } }
//          ]
//        }
//      }
//    }
//    ```
//
// 6️⃣ KIBANA DASHBOARD:
//    - Real-time logs streaming
//    - Filter by: service, level, timestamp, correlation ID
//    - Visualizations: Error rate, Request volume, Response time
//    - Alerts: Email/Slack khi error rate > threshold
//
// 7️⃣ CORRELATION ID PATTERN:
//    ```javascript
//    // Middleware thêm correlation ID vào mọi request
//    app.use((req, res, next) => {
//      req.correlationId = req.get('X-Correlation-ID') || uuid.v4();
//      next();
//    });
//
//    // Log với correlation ID
//    logger.logWithCorrelation('info', 'User login', req.correlationId, {
//      userId: user.id,
//      email: user.email
//    });
//    ```
//
//    Trace request flow:
//    - [Auth Service] correlationId: abc-123 → Login success
//    - [User Service] correlationId: abc-123 → Fetch profile
//    - [Notification Service] correlationId: abc-123 → Send email
//
// =============================================================================
// 📚 TỔNG KẾT CÁC MÔN HỌC ĐÃ ÁP DỤNG TRONG FILE NÀY
// =============================================================================
//
// ✅ MÔN HỆ ĐIỀU HÀNH:
//    - CHƯƠNG 2: Process management, Environment variables
//    - CHƯƠNG 3: File I/O (async), System calls, File rotation
//
// ✅ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - CHƯƠNG 2: Encapsulation, Inheritance, Abstraction
//    - CHƯƠNG 4: Properties và Methods (extension methods)
//    - CHƯƠNG 9: Singleton, Factory, Observer patterns
//
// ✅ MÔN CẤU TRÚC DỮ LIỆU 1:
//    - CHƯƠNG 4: Hash Table (Winston levels)
//
// ✅ MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    - CHƯƠNG 3: Kiến trúc Multi-tier, Microservices, Central Logging
//
// ✅ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - CHƯƠNG 1: JSON format, NPM ecosystem, Open-source libraries
//
// =============================================================================
// 💡 BÀI HỌC RÚT RA:
//
// 1. VANILLA vs LIBRARY:
//    - Vanilla: Hiểu sâu, nhưng tốn thời gian implement
//    - Library: Nhanh, professional, nhưng phải học API
//
// 2. KHI NÀO DÙNG THƯ VIỆN:
//    - ✅ Production code (cần stable, tested, maintained)
//    - ✅ Tính năng phức tạp (log rotation, multiple transports)
//    - ✅ Team lớn (cần standard, documentation)
//
// 3. KHI NÀO VIẾT TỪ ĐẦU:
//    - ✅ Học tập (hiểu principle)
//    - ✅ Tính năng đơn giản (không cần scale)
//    - ✅ Requirement đặc biệt (library không đáp ứng)
//
// 4. BEST PRACTICE:
//    - Học vanilla để hiểu principle
//    - Dùng library trong production
//    - Đóng gói library trong wrapper (dễ thay thế)
//
// =============================================================================
