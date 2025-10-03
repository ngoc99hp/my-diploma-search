# 📚 HƯỚNG DẪN CÀI ĐẶT HỆ THỐNG TRA CỨU VĂN BẰNG

## 🎯 YÊU CẦU HỆ THỐNG

### Phần mềm cần thiết:
- **Node.js**: >= 18.17.0 (Khuyến nghị: 20.x LTS)
- **PostgreSQL**: >= 13.0 (Khuyến nghị: 15.x hoặc 16.x)
- **npm** hoặc **yarn** hoặc **pnpm**

### Kiến thức yêu cầu:
- Cơ bản về Next.js
- Cơ bản về PostgreSQL
- Hiểu về REST API

---

## 📥 BƯỚC 1: CÀI ĐẶT DỰ ÁN

### 1.1. Clone hoặc tải source code

```bash
# Nếu dùng Git
git clone <repository-url>
cd diploma-verification-system

# Hoặc giải nén file zip vào thư mục
```

### 1.2. Cài đặt dependencies

```bash
# Sử dụng npm
npm install

# Hoặc yarn
yarn install

# Hoặc pnpm
pnpm install
```

---

## 🗄️ BƯỚC 2: SETUP DATABASE POSTGRESQL

### 2.1. Cài đặt PostgreSQL

**Windows:**
- Tải từ: https://www.postgresql.org/download/windows/
- Cài đặt với pgAdmin 4

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2.2. Tạo Database

```bash
# Đăng nhập vào PostgreSQL
psql -U postgres

# Trong psql console:
CREATE DATABASE diploma_system;
CREATE USER diploma_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE diploma_system TO diploma_user;

# Thoát
\q
```

### 2.3. Kết nối tới DB 230 (Production)

Nếu bạn đang kết nối tới server DB 230:

```bash
# Test kết nối
psql -h 192.168.x.230 -p 5432 -U your_username -d diploma_system

# Nhập password khi được yêu cầu
```

---

## ⚙️ BƯỚC 3: CẤU HÌNH ENVIRONMENT VARIABLES

### 3.1. Tạo file .env.local

```bash
cp .env.example .env.local
```

### 3.2. Chỉnh sửa .env.local

```env
# DATABASE - Thay đổi theo môi trường của bạn
DATABASE_URL="postgresql://diploma_user:your_secure_password@localhost:5432/diploma_system"

# Hoặc kết nối tới DB 230
DATABASE_URL="postgresql://username:password@192.168.x.230:5432/diploma_system"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Security
JWT_SECRET="change-this-to-random-string-in-production"
SESSION_SECRET="change-this-too"
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
ENABLE_SEARCH_LOGGING=true
ENABLE_ADMIN_LOGGING=true
LOG_LEVEL="info"
```

---

## 🏗️ BƯỚC 4: TẠO DATABASE SCHEMA

### 4.1. Lưu file schema SQL

Tạo thư mục `database/` và lưu file `schema.sql`:

```bash
mkdir -p database
# Copy nội dung từ artifact "Database Schema - PostgreSQL" vào file database/schema.sql
```

### 4.2. Chạy migration

```bash
# Cách 1: Dùng script tự động
npm run db:migrate

# Cách 2: Chạy trực tiếp bằng psql
psql -U diploma_user -d diploma_system -f database/schema.sql

# Cách 3: Dùng pgAdmin 4 (GUI)
# - Mở pgAdmin 4
# - Kết nối tới database
# - Tools > Query Tool
# - Paste nội dung schema.sql và Execute
```

### 4.3. Kiểm tra kết quả

```bash
npm run db:test
```

Kết quả mong đợi:
```
✅ Database connected successfully
✅ Connection successful

Test 2: Checking tables...
Found tables:
  - admin_logs
  - admin_users
  - diplomas
  - search_logs

✅ All tests passed successfully!
```

---

## 🌱 BƯỚC 5: IMPORT DỮ LIỆU MẪU (OPTIONAL)

Database schema đã bao gồm 3 bản ghi mẫu:
- `123456` - Nguyễn Văn A
- `ABC-2023-001` - Trần Thị B  
- `HPU-2023-0456` - Lê Văn C

### Import thêm dữ liệu từ Excel

**Sẽ được triển khai trong Phase 2** - Admin Panel sẽ có chức năng upload Excel.

Hiện tại bạn có thể insert thủ công:

```sql
INSERT INTO diplomas (
    diploma_number, registry_number, issue_date,
    major, specialization, student_code, full_name,
    training_system, graduation_year, classification
) VALUES (
    'YOUR-DIPLOMA-NUMBER', 'SV2024-XXXX', '2024-06-15',
    'Ngành học', 'Chuyên ngành', '2020XXXXXX', 'Họ và Tên',
    'Đại học chính quy', 2024, 'Khá'
);
```

---

## 🚀 BƯỚC 6: CHẠY ỨNG DỤNG

