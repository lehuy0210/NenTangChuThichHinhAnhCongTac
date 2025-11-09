// =============================================================================
// AUTH ROUTES - RESTFUL API ENDPOINTS
// =============================================================================
// 📚 LIÊN HỆ VỚI ĐỀ CƯƠNG CÁC MÔN HỌC:
//
// 1️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    ✅ RESTful API: Architectural style cho web services
//    ✅ HTTP Methods: GET, POST, PUT, DELETE (CRUD)
//    ✅ Status Codes: 200, 201, 400, 401, 403, 404, 500
//    ✅ JSON API: Request/Response format
//
// 2️⃣ MÔN MẠNG MÁY TÍNH (Networking):
//    ✅ HTTP Protocol: Request-response model
//    ✅ Headers: Authorization, Content-Type
//    ✅ Status Codes: 2xx success, 4xx client error, 5xx server error
//    ✅ Client-Server Architecture
//
// 3️⃣ MÔN AN TOÀN HỆ THỐNG:
//    ✅ Authentication Flow: Login, logout, token management
//    ✅ Authorization: Role-based access control
//    ✅ Security Headers: CORS, Rate limiting
//
// 4️⃣ MÔN KỸ THUẬT PHẦN MỀM:
//    ✅ API Design: RESTful principles, resource naming
//    ✅ Error Handling: Consistent error responses
//    ✅ Middleware Pattern: Express routing
//
// =============================================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, blacklistToken, verifyToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const logger = require('../config/logger');

// =============================================================================
// RESTFUL API PRINCIPLES
// =============================================================================
// 📚 MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//
// REST = REpresentational State Transfer
//    - Resource-based (users, posts, comments)
//    - HTTP methods = CRUD operations
//    - Stateless: Mỗi request độc lập
//    - JSON format: Standard data format
//
// HTTP METHODS & CRUD:
//    - POST   -> Create (C)
//    - GET    -> Read   (R)
//    - PUT    -> Update (U)
//    - DELETE -> Delete (D)
//
// RESOURCE NAMING:
//    ✅ /users (plural noun)
//    ✅ /users/123 (resource ID)
//    ❌ /getUsers (verb in URL)
//    ❌ /user (singular)
//
// STATUS CODES:
//    2xx Success: 200 OK, 201 Created, 204 No Content
//    4xx Client Error: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
//    5xx Server Error: 500 Internal Server Error, 503 Service Unavailable

// =============================================================================
// POST /auth/register - ĐĂNG KÝ TÀI KHOẢN
// =============================================================================
// 📚 MÔN CÔNG NGHỆ HIỆN ĐẠI - RESTFUL API:
//    Method: POST (tạo resource mới)
//    Path: /auth/register
//    Status: 201 Created (success)
//
// 📚 AUTHENTICATION FLOW:
//    1. Client gửi credentials (email, password)
//    2. Validate input (validateRegister middleware)
//    3. Check email exists
//    4. Hash password (bcrypt trong User model)
//    5. Create user in database
//    6. Generate JWT token
//    7. Return user + token

router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, fullName, avatarUrl } = req.body;

    // =========================================================================
    // STEP 1: CHECK EMAIL EXISTS
    // =========================================================================
    // 📚 CSDL: B-Tree index lookup - O(log n)
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      // 📚 MẠNG: HTTP 409 Conflict
      // Resource already exists
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng',
        code: 'EMAIL_EXISTS'
      });
    }

    // =========================================================================
    // STEP 2: CREATE USER
    // =========================================================================
    // 📚 CSDL: INSERT INTO users ...
    // Password tự động hash trong beforeCreate hook
    const user = await User.create({
      email,
      password, // Will be hashed by bcrypt
      fullName,
      avatarUrl
    });

    // =========================================================================
    // STEP 3: GENERATE JWT TOKEN
    // =========================================================================
    // 📚 AN TOÀN: HMAC-SHA256 signature
    const token = generateToken(user);

    logger.info('User registered', { userId: user.id, email: user.email });

    // =========================================================================
    // STEP 4: RETURN RESPONSE
    // =========================================================================
    // 📚 MẠNG: HTTP 201 Created
    //    - Resource mới đã được tạo
    //    - Return created resource + token
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: user.toJSON(), // Remove password
        token
      }
    });

  } catch (error) {
    logger.error('Register error:', { error: error.message });

    // 📚 CSDL: Unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }

    // 📚 MẠNG: HTTP 500 Internal Server Error
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký tài khoản'
    });
  }
});

