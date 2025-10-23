-- ============================================
-- DỮ LIỆU MẪU - 5 văn bằng
-- ============================================

-- Xóa dữ liệu cũ (nếu có)
DELETE FROM admin_logs;
DELETE FROM search_logs;
DELETE FROM diplomas;
DELETE FROM admin_users;

-- ============================================
-- 1. ADMIN USERS
-- ============================================
-- Password: admin123 (đã hash bằng bcrypt)
INSERT INTO admin_users (username, password_hash, full_name, email, role, department)
VALUES 
    ('admin', '$2b$10$YpXlSP5zQs7Z8kxGX.8rTeh3HXkNZ8VHQGqE.8rTe.YpXlSP5zQs7', 'Quản trị viên', 'admin@hpu.edu.vn', 'admin', 'Phòng Đào tạo'),
    ('pdt_staff', '$2b$10$YpXlSP5zQs7Z8kxGX.8rTeh3HXkNZ8VHQGqE.8rTe.YpXlSP5zQs7', 'Nhân viên PĐT', 'pdt@hpu.edu.vn', 'editor', 'Phòng Đào tạo');

-- ============================================
-- 2. VĂN BẰNG MẪU
-- ============================================

-- Văn bằng 1: Cử nhân CNTT - Nam
INSERT INTO diplomas (
    -- Metadata
    phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
    
    -- Thông tin văn bằng
    nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
    
    -- Thông tin cá nhân
    so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
    
    -- Thông tin trường
    ten_truong, ma_co_so_dao_tao,
    
    -- Thông tin tốt nghiệp
    nam_tot_nghiep, so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
    so_vao_so, xep_loai,
    
    -- Đơn vị cấp bằng
    don_vi_cap_bang, ma_don_vi_cap_bang,
    
    -- Người ký
    ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
    
    -- Địa danh và thời gian
    dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
    
    -- Phụ lục
    chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao, 
    tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia, 
    hinh_thuc_dao_tao,
    
    created_by
) VALUES (
    '1.0', '27/2019', 'HPU-2024-CNH-000001', 'Bằng Cử nhân',
    'Công nghệ Thông tin', '7480201', '001/ĐHCN-2024',
    '001202003456', '2020600001', 'NGUYỄN VĂN AN', '15/03/2002', 'Hải Phòng', 'Nam', 'Kinh', 'Việt Nam',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    2024, '1234/QĐ-HPU', '15/06/2024',
    '001/2024', 'Khá',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    'PGS.TS. Nguyễn Văn B', '001987654321', 'Hiệu trưởng',
    'Hải Phòng', '20/06/2024', '20/06/2024',
    'Kỹ thuật Phần mềm', '01/09/2020', 'Tiếng Việt', '4 năm',
    128, 'Trình độ 6', 'Đại học', 'Chính quy',
    'admin'
);

-- Văn bằng 2: Cử nhân Quản trị - Nữ
INSERT INTO diplomas (
    phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
    nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
    so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
    ten_truong, ma_co_so_dao_tao,
    nam_tot_nghiep, so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
    so_vao_so, xep_loai,
    don_vi_cap_bang, ma_don_vi_cap_bang,
    ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
    dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
    chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao, 
    tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia, 
    hinh_thuc_dao_tao,
    created_by
) VALUES (
    '1.0', '27/2019', 'HPU-2024-CNH-000002', 'Bằng Cử nhân',
    'Quản trị Kinh doanh', '7340101', '002/ĐHQT-2024',
    '001202007890', '2020600023', 'TRẦN THỊ BÌNH', '20/07/2002', 'Hải Dương', 'Nữ', 'Kinh', 'Việt Nam',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    2024, '1235/QĐ-HPU', '15/06/2024',
    '002/2024', 'Giỏi',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    'PGS.TS. Nguyễn Văn B', '001987654321', 'Hiệu trưởng',
    'Hải Phòng', '20/06/2024', '20/06/2024',
    'Marketing', '01/09/2020', 'Tiếng Việt', '4 năm',
    120, 'Trình độ 6', 'Đại học', 'Chính quy',
    'admin'
);

