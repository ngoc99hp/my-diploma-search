# 🚀 Hướng dẫn Cài đặt Hệ thống Văn bằng Số

Tài liệu này hướng dẫn chi tiết từng bước để setup hệ thống từ đầu.

---

## 📋 Yêu cầu hệ thống

### Phần mềm bắt buộc

- **Node.js:** >= 18.0.0 ([Download](https://nodejs.org/))
- **PostgreSQL:** >= 14.0 ([Download](https://www.postgresql.org/download/))
- **Git:** ([Download](https://git-scm.com/))
- **npm/yarn/pnpm:** (đi kèm Node.js)

### Phần mềm khuyên dùng

- **pgAdmin 4:** GUI cho PostgreSQL
- **VS Code:** Code editor
- **Postman:** Test API

### Kiểm tra version

```bash
node --version    # v18.0.0 trở lên
npm --version     # v8.0.0 trở lên
psql --version    # PostgreSQL 14.0 trở lên
```

---

## 📦 Bước 1: Clone Project

```bash
# Clone repository
git clone https://github.com/your-org/diploma-system.git
cd diploma-system

# Hoặc nếu chưa có repo, khởi tạo mới
mkdir diploma-system
cd diploma-system
git init
```

---

## 🗄️ Bước 2: Cài đặt PostgreSQL

### 2.1. Cài đặt PostgreSQL

#### Windows
1. Download PostgreSQL installer
2. Chạy installer, chọn port 5432
3. Đặt mật khẩu cho user `postgres`
4. Cài đặt pgAdmin 4

#### macOS
```bash
# Sử dụng Homebrew
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2.2. Tạo Database

```bash
# Kết nối với PostgreSQL
psql -U postgres

# Trong psql prompt:
CREATE DATABASE diploma_db;
CREATE USER diploma_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE diploma_db TO diploma_user;

# Thoát psql
\q
```

### 2.3. Verify Database

```bash
# Test kết nối
psql -U diploma_user -d diploma_db -h localhost

# Nếu thành công, bạn sẽ thấy:
diploma_db=>
```

---

## 📥 Bước 3: Cài đặt Dependencies

```bash
# Cài đặt tất cả packages
npm install

# Hoặc dùng yarn
yarn install

# Hoặc dùng pnpm
pnpm install
```

### Packages chính được cài:

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "pg": "^8.11.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "xlsx": "^0.18.5",
    "sonner": "^1.0.0",
    "lucide-react": "^0.263.1",
    "react-google-recaptcha-v3": "^1.10.1"
  }
}
```

---

## 🔧 Bước 4: Cấu hình Environment Variables

### 4.1. Tạo file `.env.local`

```bash
# Copy từ template
cp .env.local.example .env.local

# Hoặc tạo mới
touch .env.local
```

### 4.2. Nội dung file `.env.local`

```bash
# ============================================
# DATABASE
# ============================================
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://diploma_user:your_secure_password@localhost:5432/diploma_db

# Database Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10

# ============================================
# AUTHENTICATION
# ============================================
# QUAN TRỌNG: Đổi key này trong production!
JWT_SECRET=change-this-to-a-very-long-random-secret-key-minimum-32-characters

# ============================================
# RECAPTCHA
# ============================================
# Đăng ký tại: https://www.google.com/recaptcha/admin
# Chọn reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# ============================================
# LOGGING
# ============================================
ENABLE_SEARCH_LOGGING=true
ENABLE_ADMIN_LOGGING=true

# ============================================
# RATE LIMITING
# ============================================
# Time window: 1 giờ = 3600000ms
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=30

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
```

### 4.3. Setup Google reCAPTCHA

1. Truy cập: https://www.google.com/recaptcha/admin
2. Đăng ký site mới
3. Chọn **reCAPTCHA v3**
4. Thêm domain:
   - Development: `localhost`
   - Production: `yourdomain.com`
5. Copy Site Key → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
6. Copy Secret Key → `RECAPTCHA_SECRET_KEY`

---

## 🗃️ Bước 5: Setup Database Schema

### 5.1. Chạy Migration

```bash
# Chạy migration script
npm run migrate

# Hoặc
node scripts/migrate.js
```

**Kết quả mong đợi:**
```
🚀 Starting database migration...
📄 Reading schema from: /path/to/database/schema.sql
📊 Executing migration...
✅ Migration completed successfully!

📋 Created tables:
  ✓ diplomas
  ✓ search_logs
  ✓ admin_users
  ✓ admin_logs

🎉 Database is ready to use!
```

### 5.2. Import Dữ liệu mẫu (Optional)

```bash
# Import 5 văn bằng mẫu
psql -U diploma_user -d diploma_db -f database/seed-data.sql
```

### 5.3. Verify Schema

```bash
# Test connection và kiểm tra tables
npm run test:db

# Hoặc
node scripts/test-connection.js
```

---

## 👤 Bước 6: Tạo Admin User

### 6.1. Tạo hash mật khẩu

**Option 1: Dùng script**

Tạo file `scripts/create-admin.js`:

```javascript
import bcrypt from 'bcryptjs';
import { query, closePool } from '../src/lib/db.js';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');
    
    const username = 'admin';
    const password = 'admin123'; // Đổi mật khẩu này!
    const hash = await bcrypt.hash(password, 10);
    
    // Xóa admin cũ (nếu có)
    await query('DELETE FROM admin_users WHERE username = $1', [username]);
    
    // Tạo admin mới
    await query(`
      INSERT INTO admin_users 
        (username, password_hash, full_name, email, role, department)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      username,
      hash,
      'Quản trị viên',
      'admin@hpu.edu.vn',
      'admin',
      'Phòng Đào tạo'
    ]);
    
    console.log('✅ Admin user created!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  QUAN TRỌNG: Đổi mật khẩu ngay sau khi đăng nhập!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

createAdmin();
```

Chạy:
```bash
node scripts/create-admin.js
```

**Option 2: SQL trực tiếp**

```sql
-- Xóa admin cũ
DELETE FROM admin_users;

-- Insert admin với password: admin123
INSERT INTO admin_users (username, password_hash, full_name, email, role, department)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye1J3qY6xJlw3lNy5qKwQ5bKZq4mZq4lC',
  'Quản trị viên',
  'admin@hpu.edu.vn',
  'admin',
  'Phòng Đào tạo'
);
```

### 6.2. Thông tin đăng nhập

```
Username: admin
Password: admin123
```

⚠️ **LƯU Ý:** Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

---

## 🚀 Bước 7: Chạy ứng dụng

### 7.1. Development Mode

```bash
# Chạy dev server
npm run dev

# Hoặc
yarn dev
```

Ứng dụng sẽ chạy tại: **http://localhost:3000**

### 7.2. Verify hoạt động

#### Test trang tra cứu công khai
1. Mở: http://localhost:3000
2. Thử tra cứu: `001/ĐHCN-2024`
3. Kiểm tra hiển thị kết quả

#### Test admin panel
1. Mở: http://localhost:3000/admin/login
2. Đăng nhập: `admin` / `admin123`
3. Kiểm tra dashboard

---

## 🧪 Bước 8: Testing

### 8.1. Test Database Connection

```bash
npm run test:db
```

**Kết quả mong đợi:**
```
🔍 Testing Database Connection...

Configuration:
- Database URL: ✓ Set
- Node ENV: development

Test 1: Basic Connection...
✅ Connection successful

Test 2: Checking tables...
Found tables:
  - admin_logs
  - admin_users
  - diplomas
  - search_logs

Test 3: Counting records...
  - Diplomas: 5 records
  - Search Logs: 0 records
  - Admin Users: 1 records

✅ All tests passed successfully!
```

### 8.2. Manual Testing

#### Tra cứu công khai
- [ ] Tra cứu theo số hiệu thành công
- [ ] Tra cứu theo mã SV + họ tên
- [ ] Tra cứu theo mã SV + ngày sinh
- [ ] Tra cứu không tìm thấy
- [ ] CAPTCHA hoạt động
- [ ] Rate limiting (sau 30 requests/giờ)

#### Admin Panel
- [ ] Đăng nhập thành công
- [ ] Đăng nhập sai thông tin
- [ ] Xem danh sách văn bằng
- [ ] Thêm văn bằng mới
- [ ] Sửa văn bằng
- [ ] Xóa văn bằng
- [ ] Download template Excel
- [ ] Import Excel thành công
- [ ] Xem nhật ký tra cứu
- [ ] Đăng xuất

---

## 📊 Bước 9: Import Dữ liệu Thực tế

### 9.1. Chuẩn bị file Excel

**Download template:**
1. Đăng nhập admin panel
2. Vào "Quản lý văn bằng"
3. Click "Import Excel"
4. Click "Tải file template mẫu"

**Cấu trúc file Excel (29 cột):**

| STT | Tên cột | Bắt buộc | Ghi chú |
|-----|---------|----------|---------|
| 1 | Tên văn bằng | ✅ | Bằng Cử nhân, Bằng Kỹ sư, ... |
| 2 | Số hiệu VB | ✅ | Phải duy nhất |
| 3 | Số vào sổ | ✅ | |
| 4 | Mã SV | ✅ | |
| 5 | Số CCCD SV | ✅ | 12 số |
| 6 | Họ và tên | ✅ | Viết hoa, có dấu |
| 7 | Ngày sinh | ✅ | dd/MM/yyyy |
| 8 | Nơi sinh | ✅ | Tỉnh/Thành phố |
| 9 | Giới tính | ✅ | Nam/Nữ |
| 10 | Dân tộc | ✅ | Kinh, Tày, ... |
| 11 | Ngành đào tạo | ✅ | |
| 12 | Mã ngành | ✅ | 7 chữ số |
| 13 | Chuyên ngành | ✅ | |
| 14 | Năm TN | ✅ | 2024 |
| 15 | Xếp loại | | Xuất sắc, Giỏi, Khá, TB |
| 16 | Số QĐ công nhận TN | ✅ | |
| 17 | Ngày QĐ TN | ✅ | dd/MM/yyyy |
| 18 | Ngày cấp | ✅ | dd/MM/yyyy |
| 19 | Hình thức ĐT | ✅ | Chính quy, Liên thông, ... |
| 20 | Thời gian ĐT | ✅ | 4 năm, 2 năm, ... |
| 21 | Tổng TC | | Số tín chỉ |
| 22 | Trình độ KHQG | ✅ | Trình độ 6, 7, 8 |
| 23 | Bậc ĐT | ✅ | Đại học, Thạc sĩ, ... |
| 24 | Ngôn ngữ ĐT | ✅ | Tiếng Việt, Tiếng Anh |
| 25 | Đơn vị cấp bằng | | |
| 26 | Mã đơn vị CB | | |
| 27 | Họ tên người ký | ✅ | |
| 28 | CCCD người ký | ✅ | |
| 29 | Chức danh người ký | ✅ | Hiệu trưởng, ... |

### 9.2. Import qua Admin Panel

1. Đăng nhập admin panel
2. Vào "Quản lý văn bằng"
3. Click "Import Excel"
4. Chọn file Excel
5. Click "Tải lên và Import"
6. Xem kết quả: Thành công/Thất bại
7. Kiểm tra báo lỗi (nếu có)

### 9.3. Xử lý lỗi Import

**Lỗi thường gặp:**

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| "Thiếu: so_hieu_vbcc" | Cột bỏ trống | Điền đầy đủ 27 cột bắt buộc |
| "Số hiệu văn bằng đã tồn tại" | Trùng số hiệu | Kiểm tra database, đổi số hiệu |
| "Invalid date format" | Sai format ngày | Dùng dd/MM/yyyy (VD: 15/03/2002) |
| "File quá lớn" | File > 5MB | Chia nhỏ file, import từng phần |
| "Quá nhiều dòng" | > 1000 dòng | Import tối đa 1000 dòng/lần |

---

## 🔧 Bước 10: Cấu hình nâng cao

### 10.1. SSL Database (Production)

Nếu database yêu cầu SSL:

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### 10.2. Tùy chỉnh Rate Limiting

```bash
# .env.local

# Giảm limit cho bảo mật cao hơn
RATE_LIMIT_WINDOW_MS=3600000  # 1 giờ
RATE_LIMIT_MAX_REQUESTS=10    # 10 requests/giờ

# Tăng limit cho môi trường test
RATE_LIMIT_WINDOW_MS=60000    # 1 phút
RATE_LIMIT_MAX_REQUESTS=100   # 100 requests/phút
```

### 10.3. Database Connection Pool

```bash
# .env.local

# Môi trường nhỏ (VPS)
DB_POOL_MIN=2
DB_POOL_MAX=5

# Môi trường lớn (Dedicated Server)
DB_POOL_MIN=5
DB_POOL_MAX=20
```

### 10.4. Logging Configuration

```bash
# .env.local

# Bật tất cả logs (Development)
ENABLE_SEARCH_LOGGING=true
ENABLE_ADMIN_LOGGING=true

# Tắt logs (Production - nếu cần performance)
ENABLE_SEARCH_LOGGING=false
ENABLE_ADMIN_LOGGING=false
```

---

## 🚀 Bước 11: Deploy Production

### 11.1. Build Production

```bash
# Build ứng dụng
npm run build

# Test production build
npm run start
```

### 11.2. Checklist trước khi deploy

#### Environment Variables
- [ ] Đổi `JWT_SECRET` (random string 32+ ký tự)
- [ ] Cập nhật `DATABASE_URL` production
- [ ] Setup reCAPTCHA production keys
- [ ] Cấu hình SSL database nếu cần
- [ ] Review rate limits
- [ ] `NODE_ENV=production`

#### Database
- [ ] Backup database hiện tại
- [ ] Test connection production database
- [ ] Chạy migrations trên production
- [ ] Tạo admin user production
- [ ] Setup automated backups

#### Security
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Database access restricted
- [ ] Strong passwords
- [ ] Security headers configured

### 11.3. Deploy options

#### Option 1: VPS/Dedicated Server

```bash
# 1. Copy code lên server
scp -r ./* user@server:/var/www/diploma-system/

# 2. SSH vào server
ssh user@server

# 3. Install dependencies
cd /var/www/diploma-system
npm install --production

# 4. Build
npm run build

# 5. Setup PM2 (Process Manager)
npm install -g pm2
pm2 start npm --name "diploma-system" -- start
pm2 startup
pm2 save

# 6. Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/diploma
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/diploma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Option 2: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Add environment variables in Vercel dashboard
# Settings → Environment Variables
```

#### Option 3: Docker

Tạo `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Tạo `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=diploma_db
      - POSTGRES_USER=diploma_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Lỗi Database Connection

**Triệu chứng:**
```
Error: Connection terminated unexpectedly
```

**Giải pháp:**
1. Kiểm tra PostgreSQL đang chạy:
   ```bash
   # Windows
   services.msc → PostgreSQL
   
   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. Kiểm tra DATABASE_URL trong `.env.local`
3. Test connection: `npm run test:db`
4. Kiểm tra firewall/port 5432

### Lỗi Login Admin

**Triệu chứng:**
```
Tên đăng nhập hoặc mật khẩu không đúng
```

**Giải pháp:**
1. Kiểm tra user tồn tại:
   ```sql
   SELECT * FROM admin_users WHERE username = 'admin';
   ```

2. Reset password:
   ```bash
   node scripts/fix-admin-password.js
   ```

3. Kiểm tra JWT_SECRET đã set chưa

### Lỗi Import Excel

**Triệu chứng:**
```
Lỗi khi import file
```

**Giải pháp:**
1. Kiểm tra file đúng format (.xlsx)
2. File < 5MB
3. Số dòng < 1000
4. Kiểm tra 27 cột bắt buộc
5. Xem chi tiết lỗi trong response

### Lỗi reCAPTCHA

**Triệu chứng:**
```
CAPTCHA verification failed
```

**Giải pháp:**
1. Kiểm tra keys trong `.env.local`
2. Kiểm tra domain đã đăng ký với Google reCAPTCHA
3. Kiểm tra network request trong browser DevTools

### Lỗi Rate Limiting

**Triệu chứng:**
```
Vượt quá giới hạn tra cứu
```

**Giải pháp:**
1. Đợi hết thời gian window (mặc định 1 giờ)
2. Tăng limit trong `.env.local`:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=100
   ```
3. Xóa logs cũ:
   ```sql
   DELETE FROM search_logs WHERE search_time < NOW() - INTERVAL '1 day';
   ```

---

## 📚 Scripts hữu ích

### Test Database Connection
```bash
npm run test:db
# hoặc
node scripts/test-connection.js
```

### Run Migrations
```bash
npm run migrate
# hoặc
node scripts/migrate.js
```

### Fix Admin Password
```bash
node scripts/fix-admin-password.js
```

### Backup Database
```bash
# Backup
pg_dump -U diploma_user -d diploma_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U diploma_user -d diploma_db < backup_20250123.sql
```

### Clear Logs
```bash
# Xóa logs cũ hơn 30 ngày
psql -U diploma_user -d diploma_db -c "
  DELETE FROM search_logs WHERE search_time < NOW() - INTERVAL '30 days';
"
```

### Generate Admin Hash
```bash
node -e "
const bcrypt = require('bcryptjs');
const password = process.argv[1];
bcrypt.hash(password, 10).then(hash => console.log(hash));
" "your_password"
```

---

## 📞 Hỗ trợ

### Khi gặp vấn đề

1. **Kiểm tra logs:**
   ```bash
   # Development
   npm run dev
   # Xem terminal output
   
   # Production với PM2
   pm2 logs diploma-system
   ```

2. **Enable debug mode:**
   ```bash
   # .env.local
   NODE_ENV=development
   ```

3. **Test từng phần:**
   - Database connection: `npm run test:db`
   - API endpoints: Dùng Postman
   - Frontend: Browser DevTools Console

4. **Liên hệ support:**
   - Email: daotao@hpu.edu.vn
   - Hotline: 0225.xxx.xxxx

---

## 🎉 Hoàn tất!

Bây giờ bạn đã có một hệ thống văn bằng số hoàn chỉnh:

✅ Database PostgreSQL với schema v2.0  
✅ Next.js application  
✅ Admin panel với đầy đủ chức năng  
✅ Tra cứu công khai với CAPTCHA & rate limiting  
✅ Import/Export Excel  
✅ Logging & monitoring  

### Next Steps

1. Import dữ liệu thực tế
2. Tùy chỉnh UI theo brand
3. Setup SSL certificates
4. Configure monitoring
5. Train users
6. Deploy to production

---

## 📖 Tài liệu tham khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Thông tư 27/2019/TT-BGDĐT](https://thuvienphapluat.vn)

---

**Good luck! 🚀**

*Built with ❤️ by HPU Development Team*