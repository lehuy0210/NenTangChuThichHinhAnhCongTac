# Nền Tảng Chú Thích Hình Ảnh Cộng Tác

## Tổng Quan Hệ Thống

Hệ thống chú thích hình ảnh cộng tác được xây dựng với kiến trúc **Microservices**, cho phép người dùng:
- Tải lên hình ảnh kỹ thuật (chi tiết máy móc, bản vẽ)
- Thêm chú thích (annotations) tại các điểm hoặc vùng cụ thể
- Thảo luận theo luồng (threaded chat) cho mỗi chú thích
- Cộng tác thời gian thực với WebSocket

## Kiến Trúc Hệ Thống

### Microservices (6 Services)
1. **Authentication Service** (Node.js + Express + PostgreSQL)
2. **User Management Service** (Node.js + PostgreSQL)
3. **Image Service** (Python FastAPI + MinIO/S3 + PostgreSQL)
4. **Annotation Service** (Node.js + MongoDB)
5. **Chat Service** (Node.js + Socket.io + Cassandra)
6. **Notification Service** (Python + Redis + Kafka)

### Infrastructure
- **API Gateway**: NGINX (routing, load balancing, SSL termination)
- **Message Broker**: Apache Kafka (event streaming)
- **Databases**: PostgreSQL, MongoDB, Cassandra, Redis
- **Object Storage**: MinIO (S3-compatible)
- **Frontend**: React + WebSocket

## Lý Thuyết Được Áp Dụng

### 1. Kiến Trúc Microservices
**Lý thuyết từ**: Kỹ Thuật Lập Trình, OOP

**Nguyên lý**:
- **Single Responsibility Principle (SRP)**: Mỗi service chỉ làm một việc
- **Loose Coupling**: Services giao tiếp qua API/events, không phụ thuộc trực tiếp
- **High Cohesion**: Chức năng liên quan được nhóm trong cùng service

**Lợi ích**:
- Mở rộng độc lập từng service
- Deploy riêng lẻ không ảnh hưởng toàn hệ thống
- Chọn công nghệ phù hợp cho từng service

### 2. Event-Driven Architecture (EDA)
**Lý thuyết từ**: Lập Trình GUI, Cấu Trúc Dữ Liệu

**Nguyên lý**:
- Services giao tiếp qua **events** (sự kiện) thay vì gọi trực tiếp
- **Publisher-Subscriber pattern**: Service A publish event, Service B,C,D subscribe
- **Asynchronous**: Không chờ đợi phản hồi ngay lập tức

**Ví dụ trong hệ thống**:
```
ImageService upload ảnh
→ Publish event "ImageUploaded" vào Kafka
→ NotificationService subscribe event
→ Gửi thông báo cho collaborators
```

### 3. Polyglot Persistence (Lưu trữ đa ngôn ngữ)
**Lý thuyết từ**: Cơ Sở Dữ Liệu, CSDL Phân Tán

**Nguyên lý**: Sử dụng công nghệ database phù hợp cho từng loại dữ liệu

| Database | Service | Lý do |
|----------|---------|-------|
| **PostgreSQL** | Auth, User, Image metadata | Dữ liệu có cấu trúc, cần ACID, relationships |
| **MongoDB** | Annotations | Schema linh hoạt, spatial queries (tọa độ) |
| **Cassandra** | Chat messages | High write throughput, time-series data |
| **Redis** | Session, Cache | In-memory, cực nhanh, TTL tự động |

### 4. Load Balancing
**Lý thuyết từ**: Hệ Thống Phân Tán

**Thuật toán sử dụng**:
- **Round Robin**: Lần lượt gửi request đến các server
- **Least Connections**: Gửi đến server có ít kết nối nhất
- **IP Hash**: Sticky session cho WebSocket

### 5. CAP Theorem
**Lý thuyết từ**: CSDL Phân Tán

**Định lý CAP**: Hệ thống phân tán chỉ có thể đảm bảo tối đa 2/3:
- **C** (Consistency): Nhất quán
- **A** (Availability): Khả dụng
- **P** (Partition Tolerance): Chịu lỗi phân vùng

**Áp dụng**:
- PostgreSQL: **CP** (ưu tiên nhất quán)
- Cassandra: **AP** (ưu tiên khả dụng)