-- Văn bằng 3: Cử nhân Kế toán
INSERT INTO diplomas (
    phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
    nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
    so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
    ten_truong, ma_co_so_dao_tao,
    nam_tot_nghiep, so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
    so_vao_so, xep_loai,
    don_vi_cap_bang, ma_don_vi_cap_bang,
    ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
    dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
    chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao, 
    tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia, 
    hinh_thuc_dao_tao,
    created_by
) VALUES (
    '1.0', '27/2019', 'HPU-2024-CNH-000003', 'Bằng Cử nhân',
    'Kế toán', '7340301', '003/ĐHKT-2024',
    '001202011234', '2020600045', 'LÊ VĂN CƯỜNG', '10/11/2002', 'Thái Bình', 'Nam', 'Kinh', 'Việt Nam',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    2024, '1236/QĐ-HPU', '15/06/2024',
    '003/2024', 'Khá',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    'PGS.TS. Nguyễn Văn B', '001987654321', 'Hiệu trưởng',
    'Hải Phòng', '20/06/2024', '20/06/2024',
    'Kiểm toán', '01/09/2020', 'Tiếng Việt', '4 năm',
    124, 'Trình độ 6', 'Đại học', 'Chính quy',
    'admin'
);

-- Văn bằng 4: Cử nhân CNTT 2023 - Xuất sắc
INSERT INTO diplomas (
    phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
    nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
    so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
    ten_truong, ma_co_so_dao_tao,
    nam_tot_nghiep, so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
    so_vao_so, xep_loai,
    don_vi_cap_bang, ma_don_vi_cap_bang,
    ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
    dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
    chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao, 
    tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia, 
    hinh_thuc_dao_tao,
    created_by
) VALUES (
    '1.0', '27/2019', 'HPU-2023-CNH-000045', 'Bằng Cử nhân',
    'Công nghệ Thông tin', '7480201', '045/ĐHCN-2023',
    '001201005678', '2019600012', 'PHẠM THỊ DUNG', '05/05/2001', 'Hà Nội', 'Nữ', 'Kinh', 'Việt Nam',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    2023, '987/QĐ-HPU', '15/06/2023',
    '045/2023', 'Xuất sắc',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    'PGS.TS. Nguyễn Văn B', '001987654321', 'Hiệu trưởng',
    'Hải Phòng', '20/06/2023', '20/06/2023',
    'Hệ thống thông tin', '01/09/2019', 'Tiếng Việt', '4 năm',
    130, 'Trình độ 6', 'Đại học', 'Chính quy',
    'admin'
);

-- Văn bằng 5: Kỹ sư Điện tử - Viễn thông
INSERT INTO diplomas (
    phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
    nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
    so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
    ten_truong, ma_co_so_dao_tao,
    nam_tot_nghiep, so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
    so_vao_so, xep_loai,
    don_vi_cap_bang, ma_don_vi_cap_bang,
    ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
    dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
    chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao, 
    tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia, 
    hinh_thuc_dao_tao,
    created_by
) VALUES (
    '1.0', '27/2019', 'HPU-2023-KSU-000067', 'Bằng Kỹ sư',
    'Kỹ thuật Điện tử - Viễn thông', '7520207', '067/ĐHKT-2023',
    '001200012345', '2018600034', 'HOÀNG VĂN MINH', '25/12/2000', 'Quảng Ninh', 'Nam', 'Kinh', 'Việt Nam',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    2023, '988/QĐ-HPU', '15/06/2023',
    '067/2023', 'Khá',
    'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01',
    'PGS.TS. Nguyễn Văn B', '001987654321', 'Hiệu trưởng',
    'Hải Phòng', '20/06/2023', '20/06/2023',
    'Điện tử viễn thông', '01/09/2018', 'Tiếng Việt', '5 năm',
    150, 'Trình độ 6', 'Đại học', 'Chính quy',
    'admin'
);

-- ============================================
-- KẾT QUẢ
-- ============================================
SELECT 'Seed data completed!' AS status;
SELECT COUNT(*) AS total_diplomas FROM diplomas;
SELECT COUNT(*) AS total_admins FROM admin_users;