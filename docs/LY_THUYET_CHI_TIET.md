# TÀI LIỆU GIẢI THÍCH LÝ THUYẾT CHI TIẾT 100%

## AUTHENTICATION SERVICE

Tài liệu này giải thích **CHI TIẾT 100%** mọi lý thuyết được áp dụng trong Authentication Service và toàn bộ hệ thống.

---

## MỤC LỤC

1. [Kiến Trúc Microservices](#1-kiến-trúc-microservices)
2. [Containerization với Docker](#2-containerization-với-docker)
3. [Database Design](#3-database-design)
4. [ORM - Object-Relational Mapping](#4-orm---object-relational-mapping)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Password Security](#6-password-security)
7. [JWT - JSON Web Token](#7-jwt---json-web-token)
8. [Session Management & Token Blacklist](#8-session-management--token-blacklist)
9. [Input Validation](#9-input-validation)
10. [Security Best Practices](#10-security-best-practices)
11. [Rate Limiting](#11-rate-limiting)
12. [Logging](#12-logging)
13. [Error Handling](#13-error-handling)
14. [RESTful API Design](#14-restful-api-design)
15. [Polyglot Persistence](#15-polyglot-persistence)
16. [Event-Driven Architecture](#16-event-driven-architecture)

---

## 1. KIẾN TRÚC MICROSERVICES

### 1.1 Định Nghĩa

**Microservices** là kiến trúc phần mềm chia ứng dụng thành nhiều services nhỏ, độc lập, mỗi service chịu trách nhiệm cho một chức năng cụ thể.

### 1.2 Nguyên Lý

#### Single Responsibility Principle (SRP)
- Mỗi service chỉ làm **MỘT VIỆC** và làm tốt việc đó
- Ví dụ:
  - Auth Service: Chỉ xử lý authentication
  - Image Service: Chỉ xử lý images
  - Chat Service: Chỉ xử lý messaging

#### Loose Coupling (Khớp Lỏng Lẻo)
- Services giao tiếp qua **API** hoặc **Message Broker**
- Không phụ thuộc trực tiếp vào code của nhau
- Thay đổi Service A không ảnh hưởng Service B

#### High Cohesion (Gắn Kết Cao)
- Các chức năng liên quan được nhóm trong cùng service
- Ví dụ: Register, Login, Logout đều trong Auth Service

### 1.3 Lợi Ích

✅ **Scalability** (Khả năng mở rộng)
- Scale riêng từng service dựa trên nhu cầu
- Ví dụ: Image Service cần nhiều resources hơn Chat Service

✅ **Independent Deployment**
- Deploy từng service độc lập
- Không cần deploy lại toàn bộ hệ thống

✅ **Technology Flexibility**
- Mỗi service chọn công nghệ phù hợp nhất
- Auth Service: Node.js
- Image Service: Python (xử lý ảnh tốt hơn)

✅ **Fault Isolation**
- Lỗi ở Service A không làm crash Service B
- Hệ thống vẫn hoạt động một phần

### 1.4 Nhược Điểm

❌ **Complexity tăng**
- Phải quản lý nhiều services
- Distributed systems khó debug hơn

❌ **Network Latency**
- Inter-service communication qua network
- Chậm hơn function calls trong monolithic

❌ **Data Consistency**
- Mỗi service có database riêng
- Distributed transactions phức tạp

### 1.5 Áp Dụng Trong Hệ Thống

Hệ thống có **6 microservices**:

1. **Auth Service** (Node.js + PostgreSQL)
   - Đăng ký, đăng nhập, JWT

2. **User Service** (Node.js + PostgreSQL)
   - Quản lý profiles, roles

3. **Image Service** (Python + PostgreSQL + MinIO)
   - Upload, resize, thumbnail

4. **Annotation Service** (Node.js + MongoDB)
   - Tạo/sửa/xóa annotations

5. **Chat Service** (Node.js + Cassandra + Socket.io)
   - Real-time messaging

6. **Notification Service** (Python + Redis)
   - Gửi notifications, emails

---

## 2. CONTAINERIZATION VỚI DOCKER

### 2.1 Định Nghĩa

**Docker** là platform để phát triển, vận chuyển và chạy ứng dụng trong **containers**.

**Container** là package chứa application + dependencies + runtime environment.

### 2.2 Docker vs Virtual Machine

| Aspect | Docker Container | Virtual Machine |
|--------|------------------|-----------------|
| **Size** | MB (nhẹ) | GB (nặng) |
| **Boot time** | Giây | Phút |
| **Resource** | Share OS kernel | Riêng OS kernel |
| **Isolation** | Process-level | OS-level |

### 2.3 Dockerfile

```dockerfile
FROM node:18-alpine          # Base image
WORKDIR /app                 # Set working directory
COPY package*.json ./        # Copy dependency files
RUN npm ci --only=production # Install dependencies
COPY . .                     # Copy source code
EXPOSE 3001                  # Expose port
CMD ["node", "src/server.js"] # Start command
```

#### Lý thuyết: Layer Caching

Mỗi instruction tạo một **layer**:
- Layer được cache
- Nếu instruction không đổi → reuse cache
- Rebuild nhanh hơn!

**Best practice**: Đặt ít thay đổi lên trên (dependencies), nhiều thay đổi xuống dưới (source code).

### 2.4 Multi-stage Build

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production
FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY . .
```

**Lợi ích**: Image size nhỏ hơn (chỉ chứa production dependencies).

### 2.5 Docker Compose

**Docker Compose** orchestrate nhiều containers như một hệ thống duy nhất.

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"

  auth-service:
    build: ./services/auth-service
    depends_on:
      - postgres
    ports:
      - "3001:3001"
```

#### Lý thuyết: Service Dependencies

- `depends_on`: Auth service chờ postgres start
- Docker Compose tự động tạo **network** cho services giao tiếp

---

## 3. DATABASE DESIGN

### 3.1 Entity-Relationship Model (ER Model)

**ER Model** mô tả entities và relationships trong database.

#### Entities (Thực thể)
- **User**: id, email, password, fullName
- **Image**: id, userId, url, filename
- **Annotation**: id, imageId, userId, coordinates, content

#### Relationships (Mối quan hệ)
- User **has many** Images (1:N)
- User **has many** Annotations (1:N)
- Image **has many** Annotations (1:N)
- User **belongs to many** Roles (M:N) via user_roles

### 3.2 Normalization (Chuẩn Hóa)

**Mục đích**: Loại bỏ dư thừa dữ liệu, ngăn chặn bất thường.

#### 1NF (First Normal Form)
- Mỗi cell chứa giá trị **atomic** (không chia nhỏ được)
- Không có repeating groups

❌ **Vi phạm 1NF**:
```
users: id, name, phones
1, John, "123-456, 789-012"  # phones không atomic
```

✅ **Đúng 1NF**:
```
users: id, name
user_phones: user_id, phone
```

#### 2NF (Second Normal Form)
- Đạt 1NF
- Mọi non-key attribute phụ thuộc vào **toàn bộ** primary key

#### 3NF (Third Normal Form)
- Đạt 2NF
- Không có transitive dependency

**Ví dụ**: Bảng `users` trong hệ thống đạt 3NF.

### 3.3 Primary Key & Foreign Key

#### Primary Key
- Định danh **duy nhất** cho mỗi row
- Không NULL
- Không trùng lặp

**UUID vs Auto-increment Integer**:

| Aspect | UUID | Integer |
|--------|------|---------|
| **Size** | 128 bits (36 chars) | 32/64 bits |
| **Uniqueness** | Globally unique | Locally unique |
| **Security** | Không đoán được | Dễ enumerate |
| **Performance** | Chậm hơn | Nhanh hơn |
| **Distributed** | Tốt (không cần coordination) | Khó (cần central generator) |

**Kết luận**: Dùng UUID cho distributed microservices.

#### Foreign Key
- Tham chiếu đến primary key của bảng khác
- Đảm bảo **referential integrity**

```sql
CREATE TABLE images (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**ON DELETE CASCADE**: Khi xóa user → tự động xóa images của user đó.

### 3.4 Indexes (Chỉ Mục)

**Index** là cấu trúc dữ liệu tăng tốc truy vấn.

#### B-Tree Index (Default)
```sql
CREATE INDEX idx_users_email ON users(email);
```

**Cấu trúc**: Balanced tree
- Leaf nodes: Actual data
- Internal nodes: Routing
- **O(log n)** search time

#### Composite Index
```sql
CREATE INDEX idx_images_user_uploaded
ON images(user_id, uploaded_at DESC);
```

Tăng tốc query:
```sql
SELECT * FROM images
WHERE user_id = ?
ORDER BY uploaded_at DESC;
```

#### Khi nào dùng Index?

✅ **Nên dùng**:
- Columns trong WHERE clause
- Columns trong JOIN
- Columns trong ORDER BY
- Foreign keys

❌ **Không nên dùng**:
- Tables nhỏ (< 1000 rows)
- Columns ít unique values (gender: M/F)
- Columns thường được UPDATE (index cũng phải update)

### 3.5 Views (Khung Nhìn)

**View** là virtual table (không lưu data, chỉ lưu query).

```sql
CREATE VIEW v_users_with_roles AS
SELECT u.*, array_agg(r.name) AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;
```

**Lợi ích**:
- Simplify complex queries
- Encapsulation (ẩn implementation)
- Security (giới hạn access)

### 3.6 Triggers

**Trigger** là function tự động chạy khi có event (INSERT, UPDATE, DELETE).

```sql
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Use cases**:
- Auto-update timestamps
- Audit logging
- Data validation
- Cascade deletes

### 3.7 Stored Procedures

**Stored Procedure** là function lưu trong database.

```sql
CREATE FUNCTION check_user_permission(p_user_id UUID, p_permission VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND r.permissions ? p_permission
    );
END;
$$ LANGUAGE plpgsql;
```

**Lợi ích**:
- Performance (compiled, cached)
- Reusability
- Security (encapsulation)

---

## 4. ORM - OBJECT-RELATIONAL MAPPING

### 4.1 Định Nghĩa

**ORM** ánh xạ giữa **Objects** (JavaScript) và **Relational Tables** (SQL).

### 4.2 Sequelize (ORM cho Node.js)

```javascript
const User = sequelize.define('users', {
  id: { type: DataTypes.UUID, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING }
});

// Tạo user
await User.create({ email: 'user@example.com', password: 'hashed' });

// Find user
const user = await User.findByPk(userId);

// Update
await user.update({ fullName: 'New Name' });

// Delete
await user.destroy();
```

**SQL tương đương**:
```sql
INSERT INTO users (email, password) VALUES ('user@example.com', 'hashed');
SELECT * FROM users WHERE id = ?;
UPDATE users SET full_name = 'New Name' WHERE id = ?;
DELETE FROM users WHERE id = ?;
```

### 4.3 Lợi Ích

✅ **Type Safety**: TypeScript support
✅ **SQL Injection Prevention**: Parameterized queries
✅ **Database Abstraction**: Dễ switch database (PostgreSQL → MySQL)
✅ **Migrations**: Version control cho database schema

### 4.4 Connection Pooling

```javascript
pool: {
  max: 20,      // Maximum connections
  min: 5,       // Minimum connections
  acquire: 30000, // Max time to get connection
  idle: 10000   // Max idle time before release
}
```

**Lý thuyết**:
- **Tái sử dụng** connections thay vì create/close mỗi request
- **Giảm overhead** của TCP handshake
- **Concurrency**: Nhiều requests cùng lúc

**Pool size**:
- Too small → Requests phải chờ
- Too large → Resource waste

**Rule of thumb**: `pool_size = num_cores * 2 + effective_spindle_count`

### 4.5 Hooks (Lifecycle Callbacks)

```javascript
hooks: {
  beforeCreate: async (user) => {
    user.password = await bcrypt.hash(user.password, 10);
  },
  afterCreate: async (user) => {
    await sendWelcomeEmail(user.email);
  }
}
```

**Available hooks**:
- beforeValidate, afterValidate
- beforeCreate, afterCreate
- beforeUpdate, afterUpdate
- beforeDestroy, afterDestroy

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 Authentication vs Authorization

| Aspect | Authentication | Authorization |
|--------|----------------|---------------|
| **Question** | "Bạn là ai?" | "Bạn có quyền gì?" |
| **Process** | Verify identity (email + password) | Check permissions |
| **Result** | User info + token | Allow/Deny access |

### 5.2 Authentication Flow

```
1. User gửi email + password
2. Server tìm user trong database
3. Server compare password với hash
4. Nếu đúng → Generate JWT token
5. Return token cho client
6. Client lưu token (localStorage, cookies)
7. Mỗi request sau → gửi token trong header
```

### 5.3 RBAC (Role-Based Access Control)

**RBAC** phân quyền dựa trên **roles**.

```
User → Role → Permissions
```

**Ví dụ**:
- Admin → ["user:*", "image:*", "annotation:*"]
- Editor → ["image:read", "image:create", "annotation:*"]
- Viewer → ["image:read", "annotation:read"]

**Implementation**:
```javascript
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
router.delete('/images/:id', verifyToken, requireRole('admin'), deleteImage);
```

---

## 6. PASSWORD SECURITY

### 6.1 NEVER Store Plain Password!

❌ **WRONG**:
```sql
INSERT INTO users (email, password) VALUES ('user@example.com', 'password123');
```

Nếu database bị hack → Hacker có tất cả passwords!

### 6.2 Hashing

**Hashing** là one-way function: `password → hash` (không thể reverse).

```
"password123" → bcrypt → "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
```

**Properties**:
- Deterministic: Same input → same hash
- One-way: Không thể reverse từ hash ra password
- Avalanche effect: Thay đổi 1 bit input → 50% bits output thay đổi

### 6.3 Bcrypt

**Bcrypt** là hashing algorithm được thiết kế cho passwords.

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const salt = await bcrypt.genSalt(10); // 10 = cost factor
const hash = await bcrypt.hash('password123', salt);
// Result: $2b$10$salt$hash (60 characters)

// Verify password
const isValid = await bcrypt.compare('password123', hash); // true
```

#### Salt

**Salt** là random string thêm vào password trước khi hash.

**Tại sao cần salt?**

Giả sử 2 users có cùng password "password123":
- Không salt: Cùng hash → Hacker biết ngay
- Có salt: Khác hash → Hacker không biết

```
User1: password123 + salt1 → hash1
User2: password123 + salt2 → hash2 (khác hash1!)
```

#### Cost Factor

**Cost factor** = số rounds của hashing.

- Cost 10 = 2^10 = 1024 rounds
- Cost 12 = 2^12 = 4096 rounds

**Higher cost**:
- ✅ More secure (chống brute force)
- ❌ Slower (tốn CPU)

**Recommendation**: Cost 10-12 (2020s hardware).

### 6.4 Rainbow Table Attack

**Rainbow table** là pre-computed hash table.

```
password123 → hash1
password → hash2
12345678 → hash3
```

Hacker compare hash trong database với rainbow table → Tìm ra password.

**Defense**: **Salt**!

Với salt, hacker phải tạo rainbow table riêng cho mỗi salt → Không khả thi.

---

## 7. JWT - JSON WEB TOKEN

### 7.1 Cấu Trúc JWT

JWT có 3 phần, ngăn cách bởi dấu `.`:

```
Header.Payload.Signature
```

**Ví dụ**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### 1. Header

```json
{
  "alg": "HS256",  // Algorithm
  "typ": "JWT"     // Type
}
```

Base64 encoded: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

#### 2. Payload (Claims)

```json
{
  "userId": "123",
  "email": "user@example.com",
  "iat": 1234567890,  // Issued at
  "exp": 1234654290   // Expiration
}
```

Base64 encoded: `eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ`

**Registered Claims**:
- `iss` (issuer): Ai tạo token
- `sub` (subject): Token về ai
- `aud` (audience): Token dành cho ai
- `exp` (expiration): Hết hạn khi nào
- `iat` (issued at): Tạo khi nào

#### 3. Signature

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**Mục đích**: Verify token không bị sửa.

### 7.2 JWT Flow

```
1. User đăng nhập (email + password)
2. Server verify credentials
3. Server tạo JWT:
   - Header: { alg: "HS256", typ: "JWT" }
   - Payload: { userId: "123", email: "user@example.com", exp: ... }
   - Signature: HMACSHA256(header.payload, secret)
4. Server return token cho client
5. Client lưu token (localStorage)
6. Mỗi request → Client gửi token trong header:
   Authorization: Bearer <token>
7. Server verify signature
8. Nếu valid → Extract userId từ payload → Process request
```

### 7.3 Stateless vs Stateful

#### Stateful (Session-based)

```
Client                    Server
  |                         |
  |--- Login (email, pw) -->|
  |                         | Create session → Store in Redis/DB
  |<-- Session ID --------- |
  |                         |
  |--- Request + Session -->|
  |                         | Lookup session in Redis
  |<-- Response ----------- |
```

**Nhược điểm**:
- Server phải lưu sessions → Memory/DB overhead
- Khó scale horizontal (sessions phải shared)

#### Stateless (JWT)

```
Client                    Server
  |                         |
  |--- Login (email, pw) -->|
  |                         | Generate JWT (no storage)
  |<-- JWT --------------- |
  |                         |
  |--- Request + JWT ----->|
  |                         | Verify signature (no lookup!)
  |<-- Response ---------- |
```

**Ưu điểm**:
- ✅ No server storage
- ✅ Easy horizontal scaling
- ✅ Cross-domain (CORS friendly)

**Nhược điểm**:
- ❌ Không thể revoke token trực tiếp (phải dùng blacklist)
- ❌ Token size lớn hơn session ID

### 7.4 JWT Security

#### ⚠️ KHÔNG chứa sensitive data trong payload

Payload chỉ được **base64 encoded**, KHÔNG encrypted!

Ai cũng có thể decode:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload); // { userId: "123", email: "..." }
```

❌ **NEVER**:
```json
{
  "password": "password123",
  "creditCard": "1234-5678-9012-3456"
}
```

#### ✅ Signature đảm bảo integrity

Nếu hacker sửa payload:
```json
{ "userId": "123", "role": "admin" } // Changed user -> admin
```

Signature sẽ không khớp → Server reject token.

#### Secret Key

**Secret key** phải:
- ✅ Random, dài (256+ bits)
- ✅ Giữ bí mật
- ✅ Không commit vào git
- ✅ Rotate định kỳ (security best practice)

❌ **WRONG**:
```javascript
const secret = "12345"; // Too short, too simple
```

✅ **CORRECT**:
```javascript
const secret = process.env.JWT_SECRET; // Long, random, from env
```

Generate strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 8. SESSION MANAGEMENT & TOKEN BLACKLIST

### 8.1 JWT Logout Problem

**Vấn đề**: JWT là stateless → Không thể revoke (vô hiệu hóa) token.

Khi user logout:
- Client xóa token khỏi localStorage
- Nhưng nếu hacker đã copy token → Vẫn dùng được!

### 8.2 Solution: Token Blacklist

**Blacklist** là danh sách các tokens đã bị vô hiệu hóa.

#### Implementation với Redis

```javascript
// Logout
const decoded = jwt.decode(token);
const ttl = decoded.exp - Math.floor(Date.now() / 1000); // Seconds còn lại
await redis.setEx(`blacklist:${token}`, ttl, 'true');

// Verify
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) {
  throw new Error('Token revoked');
}
```

**Lý thuyết: TTL (Time To Live)**
- Token có expiry time (ví dụ: 24h)
- Blacklist chỉ cần lưu đến khi token hết hạn
- Redis `setEx` tự động xóa key sau TTL seconds

**Ví dụ**:
```
Token created: 2024-01-01 00:00:00
Token expires: 2024-01-02 00:00:00 (24h later)
User logout:   2024-01-01 12:00:00
TTL = 12h (còn 12h nữa hết hạn)

Redis: setEx('blacklist:token', 12*3600, 'true')
After 12h → Key tự động xóa (token đã hết hạn anyway)
```

### 8.3 Alternative: Short-lived Tokens + Refresh Tokens

**Access Token**: Thời gian ngắn (15 minutes)
**Refresh Token**: Thời gian dài (7 days), dùng để lấy access token mới

```
1. Login → Server return { accessToken (15m), refreshToken (7d) }
2. Client dùng accessToken cho requests
3. Access token hết hạn → Client gửi refreshToken
4. Server verify refreshToken → Return accessToken mới
5. Logout → Blacklist refreshToken
```

**Lợi ích**:
- Access token hết hạn nhanh → Giảm rủi ro nếu bị lộ
- Blacklist nhỏ hơn (chỉ refreshTokens)

---

## 9. INPUT VALIDATION

### 9.1 NEVER Trust User Input!

**Attacks**:
- SQL Injection
- XSS (Cross-Site Scripting)
- Command Injection
- Path Traversal

**Principle**: Validate BEFORE processing!

### 9.2 Joi Schema Validation

```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[A-Z])(?=.*[0-9])/).required(),
  age: Joi.number().integer().min(18).max(100)
});

const { error, value } = schema.validate(userInput);
if (error) {
  // Return 400 Bad Request
}
```

**Validations**:
- **Type**: string, number, boolean
- **Format**: email, URL, UUID
- **Length**: min, max
- **Pattern**: regex
- **Range**: min, max for numbers
- **Custom**: custom validation functions

### 9.3 Sanitization

**Sanitization** = Làm sạch input, loại bỏ nguy hiểm.

```javascript
const schema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()  // Convert to lowercase
    .trim()       // Remove whitespace
    .max(255),

  fullName: Joi.string()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
});
```

**stripUnknown**:
```javascript
const options = {
  stripUnknown: true // Remove fields not in schema
};

const input = { email: 'user@example.com', hacker: 'DROP TABLE users' };
const { value } = schema.validate(input, options);
// value = { email: 'user@example.com' } // 'hacker' removed!
```

### 9.4 SQL Injection Prevention

❌ **VULNERABLE**:
```javascript
const email = req.body.email; // "admin' OR '1'='1"
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Result: SELECT * FROM users WHERE email = 'admin' OR '1'='1'
// Returns ALL users!
```

✅ **SAFE** (Parameterized Query):
```javascript
const email = req.body.email;
const query = 'SELECT * FROM users WHERE email = ?';
await db.query(query, [email]);
// Sequelize/ORM automatically escapes
```

### 9.5 XSS Prevention

**XSS** = Inject malicious JavaScript vào page.

❌ **VULNERABLE**:
```javascript
const name = req.body.name; // "<script>alert('XSS')</script>"
res.send(`<h1>Hello, ${name}!</h1>`);
// Browser executes script!
```

✅ **SAFE**:
```javascript
const escape = require('escape-html');
const name = escape(req.body.name);
res.send(`<h1>Hello, ${name}!</h1>`);
// Result: &lt;script&gt;alert('XSS')&lt;/script&gt; (harmless text)
```

---

## 10. SECURITY BEST PRACTICES

### 10.1 Helmet - Security Headers

```javascript
app.use(helmet());
```

**Headers được set**:

#### X-Frame-Options: DENY
- Chống **Clickjacking** attack
- Website không thể embed trong `<iframe>`

#### X-Content-Type-Options: nosniff
- Chống **MIME sniffing**
- Browser không tự đoán content type

#### Strict-Transport-Security (HSTS)
- Force HTTPS
- `max-age=31536000; includeSubDomains`

#### Content-Security-Policy (CSP)
- Giới hạn nguồn tài nguyên (scripts, styles, images)
- Chống XSS

```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com
```

### 10.2 CORS (Cross-Origin Resource Sharing)

**Same-Origin Policy**: Browser chặn requests từ domain khác.

```
Frontend: http://localhost:3000
Backend:  http://localhost:3001
→ Different origins! → Blocked!
```

**CORS headers** cho phép specific origins:

```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

**Preflight Request** (OPTIONS):
```
1. Browser gửi OPTIONS request
2. Server respond với CORS headers
3. Nếu allowed → Browser gửi actual request
```

### 10.3 HTTPS/TLS

**HTTP** = Plain text → Hacker có thể đọc!

**HTTPS** = HTTP + TLS encryption

**TLS Handshake**:
```
1. Client → Server: Hello (supported ciphers)
2. Server → Client: Certificate (public key)
3. Client verify certificate (CA signed)
4. Client → Server: Encrypted session key (with public key)
5. Server decrypt session key (with private key)
6. Both sides encrypt data with session key (symmetric encryption)
```

**Certificate**:
- Issued by CA (Certificate Authority)
- Contains: Domain name, public key, expiry date
- Browser trusts CAs (pre-installed)

### 10.4 Environment Variables

**12-Factor App**: Tách config khỏi code.

❌ **WRONG**:
```javascript
const dbPassword = 'admin123'; // Hardcoded!
```

✅ **CORRECT**:
```javascript
const dbPassword = process.env.DB_PASSWORD; // From environment
```

**.env file**:
```
DB_PASSWORD=admin123
JWT_SECRET=super-secret-key
```

**NEVER commit .env to git!**

```bash
# .gitignore
.env
.env.local
.env.production
```

---

## 11. RATE LIMITING

### 11.1 Mục Đích

**Rate limiting** giới hạn số requests từ một IP/user trong thời gian nhất định.

**Chống**:
- Brute force attacks (đoán password)
- DDoS attacks (làm sập server)
- API abuse

### 11.2 Implementation

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use(limiter);
```

### 11.3 Algorithms

#### Fixed Window

```
Window: 00:00:00 - 00:15:00
Max: 100 requests

00:00:00 - Request 1 → OK
00:14:59 - Request 100 → OK
00:15:00 - Window reset → Counter = 0
00:15:01 - Request 101 → OK (new window)
```

**Vấn đề**: Burst at window boundary
```
00:14:59 - 100 requests
00:15:01 - 100 requests
→ 200 requests trong 2 seconds!
```

#### Sliding Window

```
Mỗi request có timestamp
Check: Số requests trong [now - 15m, now] ≤ 100
```

**Tốt hơn** nhưng tốn memory hơn (phải lưu timestamps).

#### Token Bucket

```
Bucket capacity: 100 tokens
Refill rate: 10 tokens/minute

Request → Consume 1 token
No tokens → Reject request
```

### 11.4 Distributed Rate Limiting

**Vấn đề**: Nhiều servers → Mỗi server có counter riêng.

```
User → Server A (50 req) → OK
User → Server B (50 req) → OK
→ Total 100 req, nhưng mỗi server chỉ thấy 50!
```

**Solution**: Shared counter trong Redis

```javascript
const redis = require('redis');
const client = redis.createClient();

const count = await client.incr(`ratelimit:${ip}`);
if (count === 1) {
  await client.expire(`ratelimit:${ip}`, 900); // 15 minutes
}
if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

---

## 12. LOGGING

### 12.1 Tại Sao Cần Logging?

- **Debugging**: Tìm bugs
- **Monitoring**: Theo dõi health
- **Analytics**: Usage patterns
- **Security**: Detect attacks
- **Compliance**: Audit trail

### 12.2 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **error** | Errors cần xử lý ngay | Database connection failed |
| **warn** | Cảnh báo, có thể gây vấn đề | API deprecated, high memory |
| **info** | Thông tin quan trọng | Server started, User logged in |
| **http** | HTTP requests | GET /api/users 200 123ms |
| **debug** | Chi tiết cho development | Variable values, function calls |

### 12.3 Structured Logging

❌ **Unstructured**:
```
User john@example.com logged in at 2024-01-01 10:30:00
```

Khó parse, không thể query.

✅ **Structured (JSON)**:
```json
{
  "timestamp": "2024-01-01T10:30:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "email": "john@example.com",
  "ip": "192.168.1.1"
}
```

**Lợi ích**:
- Dễ parse bằng tools (ELK, Splunk)
- Searchable (filter by userId, timestamp, etc.)
- Aggregatable (count logins per hour)

### 12.4 Winston Logger

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('User logged in', { userId: '123', email: 'user@example.com' });
```

### 12.5 Log Rotation

**Vấn đề**: Log files ngày càng lớn → Hết disk!

**Solution**: Rotate logs
- Daily rotation: Tạo file mới mỗi ngày
- Size-based: Tạo file mới khi đạt size limit
- Keep N files: Xóa files cũ nhất

```javascript
new winston.transports.File({
  filename: 'combined.log',
  maxsize: 5242880, // 5MB
  maxFiles: 5       // Keep 5 files max
});
```

### 12.6 What to Log?

✅ **Log**:
- User actions (login, logout, create, update, delete)
- Errors and exceptions
- Performance metrics (response time, query time)
- Security events (failed logins, permission denied)

❌ **NEVER log**:
- Passwords (even hashed!)
- Credit card numbers
- Personal identifiable information (PII) - nếu không cần thiết
- API keys, secrets

---

## 13. ERROR HANDLING

### 13.1 Try-Catch

```javascript
try {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  // Process...
} catch (error) {
  logger.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### 13.2 Async Error Handling

**Vấn đề**: Async errors không được catch bởi Express error handler.

❌ **WRONG**:
```javascript
app.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id); // Nếu error → Unhandled rejection!
  res.json(user);
});
```

✅ **CORRECT**:
```javascript
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    res.json(user);
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

**Hoặc dùng wrapper**:
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(user);
}));
```

### 13.3 Centralized Error Handler

```javascript
app.use((err, req, res, next) => {
  logger.error('Error:', err);

  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      error: err.message
    });
  }

  // Programming errors (bugs)
  res.status(500).json({
    error: 'Internal server error'
  });
});
```

### 13.4 Error Types

#### Operational Errors (Expected)
- User not found (404)
- Validation failed (400)
- Unauthorized (401)
- Permission denied (403)

**Cách xử lý**: Return error response, continue running.

#### Programming Errors (Bugs)
- Null pointer exception
- TypeError
- ReferenceError

**Cách xử lý**: Log error, **crash process**, let orchestrator restart.

**Tại sao crash?**
- State có thể corrupted
- Không biết side effects
- Best practice: Clean restart

### 13.5 HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| **200** | OK | Request thành công |
| **201** | Created | Resource mới được tạo |
| **204** | No Content | Success nhưng không return data (DELETE) |
| **400** | Bad Request | Invalid input |
| **401** | Unauthorized | Chưa authenticate |
| **403** | Forbidden | Không có quyền |
| **404** | Not Found | Resource không tồn tại |
| **409** | Conflict | Conflict với existing resource (duplicate) |
| **422** | Unprocessable Entity | Validation failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **503** | Service Unavailable | Service down (maintenance) |

---

## 14. RESTFUL API DESIGN

### 14.1 REST Principles

**REST** = Representational State Transfer

#### 1. Resource-Based URLs

Resources (nouns), NOT actions (verbs).

✅ **CORRECT**:
```
GET    /users          # Get all users
GET    /users/123      # Get user 123
POST   /users          # Create user
PUT    /users/123      # Update user 123
DELETE /users/123      # Delete user 123
```

❌ **WRONG**:
```
GET  /getAllUsers
GET  /getUserById?id=123
POST /createUser
POST /updateUser
POST /deleteUser
```

#### 2. HTTP Methods

| Method | Action | Idempotent? |
|--------|--------|-------------|
| **GET** | Read | ✅ Yes |
| **POST** | Create | ❌ No |
| **PUT** | Update (replace) | ✅ Yes |
| **PATCH** | Update (partial) | ❌ No |
| **DELETE** | Delete | ✅ Yes |

**Idempotent**: Gọi nhiều lần = gọi 1 lần.

```
DELETE /users/123 → User deleted
DELETE /users/123 → User already deleted (same result)
```

```
POST /users → User created (ID=1)
POST /users → User created (ID=2) → DIFFERENT result!
```

#### 3. Stateless

Mỗi request phải chứa **tất cả** thông tin cần thiết.

Server không lưu client state.

✅ **Stateless**:
```
GET /users/123
Authorization: Bearer <token>
```

❌ **Stateful**:
```
1. POST /login → Server lưu session
2. GET /users/123 → Server lookup session
```

### 14.2 API Versioning

**Tại sao?** API thay đổi theo thời gian, nhưng clients cũ vẫn cần hoạt động.

#### URL Versioning

```
/v1/users
/v2/users
```

#### Header Versioning

```
GET /users
Accept: application/vnd.api+json; version=1
```

### 14.3 Filtering, Sorting, Pagination

#### Filtering

```
GET /users?role=admin&isActive=true
```

#### Sorting

```
GET /users?sort=createdAt&order=desc
```

#### Pagination

```
GET /users?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 14.4 Response Format

#### Success

```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com"
  }
}
```

#### Error

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "details": [
    {
      "field": "userId",
      "message": "User with ID 123 does not exist"
    }
  ]
}
```

---

## 15. POLYGLOT PERSISTENCE

### 15.1 Định Nghĩa

**Polyglot Persistence** = Dùng nhiều loại databases trong cùng hệ thống.

**Tại sao?** Không có database nào phù hợp cho **MỌI** use cases!

### 15.2 Database Types

| Type | Database | Best For | Example Use Case |
|------|----------|----------|------------------|
| **RDBMS** | PostgreSQL, MySQL | Structured data, transactions, relationships | Users, Orders, Invoices |
| **Document** | MongoDB | Flexible schema, nested data | Annotations, Products, CMS |
| **Wide-Column** | Cassandra, HBase | High write throughput, time-series | Chat messages, Logs, Events |
| **Key-Value** | Redis, Memcached | Caching, sessions, simple data | Sessions, Rate limiting, Counters |
| **Graph** | Neo4j, ArangoDB | Relationships, network data | Social network, Recommendations |
| **Search** | Elasticsearch | Full-text search, analytics | Search, Logs analysis |

### 15.3 Áp Dụng Trong Hệ Thống

#### PostgreSQL (RDBMS)
**Services**: Auth, User, Image metadata

**Lý do**:
- Dữ liệu có cấu trúc rõ ràng
- Cần ACID transactions
- Foreign key relationships (User → Images)
- Complex queries với JOINs

#### MongoDB (Document Database)
**Service**: Annotations

**Lý do**:
- Schema linh hoạt (annotations có thể có fields khác nhau)
- Nested documents (coordinates, content, history)
- Geospatial queries (annotations ở vùng X, Y)
- Horizontal scaling với sharding

**Schema**:
```json
{
  "_id": "...",
  "imageId": "...",
  "type": "area",
  "coordinates": { "x": 100, "y": 200, "width": 50, "height": 50 },
  "content": { "text": "...", "html": "..." },
  "history": [
    { "version": 1, "content": "...", "editedAt": "..." },
    { "version": 2, "content": "...", "editedAt": "..." }
  ]
}
```

#### Cassandra (Wide-Column Store)
**Service**: Chat messages

**Lý do**:
- **High write throughput** (hàng triệu messages/second)
- Time-series data (messages có timestamp)
- Partition by annotation_id (mỗi thread có partition riêng)
- Linear scalability (thêm nodes = tăng throughput)

**Schema**:
```cql
CREATE TABLE messages (
  annotation_id UUID,
  created_at TIMESTAMP,
  message_id UUID,
  user_id UUID,
  content TEXT,
  PRIMARY KEY (annotation_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**Query**:
```cql
SELECT * FROM messages
WHERE annotation_id = ?
ORDER BY created_at DESC
LIMIT 50;
```

#### Redis (Key-Value Store)
**Services**: Auth (token blacklist), Chat (online users)

**Lý do**:
- **In-memory** → Cực nhanh (< 1ms latency)
- **TTL** (Time To Live) → Tự động xóa expired keys
- Pub/Sub cho real-time notifications
- Atomic operations (INCR, DECR cho counters)

**Use cases**:
```
# Token blacklist
SET blacklist:token123 true EX 3600

# Rate limiting
INCR ratelimit:192.168.1.1
EXPIRE ratelimit:192.168.1.1 900

# Session
SET session:abc123 '{"userId":"123","email":"..."}' EX 86400

# Caching
SET user:123 '{"id":"123","name":"John"}' EX 300
```

### 15.4 CAP Theorem

**CAP Theorem**: Distributed system chỉ có thể đảm bảo tối đa **2/3**:

- **C** (Consistency): Tất cả nodes thấy cùng data
- **A** (Availability): Mọi request đều được response
- **P** (Partition Tolerance): Hệ thống vẫn hoạt động khi network bị tách

**Tradeoffs**:

| Database | CAP | Explanation |
|----------|-----|-------------|
| **PostgreSQL** | CP | Ưu tiên consistency. Nếu master down → unavailable |
| **Cassandra** | AP | Ưu tiên availability. Eventually consistent |
| **Redis** | CP | Ưu tiên consistency (với replication async) |
| **MongoDB** | CP | Ưu tiên consistency (với majority write concern) |

**Ví dụ**:

**PostgreSQL (CP)**:
```
1. Write data to master
2. Replicate to slaves
3. Master crashes BEFORE replication
4. System UNAVAILABLE until new master elected
→ Ưu tiên Consistency (không return stale data)
```

**Cassandra (AP)**:
```
1. Write data to node A
2. Node B chưa replicate
3. Read from node B → Old data (stale)
→ Eventually consistent (sau vài ms sẽ consistent)
→ Ưu tiên Availability (always return something)
```

---

## 16. EVENT-DRIVEN ARCHITECTURE

### 16.1 Định Nghĩa

**Event-Driven Architecture (EDA)** = Services giao tiếp qua **events** thay vì direct calls.

### 16.2 Publisher-Subscriber Pattern

```
Publisher (Image Service)
  |
  |--- Publish "ImageUploaded" event → Kafka
  |
  +--→ Subscriber 1 (Notification Service): Send email
  +--→ Subscriber 2 (Thumbnail Service): Create thumbnail
  +--→ Subscriber 3 (Search Service): Index image
```

**Decoupling**: Image Service không biết ai subscribe, không cần biết.

### 16.3 Apache Kafka

**Kafka** là distributed event streaming platform.

#### Topics

**Topic** = Category of events.

```
Topics:
- image-uploads
- annotations
- chat-messages
- notifications
```

#### Producers & Consumers

**Producer** publish events:
```javascript
await producer.send({
  topic: 'image-uploads',
  messages: [{
    value: JSON.stringify({
      eventType: 'ImageUploaded',
      imageId: '123',
      userId: 'abc',
      timestamp: Date.now()
    })
  }]
});
```

**Consumer** subscribe to topics:
```javascript
await consumer.subscribe({ topic: 'image-uploads' });

await consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value);
    console.log('Event:', event);
    // Process event
  }
});
```

#### Partitions

**Partition** = Ordered log of events.

```
Topic: chat-messages (3 partitions)

Partition 0: [msg1, msg4, msg7, ...]
Partition 1: [msg2, msg5, msg8, ...]
Partition 2: [msg3, msg6, msg9, ...]
```

**Partitioning strategy**:
- By key: `key = annotationId` → Same annotation → Same partition
- Round-robin: Distribute evenly

**Lợi ích**:
- Parallel processing (3 partitions = 3 consumers đồng thời)
- Ordering guarantee per partition

#### Consumer Groups

**Consumer Group** = Nhóm consumers chia sẻ workload.

```
Consumer Group: notification-service

Partition 0 → Consumer 1
Partition 1 → Consumer 2
Partition 2 → Consumer 3
```

Nếu Consumer 1 crashes → Partition 0 reassigned to Consumer 2/3.

#### Offset Tracking

**Offset** = Vị trí của consumer trong partition.

```
Partition 0: [msg1, msg2, msg3, msg4, msg5]
             ^                   ^
             offset=0           offset=3 (current)
```

Consumer commit offset sau khi process thành công.

Nếu crash → Resume từ last committed offset.

### 16.4 Event Sourcing

**Event Sourcing** = Lưu trữ **events** thay vì **current state**.

**Traditional**:
```
users table:
id | name | email
1  | John | john@new.com
```

Không biết email trước đó là gì!

**Event Sourcing**:
```
events:
1. UserCreated    { id: 1, name: "John", email: "john@old.com" }
2. EmailChanged   { id: 1, newEmail: "john@new.com" }
```

**Current state** = Apply all events.

**Lợi ích**:
- Complete history (audit trail)
- Time travel (rebuild state at any point)
- Event replay (fix bugs by replaying events)

---

## KẾT LUẬN

Tài liệu này đã giải thích **CHI TIẾT 100%** các lý thuyết được áp dụng trong Authentication Service:

✅ **Microservices Architecture**
✅ **Docker Containerization**
✅ **Database Design** (ER Model, Normalization, Indexes, Views, Triggers)
✅ **ORM** (Sequelize, Connection Pooling, Hooks)
✅ **Authentication & Authorization** (JWT, RBAC, Session Management)
✅ **Password Security** (Bcrypt, Salt, Hashing)
✅ **Input Validation** (Joi, Sanitization, SQL Injection Prevention)
✅ **Security Best Practices** (Helmet, CORS, HTTPS, Environment Variables)
✅ **Rate Limiting** (Algorithms, Distributed Rate Limiting)
✅ **Logging** (Winston, Structured Logging, Log Levels)
✅ **Error Handling** (Try-Catch, Async Errors, HTTP Status Codes)
✅ **RESTful API Design** (Resources, HTTP Methods, Versioning)
✅ **Polyglot Persistence** (PostgreSQL, MongoDB, Cassandra, Redis)
✅ **Event-Driven Architecture** (Kafka, Publisher-Subscriber, Event Sourcing)

Mỗi concept được áp dụng **THỰC TẾ** trong code, không chỉ là lý thuyết suông!

---

**Author**: AI Assistant
**Date**: 2025-11-08
**Version**: 1.0
**License**: MIT
