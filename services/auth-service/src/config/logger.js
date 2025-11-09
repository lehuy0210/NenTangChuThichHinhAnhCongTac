// =============================================================================
// LOGGER ĐƠN GIẢN - VANILLA JAVASCRIPT (KHÔNG DÙNG WINSTON)
// =============================================================================
// Giải thích cho sinh viên:
// Logger là công cụ ghi lại thông tin khi chương trình chạy
// Giống như việc viết nhật ký để biết chương trình đang làm gì
// =============================================================================

const fs = require('fs'); // Module đọc/ghi file có sẵn trong Node.js
const path = require('path'); // Module xử lý đường dẫn có sẵn

// =============================================================================
// BƯỚC 1: ĐỊNH NGHĨA CÁC MỨC ĐỘ LOG (LOG LEVELS)
// =============================================================================
// Giải thích: Mỗi loại thông tin có mức độ quan trọng khác nhau
// - ERROR: Lỗi nghiêm trọng (vd: database bị lỗi) - Quan trọng nhất
// - WARN: Cảnh báo (vd: server chạy chậm)
// - INFO: Thông tin bình thường (vd: user vừa đăng nhập)
// - DEBUG: Thông tin chi tiết cho lập trình viên (vd: giá trị biến)

const LOG_LEVELS = {
  ERROR: 0,  // Mức 0 - Quan trọng nhất
  WARN: 1,   // Mức 1
  INFO: 2,   // Mức 2
  DEBUG: 3   // Mức 3 - Ít quan trọng nhất
};

// =============================================================================
// BƯỚC 2: XÁC ĐỊNH MỨC ĐỘ LOG THEO ENVIRONMENT
// =============================================================================
// Giải thích:
// - Development (môi trường phát triển): Hiển thị tất cả log (kể cả DEBUG)
// - Production (môi trường thực tế): Chỉ hiển thị INFO trở lên (bỏ DEBUG)

function getCurrentLogLevel() {
  const env = process.env.NODE_ENV || 'development'; // Lấy môi trường hiện tại

  // Nếu đang phát triển -> cho phép log DEBUG
  // Nếu đang chạy thật -> chỉ log INFO trở lên
  return env === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
}

// =============================================================================
// BƯỚC 3: HÀM TẠO TIMESTAMP (THỜI GIAN HIỆN TẠI)
// =============================================================================
// Giải thích: Mỗi log cần biết nó được tạo lúc nào
// Format: 2025-01-15 14:30:45

function getTimestamp() {
  const now = new Date(); // Lấy thời gian hiện tại

  // Lấy từng thành phần: năm, tháng, ngày, giờ, phút, giây
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Ghép thành chuỗi: 2025-01-15 14:30:45
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// =============================================================================
// BƯỚC 4: HÀM FORMAT MESSAGE (ĐỊNH DẠNG THÔNG ĐIỆP LOG)
// =============================================================================
// Giải thích: Tạo chuỗi log có định dạng đẹp, dễ đọc
// Format: [2025-01-15 14:30:45] [INFO] User logged in

function formatMessage(level, message, metadata) {
  const timestamp = getTimestamp();

  // Tạo phần cơ bản: [timestamp] [level] message
  let formattedMessage = `[${timestamp}] [${level}] ${message}`;

  // Nếu có metadata (thông tin bổ sung), thêm vào
  if (metadata && Object.keys(metadata).length > 0) {
    formattedMessage += ' ' + JSON.stringify(metadata);
  }

  return formattedMessage;
}

// =============================================================================
// BƯỚC 5: HÀM GHI LOG VÀO FILE
// =============================================================================
// Giải thích: Lưu log vào file để có thể xem lại sau này

function writeToFile(filename, message) {
  try {
    // Tạo thư mục logs nếu chưa có
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Đường dẫn đến file log
    const filePath = path.join(logsDir, filename);

    // Ghi vào file (thêm vào cuối file, không ghi đè)
    fs.appendFileSync(filePath, message + '\n', 'utf8');
  } catch (error) {
    // Nếu ghi file lỗi, chỉ in ra console
    console.error('Logger error:', error.message);
  }
}

// =============================================================================
// BƯỚC 6: HÀM LOG CHÍNH
// =============================================================================
// Giải thích: Hàm này sẽ quyết định có log hay không, log vào đâu

function log(level, levelName, message, metadata = {}) {
  const currentLevel = getCurrentLogLevel();

  // Chỉ log nếu mức độ quan trọng >= mức hiện tại
  // Vd: Nếu currentLevel = INFO, thì ERROR, WARN, INFO được log, DEBUG bị bỏ qua
  if (level > currentLevel) {
    return; // Không log
  }

  // Format message
  const formattedMessage = formatMessage(levelName, message, metadata);

  // Bước 1: In ra console (màn hình)
  console.log(formattedMessage);

  // Bước 2: Ghi vào file combined.log (tất cả log)
  writeToFile('combined.log', formattedMessage);

  // Bước 3: Nếu là ERROR, ghi thêm vào error.log (riêng lỗi)
  if (level === LOG_LEVELS.ERROR) {
    writeToFile('error.log', formattedMessage);
  }
}

// =============================================================================
// BƯỚC 7: TẠO LOGGER OBJECT VỚI CÁC PHƯƠNG THỨC
// =============================================================================
// Giải thích: Tạo object logger với 4 phương thức: error, warn, info, debug
// Cách dùng: logger.info('User logged in', { userId: 123 })

const logger = {
  // Log lỗi nghiêm trọng
  error: (message, metadata) => {
    log(LOG_LEVELS.ERROR, 'ERROR', message, metadata);
  },

  // Log cảnh báo
  warn: (message, metadata) => {
    log(LOG_LEVELS.WARN, 'WARN', message, metadata);
  },

  // Log thông tin
  info: (message, metadata) => {
    log(LOG_LEVELS.INFO, 'INFO', message, metadata);
  },

  // Log debug (chi tiết)
  debug: (message, metadata) => {
    log(LOG_LEVELS.DEBUG, 'DEBUG', message, metadata);
  }
};

// =============================================================================
// EXPORT LOGGER
// =============================================================================
// Giải thích: Export để các file khác có thể dùng
// Cách dùng trong file khác:
//   const logger = require('./config/logger');
//   logger.info('Server started');

module.exports = logger;

// =============================================================================
// VÍ DỤ SỬ DỤNG
// =============================================================================
// logger.debug('Connecting to database...'); // Chỉ hiện khi development
// logger.info('Server started on port 3000'); // Hiện cả dev và production
// logger.warn('Database connection slow'); // Cảnh báo
// logger.error('Database connection failed', { error: 'Connection timeout' }); // Lỗi
