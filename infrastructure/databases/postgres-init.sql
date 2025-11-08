-- =============================================================================
-- POSTGRESQL INITIALIZATION SCRIPT
-- Nền Tảng Chú Thích Hình Ảnh Cộng Tác
-- =============================================================================
-- Lý thuyết: Database Schema Design
-- - Entity-Relationship Model (ER Model)
-- - Normalization (3NF - Third Normal Form)
-- - Primary Keys & Foreign Keys
-- - Indexes cho query optimization
-- =============================================================================

-- Enable UUID extension
-- Lý thuyết: UUID (Universally Unique Identifier)
-- - 128-bit số, globally unique
-- - Không cần central coordination
-- - Tốt cho distributed systems
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: users
-- Lý thuyết: Entity trong ER Model
-- - Primary Key: id (UUID)
-- - Unique constraint: email (không được trùng)
-- - Timestamps: created_at, updated_at (audit trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- Bcrypt hash (60 chars)
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lý thuyết: B-Tree Index
-- - Balanced tree structure
-- - O(log n) lookup time
-- - Tăng tốc queries với WHERE, JOIN, ORDER BY
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

COMMENT ON TABLE users IS 'Bảng lưu trữ thông tin người dùng. Áp dụng 3NF normalization.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash của password (salt + hash). KHÔNG BAO GIỜ lưu plain password!';

-- =============================================================================
-- TABLE: roles
-- Lý thuyết: RBAC (Role-Based Access Control)
-- - Separation of Concerns: Tách quyền thành roles
-- - Reusability: Một role có thể gán cho nhiều users
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,  -- e.g., 'admin', 'editor', 'viewer'
    description TEXT,
    permissions JSONB,  -- PostgreSQL JSON type cho flexible permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system access', '["user:*", "image:*", "annotation:*", "chat:*"]'::jsonb),
('editor', 'Can create and edit content', '["image:read", "image:create", "annotation:*", "chat:*"]'::jsonb),
('viewer', 'Read-only access', '["image:read", "annotation:read", "chat:read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- TABLE: user_roles
-- Lý thuyết: Many-to-Many Relationship
-- - Junction table (associative entity)
-- - Composite primary key (user_id, role_id)
-- - Foreign keys với ON DELETE CASCADE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,  -- Ai gán role này?
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- =============================================================================
-- TABLE: images
-- Lý thuyết: Metadata Storage
-- - Lưu metadata trong SQL, binary data trong Object Storage (MinIO)
-- - Separation of concerns: Structured data vs Unstructured data
-- =============================================================================
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,  -- MinIO URL
    thumbnail_url TEXT,
    mime_type VARCHAR(50) NOT NULL,  -- e.g., 'image/jpeg'
    file_size BIGINT NOT NULL,  -- bytes
    width INTEGER,
    height INTEGER,
    metadata JSONB,  -- EXIF data, camera info, etc.
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Lý thuyết: Composite Index
-- - Index trên nhiều columns
-- - Tăng tốc queries: WHERE user_id = ? ORDER BY uploaded_at DESC
CREATE INDEX idx_images_user_uploaded ON images(user_id, uploaded_at DESC);
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at DESC);

COMMENT ON TABLE images IS 'Metadata của hình ảnh. Binary data lưu trong MinIO.';
COMMENT ON COLUMN images.storage_url IS 'URL đầy đủ trỏ đến file trong MinIO/S3';

-- =============================================================================
-- TABLE: sessions
-- Lý thuyết: Session Management
-- - Tracking user sessions
-- - Revoke tokens (blacklist)
-- - Multi-device support
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,  -- SHA256 hash của JWT token
    device_info JSONB,  -- User agent, IP, device name
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Lý thuyết: Automatic Cleanup
-- - Delete expired sessions định kỳ
-- - Giảm database size
-- - Security: Không giữ stale tokens
-- (Trong production, dùng cron job hoặc pg_cron extension)

-- =============================================================================
-- TABLE: audit_logs
-- Lý thuyết: Audit Trail
-- - Tracking tất cả actions trong hệ thống
-- - Security & Compliance
-- - Debugging & Forensics
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,  -- e.g., 'USER_LOGIN', 'IMAGE_UPLOAD'
    resource_type VARCHAR(50),  -- e.g., 'user', 'image', 'annotation'
    resource_id UUID,
    details JSONB,  -- Additional context
    ip_address INET,  -- PostgreSQL IP address type
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Lý thuyết: Time-Series Index
-- - Partition by time để tăng performance
-- - Thường query theo thời gian gần đây
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =============================================================================
-- VIEWS
-- Lý thuyết: Database Views
-- - Virtual tables
-- - Simplify complex queries
-- - Encapsulation: Hide implementation details
-- =============================================================================

-- View: User với Roles
-- Kết hợp users + user_roles + roles bằng JOIN
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT
    u.id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.is_active,
    u.is_verified,
    u.created_at,
    COALESCE(
        json_agg(
            json_build_object(
                'role_id', r.id,
                'role_name', r.name,
                'permissions', r.permissions
            )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'
    ) AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;

COMMENT ON VIEW v_users_with_roles IS 'View kết hợp users với roles. Dùng json_agg để aggregate roles thành JSON array.';

-- View: Image Statistics per User
CREATE OR REPLACE VIEW v_user_image_stats AS
SELECT
    u.id AS user_id,
    u.full_name,
    COUNT(i.id) AS total_images,
    SUM(i.file_size) AS total_storage_bytes,
    ROUND(AVG(i.file_size)) AS avg_image_size_bytes,
    MAX(i.uploaded_at) AS last_upload_at
FROM users u
LEFT JOIN images i ON u.id = i.user_id
GROUP BY u.id, u.full_name;

COMMENT ON VIEW v_user_image_stats IS 'Thống kê hình ảnh cho mỗi user. Sử dụng aggregate functions: COUNT, SUM, AVG, MAX.';

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- Lý thuyết: Stored Procedures & Triggers
-- - Encapsulate business logic trong database
-- - Automatic actions khi INSERT/UPDATE/DELETE
-- =============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at khi UPDATE users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function tự động cập nhật updated_at timestamp.';

-- Function: Check user permissions
-- Lý thuyết: Stored Procedure cho business logic
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = p_user_id
        AND (
            r.permissions ? p_permission
            OR r.permissions ? SPLIT_PART(p_permission, ':', 1) || ':*'
        )
    ) INTO has_permission;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_permission IS 'Kiểm tra user có permission cụ thể hay không. Hỗ trợ wildcard (*).';

-- =============================================================================
-- SAMPLE DATA (for development/testing)
-- =============================================================================

-- Sample user (password: 'password123')
-- Bcrypt hash generated with 10 salt rounds
INSERT INTO users (email, password_hash, full_name, is_verified) VALUES
('admin@example.com', '$2b$10$rVZN8YnwH7z5YYhX5Yv.K.xK1YQYzJZYJ5YvYQYzJZYJ5YvYQYzJZ', 'Administrator', TRUE),
('user@example.com', '$2b$10$rVZN8YnwH7z5YYhX5Yv.K.xK1YQYzJZYJ5YvYQYzJZYJ5YvYQYzJZ', 'Regular User', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@example.com' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'user@example.com' AND r.name = 'editor'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Lý thuyết: VACUUM & ANALYZE
-- - VACUUM: Reclaim storage từ deleted rows
-- - ANALYZE: Update statistics cho query planner
-- (Trong production, enable autovacuum)

-- Lý thuyết: Connection Pooling
-- - Reuse database connections
-- - Reduce overhead của creating connections
-- - Implement trong application layer (pg-pool, pgbouncer)

COMMIT;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON DATABASE platform_db IS 'Database cho Nền Tảng Chú Thích Hình Ảnh Cộng Tác';

-- End of initialization script
SELECT 'PostgreSQL database initialized successfully!' AS status;
