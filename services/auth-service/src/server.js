// =============================================================================
// MAIN SERVER - EXPRESS APP & MIDDLEWARE STACK
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI (CONG NGHE LAP TRINH.pdf):
//    📖 CHƯƠNG 4: WEB FRAMEWORKS & EXPRESS.JS
//       - 4.1 Express.js: Minimalist web framework for Node.js
//       - 4.2 Middleware Pattern: Request → MW1 → MW2 → ... → Response
//       - 4.3 Routing: Define endpoints với HTTP methods
//       - 4.4 Chain of Responsibility: Middleware chain pattern
//
//    📖 CHƯƠNG 5: MICROSERVICES ARCHITECTURE
//       - 5.1 12-Factor App: Environment-based configuration
//       - 5.2 Stateless Services: No server-side session storage
//       - 5.3 Service Independence: Auth service tách biệt
//
// 2️⃣ MÔN MẠNG MÁY TÍNH (MANG MAY TINH.pdf):
//    📖 CHƯƠNG 4: APPLICATION LAYER - HTTP SERVER
//       - 4.1 HTTP Server: Listening on TCP port (default 3001)
//       - 4.2 Request-Response Cycle: Synchronous communication
//       - 4.3 HTTP Headers: Authorization, Content-Type, CORS headers
//
//    📖 CHƯƠNG 5: TRANSPORT LAYER - TCP
//       - 5.1 TCP Socket: app.listen() creates TCP server
//       - 5.2 Port Binding: Bind to port 3001 (or env PORT)
//       - 5.3 Connection Handling: TCP 3-way handshake
//
//    📖 CHƯƠNG 6: CORS (CROSS-ORIGIN RESOURCE SHARING)
//       - 6.1 Same-Origin Policy: Browser security mechanism
//       - 6.2 Origin: protocol + domain + port
//       - 6.3 Preflight Request: OPTIONS request cho non-simple requests
//       - Ví dụ: Frontend (localhost:3000) → Backend (localhost:3001) needs CORS
//
// 3️⃣ MÔN AN TOÀN VÀ BẢO MẬT HỆ THỐNG (AN TOAN HE THONG.pdf):
//    📖 CHƯƠNG 3: WEB SECURITY HEADERS
//       - 3.1 Helmet Middleware: Sets 8 security headers
//         * X-Frame-Options: DENY → chống clickjacking
//         * X-Content-Type-Options: nosniff → chống MIME sniffing
//         * Strict-Transport-Security → force HTTPS (HSTS)
//         * X-XSS-Protection → enable browser XSS filter
//       - Ví dụ: Clickjacking = attacker embeds site in iframe
//
//    📖 CHƯƠNG 4: RATE LIMITING & DDOS PROTECTION
//       - 4.1 Rate Limit Algorithms:
//         * Fixed Window: 100 req/15min (simple, có burst problem)
//         * Sliding Window: Rolling time window (smoother)
//         * Token Bucket: Tokens refill at constant rate
//         * Leaky Bucket: Requests leak at constant rate
//       - 4.2 DDoS Protection: Limit requests per IP
//       - 4.3 Brute Force Prevention: Limit login attempts
//       - Ví dụ: 100 requests/15min → attacker chỉ thử 100 passwords
//
// 4️⃣ MÔN HỆ ĐIỀU HÀNH (HE DIEU HANH.pdf):
//    📖 CHƯƠNG 2: PROCESS MANAGEMENT & SIGNALS
//       - 2.1 Process Signals: SIGTERM, SIGINT, SIGHUP
//       - 2.2 Signal Handlers: process.on('SIGTERM', handler)
//       - 2.3 Graceful Shutdown: Close connections before exit
//       - Ví dụ: Ctrl+C sends SIGINT → cleanup → process.exit(0)
//
//    📖 CHƯƠNG 3: ENVIRONMENT VARIABLES
//       - 3.1 process.env: Environment variable access
//       - 3.2 Configuration: PORT, NODE_ENV, DB_HOST
//       - 3.3 Security: Don't hardcode secrets in code
//
// 5️⃣ MÔN CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT 1 (CAU TRUC DU LIEU 1.pdf):
//    📖 CHƯƠNG 2: QUEUES & FIFO
//       - 2.1 Middleware Stack: FIFO queue structure
//       - 2.2 Request Queue: Requests processed in order
//       - Ví dụ: MW1 → MW2 → MW3 (first in, first processed)
//
//    📖 CHƯƠNG 4: HASH TABLES
//       - 4.1 Rate Limit Storage: In-memory hash map (IP → count)
//       - 4.2 O(1) Lookup: Check rate limit by IP
//
//    📖 CHƯƠNG 7: SLIDING WINDOW ALGORITHM
//       - 7.1 Time Windows: Track requests in rolling time window
//       - 7.2 Algorithm: Count requests trong last N minutes
//
// 6️⃣ MÔN KỸ THUẬT PHẦN MỀM (KY THUAT PHAN MEM.pdf):
//    📖 CHƯƠNG 5: DESIGN PATTERNS
//       - 5.1 Middleware Pattern: Pluggable request handlers
//       - 5.2 Chain of Responsibility: Pass request through chain
//       - 5.3 Error Handler Pattern: Centralized error handling
//
//    📖 CHƯƠNG 3: SEPARATION OF CONCERNS
//       - 3.1 Layered Architecture: Routes / Middleware / Config
//       - 3.2 Modularity: Each module has single responsibility
//
// =============================================================================

