# 🎓 Hệ thống Tra cứu Văn bằng Số

**Phiên bản:** 2.0  
**Trường:** Đại học Quản lý và Công nghệ Hải Phòng  
**Chuẩn:** Phụ lục 1.2 - Bộ Giáo dục và Đào tạo

---

## 📋 Tổng quan

Hệ thống tra cứu và quản lý văn bằng số trực tuyến, tuân thủ đầy đủ **Thông tư 27/2019/TT-BGDĐT** và **Phụ lục 1.2** về định dạng văn bằng số.

### ✨ Tính năng chính

#### 🔍 Tra cứu công khai
- ✅ Tra cứu theo **Số hiệu văn bằng**
- ✅ Tra cứu theo **Mã sinh viên + Họ tên/Ngày sinh**
- ✅ Xác thực bằng Google reCAPTCHA v3
- ✅ Rate limiting (30 requests/giờ)
- ✅ Hiển thị đầy đủ thông tin văn bằng
- ✅ Responsive design (mobile, tablet, desktop)

#### 🔐 Quản trị Admin
- ✅ Đăng nhập an toàn (JWT + bcrypt)
- ✅ Quản lý văn bằng (CRUD)
- ✅ Import hàng loạt từ Excel
- ✅ Export template Excel
- ✅ Nhật ký tra cứu với thống kê
- ✅ Phân quyền (Admin, Editor, Viewer)
- ✅ Audit logs cho mọi thao tác

#### 📊 Dữ liệu
- ✅ **44 trường** theo Phụ lục 1.2 BGDĐT
- ✅ **33 trường bắt buộc** tuân thủ đầy đủ
- ✅ **11 trường phụ lục** bằng tốt nghiệp
- ✅ Mã định danh tự động: `HPU-2024-CNH-000001`
- ✅ Soft delete (không xóa vĩnh viễn)

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 App                      │
│                   (App Router + RSC)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐         ┌─────────────────┐      │
│  │  Public Pages   │         │  Admin Panel    │      │
│  ├─────────────────┤         ├─────────────────┤      │
│  │ • Search Form   │         │ • Login         │      │
│  │ • Result View   │         │ • Dashboard     │      │
│  │ • reCAPTCHA     │         │ • CRUD Diplomas │      │
│  └─────────────────┘         │ • Import Excel  │      │
│                              │ • View Logs     │      │
│                              └─────────────────┘      │
├─────────────────────────────────────────────────────────┤
│                     API Routes                          │
│  • /api/search              - Tra cứu công khai        │
│  • /api/admin/auth          - Xác thực admin           │
│  • /api/admin/diplomas      - CRUD văn bằng            │
│  • /api/admin/import        - Import/Export Excel      │
│  • /api/admin/logs          - Nhật ký tra cứu          │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                       │
│  • PostgreSQL 14+                                       │
│  • Connection Pooling (pg)                              │
│  • Transactions & Error Handling                        │
├─────────────────────────────────────────────────────────┤
│                   Database Schema                       │
│  • diplomas           - Văn bằng (44 fields)           │
│  • search_logs        - Nhật ký tra cứu                │
│  • admin_users        - Tài khoản quản trị             │
│  • admin_logs         - Nhật ký thao tác admin         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS
- **Notifications:** Sonner (toast)
- **Security:** Google reCAPTCHA v3
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL 14+
- **ORM:** pg (node-postgres)
- **Auth:** JWT + bcryptjs
- **Excel:** xlsx (SheetJS)

### DevOps
- **Version Control:** Git
- **Environment:** .env.local
- **Package Manager:** npm/yarn/pnpm

---

## 📦 Cấu trúc thư mục

