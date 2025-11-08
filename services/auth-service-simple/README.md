# 🎓 AUTHENTICATION SERVICE - VERSION ĐƠN GIẢN

**Dành cho**: Sinh viên năm 2 - Beginner Friendly!

---

## 🎯 KHÁC GÌ VỚI VERSION ĐẦY ĐỦ?

| Aspect | Version Đơn Giản | Version Đầy Đủ |
|--------|------------------|----------------|
| **Dòng code** | ~500 dòng | ~1,500 dòng |
| **Độ khó** | ⭐⭐ Dễ-Trung bình | ⭐⭐⭐⭐ Khó |
| **Dependencies** | 7 packages | 12+ packages |
| **Docker** | ❌ Không (chạy local) | ✅ Có |
| **Redis** | ❌ Không | ✅ Có (token blacklist) |
| **Winston Logger** | ❌ Không (dùng console.log) | ✅ Có |
| **Helmet, Rate Limiting** | ❌ Không | ✅ Có |
| **Error Handling** | ✅ Đơn giản | ✅ Phức tạp |
| **Comments** | ✅ Rất chi tiết | ✅ Rất chi tiết |
| **Phù hợp** | Sinh viên năm 2 | Sinh viên năm 3-4 |

---

## 📚 KIẾN THỨC CẦN CÓ

Trước khi học code này, bạn cần biết:

✅ **JavaScript cơ bản**
- Variables (let, const)
- Functions (async/await)
- Objects, Arrays
- Promises

✅ **Node.js cơ bản**
- require/import
- npm install
- Chạy file .js

✅ **SQL cơ bản** (đã học môn Cơ Sở Dữ Liệu)
- SELECT, INSERT, UPDATE, DELETE
- PRIMARY KEY, FOREIGN KEY
- WHERE clause

**KHÔNG CẦN BIẾT**: Docker, Redis, Microservices, Complex security

---

## 🚀 CÁCH CHẠY

### Bước 1: Cài đặt PostgreSQL

**Mac**:
```bash
brew install postgresql@15
brew services start postgresql
createdb platform_db
```

**Ubuntu**:
```bash
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres createdb platform_db
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin123';"
```

**Windows**:
1. Download từ https://www.postgresql.org/download/windows/
2. Install và start PostgreSQL service
3. Dùng pgAdmin tạo database `platform_db`

### Bước 2: Cài đặt dependencies

```bash
cd services/auth-service-simple
npm install
```

### Bước 3: Tạo file .env

```bash
cp .env.example .env
```

Edit `.env` nếu cần thay đổi database config.

### Bước 4: Chạy server

```bash
npm run dev
```

Xem output:
```
✅ Kết nối database thành công!
✅ Database đã sẵn sàng!

============================================================
🎉 Server đang chạy tại: http://localhost:3001
📝 Environment: development
🗄️  Database: localhost:5432
============================================================
```

---

## 🧪 TEST API

### 1. Đăng ký user mới

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "fullName": "Nguyen Van A"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": 1,
      "email": "student@example.com",
      "fullName": "Nguyen Van A",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Đăng nhập

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

**Lưu token** từ response!

### 3. Lấy thông tin user (cần token)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📖 ĐỌC CODE THEO THỨ TỰ

**Để hiểu code, đọc theo thứ tự này**:

### 1. **src/server.js** (Main server) ⭐ ĐỌC ĐẦU TIÊN
- Tạo Express app
- Setup middleware (CORS, JSON parsing)
- Define routes
- Start server

**Độ khó**: ⭐⭐ Dễ
**Thời gian**: 15 phút

### 2. **src/config/database.js** (Database connection)
- Connect PostgreSQL với Sequelize
- Connection pooling
- sync() để tạo tables

**Độ khó**: ⭐⭐ Dễ-Trung bình
**Thời gian**: 10 phút

### 3. **src/models/User.js** (User model) ⭐ QUAN TRỌNG
- Định nghĩa User model (table schema)
- Bcrypt password hashing (beforeCreate hook)
- comparePassword() method
- toJSON() method (xóa password)

**Độ khó**: ⭐⭐⭐ Trung bình
**Thời gian**: 30 phút
**Lưu ý**: Đây là phần QUAN TRỌNG NHẤT! Đọc kỹ comments!

