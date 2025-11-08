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

## Contributors

- Hệ thống được thiết kế dựa trên kiến thức từ 10 môn học:
  - Cơ Sở Lập Trình
  - Lập Trình Hướng Đối Tượng
  - Kỹ Thuật Lập Trình
  - Cấu Trúc Dữ Liệu 1 & 2
  - Cơ Sở Dữ Liệu
  - Lập Trình GUI
  - Quản Trị CSDL
  - Lập Trình CSDL
  - Cơ Sở Dữ Liệu Phân Tán

## License

MIT