require('dotenv').config(); // Load .env variables
const express = require('express');
const helmet = require('helmet'); // Security headers
const cors = require('cors'); // CORS middleware
const rateLimit = require('express-rate-limit'); // Rate limiting
const { testConnection } = require('./config/database');
const logger = require('./config/logger');
const authRoutes = require('./routes/auth');

// =============================================================================
// INITIALIZE EXPRESS APP
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE STACK - EXECUTION ORDER MATTERS!
// =============================================================================
// 📚 MÔN CÔNG NGHỆ HIỆN ĐẠI - MIDDLEWARE PATTERN:
//
// MIDDLEWARE = Hàm chạy GIỮA request và response
//    - Có thể modify req/res
//    - Có thể kết thúc request-response cycle
//    - Phải gọi next() để chuyển sang middleware tiếp theo
//
// EXECUTION ORDER (top to bottom):
//    Request -> MW1 -> MW2 -> MW3 -> Route Handler -> Response
//
// 📚 MÔN CTDL - CHAIN/QUEUE:
//    - Middleware stack = Queue (FIFO)
//    - Request đi qua từng middleware theo thứ tự
//    - Giống assembly line trong nhà máy

// =============================================================================
// MIDDLEWARE 1: HELMET - SECURITY HEADERS
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - HTTP SECURITY HEADERS:
//
// HELMET SETS:
//    - X-Frame-Options: DENY
//      -> Chống clickjacking (không cho embed trong iframe)
//
//    - X-Content-Type-Options: nosniff
//      -> Chống MIME type sniffing
//
//    - Strict-Transport-Security: max-age=15552000
//      -> Bắt buộc HTTPS (HSTS)
//
//    - X-XSS-Protection: 1; mode=block
//      -> Enable XSS filter trong browser
//
//    - Content-Security-Policy: ...
//      -> Chặn inline scripts (XSS protection)
//
// 📚 SECURITY ATTACKS PREVENTED:
//    - Clickjacking: Attacker embed site trong invisible iframe
//    - MIME Sniffing: Browser execute file as wrong type
//    - XSS: Cross-Site Scripting injection

app.use(helmet());

