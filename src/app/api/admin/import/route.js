// src/app/api/admin/import/route.js - Updated for Schema v2.0
import { query, logAdminAction } from '@/lib/db';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;

function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Sinh mã định danh tự động
 */
async function generateMaDinhDanh(namTotNghiep, tenVBCC) {
  let type = 'CNH';
  if (tenVBCC.includes('Kỹ sư')) type = 'KSU';
  else if (tenVBCC.includes('Thạc sĩ')) type = 'THS';
  else if (tenVBCC.includes('Tiến sĩ')) type = 'TSI';

  const result = await query(
    `SELECT ma_dinh_danh_vbcc 
     FROM diplomas 
     WHERE ma_dinh_danh_vbcc LIKE $1 
     ORDER BY ma_dinh_danh_vbcc DESC 
     LIMIT 1`,
    [`HPU-${namTotNghiep}-${type}-%`]
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0].ma_dinh_danh_vbcc;
    const lastSeq = parseInt(lastCode.split('-')[3]);
    sequence = lastSeq + 1;
  }

  return `HPU-${namTotNghiep}-${type}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * POST - Import dữ liệu từ Excel
 */
export async function POST(request) {
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    const formData = await request.formData();
    const file = formData.get('file');

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
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

    // Get current date for ngay_tao_vbcc
    const today = new Date();
    const ngayTaoVBCC = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      try {
        // Map columns from Excel
        const data = {
          ten_vbcc: row['Tên văn bằng'] || 'Bằng Cử nhân',
          so_hieu_vbcc: row['Số hiệu VB'] || '',
          so_vao_so: row['Số vào sổ'] || '',
          ma_nguoi_hoc: row['Mã SV'] || '',
          so_ddcn: row['Số CCCD SV'] || '',
          ho_va_ten: row['Họ và tên'] || '',
          ngay_sinh: row['Ngày sinh'] || '',
          noi_sinh: row['Nơi sinh'] || '',
          gioi_tinh: row['Giới tính'] || 'Nam',
          dan_toc: row['Dân tộc'] || 'Kinh',
          nganh_dao_tao: row['Ngành đào tạo'] || '',
          ma_nganh_dao_tao: row['Mã ngành'] || '',
          chuyen_nganh_dao_tao: row['Chuyên ngành'] || '',
          nam_tot_nghiep: parseInt(row['Năm TN']) || new Date().getFullYear(),
          xep_loai: row['Xếp loại'] || '',
          so_quyet_dinh_cong_nhan_tot_nghiep: row['Số QĐ công nhận TN'] || '',
          ngay_quyet_dinh_cong_nhan_tot_nghiep: row['Ngày QĐ TN'] || '',
          ngay_cap_vbcc: row['Ngày cấp'] || '',
          hinh_thuc_dao_tao: row['Hình thức ĐT'] || 'Chính quy',
          thoi_gian_dao_tao: row['Thời gian ĐT'] || '4 năm',
          trinh_do_theo_khung_quoc_gia: row['Trình độ KHQG'] || 'Trình độ 6',
          bac_trinh_do_theo_khung_quoc_gia: row['Bậc ĐT'] || 'Đại học',
          ngon_ngu_dao_tao: row['Ngôn ngữ ĐT'] || 'Tiếng Việt',
          don_vi_cap_bang: row['Đơn vị cấp bằng'] || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
          ma_don_vi_cap_bang: row['Mã đơn vị CB'] || 'HPU01',
          ho_ten_nguoi_ky_vbcc: row['Họ tên người ký'] || '',
          so_ddcn_nguoi_ky_vbcc: row['CCCD người ký'] || '',
          chuc_danh_nguoi_ky_vbcc: row['Chức danh người ký'] || 'Hiệu trưởng',
          tong_so_tin_chi: parseInt(row['Tổng TC']) || null
        };

        // Validate required fields
        const required = ['so_hieu_vbcc', 'so_vao_so', 'ma_nguoi_hoc', 'so_ddcn', 'ho_va_ten', 
                         'ngay_sinh', 'noi_sinh', 'nganh_dao_tao', 'ma_nganh_dao_tao',
                         'chuyen_nganh_dao_tao', 'so_quyet_dinh_cong_nhan_tot_nghiep',
                         'ngay_quyet_dinh_cong_nhan_tot_nghiep', 'ngay_cap_vbcc',
                         'ho_ten_nguoi_ky_vbcc', 'so_ddcn_nguoi_ky_vbcc'];
        
        const missing = required.filter(f => !data[f]);
        if (missing.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            diploma_number: data.so_hieu_vbcc || 'N/A',
            message: `Thiếu: ${missing.join(', ')}`
          });
          continue;
        }

        // Check duplicate
        const existingCheck = await query(
          'SELECT id FROM diplomas WHERE so_hieu_vbcc = $1',
          [data.so_hieu_vbcc]
        );

        if (existingCheck.rows.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            diploma_number: data.so_hieu_vbcc,
            message: 'Số hiệu văn bằng đã tồn tại'
          });
          continue;
        }

        // Generate ma_dinh_danh
        const maDinhDanh = await generateMaDinhDanh(data.nam_tot_nghiep, data.ten_vbcc);

        // Insert into database (44 fields)
        await query(
          `INSERT INTO diplomas (
            phien_ban, thong_tu, ma_dinh_danh_vbcc, ten_vbcc,
            nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc,
            so_ddcn, ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
            ten_truong, ma_co_so_dao_tao, nam_tot_nghiep,
            so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
            so_vao_so, xep_loai,
            don_vi_cap_bang, ma_don_vi_cap_bang,
            ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
            dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
            chuyen_nganh_dao_tao, ngon_ngu_dao_tao, thoi_gian_dao_tao,
            tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia,
            hinh_thuc_dao_tao,
            created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38
          )`,
          [
            '1.0', '27/2019', maDinhDanh, data.ten_vbcc,
            data.nganh_dao_tao, data.ma_nganh_dao_tao, data.so_hieu_vbcc,
            data.so_ddcn, data.ma_nguoi_hoc, data.ho_va_ten, data.ngay_sinh, data.noi_sinh, 
            data.gioi_tinh, data.dan_toc, 'Việt Nam',
            'Trường Đại học Quản lý và Công nghệ Hải Phòng', 'HPU01', data.nam_tot_nghiep,
            data.so_quyet_dinh_cong_nhan_tot_nghiep, data.ngay_quyet_dinh_cong_nhan_tot_nghiep,
            data.so_vao_so, data.xep_loai || null,
            data.don_vi_cap_bang, data.ma_don_vi_cap_bang,
            data.ho_ten_nguoi_ky_vbcc, data.so_ddcn_nguoi_ky_vbcc, data.chuc_danh_nguoi_ky_vbcc,
            'Hải Phòng', ngayTaoVBCC, data.ngay_cap_vbcc,
            data.chuyen_nganh_dao_tao, data.ngon_ngu_dao_tao, data.thoi_gian_dao_tao,
            data.tong_so_tin_chi, data.trinh_do_theo_khung_quoc_gia, data.bac_trinh_do_theo_khung_quoc_gia,
            data.hinh_thuc_dao_tao,
            admin.username
          ]
        );

        results.success++;

      } catch (error) {
        console.error(`Error row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          diploma_number: row['Số hiệu VB'] || 'N/A',
          message: error.message || 'Lỗi không xác định'
        });
      }
    }

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
    console.error('Import error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi khi import file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET - Download template Excel
 */
export async function GET(request) {
  try {
    verifyAdmin(request);

    // Template data với 27 cột quan trọng
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
        'Ngành đào tạo': 'Công nghệ Thông tin',
        'Mã ngành': '7480201',
        'Chuyên ngành': 'Kỹ thuật Phần mềm',
        'Năm TN': 2024,
        'Xếp loại': 'Khá',
        'Số QĐ công nhận TN': '1234/QĐ-HPU',
        'Ngày QĐ TN': '15/06/2024',
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
        'Chức danh người ký': 'Hiệu trưởng'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Set column widths
    const columnWidths = [
      { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
      { wch: 30 }, { wch: 10 }, { wch: 25 }, { wch: 8 }, { wch: 12 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
      { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 50 },
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = columnWidths;

    // Add notes in first row
    const notes = {
      A1: { c: [{ a: 'System', t: 'Tên loại văn bằng: Bằng Cử nhân, Bằng Kỹ sư, Bằng Thạc sĩ, Bằng Tiến sĩ' }] },
      B1: { c: [{ a: 'System', t: 'Số hiệu văn bằng phải duy nhất trong hệ thống' }] },
      N1: { c: [{ a: 'System', t: 'Năm phải là số nguyên, ví dụ: 2024' }] },
      O1: { c: [{ a: 'System', t: 'Xếp loại: Xuất sắc, Giỏi, Khá, Trung bình' }] }
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
        'Content-Disposition': 'attachment; filename="template_import_vanbang_v2.xlsx"'
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