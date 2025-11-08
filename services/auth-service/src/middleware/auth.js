// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================
// Lý thuyết: Middleware Pattern
// - Function chạy giữa request và response
// - Chain of Responsibility pattern
// - req -> middleware1 -> middleware2 -> controller -> res
// =============================================================================

const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const logger = require('../config/logger');

// =============================================================================
// Lý thuyết: JWT (JSON Web Token)
// - Stateless authentication (không cần lưu session trên server)
// - Self-contained: Chứa user info trong token
// - Structure: Header.Payload.Signature
//
// Header: { "alg": "HS256", "typ": "JWT" }
// Payload: { "userId": "123", "email": "user@example.com", "iat": 1234567890, "exp": 1234654290 }
// Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
//
// Ưu điểm:
// - Scalable: Không cần shared session storage
// - Cross-domain: Dùng được cho nhiều services (microservices)
// - Mobile-friendly: Dễ sử dụng cho mobile apps
//
// Nhược điểm:
// - Không thể revoke (phải dùng blacklist)
// - Token size lớn hơn session ID
// =============================================================================

// Redis client cho token blacklist
let redisClient;

// Lý thuyết: Redis Connection
// - In-memory database, cực nhanh (< 1ms latency)
// - Dùng cho caching, session, blacklist
const initRedis = async () => {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD
  });

  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisClient.on('connect', () => logger.info('✅ Redis connected'));

  await redisClient.connect();
};

initRedis().catch(logger.error);

// =============================================================================
// VERIFY JWT TOKEN
// Lý thuyết: Authentication vs Authorization
// - Authentication: Xác định "BẠN LÀ AI" (verify identity)
// - Authorization: Xác định "BẠN CÓ QUYỀN GÌ" (check permissions)
// =============================================================================
const verifyToken = async (req, res, next) => {
  try {
    // Lý thuyết: Bearer Token
    // - Standard: RFC 6750
    // - Format: "Authorization: Bearer <token>"
    // - Bearer = người mang token này có quyền truy cập
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy token. Vui lòng đăng nhập.'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer "

    // Lý thuyết: Token Blacklist
    // - Khi user logout, thêm token vào blacklist
    // - Check blacklist trước khi verify
    // - TTL = thời gian còn lại của token
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại.'
      });
    }

    // Lý thuyết: JWT Verification
    // - Verify signature với secret key
    // - Check expiration (exp claim)
    // - Nếu signature không khớp = token bị giả mạo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lý thuyết: Token Claims
    // - iat (issued at): Khi token được tạo
    // - exp (expiration): Khi token hết hạn
    // - sub (subject): User ID
    // - Custom claims: email, role, permissions
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    req.token = token;

    // Lý thuyết: Middleware Chain
    // - next() = chuyển sang middleware tiếp theo
    // - Không gọi next() = request bị dừng ở đây
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);

    // Lý thuyết: JWT Errors
    // - JsonWebTokenError: Invalid token (signature không khớp)
    // - TokenExpiredError: Token đã hết hạn
    // - NotBeforeError: Token chưa active (nbf claim)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ.',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực token.'
    });
  }
};

// =============================================================================
// CHECK USER ROLE
// Lý thuyết: RBAC (Role-Based Access Control)
// - Authorization based on user roles
// - roles = ['admin', 'editor', 'viewer']
// - Higher-order function: Returns middleware function
// =============================================================================
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Lý thuyết: Authorization Check
    // - Phải có req.user (đã authenticated)
    // - Check role có trong allowedRoles không
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Chưa xác thực. Vui lòng đăng nhập.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền truy cập tài nguyên này.',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// =============================================================================
// BLACKLIST TOKEN (for logout)
// Lý thuyết: Token Revocation
// - JWT không thể revoke trực tiếp (stateless)
// - Workaround: Lưu blacklist trong Redis
// - TTL = thời gian còn lại của token
// =============================================================================
const blacklistToken = async (token) => {
  try {
    // Decode token to get expiration
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token');
    }

    // Lý thuyết: TTL (Time To Live)
    // - exp = Unix timestamp (seconds)
    // - now = Date.now() / 1000
    // - ttl = exp - now (seconds còn lại)
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl > 0) {
      // Add to blacklist with TTL
      // Lý thuyết: Redis SETEX
      // - SET key value EX seconds
      // - Tự động xóa key sau TTL seconds
      await redisClient.setEx(`blacklist:${token}`, ttl, 'true');
      logger.info(`Token blacklisted for ${ttl} seconds`);
    }

    return true;
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
    throw error;
  }
};

// =============================================================================
// GENERATE JWT TOKEN
// Lý thuyết: Token Generation
// - Payload: User info (không sensitive!)
// - Secret: Server secret key (PHẢI giữ bí mật!)
// - Options: expiresIn, algorithm
// =============================================================================
const generateToken = (user) => {
  // Lý thuyết: JWT Payload
  // - KHÔNG chứa sensitive data (password, credit card)
  // - Payload có thể decode dễ dàng (base64)
  // - Signature đảm bảo payload không bị sửa
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user'
  };

  // Lý thuyết: Token Options
  // - expiresIn: '24h', '7d', '30m'
  // - algorithm: 'HS256' (HMAC SHA256) - symmetric
  //              'RS256' (RSA SHA256) - asymmetric (public/private key)
  const options = {
    expiresIn: process.env.JWT_EXPIRY || '24h',
    algorithm: 'HS256'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

module.exports = {
  verifyToken,
  requireRole,
  blacklistToken,
  generateToken,
  redisClient
};
