// =============================================================================
// AUTHENTICATION MIDDLEWARE - JWT + REDIS BLACKLIST
// =============================================================================
// 📚 LIÊN HỆ VỚI ĐỀ CƯƠNG CÁC MÔN HỌC:
//
// 1️⃣ MÔN AN TOÀN HỆ THỐNG (Security):
//    ✅ JWT: JSON Web Token - stateless authentication
//    ✅ HMAC: Hash-based Message Authentication Code
//    ✅ Token Blacklist: Revoke tokens khi logout
//    ✅ Signature Verification: Chống giả mạo token
//    ✅ Expiration: Token tự động hết hạn
//
// 2️⃣ MÔN MẠNG MÁY TÍNH (Networking):
//    ✅ HTTP Headers: Authorization header, Bearer scheme
//    ✅ Client-Server Auth: Stateless authentication flow
//    ✅ Session vs Token: Session-based vs Token-based auth
//    ✅ TCP Connection: Redis connection (persistent TCP)
//
// 3️⃣ MÔN TOÁN TIN HỌC (Discrete Math):
//    ✅ HMAC SHA-256: Cryptographic hash function
//    ✅ Base64 Encoding: Binary -> ASCII conversion
//    ✅ Digital Signature: Signature = HMAC(Header.Payload, Secret)
//    ✅ One-Way Function: Cannot reverse HMAC
//
// 4️⃣ MÔN CẤU TRÚC DỮ LIỆU & GIẢI THUẬT:
//    ✅ Hash Table: Redis key-value store - O(1)
//    ✅ String Operations: Base64 encode/decode
//    ✅ Time Complexity: Token verification - O(1)
//    ✅ TTL: Time To Live in Redis
//
// 5️⃣ MÔN CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    ✅ Middleware Pattern: Express middleware chain
//    ✅ Stateless Authentication: No server-side sessions
//    ✅ Bearer Token: OAuth 2.0 Bearer token scheme
//    ✅ Async/Await: Asynchronous Redis operations
//
// 6️⃣ MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (OOP):
//    ✅ Higher-Order Functions: requireRole() returns middleware
//    ✅ Closure: Middleware captures allowedRoles
//    ✅ Factory Pattern: createValidator pattern
//
// =============================================================================

const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const logger = require('../config/logger');