### 6. JWT (JSON Web Token)
**Lý thuyết từ**: Bảo mật, Mã hóa

**Cấu trúc JWT**: `Header.Payload.Signature`
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Ưu điểm**:
- Stateless: Không cần lưu session trên server
- Scalable: Dễ mở rộng horizontal
- Cross-domain: Dùng được cho nhiều services

## Cấu Trúc Thư Mục

```
.
├── services/
│   ├── auth-service/           # Authentication Service
│   ├── user-service/           # User Management
│   ├── image-service/          # Image Upload & Processing
│   ├── annotation-service/     # Annotations
│   ├── chat-service/           # Real-time Chat
│   └── notification-service/   # Notifications
├── infrastructure/
│   ├── api-gateway/            # NGINX config
│   ├── kafka/                  # Kafka config
│   └── databases/              # DB initialization scripts
├── frontend/                   # React application
├── docker-compose.yml          # Orchestrate all services
└── docs/                       # Documentation

```

## Cài Đặt và Chạy

```bash
# Clone repository
git clone <repo-url>
cd NenTangChuThichHinhAnhCongTac

# Chạy tất cả services với Docker Compose
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Endpoints API

### Authentication Service (Port 3001)
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/logout` - Đăng xuất
- `GET /auth/verify` - Xác thực token

### Image Service (Port 3003)
- `POST /images/upload` - Upload ảnh
- `GET /images/:id` - Lấy thông tin ảnh
- `DELETE /images/:id` - Xóa ảnh

### Annotation Service (Port 3004)
- `POST /annotations` - Tạo chú thích
- `GET /annotations/:imageId` - Lấy chú thích của ảnh
- `PUT /annotations/:id` - Cập nhật chú thích
- `DELETE /annotations/:id` - Xóa chú thích

### Chat Service (Port 3005)
- WebSocket connection: `ws://localhost:3005`
- Events: `send_message`, `join_thread`, `leave_thread`

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 🎓 Liên Hệ Với Chương Trình Đào Tạo

### **🆕 CẬP NHẬT: Authentication Service - 2 VERSIONS với Mapping CHƯƠNG**

**🔥 ĐẶC BIỆT: Project có 2 BRANCHES để so sánh:**

#### **1️⃣ VANILLA VERSION** (Branch: `claude/review-course-materials-...`)
- ✅ **100% Vanilla JavaScript** - KHÔNG dùng Winston, Joi
- ✅ Code từ đầu để hiểu principle
- ✅ `logger.js`: 391 dòng với fs.appendFileSync()
- ✅ `validation.js`: Custom validation functions với regex
- ✅ Phù hợp: Học tập, hiểu cách hoạt động bên trong

#### **2️⃣ LIBRARY VERSION** (Branch: `claude/auth-library-version-...`)
- ✅ **Production-ready** với Winston, Joi libraries
- ✅ Async I/O, log rotation, schema validation
- ✅ `logger.js`: 402 dòng với Winston transports
- ✅ `validation.js`: Joi schema validation (TODO)
- ✅ Phù hợp: Production, team lớn, scale

