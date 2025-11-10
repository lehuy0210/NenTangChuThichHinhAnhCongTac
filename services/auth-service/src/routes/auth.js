// =============================================================================
// AUTH ROUTES - RESTFUL API ENDPOINTS
// =============================================================================
// 📚 ÁP DỤNG KIẾN THỨC TỪ ĐỀ CƯƠNG MÔN HỌC ĐẠI HỌC:
//
// 1️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI (CONG NGHE LAP TRINH.pdf):
//    📖 CHƯƠNG 4: RESTFUL API DESIGN
//       - 4.1 REST Principles: Resource-based URLs, HTTP methods
//       - 4.2 HTTP Methods & CRUD: POST=Create, GET=Read, PUT=Update, DELETE=Delete
//       - 4.3 Resource Naming: /users, /auth/login (nouns, not verbs)
//       - 4.4 Stateless: Each request self-contained with token
//       - Ví dụ: POST /auth/register vs ❌ /registerUser
//
//    📖 CHƯƠNG 5: JSON API STANDARDS
//       - 5.1 Request Format: application/json content-type
//       - 5.2 Response Structure: {success, data, error} pattern
//       - 5.3 Error Responses: Consistent error format
//
// 2️⃣ MÔN MẠNG MÁY TÍNH (MANG MAY TINH.pdf):
//    📖 CHƯƠNG 4: APPLICATION LAYER - HTTP PROTOCOL
//       - 4.1 HTTP Request-Response: Client sends, server responds
//       - 4.2 HTTP Status Codes:
//         * 2xx Success: 200 OK, 201 Created, 204 No Content
//         * 4xx Client Error: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict
//         * 5xx Server Error: 500 Internal Server Error
//       - 4.3 HTTP Headers: Content-Type, Authorization
//       - Ví dụ: 401 = không có token, 403 = có token nhưng không đủ quyền
//
//    📖 CHƯƠNG 3: CLIENT-SERVER ARCHITECTURE
//       - 3.1 Request-Response Model: Synchronous communication
//       - 3.2 Stateless Protocol: HTTP doesn't maintain state
//
// 3️⃣ MÔN AN TOÀN VÀ BẢO MẬT HỆ THỐNG (AN TOAN HE THONG.pdf):
//    📖 CHƯƠNG 3: AUTHENTICATION & AUTHORIZATION
//       - 3.1 Authentication (AuthN): Who are you? (Login)
//       - 3.2 Authorization (AuthZ): What can you do? (Permissions)
//       - 3.3 Authentication Flow:
//         * Register → Hash password → Store in DB → Return token
//         * Login → Verify password → Return token
//         * Logout → Blacklist token
//       - Ví dụ: AuthN = đăng nhập, AuthZ = admin vs user role
//
//    📖 CHƯƠNG 2: PASSWORD SECURITY
//       - 2.1 Registration: Hash password before storing
//       - 2.2 Login: Compare hashed passwords
//
// 4️⃣ MÔN KỸ THUẬT PHẦN MỀM (KY THUAT PHAN MEM.pdf):
//    📖 CHƯƠNG 4: API DESIGN PRINCIPLES
//       - 4.1 Consistency: Same pattern for all endpoints
//       - 4.2 Error Handling: Predictable error responses
//       - 4.3 Versioning: /v1/auth/login for future compatibility
//
//    📖 CHƯƠNG 5: DESIGN PATTERNS
//       - 5.1 Middleware Pattern: validateRegister → controller
//       - 5.2 Controller Pattern: Separate routing from business logic
//       - 5.3 Error Handling Pattern: Try-catch in all routes
//
// 5️⃣ MÔN CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT 1 (CAU TRUC DU LIEU 1.pdf):
//    📖 CHƯƠNG 4: HASH TABLES & LOOKUPS
//       - 4.1 Email Lookup: B-Tree index → O(log n)
//       - Ví dụ: User.findByEmail() uses index
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