### 4. **src/routes/auth.js** (API routes) ⭐ QUAN TRỌNG
- POST /auth/register (đăng ký)
- POST /auth/login (đăng nhập)
- GET /auth/me (lấy user info)
- JWT token generation
- verifyToken middleware

**Độ khó**: ⭐⭐⭐ Trung bình
**Thời gian**: 45 phút
**Lưu ý**: Đọc từng flow step-by-step!

---

## 🎓 CONCEPTS CHỦ CHỐT

### 1. **ORM (Sequelize)** ⭐⭐

**Lý thuyết**:
- Object-Relational Mapping
- Viết JavaScript thay vì SQL
- User.create() → INSERT INTO users
- User.findOne() → SELECT * FROM users WHERE ...

**Ví dụ**:
```javascript
// ORM (Sequelize)
const user = await User.create({ email: 'test@example.com' });

// SQL tương đương
INSERT INTO users (email) VALUES ('test@example.com');
```

**Đọc thêm**: src/models/User.js (comments chi tiết)

---

### 2. **Password Hashing (Bcrypt)** ⭐⭐⭐

**Lý thuyết**:
- KHÔNG BAO GIỜ lưu plain password!
- Hash = Mã hóa một chiều (không thể reverse)
- Salt = Random string thêm vào password
- Bcrypt tự động generate salt và hash

**Flow**:
```
User đăng ký với password: "password123"
↓
beforeCreate hook
↓
bcrypt.genSalt(10) → tạo salt
↓
bcrypt.hash("password123", salt) → $2b$10$...
↓
Lưu vào database: "$2b$10$..." (60 ký tự)
```

**Khi login**:
```
User gửi password: "password123"
↓
bcrypt.compare("password123", "$2b$10$...")
↓
Extract salt từ hash → hash lại → so sánh
↓
Return true/false
```

**Đọc thêm**: src/models/User.js - beforeCreate hook

---

### 3. **JWT (JSON Web Token)** ⭐⭐⭐⭐

**Lý thuyết**:
- Stateless authentication (không cần session trên server)
- Cấu trúc: Header.Payload.Signature
- Signature đảm bảo token không bị sửa

**Cấu trúc JWT**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (base64)
.
eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdCJ9  ← Payload (base64)
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV    ← Signature (HMAC)
```

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "userId": 1,
  "email": "test@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Signature**:
```
HMACSHA256(
  base64(header) + "." + base64(payload),
  secret
)
```

**⚠️ QUAN TRỌNG**:
- Payload chỉ được **base64 encoded**, KHÔNG encrypted!
- Ai cũng có thể decode payload!
- KHÔNG bao giờ chứa password, credit card trong payload!
- Signature đảm bảo payload không bị sửa

**Flow**:
```
1. User đăng nhập thành công
2. Server tạo JWT: { userId: 1, email: "test@example.com" }
3. Server sign JWT với secret → token
4. Return token cho client
5. Client lưu token trong localStorage
6. Mỗi request sau, client gửi: Authorization: Bearer <token>
7. Server verify signature → extract userId → process request
```

**Đọc thêm**: src/routes/auth.js - generateToken() và verifyToken()

---

### 4. **Input Validation (Joi)** ⭐⭐

**Lý thuyết**:
- NEVER trust user input!
- Validate TRƯỚC KHI xử lý
- Schema-based validation (declarative)

**Ví dụ**:
```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const { error } = schema.validate(userInput);
if (error) {
  return res.status(400).json({ error: error.message });
}
```

**Đọc thêm**: src/routes/auth.js - registerSchema, loginSchema

---

### 5. **REST API** ⭐⭐

**Lý thuyết**:
- HTTP Methods: GET (đọc), POST (tạo), PUT (sửa), DELETE (xóa)
- Resource-based URLs: /users, /users/:id
- Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 500 Error

**Endpoints**:
```
POST /auth/register  → Tạo user mới (201 Created)
POST /auth/login     → Đăng nhập (200 OK)
GET  /auth/me        → Lấy user info (200 OK)
```

---

## 🐛 DEBUGGING TIPS

### 1. **Xem logs trong console**

Server sẽ log mọi thứ:
```
📝 Bắt đầu đăng ký...
✅ Input hợp lệ: { email: 'test@example.com', fullName: 'Test' }
➕ Đang tạo user mới...
🔒 Password đã được hash!
✅ User đã được tạo: 1
🎫 Token đã được tạo
✅ Đăng ký thành công!
```

### 2. **Test với Postman/Insomnia**

- Dùng GUI thay vì curl
- Dễ test hơn
- Lưu requests để reuse

### 3. **Check database**

```bash
# Connect PostgreSQL
psql -U admin -d platform_db