// =============================================================================
// PHẦN 1: JWT (JSON WEB TOKEN) - GIẢI THÍCH CHI TIẾT
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - JWT STRUCTURE:
//
// JWT CẤU TRÚC: HEADER.PAYLOAD.SIGNATURE
//
// EXAMPLE JWT:
//    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20iLCJleHAiOjE3MTAwMDAwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
//    │                                       │                                                                     │
//    └─────────── HEADER ────────────────────┴─────────────────────── PAYLOAD ──────────────────────────────────┴────────── SIGNATURE ─────────
//
// === PART 1: HEADER ===
// Base64URL encoded JSON:
//    {
//      "alg": "HS256",   // Algorithm: HMAC SHA-256
//      "typ": "JWT"      // Type: JSON Web Token
//    }
//
// === PART 2: PAYLOAD ===
// Base64URL encoded JSON (Claims):
//    {
//      "userId": "123",
//      "email": "user@test.com",
//      "exp": 1710000000,    // Expiration (Unix timestamp)
//      "iat": 1709913600     // Issued At (Unix timestamp)
//    }
//
// 📚 LƯU Ý BẢO MẬT:
//    - Payload KHÔNG được mã hóa, chỉ được encode (base64)
//    - Ai cũng có thể decode payload (dùng base64 decode)
//    - => KHÔNG BAO GIỜ lưu password, credit card, secret trong JWT!
//
// === PART 3: SIGNATURE ===
// HMAC SHA-256 signature:
//    signature = HMAC-SHA256(
//      base64UrlEncode(header) + "." + base64UrlEncode(payload),
//      secret_key
//    )
//
// 📚 MÔN TOÁN TIN HỌC - HMAC ALGORITHM:
//
// HMAC (Hash-based Message Authentication Code):
//    HMAC(K, m) = H((K' ⊕ opad) || H((K' ⊕ ipad) || m))
//
// Trong đó:
//    - H = hash function (SHA-256)
//    - K = secret key
//    - m = message (header.payload)
//    - K' = key padded to block size
//    - opad = outer padding (0x5c5c5c...)
//    - ipad = inner padding (0x363636...)
//    - ⊕ = XOR operation
//    - || = concatenation
//
// VÍ DỤ CỤ THỂ:
//    message = "eyJhbGci...InR5cCI6IkpXVCJ9.eyJ1c2VySWQi..."
//    secret = "my-secret-key-123"
//    signature = HMAC-SHA256(message, secret)
//              = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
//
// CHỐNG GIẢ MẠO (Tampering Protection):
//    - Attacker sửa payload: { userId: "123" } -> { userId: "1" } (admin)
//    - Encode lại: eyJhbGci... (payload mới)
//    - Nhưng không biết secret key -> không tạo được signature mới
//    - Server verify signature -> FAIL -> reject token
//
// =============================================================================
// PHẦN 2: BASE64URL ENCODING
// =============================================================================
// 📚 MÔN TOÁN TIN HỌC - ENCODING:
//
// BASE64URL vs BASE64:
//    - Base64: Sử dụng +, /, =
//    - Base64URL: Thay + -> -, / -> _, bỏ =
//    - Lý do: +, /, = không URL-safe
//
// ENCODING PROCESS:
//    1. Chuyển string -> binary (UTF-8)
//       "JWT" -> 01001010 01010111 01010100
//
//    2. Chia thành groups of 6 bits
//       010010 | 100101 | 011101 | 010100
//
//    3. Map mỗi 6-bit group -> base64 character
//       010010 = 18 = 'S'
//       100101 = 37 = 'l'
//       011101 = 29 = 'd'
//       010100 = 20 = 'U'
//       => "JWT" -> "SldU"
//
// 📚 MÔN CẤU TRÚC DỮ LIỆU:
//    - Base64 alphabet: A-Z, a-z, 0-9, -, _ (64 chars)
//    - Lookup table: O(1) encode/decode
//
// =============================================================================
// PHẦN 3: REDIS - IN-MEMORY DATA STORE
// =============================================================================
// 📚 MÔN CẤU TRÚC DỮ LIỆU - REDIS DATA STRUCTURES:
//
// REDIS = Remote Dictionary Server
//    - In-memory key-value store
//    - Cực nhanh: O(1) cho GET/SET
//    - Persistent: Có thể lưu xuống disk
//
// USE CASES:
//    - Session storage
//    - Cache layer
//    - Message queue (Pub/Sub)
//    - Rate limiting
//    - Token blacklist (chúng ta dùng)
//
// REDIS vs DATABASE:
//    - Redis: RAM-based, O(1), ~1ms response
//    - PostgreSQL: Disk-based, O(log n), ~10ms response
//    - Redis: Volatile (mất data khi crash, nếu không config persist)
//    - PostgreSQL: Durable (ACID)
//
// TTL (Time To Live):
//    - Tự động xóa key sau X giây
//    - Perfect cho token blacklist
//    - VD: Token hết hạn sau 24h -> TTL = 86400s
//
// 📚 MÔN HỆ ĐIỀU HÀNH:
//    - Redis single-threaded (1 thread xử lý commands)
//    - Event loop: Giống Node.js
//    - Non-blocking I/O

let redisClient;

/**
 * Khởi tạo Redis connection
 * 📚 MẠNG MÁY TÍNH: TCP persistent connection
 */