// =============================================================================
// MIDDLEWARE 2: CORS - CROSS-ORIGIN RESOURCE SHARING
// =============================================================================
// 📚 MÔN MẠNG MÁY TÍNH - SAME-ORIGIN POLICY:
//
// SAME-ORIGIN POLICY:
//    - Browser chặn requests từ domain khác
//    - Origin = protocol + domain + port
//    - VD: https://example.com:443 khác https://example.com:8080
//
// CORS = Cơ chế để bypass Same-Origin Policy
//    - Server gửi header: Access-Control-Allow-Origin
//    - Browser check header -> cho phép request
//
// PREFLIGHT REQUEST:
//    - Browser gửi OPTIONS request trước (cho non-simple requests)
//    - Check server có cho phép không
//    - Nếu OK -> gửi request thật
//
// EXAMPLE:
//    Frontend: http://localhost:3000
//    Backend: http://localhost:3001
//    Cần CORS để frontend gọi được backend

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', // Allowed domains
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// =============================================================================
// MIDDLEWARE 3: RATE LIMITING
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - RATE LIMITING:
//
// ALGORITHMS:
//    1. Fixed Window: 100 requests/15 minutes
//       - Simple, có burst problem
//
//    2. Sliding Window (express-rate-limit sử dụng):
//       - Track requests trong rolling time window
//       - Smoother, chống burst
//
//    3. Token Bucket:
//       - Mỗi user có bucket với tokens
//       - Mỗi request tiêu 1 token
//       - Tokens refill theo rate
//
//    4. Leaky Bucket:
//       - Requests vào bucket với bất kỳ rate
//       - Ra với constant rate
//
// 📚 MÔN CTDL - SLIDING WINDOW:
//    - Store: { ip: { count: 5, resetTime: 1710000000 } }
//    - Hash map: O(1) lookup
//    - Cleanup expired entries

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút',
  standardHeaders: true, // Return `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

app.use(limiter); // Apply to all routes

// Stricter limit for auth routes (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: 'Quá nhiều lần đăng nhập/đăng ký, vui lòng thử lại sau 15 phút',
  skipSuccessfulRequests: true // Don't count successful requests
});

// =============================================================================
// MIDDLEWARE 4: BODY PARSER
// =============================================================================
// 📚 MÔN MẠNG MÁY TÍNH - HTTP REQUEST BODY:
//
// CONTENT-TYPE:
//    - application/json: JSON data
//    - application/x-www-form-urlencoded: Form data
//    - multipart/form-data: File uploads
//
// PARSING:
//    - Raw body (Buffer) -> Parse -> JavaScript object
//    - JSON: '{"name":"John"}' -> { name: "John" }
//    - Form: 'name=John&age=30' -> { name: "John", age: "30" }
//
// LIMIT:
//    - 10mb limit để tránh DoS (large payload attack)

app.use(express.json({ limit: '10mb' })); // Parse JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse form data

// =============================================================================
// MIDDLEWARE 5: REQUEST LOGGING
// =============================================================================
// 📚 MÔN HỆ THỐNG PHÂN TÁN - DISTRIBUTED TRACING:
//    - Log mọi request để debug và monitor
//    - Trong microservices: Add correlation ID
//    - Forward logs đến central logging (ELK)
//
// 📚 MÔN AN TOÀN: Audit trail
//    - Track ai làm gì, khi nào
//    - Forensics khi có security incident

app.use((req, res, next) => {
  const start = Date.now();

  // Log AFTER response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// =============================================================================
// ROUTES
// =============================================================================
// 📚 MÔN CÔNG NGHỆ HIỆN ĐẠI - ROUTING:
//    - Route = URL pattern + HTTP method + handler
//    - RESTful routes: /users, /users/:id
//    - Middleware before route: Apply to that route only

// Health check endpoint (for Docker/K8s)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime() // Server uptime in seconds
  });
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    service: 'Authentication Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      me: 'GET /auth/me',
      verify: 'GET /auth/verify'
    }
  });
});

