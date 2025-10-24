// src/app/api/admin/import/route.js - FIXED VERSION
import { query, logAdminAction } from '@/lib/db';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;

// ✅ ENUM VALUES
const ALLOWED_VALUES = {
  xep_loai: ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Trung bình khá'],
  gioi_tinh: ['Nam', 'Nữ'],
  hinh_thuc_dao_tao: ['Chính quy', 'Từ xa', 'Liên thông', 'Văn bằng 2']
};

// ✅ CONFIG
const DEFAULT_CONFIG = {
  ten_truong: 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
  ma_co_so_dao_tao: 'HPU01',
  dia_danh_cap_vbcc: 'Hải Phòng',
  phien_ban: '1.0',
  thong_tu: '27/2019'
};

function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET);
}

/**
 * ✅ PARSE VIETNAMESE DATE - Xử lý nhiều format
 */
function parseVietnameseDate(dateStr, fieldName = 'Ngày') {
  if (!dateStr) return null;

  const str = dateStr.toString().trim();
  
  // Format 1: dd/MM/yyyy
  const match1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    const [_, day, month, year] = match1;
    const date = new Date(year, month - 1, day);
    
    if (date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year) {
      return date.toISOString().split('T')[0]; // yyyy-MM-dd
    }
  }
  
  // Format 2: dd-MM-yyyy
  const match2 = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match2) {
    const [_, day, month, year] = match2;
    const date = new Date(year, month - 1, day);
    
    if (date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Format 3: ISO 8601 (yyyy-MM-dd)
  const match3 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match3) {
    const [_, year, month, day] = match3;
    const date = new Date(year, month - 1, day);
    
    if (date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year) {
      return date.toISOString().split('T')[0];
    }
  }

  throw new Error(`${fieldName} không hợp lệ: "${dateStr}" (yêu cầu dd/MM/yyyy)`);
}

/**
 * ✅ VALIDATE YEAR
 */
function validateYear(yearStr, fieldName = 'Năm') {
  const year = parseInt(yearStr);
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(`${fieldName} không hợp lệ: "${yearStr}" (phải từ 1900-2100)`);
  }
  return year;
}

/**
 * ✅ VALIDATE ENUM
 */
function validateEnum(value, allowedValues, fieldName) {
  if (!value) return null;
  if (!allowedValues.includes(value)) {
    throw new Error(
      `${fieldName} không hợp lệ: "${value}" (chỉ chấp nhận: ${allowedValues.join(', ')})`
    );
  }
  return value;
}

/**
 * ✅ GENERATE MA DINH DANH - Fix race condition với SERIALIZABLE transaction
 */