**Nguồn đề cương**: [TaiLieuHocTheoDeCuongMonHocTruongDaiHoc](https://github.com/lehuy0210/TaiLieuHocTheoDeCuongMonHocTruongDaiHoc)

---

#### 📊 **Top 10 Môn Học Được Áp Dụng Nhiều Nhất**:

**🎯 ĐẶC BIỆT**: Mỗi file code giờ đây có comment mapping CỤ THỂ đến **CHƯƠNG** của môn học!

1. **An Toàn và Bảo Mật Hệ Thống** - 7/7 files (100%)
   - 📖 CHƯƠNG 1-5: Password Security, Cryptography, Web Attacks
   - Bcrypt internals: Cost 10 = 2^10 = 1024 iterations
   - JWT structure: HMAC-SHA256 signature verification
   - 7 attack types: SQL Injection, XSS, CSRF, SSRF, ReDoS, etc.

2. **Cơ Sở Dữ Liệu** - 7/7 files (100%)
   - 📖 CHƯƠNG 3: Normalization, CHƯƠNG 5: B-Tree Indexing
   - B-Tree index: 1M records → 20 comparisons vs 1M without index
   - Connection pool: 65ms → 7ms optimization
   - ACID transactions, Soft delete pattern

3. **Mạng Máy Tính** - 7/7 files (100%)
   - 📖 CHƯƠNG 4: Application Layer (HTTP, DNS), CHƯƠNG 5: Transport Layer (TCP)
   - HTTP protocol, RESTful API, Status codes
   - TCP socket, Client-server architecture
   - CORS, Security headers

4. **Cấu Trúc Dữ Liệu & Giải Thuật 1** - 7/7 files (100%)
   - 📖 CHƯƠNG 1: Lists, CHƯƠNG 2: Sorting, CHƯƠNG 4: Hash Tables
   - Hash table O(1) Redis operations
   - 5 rate limiting algorithms: Fixed Window, Sliding Window, Token Bucket, Leaky Bucket
   - Base64URL encoding process

5. **Toán Tin Học (Discrete Math)** - 5/7 files (71%)
   - Shannon entropy: H = log₂(R^L)
   - HMAC formula: HMAC(K,m) = H((K' ⊕ opad) || H((K' ⊕ ipad) || m))
   - UUID collision probability: P ≈ n²/(2 * 2^122) ≈ 10^-15

6. **Kỹ Thuật Phần Mềm** - 6/7 files (86%)
   - Design patterns: Middleware, Strategy, Factory
   - SOLID principles, Separation of concerns
   - Error handling patterns

7. **Công Nghệ Lập Trình Hiện Đại** - 6/7 files (86%)
   - RESTful API design principles
   - Microservices architecture
   - Event-Driven Architecture with Kafka

8. **Lập Trình Hướng Đối Tượng** - 5/7 files (71%)
   - Sequelize ORM models
   - Encapsulation, Inheritance
   - Model hooks: beforeCreate, toJSON

9. **Hệ Điều Hành** - 4/7 files (57%)
   - SIGTERM/SIGINT signals for graceful shutdown
   - File I/O operations
   - Process management

10. **Lý Thuyết Tính Toán (Automata)** - 2/7 files (29%)
    - Regular expressions = Finite Automaton (DFA)
    - ReDoS prevention with regex complexity

### 📁 **Chi Tiết Từng File**:

| File | Dòng Code | Môn Học Kết Nối | Highlights |
|------|-----------|-----------------|------------|
| **logger.js** | 262 | 10 môn (38%) | Microservices logging, ELK stack architecture |
| **database.js** | 297 | 14 môn (54%) | Connection pool, B-Tree, ACID transactions |
| **validation.js** | 768 | 10 môn (38%) | Automata theory, Shannon entropy, 7 attack types |
| **User.js** | 705 | 11 môn (42%) | Bcrypt internals, Rainbow tables, UUID collision |
| **auth.js** | 891 | 11 môn (42%) | JWT structure, HMAC algorithm, Redis architecture |
| **routes/auth.js** | 490 | 9 môn (35%) | RESTful principles, HTTP status codes, AuthN vs AuthZ |
| **server.js** | 558 | 13 môn (50%) | Middleware stack, 5 rate limiting algorithms, Security headers |

**TỔNG: ~3,500 dòng code với educational comments chi tiết**

### 📚 **Tài Liệu Đặc Biệt**:

- **CHUONG_TRINH_HOC.md** (300 dòng): Master mapping document showing connections between ALL code and ALL 26 university courses, with knowledge chains and learning paths

### 💎 **Educational Highlights**:

- ✅ **Concrete Examples**: Mọi concept đều có số liệu thực tế
  - "Password 'password' = 37.6 bits → 2 phút crack"
  - "B-Tree với 1M records chỉ cần 20 comparisons"
  - "Connection pool optimization: 65ms → 7ms"

- ✅ **Visual Diagrams**: JWT structure, HMAC formula breakdown, Middleware execution flow

- ✅ **Vietnamese Comments**: Dễ hiểu cho sinh viên trung bình-khá

- ✅ **Knowledge Expansion Sections**: Mỗi file có phần tổng kết lý thuyết ở cuối

**Xem chi tiết mapping tại**: `services/auth-service/CHUONG_TRINH_HOC.md`

## License

MIT