// Mount auth routes với prefix /auth
// 📚 KỸ THUẬT PM: Modular routes
app.use('/auth', authLimiter, authRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================
// 📚 MÔN KỸ THUẬT PHẦN MỀM - ERROR HANDLING PATTERN:
//
// ERROR TYPES:
//    1. 404 Not Found: No route matches
//    2. Validation errors: Bad input (handled in routes)
//    3. Database errors: Connection issues, constraints
//    4. Uncaught exceptions: Bugs in code
//
// CENTRALIZED ERROR HANDLER:
//    - Consistency: All errors same format
//    - DRY: Error handling logic chỉ viết 1 lần
//    - Production: Hide stack traces

// 404 Handler - No route found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint không tồn tại',
    path: req.path
  });
});

// Global error handler
// 📚 MÔN HỆ ĐIỀU HÀNH: Exception handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  // 📚 AN TOÀN: Không expose stack trace trong production
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Lỗi server' // Generic message
      : err.message, // Detailed message for development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH - PROCESS LIFECYCLE:
//
// STARTUP SEQUENCE:
//    1. Load environment variables (.env)
//    2. Initialize dependencies (database, redis)
//    3. Start HTTP server (listen on port)
//    4. Log startup info
//
// 📚 MÔN MẠNG - TCP SOCKET:
//    - app.listen() tạo TCP socket
//    - Bind to port 3001
//    - Listen for incoming connections