async function initRedis() {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD
  });

  // 📚 HỆ ĐIỀU HÀNH: Event-driven I/O
  redisClient.on('error', (err) => {
    logger.error('Redis error:', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  // 📚 MẠNG: TCP handshake
  await redisClient.connect();
}

// Initialize Redis connection
initRedis().catch((err) => {
  logger.error('Failed to initialize Redis:', { error: err.message });
});

// =============================================================================
// MIDDLEWARE 1: VERIFY TOKEN (XÁC THỰC TOKEN)
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - AUTHENTICATION FLOW:
//
// FLOW:
//    1. Client gửi request với header: "Authorization: Bearer <token>"
//    2. Extract token từ header
//    3. Check token có trong blacklist không (Redis lookup - O(1))
//    4. Verify token signature (HMAC verify)
//    5. Check token expiration
//    6. Nếu valid -> set req.user và next()
//    7. Nếu invalid -> return 401 Unauthorized
//
// TIME COMPLEXITY:
//    - Extract token: O(1)
//    - Redis GET: O(1)
//    - HMAC verify: O(n) với n = token length (~200 chars)
//    - Total: O(n) ≈ O(1) (n is constant)

/**
 * Verify JWT token middleware
 * 📚 CÔNG NGHỆ HIỆN ĐẠI: Express middleware pattern
 */
const verifyToken = async (req, res, next) => {
  try {
    // =========================================================================
    // STEP 1: EXTRACT TOKEN FROM HEADER
    // =========================================================================
    // 📚 MÔN MẠNG MÁY TÍNH - HTTP AUTHORIZATION HEADER:
    //
    // BEARER TOKEN SCHEME (RFC 6750):
    //    Authorization: Bearer <token>
    //
    // VÍ DỤ:
    //    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    //
    // "Bearer" = token type (OAuth 2.0 standard)
    // Alternatives: Basic, Digest, HOBA, Mutual, AWS4-HMAC-SHA256

    const authHeader = req.headers.authorization;

    // Check header tồn tại và có format đúng
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy token. Vui lòng đăng nhập.',
        code: 'NO_TOKEN'
      });
    }

    // 📚 CTDL: String substring - O(n)
    // "Bearer xyz123" -> "xyz123"
    const token = authHeader.substring(7); // Length of "Bearer " = 7

    // =========================================================================
    // STEP 2: CHECK BLACKLIST (REDIS)
    // =========================================================================
    // 📚 MÔN CẤU TRÚC DỮ LIỆU - HASH TABLE LOOKUP:
    //
    // REDIS GET OPERATION:
    //    - Time complexity: O(1)
    //    - Redis dùng hash table internally
    //    - Key: "blacklist:<token>"
    //    - Value: "true" hoặc null
    //
    // WHY BLACKLIST?
    //    - JWT = stateless -> server không lưu token
    //    - Khi logout -> không thể "xóa" token (vì không lưu)
    //    - Solution: Blacklist = danh sách token bị revoke
    //    - Token trong blacklist = invalid
    //
    // TTL (Time To Live):
    //    - Token hết hạn sau 24h -> TTL = 24h
    //    - Redis tự động xóa key sau TTL
    //    - Tiết kiệm memory

    const isBlacklisted = await redisClient.get(`blacklist:${token}`);

    if (isBlacklisted) {
      // 📚 AN TOÀN: Token đã logout -> reject
      return res.status(401).json({
        success: false,
        error: 'Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại.',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    // =========================================================================
    // STEP 3: VERIFY TOKEN SIGNATURE & EXPIRATION
    // =========================================================================
    // 📚 MÔN AN TOÀN HỆ THỐNG - JWT VERIFICATION:
    //
    // jwt.verify() PERFORMS:
    //    1. Decode header + payload (base64url decode)
    //    2. Compute signature: HMAC-SHA256(header.payload, secret)
    //    3. Compare computed signature với signature trong token
    //    4. Check expiration: now < exp
    //
    // VERIFICATION STEPS:
    //    Token: "header.payload.signature"
    //
    //    Step 1: Decode
    //       header = base64UrlDecode(token.split('.')[0])
    //       payload = base64UrlDecode(token.split('.')[1])
    //       receivedSignature = token.split('.')[2]
    //
    //    Step 2: Compute expected signature
    //       message = base64UrlEncode(header) + "." + base64UrlEncode(payload)
    //       expectedSignature = HMAC-SHA256(message, JWT_SECRET)
    //
    //    Step 3: Compare signatures (constant-time)
    //       if (expectedSignature !== receivedSignature) -> FAIL
    //
    //    Step 4: Check expiration
    //       now = Math.floor(Date.now() / 1000)
    //       if (now >= payload.exp) -> EXPIRED
    //
    // 📚 TOÁN TIN HỌC: HMAC is a MAC (Message Authentication Code)
    //    - Ensures: Authentication (who created it)
    //    - Ensures: Integrity (not tampered)
    //    - Does NOT ensure: Confidentiality (payload is public)

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 📚 TOKEN PAYLOAD STRUCTURE:
    // {
    //   userId: "550e8400-e29b-41d4-a716-446655440000",
    //   email: "user@test.com",
    //   role: "user",
    //   iat: 1710000000,  // Issued At (Unix timestamp)
    //   exp: 1710086400   // Expiration (Unix timestamp)
    // }

    // =========================================================================
    // STEP 4: SET req.user (FOR DOWNSTREAM MIDDLEWARE)
    // =========================================================================
    // 📚 CÔNG NGHỆ HIỆN ĐẠI: Middleware pattern
    //    - Mỗi middleware có thể modify req/res
    //    - Downstream middleware/controller access req.user
    //    - Chain of Responsibility pattern

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    req.token = token; // Save for blacklistToken() later

    // =========================================================================
    // STEP 5: NEXT() - PASS TO NEXT MIDDLEWARE
    // =========================================================================
    // 📚 CÔNG NGHỆ HIỆN ĐẠI: Express middleware chain
    next();

  } catch (error) {
    logger.error('Token verification error:', {
      error: error.message,
      name: error.name
    });

    // =========================================================================
    // ERROR HANDLING - DIFFERENT JWT ERRORS
    // =========================================================================
    // 📚 AN TOÀN HỆ THỐNG: Specific error codes

    // Error 1: Token expired
    // 📚 HỆ ĐIỀU HÀNH: Time management
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }

    // Error 2: Invalid token (signature mismatch)
    // 📚 TOÁN TIN: HMAC verification failed
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ.',
        code: 'INVALID_TOKEN'
      });
    }

    // Error 3: Token not active yet (nbf - not before)
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        error: 'Token chưa có hiệu lực.',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    // Other errors
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực token.'
    });
  }
};

