# 🎓 HỆ THỐNG TRA CỨU VĂN BẰNG

**Trường Đại học Quản lý và Công nghệ Hải Phòng**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📖 GIỚI THIỆU

Hệ thống tra cứu và xác thực văn bằng tốt nghiệp trực tuyến, cho phép công dân, doanh nghiệp, cơ quan nhà nước và nội bộ trường kiểm tra tính hợp lệ của văn bằng tốt nghiệp được cấp bởi Trường Đại học Quản lý và Công nghệ Hải Phòng.

### ✨ Tính năng chính

- ✅ Tra cứu văn bằng bằng số hiệu bằng tốt nghiệp
- ✅ Hiển thị thông tin chi tiết: Tên trường, ngành đào tạo, chuyên ngành, số vào sổ, ngày cấp
- ✅ Xem thông tin sinh viên: Mã SV, họ tên, hệ đào tạo, năm tốt nghiệp
- ✅ Hệ thống hoàn toàn công khai, không cần đăng nhập
- ✅ Rate limiting để chống spam/DDoS
- ✅ Logging tra cứu để phân tích
- ✅ Responsive design, tương thích mobile

---

## 🚀 CÔNG NGHỆ SỬ DỤNG

### Frontend
- **Next.js 14** - React framework với App Router
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **React IMask** - Input masking

### Backend
- **Next.js API Routes** - REST API
- **Node.js** - Runtime environment

### Database
- **PostgreSQL 13+** - Relational database
- **pg** - PostgreSQL client for Node.js

### Deployment
- **Vercel** - Hosting platform
- **DB 230** - Production database server

---

## 📋 YÊU CẦU HỆ THỐNG

- Node.js >= 18.17.0 (Khuyến nghị: 20.x LTS)
- PostgreSQL >= 13.0 (Khuyến nghị: 15.x hoặc 16.x)
- npm/yarn/pnpm

---

## 🛠️ CÀI ĐẶT

### 1. Clone repository

```bash
git clone <repository-url>
cd diploma-verification-system
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình database

```bash
# Tạo database PostgreSQL
createdb diploma_system

# Copy file cấu hình
cp .env.example .env.local

# Chỉnh sửa .env.local với thông tin database của bạn
```

### 4. Chạy migration

```bash
npm run db:migrate
```

### 5. Test kết nối

```bash
npm run db:test
```

### 6. Chạy development server

```bash
npm run dev
```

Mở trình duyệt: http://localhost:3000

📚 **Xem hướng dẫn chi tiết tại [SETUP.md](SETUP.md)**

---

## 📊 DATABASE SCHEMA

### Bảng chính

#### `diplomas` - Thông tin văn bằng
- `diploma_number` (VARCHAR) - Số hiệu bằng (unique)
- `registry_number` (VARCHAR) - Số vào sổ
- `issue_date` (DATE) - Ngày cấp
- `school_name` (VARCHAR) - Tên trường
- `major` (VARCHAR) - Ngành đào tạo
- `specialization` (VARCHAR) - Chuyên ngành
- `student_code` (VARCHAR) - Mã sinh viên
- `full_name` (VARCHAR) - Họ và tên
- `training_system` (VARCHAR) - Hệ đào tạo
- `graduation_year` (INTEGER) - Năm tốt nghiệp

#### `search_logs` - Nhật ký tra cứu
- `diploma_number` (VARCHAR) - Số hiệu được tra cứu
- `ip_address` (VARCHAR) - Địa chỉ IP
- `found` (BOOLEAN) - Tìm thấy hay không
- `search_time` (TIMESTAMP) - Thời gian tra cứu

#### `admin_users` - Quản trị viên
- `username` (VARCHAR) - Tên đăng nhập
- `password_hash` (VARCHAR) - Mật khẩu đã hash
- `role` (VARCHAR) - Vai trò (admin/editor/viewer)

#### `admin_logs` - Nhật ký admin
- `action` (VARCHAR) - Hành động (INSERT/UPDATE/DELETE)
- `table_name` (VARCHAR) - Tên bảng
- `old_data` (JSONB) - Dữ liệu cũ
- `new_data` (JSONB) - Dữ liệu mới

---

## 🔌 API ENDPOINTS

### POST /api/search
Tra cứu văn bằng theo số hiệu

**Request:**
```json
{
  "diplomaNumber": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "diploma_number": "123456",
    "registry_number": "SV2023-7890",
    "issue_date": "2023-06-15",
    "school_name": "Trường Đại học Quản lý và Công nghệ Hải Phòng",
    "major": "Công nghệ Thông tin",
    "specialization": "Kỹ thuật Phần mềm",
    "student_info": {
      "student_code": "2019600001",
      "full_name": "Nguyễn Văn A",
      "training_system": "Đại học chính quy",
      "graduation_year": 2023
    }
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "message": "Không có số hiệu bằng Tốt nghiệp này!"
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "message": "Bạn đã vượt quá số lần tra cứu cho phép. Vui lòng thử lại sau.",
  "rateLimitExceeded": true
}
```

### GET /api/search
Health check endpoint

---

## 🎨 GIAO DIỆN

### Desktop
![Desktop View](screenshots/desktop.png)

### Mobile
![Mobile View](screenshots/mobile.png)

---

## 🔐 BẢO MẬT

- ✅ Rate limiting: 100 requests/hour per IP
- ✅ SQL injection prevention với parameterized queries
- ✅ Input validation và sanitization
- ✅ HTTPS trong production
- ✅ Logging tất cả tra cứu để audit
- ✅ Tuân thủ Luật bảo vệ dữ liệu cá nhân 91/2025/QH15

---

## 📈 HIỆU NĂNG

- ⚡ Response time: < 200ms (trung bình)
- 💾 Database query optimization với indexes
- 🗄️ Connection pooling
- 📦 API caching: 5 minutes
- 🚀 Deploy trên Vercel Edge Network

---

## 🧪 TESTING

### Test kết nối database
```bash
npm run db:test
```

### Test API
```bash
# Test tra cứu thành công
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"diplomaNumber":"123456"}'