async function startServer() {
  try {
    // =========================================================================
    // STEP 1: TEST DATABASE CONNECTION
    // =========================================================================
    // 📚 FAIL-FAST PRINCIPLE:
    //    - Check dependencies trước khi start
    //    - Nếu DB không connect -> crash ngay
    //    - Orchestrator (Docker/K8s) sẽ restart

    await testConnection();

    // =========================================================================
    // STEP 2: START HTTP SERVER
    // =========================================================================
    // 📚 MẠNG: TCP socket listening
    //    - Port: 3001
    //    - Backlog queue: Default 511 (pending connections)

    app.listen(PORT, () => {
      logger.info(`🚀 Auth Service đang chạy trên port ${PORT}`);
      logger.info(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    });

  } catch (error) {
    logger.error('❌ Không thể khởi động server:', { error: error.message });
    process.exit(1); // Exit code 1 = error
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH - SIGNAL HANDLING:
//
// UNIX SIGNALS:
//    - SIGTERM: Termination signal (graceful)
//      Docker stop, Kubernetes pod termination
//
//    - SIGINT: Interrupt (Ctrl+C)
//      User manually stops server
//
//    - SIGHUP: Hangup
//      Terminal closed
//
// GRACEFUL SHUTDOWN STEPS:
//    1. Stop accepting new requests
//    2. Finish processing current requests
//    3. Close database connections
//    4. Close other resources (Redis, file handles)
//    5. Exit process

function gracefulShutdown(signal) {
  logger.info(`\n${signal} nhận được. Đang tắt server...`);

  // Close database
  const { closeConnection } = require('./config/database');
  closeConnection().then(() => {
    logger.info('✅ Đã đóng kết nối database');
    logger.info('👋 Server đã tắt thành công');
    process.exit(0); // Exit code 0 = success
  });

  // Force shutdown after 30 seconds
  // 📚 HỆ ĐIỀU HÀNH: Timeout để tránh hang
  setTimeout(() => {
    logger.error('⚠️  Buộc tắt server sau 30 giây timeout');
    process.exit(1);
  }, 30000);
}

// Register signal handlers
// 📚 HỆ ĐIỀU HÀNH: Event-driven architecture
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// UNCAUGHT EXCEPTION HANDLERS
// =============================================================================
// 📚 MÔN HỆ ĐIỀU HÀNH - EXCEPTION HANDLING:
//
// UNCAUGHT EXCEPTION:
//    - Synchronous error không được catch
//    - VD: undefined.toString()
//    - Best practice: Crash và restart (fail-fast)
//
// UNHANDLED REJECTION:
//    - Promise rejection không có .catch()
//    - VD: await fetch() fails, no try-catch
//    - Node.js sẽ crash (từ v15)

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection:', { reason });
  process.exit(1);
});

// =============================================================================
// START SERVER
// =============================================================================
startServer();

// Export for testing
module.exports = app;

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: MIDDLEWARE PATTERN
// =============================================================================
//
// MIDDLEWARE = Function với signature: (req, res, next)
//
// TYPES:
//    1. Application-level: app.use(middleware)
//    2. Router-level: router.use(middleware)
//    3. Error-handling: (err, req, res, next)
//    4. Built-in: express.json(), express.static()
//    5. Third-party: helmet(), cors()
//
// EXECUTION ORDER:
//    Request
//      ↓
//    MW1 (helmet)
//      ↓
//    MW2 (cors)
//      ↓
//    MW3 (rate limit)
//      ↓
//    MW4 (body parser)
//      ↓
//    MW5 (logging)
//      ↓
//    Route Handler
//      ↓
//    Response
//
// ERROR FLOW:
//    MW1 -> MW2 -> [ERROR] -> Skip to Error Handler
//
// =============================================================================
// 📚 RATE LIMITING ALGORITHMS
// =============================================================================
//
// 1. FIXED WINDOW:
//    - Counter resets every window
//    - Simple, but burst problem
//    - VD: 100 req/min -> 100 at 0:59, 100 at 1:00 = 200 req in 1 second!
//
// 2. SLIDING WINDOW LOG:
//    - Store timestamp of each request
//    - Count requests in last N seconds
//    - Accurate, but memory intensive
//    - O(n) space, O(n) time
//
// 3. SLIDING WINDOW COUNTER:
//    - Weighted average of 2 fixed windows
//    - Good balance
//    - O(1) space, O(1) time
//
// 4. TOKEN BUCKET:
//    - Bucket với max tokens
//    - Each request consumes token
//    - Tokens refill at rate R
//    - Allow bursts (up to bucket size)
//
// 5. LEAKY BUCKET:
//    - Queue with max size
//    - Requests enter at any rate
//    - Leave at constant rate
//    - Smooth traffic
//
// =============================================================================
// 📚 HTTP SECURITY HEADERS (HELMET)
// =============================================================================
//
// X-Frame-Options: DENY/SAMEORIGIN
//    - Chống clickjacking
//    - Attacker embed site trong iframe để trick user
//
// X-Content-Type-Options: nosniff
//    - Chống MIME sniffing
//    - Force browser respect Content-Type header
//
// Strict-Transport-Security: max-age=31536000
//    - HSTS: Bắt buộc HTTPS
//    - Browser tự động upgrade HTTP -> HTTPS
//
// Content-Security-Policy: ...
//    - Whitelist sources cho scripts, styles, images
//    - Chống XSS bằng cách chặn inline scripts
//
// X-XSS-Protection: 1; mode=block
//    - Enable XSS filter trong old browsers
//    - Modern browsers dùng CSP thay thế
//
// Referrer-Policy: no-referrer
//    - Control Referer header
//    - Prevent leak sensitive URLs
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - Express.js, Middleware pattern, REST API
//    - Environment config, 12-Factor App
//
// ✅ MẠNG MÁY TÍNH:
//    - HTTP server, TCP socket, CORS
//    - Client-server model, Request-response cycle
//
// ✅ AN TOÀN HỆ THỐNG:
//    - Helmet security headers, Rate limiting
//    - CORS policy, DDoS protection
//
// ✅ HỆ ĐIỀU HÀNH:
//    - Process signals (SIGTERM, SIGINT)
//    - Graceful shutdown, Exception handling
//    - Environment variables
//
// ✅ CẤU TRÚC DỮ LIỆU:
//    - Sliding window (rate limit)
//    - Queue (middleware chain)
//    - Hash map (in-memory rate limit storage)
//
// ✅ KỸ THUẬT PHẦN MỀM:
//    - Design patterns (Middleware, Chain of Responsibility)
//    - Separation of concerns, Error handling
//    - Fail-fast principle
//
// =============================================================================