async function generateMaDinhDanh(client, namTotNghiep, tenVBCC) {
  let type = 'CNH';
  if (tenVBCC.includes('Kỹ sư')) type = 'KSU';
  else if (tenVBCC.includes('Thạc sĩ')) type = 'THS';
  else if (tenVBCC.includes('Tiến sĩ')) type = 'TSI';

  // ✅ FOR UPDATE SKIP LOCKED để tránh deadlock
  const result = await client.query(
    `SELECT ma_dinh_danh_vbcc 
     FROM diplomas 
     WHERE ma_dinh_danh_vbcc LIKE $1 
     ORDER BY ma_dinh_danh_vbcc DESC 
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [`HPU-${namTotNghiep}-${type}-%`]
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0].ma_dinh_danh_vbcc;
    const parts = lastCode.split('-');
    if (parts.length >= 4) {
      const lastSeq = parseInt(parts[3]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
  }

  return `HPU-${namTotNghiep}-${type}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * ✅ VALIDATE & PARSE ROW DATA
 */
function parseRowData(row, rowNumber) {
  // Map 34 cột từ Excel
  const data = {
    ten_vbcc: (row['Tên văn bằng'] || 'Bằng Cử nhân').trim(),
    so_hieu_vbcc: (row['Số hiệu VB'] || '').trim(),
    so_vao_so: (row['Số vào sổ'] || '').trim(),
    ma_nguoi_hoc: (row['Mã SV'] || '').trim(),
    so_ddcn: (row['Số CCCD SV'] || '').trim(),
    ho_va_ten: (row['Họ và tên'] || '').trim().toUpperCase(),
    ngay_sinh_raw: row['Ngày sinh'],
    noi_sinh: (row['Nơi sinh'] || '').trim(),
    gioi_tinh: (row['Giới tính'] || 'Nam').trim(),
    dan_toc: (row['Dân tộc'] || 'Kinh').trim(),
    quoc_tich: (row['Quốc tịch'] || 'Việt Nam').trim(),
    
    nganh_dao_tao: (row['Ngành đào tạo'] || '').trim(),
    ma_nganh_dao_tao: (row['Mã ngành'] || '').trim(),
    chuyen_nganh_dao_tao: (row['Chuyên ngành'] || '').trim(),
    nam_tot_nghiep_raw: row['Năm TN'],
    xep_loai: (row['Xếp loại'] || '').trim(),
    so_quyet_dinh_cong_nhan_tot_nghiep: (row['Số QĐ công nhận TN'] || '').trim(),
    ngay_quyet_dinh_cong_nhan_tot_nghiep_raw: row['Ngày QĐ TN'],
    so_quyet_dinh_hoi_dong_danh_gia: (row['Số QĐ hội đồng'] || '').trim() || null,
    ngay_tao_vbcc_raw: row['Ngày tạo VB'],
    ngay_cap_vbcc_raw: row['Ngày cấp'],
    
    hinh_thuc_dao_tao: (row['Hình thức ĐT'] || 'Chính quy').trim(),
    thoi_gian_dao_tao: (row['Thời gian ĐT'] || '4 năm').trim(),
    tong_so_tin_chi: parseInt(row['Tổng TC']) || null,
    
    trinh_do_theo_khung_quoc_gia: (row['Trình độ KHQG'] || 'Trình độ 6').trim(),
    bac_trinh_do_theo_khung_quoc_gia: (row['Bậc ĐT'] || 'Đại học').trim(),
    ngon_ngu_dao_tao: (row['Ngôn ngữ ĐT'] || 'Tiếng Việt').trim(),
    
    don_vi_cap_bang: (row['Đơn vị cấp bằng'] || DEFAULT_CONFIG.ten_truong).trim(),
    ma_don_vi_cap_bang: (row['Mã đơn vị CB'] || DEFAULT_CONFIG.ma_co_so_dao_tao).trim(),
    ho_ten_nguoi_ky_vbcc: (row['Họ tên người ký'] || '').trim(),
    so_ddcn_nguoi_ky_vbcc: (row['CCCD người ký'] || '').trim(),
    chuc_danh_nguoi_ky_vbcc: (row['Chức danh người ký'] || 'Hiệu trưởng').trim(),
    ho_ten_nguoi_ky_vbcc_ban_giay: (row['Họ tên người ký bản giấy'] || '').trim() || null,
    chuc_danh_nguoi_ky_vbcc_ban_giay: (row['Chức danh người ký bản giấy'] || '').trim() || null
  };

  // ✅ VALIDATE REQUIRED FIELDS
  const required = {
    'Số hiệu VB': data.so_hieu_vbcc,
    'Số vào sổ': data.so_vao_so,
    'Mã SV': data.ma_nguoi_hoc,
    'Số CCCD SV': data.so_ddcn,
    'Họ và tên': data.ho_va_ten,
    'Ngày sinh': data.ngay_sinh_raw,
    'Nơi sinh': data.noi_sinh,
    'Ngành đào tạo': data.nganh_dao_tao,
    'Mã ngành': data.ma_nganh_dao_tao,
    'Chuyên ngành': data.chuyen_nganh_dao_tao,
    'Số QĐ công nhận TN': data.so_quyet_dinh_cong_nhan_tot_nghiep,
    'Ngày QĐ TN': data.ngay_quyet_dinh_cong_nhan_tot_nghiep_raw,
    'Ngày tạo VB': data.ngay_tao_vbcc_raw,
    'Ngày cấp': data.ngay_cap_vbcc_raw,
    'Họ tên người ký': data.ho_ten_nguoi_ky_vbcc,
    'CCCD người ký': data.so_ddcn_nguoi_ky_vbcc
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([field, _]) => field);

  if (missing.length > 0) {
    throw new Error(`Thiếu trường bắt buộc: ${missing.join(', ')}`);
  }

  // ✅ PARSE & VALIDATE DATES
  try {
    data.ngay_sinh = parseVietnameseDate(data.ngay_sinh_raw, 'Ngày sinh');
    data.ngay_quyet_dinh_cong_nhan_tot_nghiep = parseVietnameseDate(
      data.ngay_quyet_dinh_cong_nhan_tot_nghiep_raw,
      'Ngày QĐ TN'
    );
    data.ngay_tao_vbcc = parseVietnameseDate(data.ngay_tao_vbcc_raw, 'Ngày tạo VB');
    data.ngay_cap_vbcc = parseVietnameseDate(data.ngay_cap_vbcc_raw, 'Ngày cấp');
  } catch (error) {
    throw new Error(`Lỗi ngày tháng: ${error.message}`);
  }

  // ✅ VALIDATE YEAR
  data.nam_tot_nghiep = validateYear(
    data.nam_tot_nghiep_raw || new Date().getFullYear(),
    'Năm TN'
  );

  // ✅ VALIDATE ENUMS
  data.gioi_tinh = validateEnum(data.gioi_tinh, ALLOWED_VALUES.gioi_tinh, 'Giới tính');
  data.hinh_thuc_dao_tao = validateEnum(
    data.hinh_thuc_dao_tao,
    ALLOWED_VALUES.hinh_thuc_dao_tao,
    'Hình thức ĐT'
  );
  if (data.xep_loai) {
    data.xep_loai = validateEnum(data.xep_loai, ALLOWED_VALUES.xep_loai, 'Xếp loại');
  }

  return data;
}

/**
 * ✅ POST - Import với Transaction
 */
export async function POST(request) {
  let client;
  
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    const formData = await request.formData();
    const file = formData.get('file');

    // ✅ VALIDATE FILE
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vui lòng chọn file Excel' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `File quá lớn! Tối đa: ${MAX_FILE_SIZE/1024/1024}MB` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Chỉ chấp nhận file Excel (.xlsx, .xls)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ PARSE EXCEL - Không duplicate buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'File Excel không có dữ liệu' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (jsonData.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `File quá nhiều dòng! Tối đa ${MAX_ROWS} dòng, file có ${jsonData.length} dòng` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: jsonData.length,
      success: 0,
      failed: 0,
      errors: []
    };

    // ✅ GET DB CLIENT FOR TRANSACTION
    client = await query.connect();
    
    // ✅ BEGIN TRANSACTION với SERIALIZABLE isolation
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // ✅ BATCH CHECK DUPLICATES (1 query thay vì N queries)
    const allSoHieuVBCC = jsonData
      .map(row => row['Số hiệu VB'])
      .filter(Boolean);
    
    const duplicateCheck = await client.query(
      `SELECT so_hieu_vbcc FROM diplomas WHERE so_hieu_vbcc = ANY($1::text[])`,
      [allSoHieuVBCC]
    );
    
    const existingSoHieuSet = new Set(
      duplicateCheck.rows.map(r => r.so_hieu_vbcc)
    );

    // ✅ PROCESS EACH ROW
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      try {
        // Parse & validate
        const data = parseRowData(row, rowNumber);

        // Check duplicate trong batch
        if (existingSoHieuSet.has(data.so_hieu_vbcc)) {
          throw new Error('Số hiệu văn bằng đã tồn tại trong hệ thống');
        }

        // Check duplicate trong file hiện tại
        const duplicateInFile = jsonData.slice(0, i).find(
          r => r['Số hiệu VB'] === data.so_hieu_vbcc
        );
        if (duplicateInFile) {
          throw new Error('Số hiệu văn bằng bị trùng trong file (dòng trước đó)');
        }

        // Generate ma_dinh_danh
        const maDinhDanh = await generateMaDinhDanh(
          client,
          data.nam_tot_nghiep,
          data.ten_vbcc
        );

        // ✅ INSERT với đúng 41 tham số
        const insertValues = [
          // 1-7: Metadata & Identification
          DEFAULT_CONFIG.phien_ban,
          DEFAULT_CONFIG.thong_tu,
          maDinhDanh,
          data.ten_vbcc,
          data.nganh_dao_tao,
          data.ma_nganh_dao_tao,
          data.so_hieu_vbcc,
          
          // 8-15: Personal Info
          data.so_ddcn,
          data.ma_nguoi_hoc,
          data.ho_va_ten,
          data.ngay_sinh,
          data.noi_sinh,
          data.gioi_tinh,
          data.dan_toc,
          data.quoc_tich,
          
          // 16-23: Education Info
          DEFAULT_CONFIG.ten_truong,
          DEFAULT_CONFIG.ma_co_so_dao_tao,
          data.nam_tot_nghiep,
          data.so_quyet_dinh_cong_nhan_tot_nghiep,
          data.ngay_quyet_dinh_cong_nhan_tot_nghiep,
          data.so_quyet_dinh_hoi_dong_danh_gia,
          data.so_vao_so,
          data.xep_loai,
          
          // 24-33: Issuing Info
          data.don_vi_cap_bang,
          data.ma_don_vi_cap_bang,
          data.ho_ten_nguoi_ky_vbcc,
          data.so_ddcn_nguoi_ky_vbcc,
          data.chuc_danh_nguoi_ky_vbcc,
          data.ho_ten_nguoi_ky_vbcc_ban_giay,
          data.chuc_danh_nguoi_ky_vbcc_ban_giay,
          DEFAULT_CONFIG.dia_danh_cap_vbcc,
          data.ngay_tao_vbcc,
          data.ngay_cap_vbcc,
          
          // 34-40: Training Details
          data.chuyen_nganh_dao_tao,
          data.ngon_ngu_dao_tao,
          data.thoi_gian_dao_tao,
          data.tong_so_tin_chi,
          data.trinh_do_theo_khung_quoc_gia,
          data.bac_trinh_do_theo_khung_quoc_gia,
          data.hinh_thuc_dao_tao,
          
          // 41: Metadata
          admin.username
        ];

        await client.query(
          `INSERT INTO diplomas (
            phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
            nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
            so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
            ten_truong, ma_co_so_dao_tao, nam_tot_nghiep,
            so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
            so_quyet_dinh_hoi_dong_danh_gia, so_vao_so, xep_loai,
            don_vi_cap_bang, ma_don_vi_cap_bang,
            ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
            ho_ten_nguoi_ky_vbcc_ban_giay, chuc_danh_nguoi_ky_vbcc_ban_giay,
            dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
            chuyen_nganh_dao_tao, ngon_ngu_dao_tao, thoi_gian_dao_tao,
            tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia,
            hinh_thuc_dao_tao, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
          )`,
          insertValues
        );

        results.success++;

      } catch (error) {
        console.error(`Error row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          diploma_number: row['Số hiệu VB'] || 'N/A',
          student_name: row['Họ và tên'] || 'N/A',
          message: error.message || 'Lỗi không xác định'
        });
      }
    }

    // ✅ COMMIT TRANSACTION
    await client.query('COMMIT');

    // Log admin action
    await logAdminAction(
      admin.id, 'IMPORT', 'diplomas', null, null,
      { fileName: file.name, fileSize: file.size, results },
      `Import Excel: ${results.success} thành công, ${results.failed} thất bại`,
      ipAddress
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // ✅ ROLLBACK on error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }

    console.error('Import error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Lỗi khi import file'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // ✅ RELEASE CLIENT
    if (client) {
      client.release();
    }
  }
}

/**
 * ✅ GET - Download Template
 */
export async function GET(request) {
  try {
    verifyAdmin(request);

    const templateData = [
      {
        'Tên văn bằng': 'Bằng Cử nhân',
        'Số hiệu VB': '001/ĐHCN-2024',
        'Số vào sổ': '001/2024',
        'Mã SV': '2020600001',
        'Số CCCD SV': '001202003456',
        'Họ và tên': 'NGUYỄN VĂN AN',
        'Ngày sinh': '15/03/2002',
        'Nơi sinh': 'Hải Phòng',
        'Giới tính': 'Nam',
        'Dân tộc': 'Kinh',
        'Quốc tịch': 'Việt Nam',
        'Ngành đào tạo': 'Công nghệ Thông tin',
        'Mã ngành': '7480201',
        'Chuyên ngành': 'Kỹ thuật Phần mềm',
        'Năm TN': 2024,
        'Xếp loại': 'Khá',
        'Số QĐ công nhận TN': '1234/QĐ-HPU',
        'Ngày QĐ TN': '15/06/2024',
        'Số QĐ hội đồng': '1200/QĐ-HĐTN',
        'Ngày tạo VB': '20/06/2024',
        'Ngày cấp': '20/06/2024',
        'Hình thức ĐT': 'Chính quy',
        'Thời gian ĐT': '4 năm',
        'Tổng TC': 128,
        'Trình độ KHQG': 'Trình độ 6',
        'Bậc ĐT': 'Đại học',
        'Ngôn ngữ ĐT': 'Tiếng Việt',
        'Đơn vị cấp bằng': 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        'Mã đơn vị CB': 'HPU01',
        'Họ tên người ký': 'PGS.TS. Nguyễn Văn B',
        'CCCD người ký': '001987654321',
        'Chức danh người ký': 'Hiệu trưởng',
        'Họ tên người ký bản giấy': '',
        'Chức danh người ký bản giấy': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Column widths
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 25 }, { wch: 8 },
      { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }
    ];

    // Add helpful notes
    const notes = {
      A1: { c: [{ a: 'System', t: 'Tên loại văn bằng: Bằng Cử nhân, Bằng Kỹ sư, Bằng Thạc sĩ, Bằng Tiến sĩ' }] },
      B1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Số hiệu văn bằng phải duy nhất trong hệ thống' }] },
      C1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Số vào sổ cấp bằng' }] },
      D1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Mã sinh viên' }] },
      E1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Số CCCD/CMND sinh viên' }] },
      F1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Họ và tên (tự động IN HOA)' }] },
      G1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Format: dd/MM/yyyy (VD: 15/03/2002)' }] },
      H1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Nơi sinh' }] },
      I1: { c: [{ a: 'System', t: 'Giới tính: Nam hoặc Nữ (mặc định: Nam)' }] },
      J1: { c: [{ a: 'System', t: 'Dân tộc (mặc định: Kinh)' }] },
      K1: { c: [{ a: 'System', t: 'Quốc tịch (mặc định: Việt Nam)' }] },
      L1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Tên ngành đào tạo' }] },
      M1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Mã ngành (7 số)' }] },
      N1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Chuyên ngành đào tạo' }] },
      O1: { c: [{ a: 'System', t: 'Năm tốt nghiệp (số nguyên, VD: 2024)' }] },
      P1: { c: [{ a: 'System', t: 'Xếp loại: Xuất sắc, Giỏi, Khá, Trung bình' }] },
      Q1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Số quyết định công nhận tốt nghiệp' }] },
      R1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Ngày QĐ công nhận TN (dd/MM/yyyy)' }] },
      S1: { c: [{ a: 'System', t: 'Số QĐ hội đồng đánh giá (không bắt buộc)' }] },
      T1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Ngày tạo văn bằng (dd/MM/yyyy)' }] },
      U1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Ngày cấp văn bằng (dd/MM/yyyy)' }] },
      V1: { c: [{ a: 'System', t: 'Hình thức: Chính quy, Từ xa, Liên thông, Văn bằng 2' }] },
      W1: { c: [{ a: 'System', t: 'Thời gian đào tạo (VD: 4 năm, 5 năm)' }] },
      X1: { c: [{ a: 'System', t: 'Tổng số tín chỉ (số nguyên)' }] },
      AC1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Họ tên người ký văn bằng' }] },
      AD1: { c: [{ a: 'System', t: '⚠️ BẮT BUỘC - Số CCCD người ký' }] },
      AF1: { c: [{ a: 'System', t: 'Người ký bản giấy (không bắt buộc, để trống nếu không có)' }] },
      AG1: { c: [{ a: 'System', t: 'Chức danh người ký bản giấy (không bắt buộc)' }] }
    };

    Object.keys(notes).forEach(cell => {
      if (!worksheet[cell]) worksheet[cell] = { v: '' };
      worksheet[cell].c = notes[cell].c;
    });

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_vanbang_34cot_v2.xlsx"'
      }
    });

  } catch (error) {
    console.error('Template download error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi khi tạo template' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}