```
diploma-system/
├── database/
│   ├── schema.sql                 # Schema v2.0 (44 fields)
│   └── seed-data.sql              # Dữ liệu mẫu (5 văn bằng)
│
├── scripts/
│   ├── migrate.js                 # Chạy migration
│   ├── test-connection.js         # Test database
│   └── fix-admin-password.js      # Fix mật khẩu admin
│
├── src/
│   ├── app/
│   │   ├── page.js                # Trang tra cứu công khai
│   │   ├── layout.js              # Root layout
│   │   ├── globals.css            # Global styles
│   │   │
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.js        # Đăng nhập admin
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── page.js        # Dashboard chính
│   │   │       └── components/
│   │   │           ├── DiplomaModal.js      # Form thêm/sửa (44 fields)
│   │   │           ├── DiplomasTable.js     # Bảng danh sách
│   │   │           ├── ImportModal.js       # Import Excel
│   │   │           ├── LogsTable.js         # Nhật ký tra cứu
│   │   │           ├── Pagination.js        # Phân trang
│   │   │           └── Sidebar.js           # Menu sidebar
│   │   │
│   │   └── api/
│   │       ├── search/
│   │       │   └── route.js       # API tra cứu công khai
│   │       │
│   │       └── admin/
│   │           ├── auth/
│   │           │   └── route.js   # Login/Logout
│   │           ├── diplomas/
│   │           │   └── route.js   # CRUD văn bằng
│   │           ├── import/
│   │           │   └── route.js   # Import/Export Excel
│   │           └── logs/
│   │               └── route.js   # API logs
│   │
│   └── lib/
│       └── db.js                  # Database functions
│
├── .env.local                     # Environment variables
├── .gitignore
├── package.json
├── README.md                      # File này
├── SETUP.md                       # Hướng dẫn cài đặt
└── next.config.js
```

---

## 🎯 Tính năng chi tiết

### 1. Tra cứu Văn bằng (Public)

#### Tra cứu theo Số hiệu
```
Input:  Số hiệu VB (VD: 001/ĐHCN-2024)
Output: Thông tin đầy đủ văn bằng + Mã định danh
```

#### Tra cứu theo Mã SV
```
Input:  Mã SV + (Họ tên HOẶC Ngày sinh)
Output: Thông tin đầy đủ văn bằng + Mã định danh
```

#### Thông tin hiển thị
- ✅ Mã định danh: `HPU-2024-CNH-000001`
- ✅ Thông tin cá nhân: Họ tên, ngày sinh, nơi sinh, giới tính
- ✅ Thông tin văn bằng: Số hiệu, ngành, chuyên ngành, xếp loại
- ✅ Thông tin đào tạo: Hình thức, thời gian, trình độ
- ✅ Thông tin cấp bằng: Ngày cấp, nơi cấp, đơn vị cấp

### 2. Quản trị Admin

#### Đăng nhập
- 🔐 JWT Token (8 giờ)
- 🔐 bcrypt password hashing
- 🔐 Cookie HttpOnly + SameSite

#### Dashboard
- 📊 Thống kê tổng quan
- 📊 Danh sách văn bằng (phân trang)
- 🔍 Tìm kiếm nhanh
- ⚡ Real-time updates

#### Quản lý Văn bằng
- ➕ **Thêm mới:** Form 3 tabs với 44 fields
- ✏️ **Chỉnh sửa:** Cập nhật mọi thông tin
- 🗑️ **Xóa:** Soft delete (is_active = false)
- 📥 **Import:** Excel với 29 cột
- 📤 **Export:** Download template mẫu

#### Import Excel
```
Template: 29 cột quan trọng
- Tự động sinh mã định danh
- Validate 27 trường bắt buộc
- Báo lỗi chi tiết theo từng dòng
- Skip các bản ghi lỗi, import phần hợp lệ
```

#### Nhật ký Tra cứu
- 📈 Thống kê: Tổng/Thành công/Thất bại/Tỷ lệ
- 📊 Top văn bằng được tìm nhiều nhất
- 📅 Thống kê theo ngày
- 🔎 Filter theo khoảng thời gian

---

## 🔒 Bảo mật

### Authentication
- ✅ JWT với secret key
- ✅ Password hashing (bcrypt, cost=10)
- ✅ HttpOnly cookies
- ✅ Session timeout (8h)

### Authorization
- ✅ Role-based access (admin, editor, viewer)
- ✅ Middleware protection cho admin routes
- ✅ Token verification mọi request

### Rate Limiting
- ✅ 30 requests/giờ cho search
- ✅ IP-based tracking
- ✅ Configurable limits

### Data Protection
- ✅ CCCD được hash trong logs
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (SameSite cookies)

### Privacy
- ❌ KHÔNG hiển thị CCCD sinh viên trong tra cứu công khai
- ✅ Chỉ admin mới xem được CCCD
- ✅ Audit logs cho mọi thao tác nhạy cảm

---

## 📊 Database Schema v2.0

### Table: diplomas (44 fields)