### 6.1. Development Mode

```bash
npm run dev
```

Mở trình duyệt: http://localhost:3000

### 6.2. Production Build

```bash
# Build ứng dụng
npm run build

# Chạy production server
npm start
```

---

## 🧪 BƯỚC 7: KIỂM TRA CHỨC NĂNG

### 7.1. Test tra cứu văn bằng

1. Mở: http://localhost:3000
2. Nhập số hiệu bằng: `123456`
3. Click "Tra cứu thông tin"
4. Kết quả hiển thị: Nguyễn Văn A - Công nghệ Thông tin
5. Click "Xem thông tin chi tiết" để xem thêm

### 7.2. Test với các số bằng mẫu khác

- `ABC-2023-001` → Trần Thị B
- `HPU-2023-0456` → Lê Văn C
- `INVALID-NUMBER` → "Không có số hiệu bằng Tốt nghiệp này!"

### 7.3. Test API trực tiếp

```bash
# Test bằng curl
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"diplomaNumber":"123456"}'

# Test health check
curl http://localhost:3000/api/search
```

---

## 📊 BƯỚC 8: XEM DATABASE (OPTIONAL)

### Sử dụng pgAdmin 4

1. Mở pgAdmin 4
2. Add Server:
   - Name: Diploma System
   - Host: localhost (hoặc 192.168.x.230)
   - Port: 5432
   - Database: diploma_system
   - Username: diploma_user
   - Password: your_password

3. Browse:
   - Schemas > public > Tables
   - Xem dữ liệu: Right click > View/Edit Data

### Sử dụng command line

```bash
# Kết nối
psql -U diploma_user -d diploma_system

# Xem bảng
\dt

# Query dữ liệu
SELECT * FROM diplomas LIMIT 10;

# Xem thống kê
SELECT * FROM diplomas_by_year;
```

---

## 🔧 TROUBLESHOOTING

### ❌ Lỗi: "Cannot connect to database"

**Nguyên nhân:**
- PostgreSQL chưa chạy
- DATABASE_URL sai
- Firewall chặn port 5432

**Giải pháp:**
```bash
# Kiểm tra PostgreSQL đang chạy
# Windows
net start postgresql-x64-16

# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Test kết nối
psql -U diploma_user -d diploma_system -h localhost
```

### ❌ Lỗi: "relation does not exist"

**Nguyên nhân:** Chưa chạy migration

**Giải pháp:**
```bash
npm run db:migrate
```

### ❌ Lỗi: "password authentication failed"

**Nguyên nhân:** Password sai hoặc user chưa có quyền

**Giải pháp:**
```sql
-- Đăng nhập với user postgres
psql -U postgres

-- Reset password
ALTER USER diploma_user WITH PASSWORD 'new_password';

-- Grant quyền
GRANT ALL PRIVILEGES ON DATABASE diploma_system TO diploma_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO diploma_user;
```

### ❌ Lỗi: "Module not found: Can't resolve '@/lib/db'"

**Nguyên nhân:** File lib/db.js chưa tồn tại

**Giải pháp:**
- Copy nội dung từ artifact "lib/db.js" 
- Tạo thư mục `lib/` trong root project
- Lưu file `db.js` vào đó

### ❌ Lỗi khi deploy lên Vercel

**Nguyên nhân:** Vercel Serverless Functions có giới hạn

**Giải pháp:**
- Sử dụng Connection Pooling
- Sử dụng Vercel Postgres hoặc Supabase
- Hoặc host database riêng (Railway, Render, etc.)

---

## 📁 CẤU TRÚC THƯ MỤC

```
diploma-verification-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.js          # API tra cứu
│   │   ├── layout.js                 # Layout chính
│   │   ├── page.js                   # Trang tra cứu
│   │   └── globals.css               # CSS global
│   └── lib/
│       └── db.js                     # Database connection
├── database/
│   └── schema.sql                    # Database schema
├── scripts/
│   ├── migrate.js                    # Migration script
│   └── test-connection.js            # Test DB
├── .env.example                      # Mẫu environment variables
├── .env.local                        # Environment variables (local)
├── package.json
├── next.config.js
└── README.md
```

---

## 🎓 NEXT STEPS

Sau khi hoàn thành setup, bạn có thể:

1. ✅ **Phase 1 (Hoàn thành):**
   - Form tra cứu
   - Database setup
   - API tra cứu

2. 🚧 **Phase 2 (Tiếp theo):**
   - Tích hợp Captcha
   - Admin Panel
   - Import Excel
   - Backup automation

3. 🔮 **Phase 3 (Tương lai):**
   - Đa ngôn ngữ
   - Export PDF
   - Analytics Dashboard
   - Mobile App

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra lại từng bước trong hướng dẫn này
2. Xem phần Troubleshooting
3. Check logs trong terminal
4. Liên hệ team phát triển

---

**Chúc bạn setup thành công! 🎉**