// =============================================================================
// POST /auth/login - ĐĂNG NHẬP
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - AUTHENTICATION:
//    - Verify credentials (email + password)
//    - Generate session token (JWT)
//    - Return token to client
//
// 📚 SECURITY CONSIDERATIONS:
//    - Rate limiting: Prevent brute-force attacks
//    - Constant-time comparison: Prevent timing attacks (bcrypt.compare)
//    - Generic error message: Don't leak user existence

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // =========================================================================
    // STEP 1: FIND USER BY EMAIL
    // =========================================================================
    // 📚 CSDL: SELECT * FROM users WHERE email = ?
    const user = await User.findByEmail(email);

    if (!user) {
      // 📚 AN TOÀN: Generic error message
      // Không nói "Email không tồn tại" vì:
      // - Attacker có thể enumerate users
      // - Biết được emails nào có trong hệ thống
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // =========================================================================
    // STEP 2: VALIDATE PASSWORD
    // =========================================================================
    // 📚 AN TOÀN: Bcrypt compare (constant-time)
    // - Hash input password với salt từ stored hash
    // - Compare hashes
    // - Constant-time prevents timing attacks
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc password không đúng',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // =========================================================================
    // STEP 3: CHECK ACCOUNT STATUS
    // =========================================================================
    // 📚 CSDL: Soft delete pattern
    // isActive = false -> account disabled
    if (!user.isActive) {
      // 📚 MẠNG: HTTP 403 Forbidden
      // Authenticated but not allowed
      return res.status(403).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // =========================================================================
    // STEP 4: GENERATE TOKEN
    // =========================================================================
    const token = generateToken(user);

    logger.info('User logged in', { userId: user.id, email: user.email });

    // =========================================================================
    // STEP 5: RETURN RESPONSE
    // =========================================================================
    // 📚 MẠNG: HTTP 200 OK
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    logger.error('Login error:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
});

// =============================================================================
// POST /auth/logout - ĐĂNG XUẤT
// =============================================================================
// 📚 MÔN AN TOÀN - TOKEN REVOCATION:
//    - JWT = stateless -> cannot "delete" token
//    - Solution: Add to blacklist (Redis)
//    - Token in blacklist = invalid
//
// 📚 FLOW:
//    1. Verify token (middleware)
//    2. Add token to Redis blacklist với TTL
//    3. Client should delete token from localStorage

router.post('/logout', verifyToken, async (req, res) => {
  try {
    // =========================================================================
    // BLACKLIST TOKEN
    // =========================================================================
    // 📚 CTDL: Redis SET with TTL - O(1)
    // TTL = thời gian còn lại đến expiration
    await blacklistToken(req.token);

    logger.info('User logged out', { userId: req.user.id, email: req.user.email });

    // =========================================================================
    // RETURN SUCCESS
    // =========================================================================
    // 📚 MẠNG: HTTP 200 OK
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });

  } catch (error) {
    logger.error('Logout error:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng xuất'
    });
  }
});

// =============================================================================
// GET /auth/me - LẤY THÔNG TIN USER HIỆN TẠI
// =============================================================================
// 📚 MÔN CÔNG NGHỆ HIỆN ĐẠI - RESTFUL API:
//    Method: GET (read operation)
//    Authentication: Required (verifyToken middleware)
//    Returns: Current user's info from token