#### A. Thông tin chung (33 fields bắt buộc)
```sql
- Metadata: phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc
- Ngành: nganh_dao_tao, ma_nganh_dao_tao
- Định danh: so_hieu_vbcc, so_ddcn, ma_nguoi_hoc
- Cá nhân: ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich
- Trường: ten_truong, ma_co_so_dao_tao
- Tốt nghiệp: nam_tot_nghiep, so_quyet_dinh_*, ngay_quyet_dinh_*
- Văn bằng: so_vao_so, xep_loai
- Cấp bằng: don_vi_cap_bang, ma_don_vi_cap_bang
- Người ký: ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_*
- Thời gian: dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc
```

#### B. Phụ lục bằng (11 fields)
```sql
- chuyen_nganh_dao_tao, ngay_nhap_hoc
- ngon_ngu_dao_tao, thoi_gian_dao_tao, tong_so_tin_chi
- trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia
- hinh_thuc_dao_tao, ghi_chu
- attachment_name, attachment_content_base64
```

### Mã định danh tự động
```
Format: HPU-{NĂM}-{LOẠI}-{SEQUENCE}

Loại:
- CNH: Cử nhân
- KSU: Kỹ sư  
- THS: Thạc sĩ
- TSI: Tiến sĩ

Ví dụ: HPU-2024-CNH-000001
```

---

## 📈 Performance

### Database
- ✅ Connection pooling (2-10 connections)
- ✅ Indexes trên các cột tìm kiếm
- ✅ Query optimization
- ✅ Transaction support

### Caching
- ✅ Static pages (Next.js ISR)
- ✅ API response caching (5 phút)
- ✅ CDN ready

### Monitoring
- ✅ Query execution time logging
- ✅ Error tracking
- ✅ Response time metrics

---

## 🧪 Testing

### Unit Tests
```bash
npm run test:db          # Test database connection
node scripts/migrate.js  # Test schema migration
```

### Manual Testing Checklist

#### Tra cứu công khai
- [ ] Tra cứu theo số hiệu - Tìm thấy
- [ ] Tra cứu theo số hiệu - Không tìm thấy
- [ ] Tra cứu theo mã SV + họ tên
- [ ] Tra cứu theo mã SV + ngày sinh
- [ ] Tra cứu thiếu thông tin
- [ ] CAPTCHA verification
- [ ] Rate limiting

#### Admin panel
- [ ] Đăng nhập thành công
- [ ] Đăng nhập sai mật khẩu
- [ ] Thêm văn bằng mới
- [ ] Chỉnh sửa văn bằng
- [ ] Xóa văn bằng
- [ ] Import Excel hợp lệ
- [ ] Import Excel có lỗi
- [ ] Download template
- [ ] Xem nhật ký tra cứu
- [ ] Đăng xuất

---

## 🚀 Production Checklist

### Trước khi deploy

- [ ] Đổi `JWT_SECRET` trong `.env`
- [ ] Cấu hình SSL database
- [ ] Setup Google reCAPTCHA keys (production)
- [ ] Review rate limits
- [ ] Enable logging (`ENABLE_SEARCH_LOGGING=true`)
- [ ] Backup database
- [ ] Test full workflow
- [ ] Security audit
- [ ] Performance testing

### Sau khi deploy

- [ ] Kiểm tra kết nối database
- [ ] Test tra cứu công khai
- [ ] Test admin login
- [ ] Kiểm tra logs
- [ ] Monitor errors
- [ ] Setup automated backups
- [ ] Configure monitoring/alerting

---

## 📞 Liên hệ & Hỗ trợ

**Phòng Đào tạo - Trường Đại học HPU**
- 📧 Email: daotao@hpu.edu.vn
- 🌐 Website: https://hpu.edu.vn
- 📞 Hotline: 0225.xxx.xxxx

---

## 📄 License

Copyright © 2025 Trường Đại học Quản lý và Công nghệ Hải Phòng.  
All rights reserved.

---

## 🎉 Changelog

### Version 2.0 (2025-01-XX)
- ✅ Cập nhật schema lên 44 fields (Phụ lục 1.2)
- ✅ Thêm mã định danh tự động
- ✅ Hỗ trợ tra cứu combo (Mã SV + Họ tên/Ngày sinh)
- ✅ Import Excel với 29 cột
- ✅ Nhật ký tra cứu với thống kê chi tiết
- ✅ Cải thiện UI/UX admin panel
- ✅ Tối ưu performance & security

### Version 1.0 (Initial)
- ✅ Tra cứu cơ bản theo số hiệu
- ✅ Admin CRUD đơn giản
- ✅ Schema 11 fields

---

**Built with ❤️ by HPU Development Team**