// =============================================================================
// LOGGER - GHI LOG HỆ THỐNG (VANILLA JAVASCRIPT - KHÔNG DÙNG THƯ VIỆN WINSTON)
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN HỆ ĐIỀU HÀNH (HE DIEU HANH.pdf):
//    📖 CHƯƠNG 3: QUẢN LÝ FILE VÀ I/O
//       - 3.1 File System: Tổ chức và lưu trữ file trên disk
//       - 3.2 File Operations: open(), read(), write(), close()
//       - 3.3 System Calls: fs.appendFileSync() gọi write() system call của OS
//       - Ví dụ: appendFileSync('log.txt', 'data') → OS ghi xuống ổ cứng
//
//    📖 CHƯƠNG 2: QUẢN LÝ PROCESS
//       - 2.1 Process Environment: process.env chứa biến môi trường
//       - 2.2 Environment Variables: NODE_ENV='development' hoặc 'production'
//       - Ví dụ: Development = ghi nhiều log, Production = ghi ít log để tăng tốc
//
// 2️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 2: BỐN TÍNH CHẤT OOP
//       - 2.1 Encapsulation (Đóng gói): Gom các hàm log vào 1 object logger
//       - Giải thích: Thay vì viết riêng lẻ, gom thành logger.error(), logger.info()
//       - Lợi ích: Code gọn, dễ maintain, dễ test
//
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.1 Singleton Pattern: Logger là object duy nhất trong toàn app
//       - Giải thích: Tất cả module dùng chung 1 logger → log nhất quán
//
// 3️⃣ MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    📖 CHƯƠNG 3: KIẾN TRÚC ĐA LỚP
//       - 3.2 Kiến trúc Multi-tier (Microservices):
//         + Trong hệ thống phân tán, mỗi service có logger riêng
//         + Auth Service → logs/auth-service/
//         + Image Service → logs/image-service/
//       - 3.3 Central Logging: Logs từ tất cả services gửi về 1 chỗ
//         + Công cụ: ELK Stack (Elasticsearch, Logstash, Kibana)
//         + Kafka: Message broker để transport logs
//
// 🎯 MỤC ĐÍCH FILE NÀY:
//    - Viết logger đơn giản bằng vanilla JavaScript (KHÔNG dùng Winston library)
//    - Sinh viên trung bình - khá dễ hiểu cách hoạt động bên trong
//    - Ghi log vào file để debug và audit (kiểm tra lại hành động của user)
// =============================================================================

const fs = require('fs'); // Module File System - tương tác với hệ điều hành
const path = require('path'); // Module xử lý đường dẫn file

// =============================================================================
// BƯỚC 1: ĐỊNH NGHĨA CÁC MỨC ĐỘ LOG (LOG LEVELS)
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT 1:
//    📖 CHƯƠNG 4: BẢNG BĂM (HASH TABLES)
//       - 4.1 Hàm băm: Object trong JavaScript = Hash Table
//       - Object LOG_LEVELS lưu trữ: key (tên level) → value (số thứ tự)
//       - Truy cập O(1): LOG_LEVELS['ERROR'] → trả về 0 ngay lập tức
//       - Ví dụ: Thay vì if-else nhiều dòng, dùng hash table tra cứu nhanh
//
// 📚 MÔN GIẢI THUẬT 1:
//    📖 CHƯƠNG 2: SẮP XẾP VÀ TÌM KIẾM
//       - 2.1 So sánh (Comparison): level > currentLevel → quyết định có ghi log không
//       - Time complexity: O(1) vì chỉ so sánh 2 số
//
// 💡 GIẢI THÍCH CHO SINH VIÊN TRUNG BÌNH - KHÁ:
//    - Priority số càng THẤP = càng QUAN TRỌNG
//    - ERROR = 0 (quan trọng nhất, luôn luôn ghi)
//    - DEBUG = 3 (ít quan trọng, chỉ ghi khi development)
//    - Tại sao? Vì so sánh dễ: if (level <= currentLevel) thì ghi log

const LOG_LEVELS = {
  ERROR: 0,  // Lỗi nghiêm trọng - phải xử lý ngay (VD: database down, payment failed)
  WARN: 1,   // Cảnh báo - có thể gây vấn đề (VD: disk space < 10%, API response chậm)
  INFO: 2,   // Thông tin bình thường (VD: user login, order created)
  DEBUG: 3   // Chi tiết cho developer (VD: SQL query executed, function called)
};