// =============================================================================
// MIDDLEWARE 2: REQUIRE ROLE (AUTHORIZATION)
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - AUTHORIZATION:
//
// AUTHENTICATION vs AUTHORIZATION:
//    - Authentication: "Bạn là ai?" (Who are you?)
//      -> Verify identity (login, JWT)
//
//    - Authorization: "Bạn có quyền gì?" (What can you do?)
//      -> Verify permissions (roles, ACL)
//
// RBAC (Role-Based Access Control):
//    - User có 1 hoặc nhiều roles
//    - Mỗi role có permissions
//    - VD: role "admin" -> có quyền DELETE user
//          role "user" -> không có quyền DELETE user
//
// 📚 MÔN LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - Higher-order function: requireRole() returns middleware
//    - Closure: Middleware "nhớ" allowedRoles

/**
 * Require specific role(s) middleware
 * 📚 OOP: Higher-order function + Closure
 *
 * @param {...string} allowedRoles - Roles allowed to access
 * @returns {Function} Express middleware
 */
const requireRole = (...allowedRoles) => {
  // 📚 OOP: CLOSURE
  // Middleware function này "nhớ" allowedRoles

  return (req, res, next) => {
    // =========================================================================
    // STEP 1: CHECK AUTHENTICATED
    // =========================================================================
    // 📚 AN TOÀN: Phải authenticated trước khi check authorization

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Chưa xác thực. Vui lòng đăng nhập.',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // =========================================================================
    // STEP 2: CHECK ROLE
    // =========================================================================
    // 📚 CTDL: Array.includes() - Linear search O(n)
    //    - n = số roles allowed (thường < 5)
    //    - O(n) ≈ O(1) khi n nhỏ
    //
    // VÍ DỤ:
    //    allowedRoles = ['admin', 'editor']
    //    req.user.role = 'user'
    //    -> 'user' not in ['admin', 'editor']
    //    -> 403 Forbidden

    if (!allowedRoles.includes(req.user.role)) {
      // 📚 MẠNG MÁY TÍNH - HTTP STATUS CODES:
      //    - 401 Unauthorized: Not authenticated (no token, invalid token)
      //    - 403 Forbidden: Authenticated but no permission

      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền truy cập tài nguyên này.',
        code: 'FORBIDDEN',
        required: allowedRoles,
        actual: req.user.role
      });
    }

    // =========================================================================
    // STEP 3: NEXT() - HAS PERMISSION
    // =========================================================================
    next();
  };
};

