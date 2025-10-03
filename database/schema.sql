-- ============================================
-- HỆ THỐNG TRA CỨU VĂN BẰNG - DATABASE SCHEMA
-- PostgreSQL Version
-- ============================================

-- Xóa các bảng nếu đã tồn tại (cho development)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS search_logs CASCADE;
DROP TABLE IF EXISTS diplomas CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ============================================
-- 1. BẢNG DIPLOMAS - Thông tin văn bằng
-- ============================================
CREATE TABLE diplomas (
    id SERIAL PRIMARY KEY,
    
    -- Thông tin văn bằng (6 trường chính theo yêu cầu)
    diploma_number VARCHAR(100) UNIQUE NOT NULL,  -- Số hiệu văn bằng
    registry_number VARCHAR(100),                  -- Số vào sổ
    issue_date DATE,                               -- Ngày cấp
    school_name VARCHAR(255) NOT NULL DEFAULT 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
    major VARCHAR(255),                            -- Ngành đào tạo
    specialization VARCHAR(255),                   -- Chuyên ngành đào tạo
    
    -- Thông tin chi tiết sinh viên
    student_code VARCHAR(50),                      -- Mã sinh viên
    full_name VARCHAR(255) NOT NULL,               -- Họ và tên
    birth_date DATE,                               -- Ngày sinh (optional)
    training_system VARCHAR(100),                  -- Hệ đào tạo (Chính quy, Liên thông, Vừa làm vừa học)
    graduation_year INTEGER,                       -- Năm tốt nghiệp
    
    -- Thông tin bổ sung
    gpa DECIMAL(3,2),                              -- Điểm trung bình (optional)
    classification VARCHAR(50),                    -- Xếp loại tốt nghiệp (Xuất sắc, Giỏi, Khá, TB)
    notes TEXT,                                    -- Ghi chú
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,                -- Trạng thái hoạt động
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),                       -- User tạo
    updated_by VARCHAR(100)                        -- User cập nhật
);

-- Index để tối ưu tìm kiếm
CREATE INDEX idx_diploma_number ON diplomas(diploma_number);
CREATE INDEX idx_student_code ON diplomas(student_code);
CREATE INDEX idx_full_name ON diplomas(full_name);
CREATE INDEX idx_issue_date ON diplomas(issue_date);
CREATE INDEX idx_graduation_year ON diplomas(graduation_year);
CREATE INDEX idx_is_active ON diplomas(is_active);

-- Comment cho các cột
COMMENT ON TABLE diplomas IS 'Bảng lưu trữ thông tin văn bằng tốt nghiệp';
COMMENT ON COLUMN diplomas.diploma_number IS 'Số hiệu bằng tốt nghiệp - Trường duy nhất để tra cứu';
COMMENT ON COLUMN diplomas.registry_number IS 'Số vào sổ cấp bằng';
COMMENT ON COLUMN diplomas.is_active IS 'FALSE nếu bằng bị thu hồi hoặc không còn hiệu lực';

-- ============================================
-- 2. BẢNG SEARCH_LOGS - Nhật ký tra cứu
-- ============================================
CREATE TABLE search_logs (
    id SERIAL PRIMARY KEY,
    diploma_number VARCHAR(100),                   -- Số hiệu được tra cứu
    ip_address VARCHAR(45),                        -- IPv4 hoặc IPv6
    user_agent TEXT,                               -- Browser info
    referer VARCHAR(500),                          -- Nguồn truy cập
    found BOOLEAN NOT NULL,                        -- Tìm thấy hay không
    search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER                       -- Thời gian phản hồi (ms)
);

-- Index để phân tích
CREATE INDEX idx_search_time ON search_logs(search_time);
CREATE INDEX idx_ip_address ON search_logs(ip_address);
CREATE INDEX idx_found ON search_logs(found);
CREATE INDEX idx_diploma_search ON search_logs(diploma_number, search_time);

COMMENT ON TABLE search_logs IS 'Nhật ký tra cứu để phân tích và chống lạm dụng';

-- ============================================
-- 3. BẢNG ADMIN_USERS - Quản trị viên
-- ============================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,           -- Bcrypt hash
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',             -- admin, editor, viewer
    department VARCHAR(100),                       -- Phòng ban
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_username ON admin_users(username);
CREATE INDEX idx_email ON admin_users(email);
CREATE INDEX idx_is_active_user ON admin_users(is_active);

COMMENT ON TABLE admin_users IS 'Tài khoản quản trị hệ thống';
COMMENT ON COLUMN admin_users.role IS 'admin: full quyền, editor: thêm/sửa, viewer: chỉ xem';

-- ============================================
-- 4. BẢNG ADMIN_LOGS - Nhật ký thao tác admin
-- ============================================
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,                   -- INSERT, UPDATE, DELETE, IMPORT
    table_name VARCHAR(50),
    record_id INTEGER,
    old_data JSONB,                                -- Dữ liệu cũ (cho UPDATE/DELETE)
    new_data JSONB,                                -- Dữ liệu mới (cho INSERT/UPDATE)
    description TEXT,                              -- Mô tả chi tiết
    ip_address VARCHAR(45),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_action_time ON admin_logs(action_time);
CREATE INDEX idx_action_type ON admin_logs(action);

COMMENT ON TABLE admin_logs IS 'Nhật ký mọi thao tác của admin để audit';

-- ============================================
-- 5. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger
CREATE TRIGGER update_diplomas_updated_at
    BEFORE UPDATE ON diplomas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. DỮ LIỆU MẪU (Sample Data)