// =============================================================================
// BƯỚC 2: XÁC ĐỊNH MỨC ĐỘ LOG THEO ENVIRONMENT (MÔI TRƯỜNG)
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    📖 CHƯƠNG 2: QUẢN LÝ PROCESS
//       - 2.2 Environment Variables (Biến môi trường):
//         + Mỗi process có bộ biến riêng (process.env)
//         + OS cung cấp: PATH, HOME, NODE_ENV, ...
//         + Ứng dụng đọc để thay đổi hành vi
//       - Ví dụ: NODE_ENV='production' → app chạy chế độ production
//
// 💡 GIẢI THÍCH DỄ HIỂU:
//    - Development (Phát triển): Lập trình viên đang code, cần log chi tiết
//      → Ghi TẤT CẢ logs (ERROR, WARN, INFO, DEBUG)
//
//    - Production (Thực tế): App đang chạy cho user, cần tốc độ
//      → Chỉ ghi logs QUAN TRỌNG (ERROR, WARN, INFO), bỏ DEBUG
//      → Lý do: Ghi ít log = ít disk I/O = app nhanh hơn

function getCurrentLogLevel() {
  const env = process.env.NODE_ENV || 'development';

  // Kiểm tra môi trường và trả về level phù hợp
  if (env === 'development') {
    return LOG_LEVELS.DEBUG;  // Development: Log tất cả để dễ debug
  } else {
    return LOG_LEVELS.INFO;   // Production: Bỏ DEBUG để tăng performance
  }
}

// =============================================================================
// BƯỚC 3: TẠO TIMESTAMP (DẤU THỜI GIAN)
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU 1:
//    📖 CHƯƠNG 1: DANH SÁCH (LISTS) - STRING MANIPULATION
//       - 1.1 Array List: String.padStart() thêm '0' vào đầu nếu thiếu
//       - Ví dụ: '5'.padStart(2, '0') → '05' (thêm 1 số 0)
//       - Time complexity: O(n) với n = độ dài string
//
// 💡 VÍ DỤ DỄ HIỂU:
//    - now.getMonth() = 4 (tháng 5, vì tháng bắt đầu từ 0)
//    - month + 1 = 5
//    - String(5).padStart(2, '0') = '05'
//    - Kết quả: '2025-05-10 14:30:45' (format chuẩn ISO 8601)

