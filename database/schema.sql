-- ============================================
-- SCHEMA VĂN BẰNG SỐ v2.0 - Theo Phụ lục 1.2
-- ============================================

-- ============================================
-- 1. BẢNG DIPLOMAS (Văn bằng)
-- ============================================
CREATE TABLE diplomas (
    id SERIAL PRIMARY KEY,
    
    -- A. Thông tin chung (33 trường bắt buộc)
    phien_ban VARCHAR(10) NOT NULL DEFAULT '1.0',
    thong_tu VARCHAR(10) NOT NULL DEFAULT '27/2019',
    ma_dinh_danh_vbcc VARCHAR(36) UNIQUE NOT NULL,
    ten_vbcc VARCHAR(50) NOT NULL,
    nganh_dao_tao VARCHAR(150) NOT NULL,
    ma_nganh_dao_tao VARCHAR(12) NOT NULL,
    so_hieu_vbcc VARCHAR(20) UNIQUE NOT NULL,
    so_ddcn VARCHAR(12) NOT NULL,
    ma_nguoi_hoc VARCHAR(12) NOT NULL,
    ho_va_ten VARCHAR(150) NOT NULL,
    ngay_sinh VARCHAR(10) NOT NULL,
    noi_sinh VARCHAR(250) NOT NULL,
    gioi_tinh VARCHAR(20) NOT NULL CHECK (gioi_tinh IN ('Nam', 'Nữ')),
    dan_toc VARCHAR(50) NOT NULL,
    quoc_tich VARCHAR(100) NOT NULL DEFAULT 'Việt Nam',
    ten_truong VARCHAR(250) NOT NULL DEFAULT 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
    ma_co_so_dao_tao VARCHAR(20) NOT NULL DEFAULT 'HPU01',
    nam_tot_nghiep INTEGER NOT NULL,
    so_quyet_dinh_cong_nhan_tot_nghiep VARCHAR(50) NOT NULL,
    ngay_quyet_dinh_cong_nhan_tot_nghiep VARCHAR(10) NOT NULL,
    so_quyet_dinh_hoi_dong_danh_gia VARCHAR(50),
    so_vao_so VARCHAR(20) NOT NULL,
    xep_loai VARCHAR(50),
    don_vi_cap_bang VARCHAR(250) NOT NULL,
    ma_don_vi_cap_bang VARCHAR(20) NOT NULL DEFAULT 'HPU01',
    ho_ten_nguoi_ky_vbcc VARCHAR(150) NOT NULL,
    so_ddcn_nguoi_ky_vbcc VARCHAR(12) NOT NULL,
    chuc_danh_nguoi_ky_vbcc VARCHAR(150) NOT NULL,
    ho_ten_nguoi_ky_vbcc_ban_giay VARCHAR(150),
    chuc_danh_nguoi_ky_vbcc_ban_giay VARCHAR(150),
    dia_danh_cap_vbcc VARCHAR(50) NOT NULL DEFAULT 'Hải Phòng',
    ngay_tao_vbcc VARCHAR(10) NOT NULL,
    ngay_cap_vbcc VARCHAR(10) NOT NULL,
    
    -- B. Phụ lục bằng (11 trường)
    chuyen_nganh_dao_tao VARCHAR(150) NOT NULL,
    ngay_nhap_hoc VARCHAR(10),
    ngon_ngu_dao_tao VARCHAR(150) NOT NULL DEFAULT 'Tiếng Việt',
    thoi_gian_dao_tao VARCHAR(150) NOT NULL,
    tong_so_tin_chi INTEGER,
    trinh_do_theo_khung_quoc_gia VARCHAR(150) NOT NULL,
    bac_trinh_do_theo_khung_quoc_gia VARCHAR(150) NOT NULL,
    hinh_thuc_dao_tao VARCHAR(150) NOT NULL,
    ghi_chu TEXT,
    attachment_name VARCHAR(250),
    attachment_content_base64 TEXT,
    
    -- C. Metadata hệ thống
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- ============================================
-- 2. INDEXES
-- ============================================
CREATE INDEX idx_ma_dinh_danh ON diplomas(ma_dinh_danh_vbcc);
CREATE INDEX idx_so_hieu_vbcc ON diplomas(so_hieu_vbcc);
CREATE INDEX idx_ma_nguoi_hoc ON diplomas(ma_nguoi_hoc);
CREATE INDEX idx_so_ddcn ON diplomas(so_ddcn);
CREATE INDEX idx_ho_va_ten ON diplomas(ho_va_ten);
CREATE INDEX idx_ngay_sinh ON diplomas(ngay_sinh);
CREATE INDEX idx_nam_tot_nghiep ON diplomas(nam_tot_nghiep);
CREATE INDEX idx_is_active ON diplomas(is_active);

-- Unique constraint: 1 SV chỉ có 1 bằng/ngành/năm
CREATE UNIQUE INDEX idx_unique_diploma 
ON diplomas(ma_nguoi_hoc, nam_tot_nghiep, ma_nganh_dao_tao);

-- ============================================
-- 3. BẢNG SEARCH_LOGS
-- ============================================
CREATE TABLE search_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    search_type VARCHAR(20) NOT NULL,
    search_value_hash VARCHAR(64),
    found BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    captcha_score DECIMAL(3,2),
    captcha_status VARCHAR(20),
    error_message TEXT,
    search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_ip ON search_logs(ip_address, search_time);
CREATE INDEX idx_search_time ON search_logs(search_time);

-- ============================================
-- 4. BẢNG ADMIN_USERS
-- ============================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. BẢNG ADMIN_LOGS
-- ============================================
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address VARCHAR(45),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_time ON admin_logs(action_time);

-- ============================================
-- 6. TRIGGER UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diplomas_updated_at
    BEFORE UPDATE ON diplomas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- KẾT THÚC
-- ============================================
SELECT 'Schema v2.0 created successfully!' AS status;