// =============================================================================
// FUNCTION 1: BLACKLIST TOKEN (LOGOUT)
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - TOKEN REVOCATION:
//
// PROBLEM: JWT is stateless
//    - Server không lưu token
//    - Token valid cho đến khi expire
//    - Nếu user logout -> token vẫn valid!
//
// SOLUTION: Blacklist
//    - Lưu revoked tokens trong Redis
//    - Verify token -> check blacklist
//    - Token trong blacklist = invalid
//
// TTL OPTIMIZATION:
//    - Token expires sau 24h
//    - Blacklist token với TTL = thời gian còn lại
//    - VD: Token còn 10 giờ -> TTL = 10 * 3600 = 36000s
//    - Redis tự động xóa sau 10 giờ (khi token hết hạn anyway)
//
// 📚 MÔN CTDL - MEMORY OPTIMIZATION:
//    - Không cần lưu blacklist mãi mãi
//    - TTL = automatic garbage collection
//    - Memory usage: O(active_tokens)

/**
 * Blacklist a token (revoke it)
 * 📚 CTDL: Redis SET with TTL - O(1)
 *
 * @param {string} token - JWT token to blacklist
 */
const blacklistToken = async (token) => {
  try {
    // =========================================================================
    // STEP 1: DECODE TOKEN (NO VERIFY)
    // =========================================================================
    // 📚 AN TOÀN: jwt.decode() không verify signature
    //    - Chỉ decode base64 để lấy payload
    //    - Dùng để extract expiration time

    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      throw new Error('Token không hợp lệ');
    }

    // =========================================================================
    // STEP 2: CALCULATE TTL
    // =========================================================================
    // 📚 HỆ ĐIỀU HÀNH - TIME MANAGEMENT:
    //
    // Unix timestamp: Số giây từ 1970-01-01 00:00:00 UTC
    //    - decoded.exp: Expiration time (Unix timestamp)
    //    - Date.now(): Milliseconds from epoch
    //    - Date.now() / 1000: Seconds from epoch
    //
    // TTL = exp - now (số giây còn lại)

    const now = Math.floor(Date.now() / 1000); // Current time (seconds)
    const ttl = decoded.exp - now;             // Time to live (seconds)

    // =========================================================================
    // STEP 3: ADD TO BLACKLIST (IF NOT EXPIRED)
    // =========================================================================
    // 📚 CTDL: Redis SETEX - O(1)
    //    - SETEX key ttl value
    //    - Tự động xóa sau ttl giây

    if (ttl > 0) {
      // Redis command: SETEX blacklist:<token> <ttl> "true"
      await redisClient.setEx(`blacklist:${token}`, ttl, 'true');

      logger.info('Token blacklisted', {
        ttl: ttl,
        expiresIn: `${Math.floor(ttl / 3600)} hours`
      });
    } else {
      // Token đã hết hạn -> không cần blacklist
      logger.debug('Token already expired, no need to blacklist');
    }

    return true;

  } catch (error) {
    logger.error('Blacklist token error:', { error: error.message });
    throw error;
  }
};