router.get('/me', verifyToken, async (req, res) => {
  try {
    // =========================================================================
    // FETCH USER FROM DATABASE
    // =========================================================================
    // 📚 CSDL: SELECT * FROM users WHERE id = ?
    // Primary key lookup: O(log n) với B-Tree index
    const user = await User.findByPk(req.user.id);

    if (!user) {
      // User trong token không tồn tại trong DB
      // (Có thể bị xóa sau khi token được issue)
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    // =========================================================================
    // RETURN USER INFO
    // =========================================================================
    // 📚 MẠNG: HTTP 200 OK
    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Get user info error:', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
});

// =============================================================================
// GET /auth/verify - VERIFY TOKEN
// =============================================================================
// 📚 MÔN AN TOÀN - TOKEN VERIFICATION:
//    - Client có thể gọi API này để check token còn valid
//    - Dùng khi: App refresh, check before API calls
//    - verifyToken middleware đã verify -> nếu đến đây = valid

router.get('/verify', verifyToken, (req, res) => {
  // 📚 AN TOÀN: Token đã được verify bởi middleware
  // Nếu đến được đây -> token hợp lệ

  // 📚 MẠNG: HTTP 200 OK
  res.json({
    success: true,
    message: 'Token hợp lệ',
    data: {
      user: req.user // User info từ token payload
    }
  });
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================
module.exports = router;

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: HTTP STATUS CODES
// =============================================================================
//
// === 2xx SUCCESS ===
//    200 OK: Request thành công
//    201 Created: Resource mới được tạo (POST)
//    204 No Content: Thành công, không return data (DELETE)
//
// === 4xx CLIENT ERROR ===
//    400 Bad Request: Invalid syntax/data
//    401 Unauthorized: Chưa authenticated (no token/invalid token)
//    403 Forbidden: Authenticated nhưng không có permission
//    404 Not Found: Resource không tồn tại
//    409 Conflict: Resource đã tồn tại (duplicate)
//    422 Unprocessable Entity: Validation errors
//    429 Too Many Requests: Rate limit exceeded
//
// === 5xx SERVER ERROR ===
//    500 Internal Server Error: Lỗi server chung
//    502 Bad Gateway: Upstream server error
//    503 Service Unavailable: Server overloaded/maintenance
//
// =============================================================================
// 📚 RESTFUL API BEST PRACTICES
// =============================================================================
//
// 1. RESOURCE NAMING:
//    ✅ /users (plural)
//    ✅ /users/123
//    ✅ /users/123/posts
//    ❌ /getUser (verb)
//    ❌ /user (singular)
//
// 2. HTTP METHODS:
//    GET /users        -> List users
//    POST /users       -> Create user
//    GET /users/123    -> Get user 123
//    PUT /users/123    -> Update user 123 (full replace)
//    PATCH /users/123  -> Update user 123 (partial)
//    DELETE /users/123 -> Delete user 123
//
// 3. VERSIONING:
//    ✅ /v1/users
//    ✅ /api/v2/users
//    ✅ Header: Accept: application/vnd.api.v2+json
//
// 4. FILTERING & PAGINATION:
//    GET /users?role=admin&limit=10&offset=20
//    GET /users?page=2&per_page=10
//
// 5. ERROR RESPONSES:
//    {
//      "success": false,
//      "error": "Message for user",
//      "code": "ERROR_CODE",
//      "details": [...]
//    }
//
// 6. SUCCESS RESPONSES:
//    {
//      "success": true,
//      "data": {...},
//      "metadata": { "page": 1, "total": 100 }
//    }
//
// =============================================================================
// 📚 AUTHENTICATION vs AUTHORIZATION
// =============================================================================
//
// AUTHENTICATION (AuthN): "Bạn là ai?"
//    - Verify identity
//    - Login với credentials
//    - Phương pháp:
//      + Basic Auth: username:password base64
//      + Bearer Token: JWT, OAuth
//      + API Key: X-API-Key header
//      + OAuth 2.0: Authorization code flow
//
// AUTHORIZATION (AuthZ): "Bạn có quyền gì?"
//    - Verify permissions
//    - Check user có quyền access resource
//    - Phương pháp:
//      + RBAC: Role-Based Access Control
//      + ABAC: Attribute-Based Access Control
//      + ACL: Access Control List
//
// EXAMPLE:
//    - Authentication: User login -> JWT token
//    - Authorization: User với role="admin" có thể DELETE users
//                    User với role="user" chỉ có thể GET users
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - RESTful API design, HTTP methods, JSON format
//    - Status codes, Resource naming
//
// ✅ MẠNG MÁY TÍNH:
//    - HTTP protocol, Request-response model
//    - Headers, Status codes, Client-server architecture
//
// ✅ AN TOÀN HỆ THỐNG:
//    - Authentication flow, Token management
//    - Authorization, RBAC, Generic error messages
//
// ✅ KỸ THUẬT PHẦN MỀM:
//    - API design patterns, Error handling
//    - Middleware pattern, Separation of concerns
//
// ✅ CƠ SỞ DỮ LIỆU:
//    - CRUD operations, B-Tree lookups
//    - Unique constraints, Soft delete
//
// ✅ CẤU TRÚC DỮ LIỆU:
//    - O(1) Redis operations, O(log n) database lookups
//
// =============================================================================