# Trong psql:
SELECT * FROM users;
\d users  # Xem schema
```

### 4. **Common errors**

**Error: "Cannot find module"**
→ Chạy `npm install`

**Error: "connect ECONNREFUSED"**
→ PostgreSQL chưa chạy → Start PostgreSQL

**Error: "duplicate key value"**
→ Email đã tồn tại → Dùng email khác

**Error: "Token expired"**
→ Token hết hạn (24h) → Login lại

---

## 🎯 BÀI TẬP THỰC HÀNH

### **Level 1: Dễ** ⭐

1. **Thêm field `age` vào User**
   - Thêm vào model
   - Thêm validation (18-100)
   - Test API

2. **Thêm endpoint GET /auth/users**
   - Return danh sách users
   - Không cần authentication

### **Level 2: Trung bình** ⭐⭐

1. **Implement Change Password**
   - Endpoint: PUT /auth/change-password
   - Cần authentication
   - Validate old password
   - Hash new password

2. **Add field `avatarUrl`**
   - String field trong User model
   - Validation: Phải là URL hợp lệ
   - Optional (có thể null)

### **Level 3: Khó** ⭐⭐⭐

1. **Implement Logout**
   - Vấn đề: JWT là stateless, không thể "logout"
   - Solution đơn giản: Client xóa token
   - Solution nâng cao: Token blacklist (cần Redis)

2. **Implement Refresh Token**
   - Access token: 15 phút
   - Refresh token: 7 ngày
   - Endpoint: POST /auth/refresh

---

## 📊 SO SÁNH VỚI VERSION ĐẦY ĐỦ

| Feature | Simple | Full |
|---------|--------|------|
| Đăng ký/Đăng nhập | ✅ | ✅ |
| JWT Authentication | ✅ | ✅ |
| Bcrypt Password Hashing | ✅ | ✅ |
| Input Validation (Joi) | ✅ | ✅ |
| Docker Support | ❌ | ✅ |
| Redis Token Blacklist | ❌ | ✅ |
| Winston Logger | ❌ (console.log) | ✅ |
| Rate Limiting | ❌ | ✅ |
| Helmet Security Headers | ❌ | ✅ |
| Complex Error Handling | ❌ | ✅ |
| Health Checks | ✅ | ✅ |
| Comments | ✅ Chi tiết | ✅ Chi tiết |

**Khi nào upgrade lên version đầy đủ?**
- Sau khi hiểu 100% version đơn giản
- Học xong Docker
- Cần security tốt hơn cho production

---

## 💡 TIPS HỌC CODE

1. **Đọc comments trước khi đọc code**
   - Hiểu lý thuyết trước
   - Code sẽ dễ hiểu hơn

2. **Debug bằng console.log()**
   ```javascript
   console.log('User:', user);
   console.log('Token:', token);
   ```

3. **Thử modify code**
   - Thay đổi validation rules
   - Thêm fields mới
   - Test và xem kết quả

4. **Dùng Postman để test**
   - Dễ hơn curl
   - Save requests
   - Xem response rõ ràng

5. **Hỏi khi không hiểu**
   - Google
   - Stack Overflow
   - ChatGPT

---

## 🏆 CHECKLIST HỌC

- [ ] Đọc README này
- [ ] Cài đặt PostgreSQL
- [ ] Chạy được server
- [ ] Test đăng ký thành công
- [ ] Test đăng nhập thành công
- [ ] Test GET /auth/me với token
- [ ] Hiểu ORM (Sequelize)
- [ ] Hiểu Bcrypt hashing
- [ ] Hiểu JWT (Header.Payload.Signature)
- [ ] Hiểu Input Validation (Joi)
- [ ] Làm được bài tập Level 1
- [ ] Làm được bài tập Level 2
- [ ] Sẵn sàng học version đầy đủ!

---

**Chúc bạn học tốt!** 🚀

Nếu có thắc mắc, đọc kỹ comments trong code - mọi thứ đều được giải thích chi tiết!