function getTimestamp() {
  const now = new Date();

  // Lấy các thành phần ngày giờ
  const year = now.getFullYear();                         // 2025
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  const day = String(now.getDate()).padStart(2, '0');        // 01-31
  const hours = String(now.getHours()).padStart(2, '0');     // 00-23
  const minutes = String(now.getMinutes()).padStart(2, '0'); // 00-59
  const seconds = String(now.getSeconds()).padStart(2, '0'); // 00-59

  // Ghép lại thành format: YYYY-MM-DD HH:MM:SS
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// =============================================================================
// BƯỚC 4: FORMAT MESSAGE (ĐỊNH DẠNG THÔNG ĐIỆP)
// =============================================================================
// 📚 MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    📖 CHƯƠNG 1: XU HƯỚNG LẬP TRÌNH HIỆN ĐẠI
//       - 1.1 JSON (JavaScript Object Notation):
//         + JSON.stringify(): Chuyển object JavaScript → string
//         + Ví dụ: {user: 'john', age: 25} → '{"user":"john","age":25}'
//       - 1.2 Structured Logging:
//         + Log có format chuẩn để dễ parse bởi tools (ELK, Splunk)
//         + Format: [timestamp] [level] message {metadata}
//
// 💡 VÍ DỤ:
//    Input: formatMessage('ERROR', 'Login failed', {userId: 123})
//    Output: '[2025-01-10 14:30:45] [ERROR] Login failed {"userId":123}'

function formatMessage(level, message, metadata) {
  const timestamp = getTimestamp();

  // Tạo message cơ bản
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
//    📖 CHƯƠNG 3: QUẢN LÝ FILE VÀ I/O
//       - 3.2 File Operations:
//         + fs.appendFileSync(): Ghi thêm vào cuối file (không xóa nội dung cũ)
//         + fs.writeFileSync(): Ghi đè toàn bộ file (xóa nội dung cũ)
//         + Synchronous: Chương trình chờ đợi ghi xong mới chạy tiếp
//       - 3.3 System Calls:
//         + appendFileSync() → gọi write() system call → OS ghi vào disk
//         + Blocking I/O: CPU đợi disk (chậm vì disk chậm hơn RAM 10,000 lần)
//
// 📚 MÔN KIẾN TRÚC MÁY TÍNH:
//    📖 CHƯƠNG 5: MEMORY HIERARCHY (HỆ THỐNG CẤP BẬC BỘ NHỚ)
//       - CPU Cache: ~1ns (nhanh nhất)
//       - RAM: ~100ns
//       - SSD: ~100,000ns = 0.1ms
//       - HDD: ~10,000,000ns = 10ms
//       - Kết luận: Disk I/O là bottleneck (điểm nghẽn) → ghi log ít = app nhanh
//
// 💡 CÁCH HOẠT ĐỘNG:
//    1. Kiểm tra thư mục 'logs' có tồn tại không
//    2. Nếu chưa có → tạo thư mục (mkdirSync)
//    3. Ghi log vào file (appendFileSync)
//    4. Nếu lỗi → chỉ log ra console, không crash app

function writeToFile(filename, message) {
  try {
    // Tạo đường dẫn tới thư mục logs (ví dụ: /home/app/logs)
    const logsDir = path.join(__dirname, '..', '..', 'logs');

    // Kiểm tra thư mục logs có tồn tại không
    if (!fs.existsSync(logsDir)) {
      // Tạo thư mục logs (recursive: true → tạo cả thư mục cha nếu chưa có)
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Tạo đường dẫn đầy đủ đến file log
    const filePath = path.join(logsDir, filename);

    // Ghi log vào file (append = ghi thêm, không xóa nội dung cũ)
    // 'utf8' = encoding, '\n' = xuống dòng
    fs.appendFileSync(filePath, message + '\n', 'utf8');

  } catch (error) {
    // Nếu không ghi được file → chỉ log ra console
    // Tránh infinite loop nếu logger bị lỗi
    console.error('Logger error:', error.message);
  }
}

// =============================================================================
// BƯỚC 6: HÀM LOG CHÍNH
// =============================================================================
// 📚 MÔN GIẢI THUẬT 1:
//    📖 CHƯƠNG 2: SẮP XẾP VÀ TÌM KIẾM
//       - 2.2 Linear Search (Tìm kiếm tuyến tính):
//         + Filter algorithm: Chỉ log nếu level <= currentLevel
//         + Time complexity: O(1) vì chỉ so sánh 2 số
//       - Optimization: Skip logs không cần thiết để tăng performance
//
// 💡 CƠ CHẾ HOẠT ĐỘNG:
//    1. Lấy currentLevel từ environment (development = 3, production = 2)
//    2. So sánh: if (level > currentLevel) → skip (không ghi)
//    3. Format message
//    4. Ghi vào console
//    5. Ghi vào file combined.log (tất cả logs)
//    6. Nếu ERROR → ghi thêm vào error.log
//
// VÍ DỤ:
//    - Production (currentLevel = INFO = 2):
//      + log(ERROR = 0) → 0 <= 2 → GHI ✅
//      + log(DEBUG = 3) → 3 > 2 → BỎ QUA ❌

function log(level, levelName, message, metadata = {}) {
  const currentLevel = getCurrentLogLevel();

  // Filter: Chỉ log nếu mức độ quan trọng đủ cao
  if (level > currentLevel) {
    return; // Skip log này để tăng performance
  }

  // Format message thành chuỗi chuẩn
  const formattedMessage = formatMessage(levelName, message, metadata);

  // Output 1: Console (stdout/stderr) - hiển thị ngay trên terminal
  console.log(formattedMessage);

  // Output 2: File combined.log (ghi tất cả logs vào 1 file)
  writeToFile('combined.log', formattedMessage);

  // Output 3: File error.log (chỉ ghi errors vào file riêng)
  if (level === LOG_LEVELS.ERROR) {
    writeToFile('error.log', formattedMessage);
  }

  // 🏗️ TODO: Trong production, gửi logs đến Kafka
  // - Kafka Topic: 'auth-service-logs'
  // - Kafka consumer → forward đến Elasticsearch
  // - Ví dụ: kafkaProducer.send({ topic: 'logs', messages: [formattedMessage] })
}

// =============================================================================
// BƯỚC 7: TẠO LOGGER OBJECT (ĐỐI TƯỢNG LOGGER)
// =============================================================================
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    📖 CHƯƠNG 2: BỐN TÍNH CHẤT OOP
//       - 2.1 Encapsulation (Đóng gói):
//         + Gom 4 hàm (error, warn, info, debug) vào 1 object logger
//         + Lợi ích: Code gọn, dễ sử dụng, dễ maintain
//       - 2.4 Abstraction (Trừu tượng hóa):
//         + User chỉ cần gọi logger.error() mà không cần biết bên trong hoạt động thế nào
//         + Ẩn đi complexity (formatMessage, writeToFile, level checking)
//
//    📖 CHƯƠNG 9: DESIGN PATTERNS
//       - 9.1 Singleton Pattern:
//         + Logger là object duy nhất trong toàn app
//         + Tất cả module import cùng 1 instance
//         + Lợi ích: Log nhất quán, không tạo nhiều logger
//
// 💡 CÁCH DÙNG:
//    const logger = require('./config/logger');
//    logger.error('Database connection failed', { error: err.message });
//    logger.info('User logged in', { userId: 123 });

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
// 🏗️ KIẾN TRÚC MICROSERVICES & CENTRAL LOGGING
// =============================================================================
//
// 📚 MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    📖 CHƯƠNG 3.2: KIẾN TRÚC MULTI-TIER (MICROSERVICES)
//
// Trong hệ thống microservices lớn (như Netflix, Uber):
//
// 1️⃣ MỖI SERVICE CÓ LOGGER RIÊNG:
//    - Auth Service → logs/auth-service/combined.log
//    - Image Service → logs/image-service/combined.log
//    - Chat Service → logs/chat-service/combined.log
//
// 2️⃣ CENTRAL LOGGING PIPELINE (ELK STACK):
//
//    ┌──────────────┐
//    │ Auth Service │──┐
//    └──────────────┘  │
//    ┌──────────────┐  │    ┌────────┐    ┌──────────┐    ┌───────────────┐
//    │Image Service │──┼───▶│ Kafka  │───▶│ Logstash │───▶│ Elasticsearch │
//    └──────────────┘  │    │(Queue) │    │(Process) │    │   (Storage)   │
//    ┌──────────────┐  │    └────────┘    └──────────┘    └───────────────┘
//    │ Chat Service │──┘                                           │
//    └──────────────┘                                              ▼
//                                                          ┌───────────────┐
//                                                          │    Kibana     │
//                                                          │ (Visualization)│
//                                                          └───────────────┘
//
// 3️⃣ GIẢI THÍCH TỪNG THÀNH PHẦN:
//    - Kafka: Message queue nhận logs từ tất cả services
//    - Logstash: Parse và transform logs (thêm metadata, filter spam)
//    - Elasticsearch: Database lưu trữ logs, hỗ trợ full-text search
//    - Kibana: Web UI để search, filter, visualize logs
//
// 4️⃣ LỢI ÍCH:
//    - Tìm kiếm logs từ TẤT CẢ services ở 1 nơi
//    - Trace request qua nhiều services (dùng correlation ID)
//    - Alerting tự động: Nhiều errors → gửi email/SMS
//    - Analytics: Thống kê số lượng requests, errors, performance
//
// 5️⃣ CORRELATION ID (ID LIÊN HỆ):
//    - Mỗi request có 1 ID duy nhất
//    - ID này đi theo request qua TẤT CẢ services
//    - VD: Request đăng nhập:
//      + [Auth Service] correlationId: abc-123 → Login success
//      + [User Service] correlationId: abc-123 → Fetch user profile
//      + [Notification Service] correlationId: abc-123 → Send welcome email
//    - Dễ dàng trace toàn bộ flow chỉ bằng 1 ID
//
// =============================================================================
// 📚 TỔNG KẾT CÁC MÔN HỌC ĐÃ ÁP DỤNG TRONG FILE NÀY
// =============================================================================
//
// ✅ MÔN HỆ ĐIỀU HÀNH:
//    - CHƯƠNG 2: Process management, Environment variables
//    - CHƯƠNG 3: File I/O, System calls, Blocking vs non-blocking
//
// ✅ MÔN CẤU TRÚC DỮ LIỆU 1:
//    - CHƯƠNG 1: String manipulation (padStart)
//    - CHƯƠNG 4: Hash Table (Object LOG_LEVELS)
//
// ✅ MÔN GIẢI THUẬT 1:
//    - CHƯƠNG 2: So sánh O(1), Filter algorithm
//
// ✅ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - CHƯƠNG 2: Encapsulation, Abstraction
//    - CHƯƠNG 9: Singleton Pattern
//
// ✅ MÔN LẬP TRÌNH CƠ SỞ DỮ LIỆU:
//    - CHƯƠNG 3: Kiến trúc Multi-tier, Microservices, Central Logging
//
// ✅ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - CHƯƠNG 1: JSON, Structured Logging, RESTful API
//
// ✅ MÔN KIẾN TRÚC MÁY TÍNH:
//    - CHƯƠNG 5: Memory Hierarchy, Disk I/O bottleneck
//
// =============================================================================
