// =============================================================================
// MAIN SERVER - VERSION ĐƠN GIẢN
// =============================================================================
// Lý thuyết: Express.js
// - Framework cho Node.js để tạo web server
// - Xử lý HTTP requests (GET, POST, PUT, DELETE)
// - Middleware-based architecture
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');

// =============================================================================
// Tạo Express app
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Authentication Service (Simple Version)...\n');

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Lý thuyết: CORS (Cross-Origin Resource Sharing)
// - Browser chặn requests từ domain khác (security)
// - CORS cho phép frontend (React) gọi API từ domain khác
// - Ví dụ: Frontend http://localhost:3000 → Backend http://localhost:3001
app.use(cors());

// Lý thuyết: Body Parsing
// - express.json(): Parse JSON request body
// - Cho phép đọc req.body trong route handlers
app.use(express.json());

// Lý thuyết: Request Logging
// - Log mọi incoming requests để debug
// - Thấy được: Method, URL, Status code
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Authentication Service (Simple Version)',
    version: '1.0.0',
    message: 'Dành cho sinh viên năm 2 - Dễ hiểu hơn!',
    endpoints: {
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      me: 'GET /auth/me (cần token)'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint không tồn tại'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Lỗi server'
  });
});

// =============================================================================
// START SERVER
// =============================================================================
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start listening
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🎉 Server đang chạy tại: http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
      console.log('='.repeat(60) + '\n');

      console.log('📚 Hướng dẫn test API:');
      console.log('1. Đăng ký: POST http://localhost:3001/auth/register');
      console.log('2. Đăng nhập: POST http://localhost:3001/auth/login');
      console.log('3. Lấy info: GET http://localhost:3001/auth/me\n');
    });
  } catch (error) {
    console.error('❌ Không thể start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
