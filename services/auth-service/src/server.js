// =============================================================================
// AUTHENTICATION SERVICE - MAIN SERVER
// =============================================================================
// Lý thuyết: Express.js Framework
// - Minimal web framework cho Node.js
// - Middleware-based architecture
// - RESTful API support
// =============================================================================

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const logger = require('./config/logger');
const authRoutes = require('./routes/auth');

// =============================================================================
// EXPRESS APP INITIALIZATION
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Lý thuyết: Helmet - Security Headers
// - Set various HTTP headers để bảo vệ app
// - X-Frame-Options: Chống clickjacking
// - X-Content-Type-Options: Chống MIME sniffing
// - Strict-Transport-Security: Force HTTPS
// - X-XSS-Protection: Chống XSS attacks
app.use(helmet());

// Lý thuyết: CORS (Cross-Origin Resource Sharing)
// - Browser security: Chặn requests từ domain khác
// - CORS headers cho phép specific origins
// - Cần thiết cho frontend (React) gọi API từ domain khác
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// =============================================================================
// RATE LIMITING
// =============================================================================
// Lý thuyết: Rate Limiting
// - Giới hạn số requests từ một IP trong thời gian nhất định
// - Chống brute force attacks
// - Chống DDoS attacks
// - Sliding window algorithm
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth routes to 5 requests per windowMs
  message: 'Quá nhiều lần đăng nhập/đăng ký, vui lòng thử lại sau 15 phút',
  skipSuccessfulRequests: true // Don't count successful requests
});

// =============================================================================
// BODY PARSING MIDDLEWARE
// =============================================================================
// Lý thuyết: Body Parsing
// - express.json(): Parse JSON request body
// - express.urlencoded(): Parse URL-encoded form data
// - limit: Giới hạn kích thước request body (chống payload attacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================
// Lý thuyết: HTTP Request Logging
// - Log mọi incoming requests
// - Useful cho debugging và monitoring
// - Track: method, URL, status code, response time
app.use((req, res, next) => {
  const start = Date.now();

  // Log sau khi response được gửi
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================
// Lý thuyết: Health Check
// - Endpoint để check service còn sống không
// - Docker/Kubernetes dùng để monitor container health
// - Load balancer dùng để check backend healthy
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =============================================================================
// API ROUTES
// =============================================================================
// Lý thuyết: Route Mounting
// - Prefix /auth cho tất cả auth routes
// - Modular routing (separation of concerns)
app.use('/auth', authLimiter, authRoutes);

// Root endpoint
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

// =============================================================================
// 404 HANDLER
// =============================================================================
// Lý thuyết: 404 Not Found
// - Catch-all route cho undefined endpoints
// - Phải đặt sau tất cả routes khác
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint không tồn tại',
    path: req.path
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
// Lý thuyết: Centralized Error Handling
// - Middleware với 4 parameters (err, req, res, next)
// - Catch tất cả errors từ async routes
// - Single place để handle errors
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  // Lý thuyết: Error Response
  // - Không expose stack trace trong production
  // - Return generic error message
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Lỗi server'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================
// Lý thuyết: Asynchronous Initialization
// - Test database connection trước khi start server
// - Fail fast nếu không connect được database
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Auth Service listening on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
// Lý thuyết: Graceful Shutdown
// - Đóng connections khi nhận SIGTERM/SIGINT
// - Finish processing requests đang chạy
// - Close database connections
// - Docker/Kubernetes gửi SIGTERM trước khi kill container
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  // Lý thuyết: Server.close()
  // - Stop accepting new connections
  // - Wait for existing connections to finish
  // - Timeout after 30s
  const server = app.listen(PORT);

  server.close(() => {
    logger.info('✅ HTTP server closed');

    // Close database connection
    const { closeConnection } = require('./config/database');
    closeConnection().then(() => {
      logger.info('👋 Graceful shutdown completed');
      process.exit(0);
    });
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error('⚠️  Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// UNHANDLED REJECTION/EXCEPTION HANDLERS
// =============================================================================
// Lý thuyết: Process-level Error Handlers
// - uncaughtException: Synchronous errors không được catch
// - unhandledRejection: Promise rejections không được catch
// - Best practice: Log và crash, để orchestrator restart
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app; // Export cho testing