-- ============================================

-- Tạo admin user mẫu (password: admin123)
INSERT INTO admin_users (username, password_hash, full_name, email, role, department)
VALUES 
    ('admin', '$2b$10$YourHashedPasswordHere', 'Quản trị viên', 'admin@hpu.edu.vn', 'admin', 'Phòng Đào tạo'),
    ('pdt_staff', '$2b$10$YourHashedPasswordHere', 'Nhân viên PĐT', 'pdt@hpu.edu.vn', 'editor', 'Phòng Đào tạo'),
    ('viewer', '$2b$10$YourHashedPasswordHere', 'Người xem', 'viewer@hpu.edu.vn', 'viewer', 'Phòng Đào tạo');

-- Dữ liệu văn bằng mẫu
INSERT INTO diplomas (
    diploma_number, registry_number, issue_date, 
    major, specialization, student_code, full_name,
    training_system, graduation_year, gpa, classification,
    created_by
) VALUES 
    (
        '123456', 'SV2023-7890', '2023-06-15',
        'Công nghệ Thông tin', 'Kỹ thuật Phần mềm',
        '2019600001', 'Nguyễn Văn A',
        'Đại học chính quy', 2023, 3.45, 'Khá',
        'admin'
    ),
    (
        'ABC-2023-001', 'SV2023-1234', '2023-07-20',
        'Quản trị Kinh doanh', 'Marketing',
        '2019600123', 'Trần Thị B',
        'Đại học chính quy', 2023, 3.78, 'Giỏi',
        'admin'
    ),
    (
        'HPU-2023-0456', 'SV2023-5678', '2023-08-10',
        'Kế toán', 'Kiểm toán',
        '2019600456', 'Lê Văn C',
        'Đại học chính quy', 2023, 3.25, 'Khá',
        'admin'
    );

-- ============================================
-- 7. VIEWS - Các view hữu ích
-- ============================================

-- View thống kê tra cứu theo ngày
CREATE VIEW daily_search_stats AS
SELECT 
    DATE(search_time) as search_date,
    COUNT(*) as total_searches,
    COUNT(CASE WHEN found = TRUE THEN 1 END) as successful_searches,
    COUNT(CASE WHEN found = FALSE THEN 1 END) as failed_searches,
    COUNT(DISTINCT ip_address) as unique_visitors,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms
FROM search_logs
GROUP BY DATE(search_time)
ORDER BY search_date DESC;

-- View thống kê văn bằng theo năm
CREATE VIEW diplomas_by_year AS
SELECT 
    graduation_year,
    COUNT(*) as total_diplomas,
    COUNT(CASE WHEN classification = 'Xuất sắc' THEN 1 END) as excellent_count,
    COUNT(CASE WHEN classification = 'Giỏi' THEN 1 END) as good_count,
    COUNT(CASE WHEN classification = 'Khá' THEN 1 END) as fair_count,
    ROUND(AVG(gpa), 2) as average_gpa
FROM diplomas
WHERE is_active = TRUE
GROUP BY graduation_year
ORDER BY graduation_year DESC;

-- View văn bằng được tra cứu nhiều nhất
CREATE VIEW most_searched_diplomas AS
SELECT 
    sl.diploma_number,
    d.full_name,
    d.major,
    d.graduation_year,
    COUNT(*) as search_count,
    MAX(sl.search_time) as last_searched
FROM search_logs sl
LEFT JOIN diplomas d ON sl.diploma_number = d.diploma_number
WHERE sl.found = TRUE
GROUP BY sl.diploma_number, d.full_name, d.major, d.graduation_year
ORDER BY search_count DESC
LIMIT 100;

-- ============================================
-- 8. FUNCTIONS - Các hàm hữu ích
-- ============================================

-- Hàm tìm kiếm văn bằng
CREATE OR REPLACE FUNCTION search_diploma(
    p_diploma_number VARCHAR(100)
)
RETURNS TABLE (
    diploma_number VARCHAR(100),
    registry_number VARCHAR(100),
    issue_date DATE,
    school_name VARCHAR(255),
    major VARCHAR(255),
    specialization VARCHAR(255),
    student_code VARCHAR(50),
    full_name VARCHAR(255),
    training_system VARCHAR(100),
    graduation_year INTEGER,
    classification VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.diploma_number,
        d.registry_number,
        d.issue_date,
        d.school_name,
        d.major,
        d.specialization,
        d.student_code,
        d.full_name,
        d.training_system,
        d.graduation_year,
        d.classification
    FROM diplomas d
    WHERE d.diploma_number = p_diploma_number
    AND d.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Hàm kiểm tra rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_ip_address VARCHAR(45),
    p_time_window_minutes INTEGER DEFAULT 60,
    p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
    request_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO request_count
    FROM search_logs
    WHERE ip_address = p_ip_address
    AND search_time >= NOW() - INTERVAL '1 minute' * p_time_window_minutes;
    
    RETURN request_count < p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. GRANT PERMISSIONS (Optional)
-- ============================================
-- Tạo role cho ứng dụng
-- CREATE ROLE diploma_app_user WITH LOGIN PASSWORD 'your_secure_password';
-- GRANT SELECT, INSERT ON search_logs TO diploma_app_user;
-- GRANT SELECT ON diplomas TO diploma_app_user;
-- GRANT SELECT ON admin_users TO diploma_app_user;

-- ============================================
-- KẾT THÚC SCHEMA
-- ============================================

-- Kiểm tra kết quả
SELECT 'Database schema created successfully!' AS status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;