# Test tra cứu không tìm thấy
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"diplomaNumber":"INVALID"}'
```

---

## 📦 DEPLOYMENT

### Deploy lên Vercel

1. Push code lên GitHub
2. Import project vào Vercel
3. Cấu hình Environment Variables trong Vercel Dashboard:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   JWT_SECRET=your-secret
   RATE_LIMIT_MAX_REQUESTS=100
   ENABLE_SEARCH_LOGGING=true
   ```
4. Deploy

### Kết nối DB 230

Trong production, cấu hình `DATABASE_URL` trỏ đến server DB 230:

```env
DATABASE_URL=postgresql://username:password@192.168.x.230:5432/diploma_system
```

---

## 🗺️ ROADMAP

### ✅ Phase 1 - Hoàn thành (Hiện tại)
- [x] Form tra cứu cơ bản
- [x] Database schema design
- [x] API tra cứu với PostgreSQL
- [x] Rate limiting
- [x] Search logging
- [x] Responsive UI

### 🚧 Phase 2 - Đang phát triển
- [ ] Tích hợp Captcha (Cloudflare Turnstile)
- [ ] Admin Panel
  - [ ] Dashboard thống kê
  - [ ] Upload Excel import data
  - [ ] CRUD văn bằng
  - [ ] Xem logs
- [ ] Backup tự động
- [ ] Email notifications

### 🔮 Phase 3 - Tương lai
- [ ] Đa ngôn ngữ (Tiếng Việt + English)
- [ ] Export kết quả PDF
- [ ] QR Code verification
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API cho bên thứ 3

---

## 📂 CẤU TRÚC DỰ ÁN

```
diploma-verification-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.js      # API tra cứu
│   │   ├── layout.js             # Layout chính
│   │   ├── page.js               # Trang tra cứu
│   │   └── globals.css           # CSS global
│   └── lib/
│       └── db.js                 # Database connection & helpers
├── database/
│   └── schema.sql                # PostgreSQL schema
├── scripts/
│   ├── migrate.js                # Database migration
│   └── test-connection.js        # Test DB connection
├── public/                       # Static files
├── .env.example                  # Environment template
├── .env.local                    # Local env (gitignored)
├── package.json
├── next.config.js
├── tailwind.config.js
├── SETUP.md                      # Hướng dẫn cài đặt chi tiết
└── README.md                     # File này
```

---

## 🤝 ĐÓNG GÓP

Dự án này được phát triển và duy trì bởi **Trung tâm Công nghệ Thông tin - Trường ĐH HPU**.

### Liên hệ
- 📧 Email: daotao@hpu.edu.vn
- 🌐 Website: https://hpu.edu.vn
- 📞 Hotline: (0225) 3.xxx.xxx

---

## 📄 LICENSE

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết

---

## 🙏 CREDITS

- **Next.js Team** - Framework
- **Vercel** - Hosting platform  
- **PostgreSQL Team** - Database
- **Tailwind CSS** - UI framework

---

## 📝 CHANGELOG

### Version 1.0.0 (2025-10-03)
- ✨ Phát hành phiên bản đầu tiên
- ✅ Chức năng tra cứu văn bằng cơ bản
- ✅ Database PostgreSQL
- ✅ Rate limiting
- ✅ Search logging
- ✅ Responsive UI

---

**Developed with ❤️ by HPU IT Team**