// =============================================================================
// FUNCTION 2: GENERATE TOKEN (LOGIN)
// =============================================================================
// 📚 MÔN AN TOÀN HỆ THỐNG - JWT GENERATION:
//
// GENERATION PROCESS:
//    1. Create payload (user data)
//    2. Create header (algorithm info)
//    3. Compute signature: HMAC-SHA256(header.payload, secret)
//    4. Concatenate: header.payload.signature
//    5. Base64URL encode each part
//
// 📚 TOÁN TIN HỌC - HMAC COMPUTATION:
//
// STEP-BY-STEP:
//    header = { alg: "HS256", typ: "JWT" }
//    payload = { userId: "123", email: "user@test.com", exp: 1710000000 }
//    secret = "my-secret-key"
//
//    encodedHeader = base64UrlEncode(JSON.stringify(header))
//                  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
//
//    encodedPayload = base64UrlEncode(JSON.stringify(payload))
//                   = "eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20iLCJleHAiOjE3MTAwMDAwMDB9"
//
//    message = encodedHeader + "." + encodedPayload
//
//    signature = HMAC-SHA256(message, secret)
//              = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
//
//    token = encodedHeader + "." + encodedPayload + "." + signature

/**
 * Generate JWT token
 * 📚 AN TOÀN: HMAC-SHA256 signature
 *
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  // ===========================================================================
  // STEP 1: CREATE PAYLOAD (CLAIMS)
  // ===========================================================================
  // 📚 AN TOÀN HỆ THỐNG - JWT CLAIMS:
  //
  // STANDARD CLAIMS (RFC 7519):
  //    - iss (Issuer): Ai phát hành token
  //    - sub (Subject): User ID
  //    - aud (Audience): Token dành cho ai
  //    - exp (Expiration): Thời gian hết hạn
  //    - nbf (Not Before): Token chỉ valid sau thời điểm này
  //    - iat (Issued At): Thời điểm phát hành
  //    - jti (JWT ID): Unique ID của token
  //
  // CUSTOM CLAIMS:
  //    - userId, email, role (chúng ta thêm)
  //
  // 📚 LƯU Ý:
  //    - Payload KHÔNG mã hóa, chỉ encode
  //    - Ai cũng decode được payload
  //    - KHÔNG lưu sensitive data (password, secret)

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user'
    // 🏗️ NÂNG CAO: Có thể thêm:
    // - permissions: ['read:users', 'write:posts']
    // - tenantId: '123' (multi-tenant)
    // - sessionId: 'abc' (track sessions)
  };

  // ===========================================================================
  // STEP 2: CREATE OPTIONS
  // ===========================================================================
  // 📚 HỆ ĐIỀU HÀNH - TIME FORMATS:
  //    - expiresIn: '24h', '7d', '30m', '1y'
  //    - algorithm: 'HS256' (HMAC SHA-256)
  //
  // 📚 AN TOÀN: Token expiration
  //    - Short-lived: 15 minutes (high security)
  //    - Medium: 24 hours (balance)
  //    - Long-lived: 30 days (convenience, less secure)
  //    - Refresh token: 90 days (với refresh mechanism)

  const options = {
    expiresIn: process.env.JWT_EXPIRY || '24h',
    algorithm: 'HS256'

    // 🏗️ NÂNG CAO: Thêm claims
    // issuer: 'auth-service',
    // audience: 'platform-api',
    // jwtid: uuidv4() // Unique token ID
  };

  // ===========================================================================
  // STEP 3: SIGN TOKEN
  // ===========================================================================
  // 📚 TOÁN TIN HỌC: HMAC-SHA256 signing
  //    - Input: payload + secret
  //    - Output: signature (256 bits = 32 bytes)
  //    - One-way: Cannot derive secret from signature
  //
  // 📚 AN TOÀN: Secret key security
  //    - Secret MUST be strong (256+ bits)
  //    - Stored in .env (never commit to git)
  //    - Rotated periodically (key rotation)
  //    - Different secrets per environment (dev/staging/prod)

  const token = jwt.sign(payload, process.env.JWT_SECRET, options);

  // Token format: "xxx.yyy.zzz"
  // Length: ~150-200 characters (depends on payload size)

  return token;
};

// =============================================================================
// EXPORT
// =============================================================================
module.exports = {
  verifyToken,     // Middleware: Verify JWT token
  requireRole,     // Middleware: Check user role
  blacklistToken,  // Function: Revoke token (logout)
  generateToken,   // Function: Create new token (login)
  redisClient      // Redis client (for testing/utility)
};

// =============================================================================
// 📚 KIẾN THỨC MỞ RỘNG: SESSION vs TOKEN AUTHENTICATION
// =============================================================================
//
// === SESSION-BASED AUTHENTICATION ===
//
// FLOW:
//    1. User login -> Server tạo session, lưu vào database/memory
//    2. Server trả về session ID (cookie)
//    3. Client gửi session ID trong mỗi request
//    4. Server lookup session trong database
//
// PROS:
//    - Có thể revoke ngay lập tức (xóa session)
//    - Server control toàn bộ
//    - Session data có thể lớn
//
// CONS:
//    - Stateful: Server phải lưu sessions
//    - Scalability: Hard to scale (session store bottleneck)
//    - Database lookup mỗi request (slow)
//    - Load balancer cần sticky sessions
//
// === TOKEN-BASED AUTHENTICATION (JWT) ===
//
// FLOW:
//    1. User login -> Server tạo JWT token
//    2. Server trả về token (không lưu server-side)
//    3. Client gửi token trong header
//    4. Server verify signature (không cần database lookup)
//
// PROS:
//    - Stateless: Server không lưu gì
//    - Scalable: Mọi server đều verify được
//    - No database lookup (fast)
//    - Mobile-friendly
//    - Cross-domain (CORS-friendly)
//
// CONS:
//    - Không thể revoke ngay (cần blacklist)
//    - Token size lớn hơn session ID (200 vs 20 bytes)
//    - Payload không mã hóa (security risk nếu lưu sensitive data)
//
// === HYBRID APPROACH (BEST) ===
//
//    - Short-lived JWT (15 minutes)
//    - Refresh token (7 days, stored server-side)
//    - JWT cho authorization (fast, stateless)
//    - Refresh token cho revocation (can blacklist)
//
// =============================================================================
// 📚 JWT SECURITY BEST PRACTICES
// =============================================================================
//
// 1. SECRET KEY:
//    ✅ Use strong secret (256+ bits, random)
//    ✅ Store in environment variables
//    ✅ Different secret per environment
//    ✅ Rotate periodically (key rotation)
//    ❌ Don't commit to git
//    ❌ Don't hardcode in code
//
// 2. PAYLOAD:
//    ✅ Only include necessary data
//    ✅ Use standard claims (exp, iat, iss)
//    ❌ Don't include passwords
//    ❌ Don't include credit cards
//    ❌ Don't include SSN, secrets
//
// 3. EXPIRATION:
//    ✅ Set reasonable expiry (15min - 24h)
//    ✅ Use refresh tokens for long sessions
//    ✅ Shorter expiry = more secure
//    ❌ Don't use tokens that never expire
//
// 4. TRANSMISSION:
//    ✅ HTTPS only (TLS 1.2+)
//    ✅ Authorization header (not URL params)
//    ✅ HttpOnly cookies (if using cookies)
//    ❌ Don't send in query strings (logged in servers)
//    ❌ Don't send over HTTP (unencrypted)
//
// 5. STORAGE (Client-side):
//    ✅ localStorage (OK for public apps)
//    ✅ sessionStorage (better, cleared on close)
//    ✅ HttpOnly cookie (best for web apps)
//    ❌ Don't store in regular cookies (XSS risk)
//
// 6. ALGORITHM:
//    ✅ Use HS256 (HMAC SHA-256) - symmetric
//    ✅ Or RS256 (RSA SHA-256) - asymmetric (for microservices)
//    ❌ Don't use "none" algorithm (security vulnerability)
//    ❌ Don't allow algorithm switching (algorithm confusion attack)
//
// 7. VERIFICATION:
//    ✅ Always verify signature
//    ✅ Check expiration
//    ✅ Check issuer (iss claim)
//    ✅ Use whitelist for algorithms
//    ❌ Don't trust payload without verification
//
// 8. REVOCATION:
//    ✅ Implement blacklist (Redis)
//    ✅ Use short expiry
//    ✅ Refresh token rotation
//    ❌ Don't rely on client to "delete" token
//
// =============================================================================
// 📚 COMMON JWT ATTACKS & DEFENSES
// =============================================================================
//
// ATTACK 1: NONE ALGORITHM
//    - Attacker sets alg: "none"
//    - No signature verification
//    - Defense: Whitelist allowed algorithms
//
// ATTACK 2: ALGORITHM CONFUSION
//    - HS256 key used as RS256 public key
//    - Signature bypass
//    - Defense: Explicitly set algorithm in verify()
//
// ATTACK 3: BRUTE-FORCE SECRET
//    - Weak secret -> brute-forceable
//    - Defense: Strong secret (256+ bits random)
//
// ATTACK 4: TOKEN SIDEJACKING
//    - Steal token from client (XSS, MITM)
//    - Defense: HTTPS, HttpOnly cookies, CSP headers
//
// ATTACK 5: REPLAY ATTACK
//    - Reuse old token
//    - Defense: Short expiry, jti claim, one-time tokens
//
// ATTACK 6: CROSS-SERVICE REPLAY
//    - Token from Service A used on Service B
//    - Defense: aud (audience) claim, different secrets
//
// =============================================================================
// 📊 TỔNG KẾT LIÊN HỆ VỚI ĐỀ CƯƠNG
// =============================================================================
//
// ✅ AN TOÀN HỆ THỐNG:
//    - JWT, HMAC, Token blacklist, Signature verification
//    - Authentication vs Authorization, RBAC
//    - Token revocation, Expiration
//
// ✅ MẠNG MÁY TÍNH:
//    - HTTP Authorization header, Bearer token scheme
//    - Client-server authentication flow
//    - Session vs Token, TCP connection (Redis)
//
// ✅ TOÁN TIN HỌC:
//    - HMAC SHA-256, One-way functions
//    - Base64 encoding, Digital signatures
//    - Cryptographic hash functions
//
// ✅ CẤU TRÚC DỮ LIỆU & GIẢI THUẬT:
//    - Hash table (Redis), O(1) operations
//    - TTL, String operations
//    - Time complexity analysis
//
// ✅ CÔNG NGHỆ LẬP TRÌNH HIỆN ĐẠI:
//    - Middleware pattern, Stateless authentication
//    - Bearer token, OAuth 2.0, Async/await
//
// ✅ LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG:
//    - Higher-order functions, Closure
//    - Factory pattern
//
// ✅ HỆ ĐIỀU HÀNH:
//    - Time management, TTL, Unix timestamp
//    - Event-driven I/O (Redis)
//
// ✅ KỸ THUẬT PHẦN MỀM:
//    - Design patterns, Security best practices
//    - Separation of concerns
//
// =============================================================================
