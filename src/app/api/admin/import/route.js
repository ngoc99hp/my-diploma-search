// src/app/api/admin/import/route.js - Import diplomas from Excel with detailed error reporting
import { query, transaction, logAdminAction } from '@/lib/db';
import { searchCache } from '@/lib/cache';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

/**
 * Verify admin token
 */
function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Convert dd/MM/yyyy to yyyy-MM-dd
 */
function parseVNDateToISO(vnDate) {
  if (!vnDate) return null;
  
  // Handle string input
  if (typeof vnDate === 'string') {
    const parts = vnDate.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    
    // Validate numbers
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (d < 1 || d > 31) return null;
    if (m < 1 || m > 12) return null;
    if (y < 1900 || y > 2100) return null;
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle Excel Date object
  if (vnDate instanceof Date) {
    const day = vnDate.getDate().toString().padStart(2, '0');
    const month = (vnDate.getMonth() + 1).toString().padStart(2, '0');
    const year = vnDate.getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Validate row data with detailed error messages
 */
function validateRow(row, rowNumber) {
  const errors = [];
  
  // Required fields validation
  if (!row.so_hieu_vbcc?.trim()) {
    errors.push('Thiếu Số hiệu văn bằng (cột A)');
  }
  
  if (!row.ma_nguoi_hoc?.trim()) {
    errors.push('Thiếu Mã sinh viên (cột D)');
  }
  
  if (!row.ho_va_ten?.trim()) {
    errors.push('Thiếu Họ và tên (cột F)');
  }
  
  if (!row.ngay_sinh) {
    errors.push('Thiếu Ngày sinh (cột G)');
  } else {
    const ngaySinh = parseVNDateToISO(row.ngay_sinh);
    if (!ngaySinh) {
      errors.push('Ngày sinh không đúng định dạng (cột G). Yêu cầu: dd/MM/yyyy');
    }
  }
  
  if (!row.noi_sinh?.trim()) {
    errors.push('Thiếu Nơi sinh (cột H)');
  }
  
  if (!row.gioi_tinh?.trim()) {
    errors.push('Thiếu Giới tính (cột I)');
  } else if (!['Nam', 'Nữ'].includes(row.gioi_tinh.trim())) {
    errors.push('Giới tính phải là "Nam" hoặc "Nữ" (cột I)');
  }
  
  if (!row.dan_toc?.trim()) {
    errors.push('Thiếu Dân tộc (cột J)');
  }
  
  if (!row.nganh_dao_tao?.trim()) {
    errors.push('Thiếu Ngành đào tạo (cột L)');
  }
  
  if (!row.ma_nganh_dao_tao?.trim()) {
    errors.push('Thiếu Mã ngành (cột M)');
  }
  
  if (!row.chuyen_nganh_dao_tao?.trim()) {
    errors.push('Thiếu Chuyên ngành đào tạo (cột N)');
  }
  
  if (!row.hinh_thuc_dao_tao?.trim()) {
    errors.push('Thiếu Hình thức đào tạo (cột O)');
  }
  
  if (!row.thoi_gian_dao_tao?.trim()) {
    errors.push('Thiếu Thời gian đào tạo (cột P)');
  }
  
  if (!row.trinh_do_theo_khung_quoc_gia?.trim()) {
    errors.push('Thiếu Trình độ KHQG (cột T)');
  }
  
  if (!row.bac_trinh_do_theo_khung_quoc_gia?.trim()) {
    errors.push('Thiếu Bậc đào tạo (cột U)');
  }
  
  if (!row.nam_tot_nghiep) {
    errors.push('Thiếu Năm tốt nghiệp (cột V)');
  } else {
    const nam = parseInt(row.nam_tot_nghiep);
    if (isNaN(nam) || nam < 1900 || nam > 2100) {
      errors.push('Năm tốt nghiệp không hợp lệ (cột V)');
    }
  }
  
  if (!row.so_quyet_dinh_cong_nhan_tot_nghiep?.trim()) {
    errors.push('Thiếu Số QĐ CNTN (cột X)');
  }
  
  if (!row.ngay_quyet_dinh_cong_nhan_tot_nghiep) {
    errors.push('Thiếu Ngày QĐ CNTN (cột Y)');
  } else {
    const ngayQD = parseVNDateToISO(row.ngay_quyet_dinh_cong_nhan_tot_nghiep);
    if (!ngayQD) {
      errors.push('Ngày QĐ CNTN không đúng định dạng (cột Y). Yêu cầu: dd/MM/yyyy');
    }
  }
  
  if (!row.don_vi_cap_bang?.trim()) {
    errors.push('Thiếu Đơn vị cấp bằng (cột AA)');
  }
  
  if (!row.ngay_cap_vbcc) {
    errors.push('Thiếu Ngày cấp VB (cột AC)');
  } else {
    const ngayCap = parseVNDateToISO(row.ngay_cap_vbcc);
    if (!ngayCap) {
      errors.push('Ngày cấp VB không đúng định dạng (cột AC). Yêu cầu: dd/MM/yyyy');
    }
  }
  
  if (!row.ho_ten_nguoi_ky_vbcc?.trim()) {
    errors.push('Thiếu Họ tên người ký (cột AE)');
  }
  
  if (!row.chuc_danh_nguoi_ky_vbcc?.trim()) {
    errors.push('Thiếu Chức danh người ký (cột AG)');
  }
  
  // Optional date validation
  if (row.ngay_nhap_hoc) {
    const ngayNhapHoc = parseVNDateToISO(row.ngay_nhap_hoc);
    if (!ngayNhapHoc) {
      errors.push('Ngày nhập học không đúng định dạng (cột Q). Yêu cầu: dd/MM/yyyy');
    }
  }
  
  // Credit validation
  if (row.tong_so_tin_chi) {
    const tinChi = parseInt(row.tong_so_tin_chi);
    if (isNaN(tinChi) || tinChi < 0) {
      errors.push('Tổng số tín chỉ không hợp lệ (cột S)');
    }
  }
  
  return errors;
}

/**
 * GET /api/admin/import
 * Download Excel template
 */
export async function GET(request) {
  try {
    // Verify admin
    verifyAdmin(request);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách văn bằng');
    
    // Define columns with Vietnamese headers
    worksheet.columns = [
      // A. THÔNG TIN CƠ BẢN (Required fields marked with *)
      { header: '* Số hiệu VB', key: 'so_hieu_vbcc', width: 20 },
      { header: '* Số vào sổ', key: 'so_vao_so', width: 15 },
      { header: 'Tên văn bằng', key: 'ten_vbcc', width: 20 },
      { header: '* Mã sinh viên', key: 'ma_nguoi_hoc', width: 15 },
      { header: '* Số CCCD', key: 'so_ddcn', width: 15 },
      
      // B. THÔNG TIN SINH VIÊN
      { header: '* Họ và tên', key: 'ho_va_ten', width: 30 },
      { header: '* Ngày sinh (dd/MM/yyyy)', key: 'ngay_sinh', width: 20 },
      { header: '* Nơi sinh', key: 'noi_sinh', width: 30 },
      { header: '* Giới tính (Nam/Nữ)', key: 'gioi_tinh', width: 12 },
      { header: '* Dân tộc', key: 'dan_toc', width: 15 },
      { header: 'Quốc tịch', key: 'quoc_tich', width: 15 },
      
      // C. THÔNG TIN ĐÀO TẠO
      { header: '* Ngành đào tạo', key: 'nganh_dao_tao', width: 40 },
      { header: '* Mã ngành', key: 'ma_nganh_dao_tao', width: 15 },
      { header: '* Chuyên ngành', key: 'chuyen_nganh_dao_tao', width: 40 },
      { header: '* Hình thức ĐT', key: 'hinh_thuc_dao_tao', width: 15 },
      { header: '* Thời gian ĐT', key: 'thoi_gian_dao_tao', width: 15 },
      { header: 'Ngày nhập học (dd/MM/yyyy)', key: 'ngay_nhap_hoc', width: 20 },
      { header: '* Ngôn ngữ ĐT', key: 'ngon_ngu_dao_tao', width: 15 },
      { header: 'Tổng số tín chỉ', key: 'tong_so_tin_chi', width: 15 },
      { header: '* Trình độ KHQG', key: 'trinh_do_theo_khung_quoc_gia', width: 15 },
      { header: '* Bậc đào tạo', key: 'bac_trinh_do_theo_khung_quoc_gia', width: 15 },
      { header: '* Năm TN', key: 'nam_tot_nghiep', width: 10 },
      { header: 'Xếp loại TN', key: 'xep_loai', width: 15 },
      
      // D. THÔNG TIN CẤP BẰNG
      { header: '* Số QĐ CNTN', key: 'so_quyet_dinh_cong_nhan_tot_nghiep', width: 20 },
      { header: '* Ngày QĐ CNTN (dd/MM/yyyy)', key: 'ngay_quyet_dinh_cong_nhan_tot_nghiep', width: 25 },
      { header: 'Số QĐ HĐĐG', key: 'so_quyet_dinh_hoi_dong_danh_gia', width: 20 },
      { header: '* Đơn vị cấp bằng', key: 'don_vi_cap_bang', width: 50 },
      { header: 'Mã đơn vị CB', key: 'ma_don_vi_cap_bang', width: 15 },
      { header: '* Ngày cấp VB (dd/MM/yyyy)', key: 'ngay_cap_vbcc', width: 25 },
      { header: 'Địa danh cấp VB', key: 'dia_danh_cap_vbcc', width: 20 },
      
      // E. NGƯỜI KÝ
      { header: '* Họ tên người ký', key: 'ho_ten_nguoi_ky_vbcc', width: 30 },
      { header: 'Số CCCD người ký', key: 'so_ddcn_nguoi_ky_vbcc', width: 15 },
      { header: '* Chức danh người ký', key: 'chuc_danh_nguoi_ky_vbcc', width: 20 },
      { header: 'Họ tên NK bản giấy', key: 'ho_ten_nguoi_ky_vbcc_ban_giay', width: 30 },
      { header: 'Chức danh NK bản giấy', key: 'chuc_danh_nguoi_ky_vbcc_ban_giay', width: 20 },
      
      // F. THÔNG TIN TRƯỜNG
      { header: 'Tên trường', key: 'ten_truong', width: 50 },
      { header: 'Mã cơ sở ĐT', key: 'ma_co_so_dao_tao', width: 15 },
      
      // G. GHI CHÚ
      { header: 'Ghi chú', key: 'ghi_chu', width: 40 }
    ];
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0083C2' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;
    
    // Add sample data row
    worksheet.addRow({
      so_hieu_vbcc: '001/ĐHCN-2024',
      so_vao_so: '001/2024',
      ten_vbcc: 'Bằng Cử nhân',
      ma_nguoi_hoc: '2020600001',
      so_ddcn: '001202003456',
      ho_va_ten: 'NGUYỄN VĂN AN',
      ngay_sinh: '15/03/2002',
      noi_sinh: 'Hải Phòng',
      gioi_tinh: 'Nam',
      dan_toc: 'Kinh',
      quoc_tich: 'Việt Nam',
      nganh_dao_tao: 'Công nghệ Thông tin',
      ma_nganh_dao_tao: '7480201',
      chuyen_nganh_dao_tao: 'Kỹ thuật Phần mềm',
      hinh_thuc_dao_tao: 'Chính quy',
      thoi_gian_dao_tao: '4 năm',
      ngay_nhap_hoc: '01/09/2020',
      ngon_ngu_dao_tao: 'Tiếng Việt',
      tong_so_tin_chi: 120,
      trinh_do_theo_khung_quoc_gia: 'Bậc 6',
      bac_trinh_do_theo_khung_quoc_gia: 'Đại học',
      nam_tot_nghiep: 2024,
      xep_loai: 'Khá',
      so_quyet_dinh_cong_nhan_tot_nghiep: '1234/QĐ-HPU',
      ngay_quyet_dinh_cong_nhan_tot_nghiep: '15/06/2024',
      so_quyet_dinh_hoi_dong_danh_gia: '',
      don_vi_cap_bang: 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
      ma_don_vi_cap_bang: 'HPU',
      ngay_cap_vbcc: '20/06/2024',
      dia_danh_cap_vbcc: 'Hải Phòng',
      ho_ten_nguoi_ky_vbcc: 'TS. NGUYỄN TIẾN THANH',
      so_ddcn_nguoi_ky_vbcc: '001987654321',
      chuc_danh_nguoi_ky_vbcc: 'Hiệu trưởng',
      ho_ten_nguoi_ky_vbcc_ban_giay: '',
      chuc_danh_nguoi_ky_vbcc_ban_giay: '',
      ten_truong: 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
      ma_co_so_dao_tao: 'HPU',
      ghi_chu: ''
    });
    
    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Hướng dẫn');
    instructionsSheet.columns = [
      { header: 'Hướng dẫn sử dụng template', key: 'instruction', width: 100 }
    ];
    
    instructionsSheet.addRow({ instruction: '1. Các trường có dấu * là BẮT BUỘC phải điền' });
    instructionsSheet.addRow({ instruction: '2. Định dạng ngày tháng: dd/MM/yyyy (ví dụ: 15/03/2002)' });
    instructionsSheet.addRow({ instruction: '3. Giới tính chỉ được điền: "Nam" hoặc "Nữ"' });
    instructionsSheet.addRow({ instruction: '4. Số hiệu văn bằng phải là DUY NHẤT trong hệ thống' });
    instructionsSheet.addRow({ instruction: '5. Mã sinh viên phải là DUY NHẤT cho mỗi năm tốt nghiệp và ngành học' });
    instructionsSheet.addRow({ instruction: '6. Xóa dòng dữ liệu mẫu trước khi import dữ liệu thật' });
    instructionsSheet.addRow({ instruction: '7. Các trường để trống sẽ sử dụng giá trị mặc định của hệ thống' });
    instructionsSheet.addRow({ instruction: '' });
    instructionsSheet.addRow({ instruction: 'Giá trị mặc định:' });
    instructionsSheet.addRow({ instruction: '  - Tên văn bằng: "Bằng Cử nhân"' });
    instructionsSheet.addRow({ instruction: '  - Quốc tịch: "Việt Nam"' });
    instructionsSheet.addRow({ instruction: '  - Tên trường: "Trường Đại học Quản lý và Công nghệ Hải Phòng"' });
    instructionsSheet.addRow({ instruction: '  - Mã cơ sở: "HPU01"' });
    instructionsSheet.addRow({ instruction: '  - Địa danh cấp: "Hải Phòng"' });
    instructionsSheet.addRow({ instruction: '  - Ngôn ngữ: "Tiếng Việt"' });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_vanbang.xlsx"'
      }
    });
    
  } catch (error) {
    console.error('Download template error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi khi tải template' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/admin/import
 * Import diplomas from Excel file with detailed error reporting
 */
export async function POST(request) {
  try {
    // Verify admin
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet('Danh sách văn bằng');
    if (!worksheet) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File không đúng định dạng. Vui lòng sử dụng template mẫu.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse rows
    const rows = [];
    const validationErrors = [];
    let totalRows = 0;
    
    worksheet.eachRow((row, index) => {
      // Skip header row
      if (index === 1) return;
      
      // Skip empty rows
      if (!row.getCell('A').value) return;
      
      totalRows++;
      
      const rowData = {
        so_hieu_vbcc: row.getCell('A').value?.toString().trim(),
        so_vao_so: row.getCell('B').value?.toString().trim(),
        ten_vbcc: row.getCell('C').value?.toString().trim() || 'Bằng Cử nhân',
        ma_nguoi_hoc: row.getCell('D').value?.toString().trim(),
        so_ddcn: row.getCell('E').value?.toString().trim(),
        ho_va_ten: row.getCell('F').value?.toString().trim(),
        ngay_sinh: row.getCell('G').value,
        noi_sinh: row.getCell('H').value?.toString().trim(),
        gioi_tinh: row.getCell('I').value?.toString().trim(),
        dan_toc: row.getCell('J').value?.toString().trim(),
        quoc_tich: row.getCell('K').value?.toString().trim() || 'Việt Nam',
        nganh_dao_tao: row.getCell('L').value?.toString().trim(),
        ma_nganh_dao_tao: row.getCell('M').value?.toString().trim(),
        chuyen_nganh_dao_tao: row.getCell('N').value?.toString().trim(),
        hinh_thuc_dao_tao: row.getCell('O').value?.toString().trim(),
        thoi_gian_dao_tao: row.getCell('P').value?.toString().trim(),
        ngay_nhap_hoc: row.getCell('Q').value,
        ngon_ngu_dao_tao: row.getCell('R').value?.toString().trim() || 'Tiếng Việt',
        tong_so_tin_chi: row.getCell('S').value ? parseInt(row.getCell('S').value) : null,
        trinh_do_theo_khung_quoc_gia: row.getCell('T').value?.toString().trim(),
        bac_trinh_do_theo_khung_quoc_gia: row.getCell('U').value?.toString().trim(),
        nam_tot_nghiep: row.getCell('V').value ? parseInt(row.getCell('V').value) : null,
        xep_loai: row.getCell('W').value?.toString().trim(),
        so_quyet_dinh_cong_nhan_tot_nghiep: row.getCell('X').value?.toString().trim(),
        ngay_quyet_dinh_cong_nhan_tot_nghiep: row.getCell('Y').value,
        so_quyet_dinh_hoi_dong_danh_gia: row.getCell('Z').value?.toString().trim(),
        don_vi_cap_bang: row.getCell('AA').value?.toString().trim(),
        ma_don_vi_cap_bang: row.getCell('AB').value?.toString().trim() || 'HPU01',
        ngay_cap_vbcc: row.getCell('AC').value,
        dia_danh_cap_vbcc: row.getCell('AD').value?.toString().trim() || 'Hải Phòng',
        ho_ten_nguoi_ky_vbcc: row.getCell('AE').value?.toString().trim(),
        so_ddcn_nguoi_ky_vbcc: row.getCell('AF').value?.toString().trim(),
        chuc_danh_nguoi_ky_vbcc: row.getCell('AG').value?.toString().trim(),
        ho_ten_nguoi_ky_vbcc_ban_giay: row.getCell('AH').value?.toString().trim(),
        chuc_danh_nguoi_ky_vbcc_ban_giay: row.getCell('AI').value?.toString().trim(),
        ten_truong: row.getCell('AJ').value?.toString().trim() || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        ma_co_so_dao_tao: row.getCell('AK').value?.toString().trim() || 'HPU01',
        ghi_chu: row.getCell('AL').value?.toString().trim()
      };
      
      // Validate row
      const rowErrors = validateRow(rowData, index);
      if (rowErrors.length > 0) {
        validationErrors.push({
          row: index,
          so_hieu: rowData.so_hieu_vbcc || '(Trống)',
          ma_sv: rowData.ma_nguoi_hoc || '(Trống)',
          ho_ten: rowData.ho_va_ten || '(Trống)',
          errors: rowErrors
        });
        return;
      }
      
      rows.push({ ...rowData, excelRow: index });
    });
    
    // If all rows have validation errors
    if (rows.length === 0 && validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Tất cả ${validationErrors.length} dòng đều có lỗi validation. Vui lòng kiểm tra lại dữ liệu.`,
          results: { 
            total: totalRows,
            success: 0, 
            failed: validationErrors.length, 
            errors: validationErrors 
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File không có dữ liệu hợp lệ',
          results: { total: 0, success: 0, failed: 0, errors: [] }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Import data with detailed error tracking
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [...validationErrors],
      duplicates: [],
      dbErrors: []
    };
    
    console.log(`🚀 Starting import of ${rows.length} records...`);
    
    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const rowIndex = rowData.excelRow;
      
      try {
        await transaction(async (client) => {
          // Check duplicate so_hieu_vbcc
          const checkSoHieu = await client.query(
            'SELECT id, ho_va_ten FROM diplomas WHERE so_hieu_vbcc = $1 AND is_active = TRUE',
            [rowData.so_hieu_vbcc]
          );
          
          if (checkSoHieu.rows.length > 0) {
            throw new Error(`DUPLICATE|Số hiệu "${rowData.so_hieu_vbcc}" đã tồn tại (thuộc về: ${checkSoHieu.rows[0].ho_va_ten})`);
          }
          
          // Check duplicate ma_nguoi_hoc for same year and major
          const checkMaSV = await client.query(
            `SELECT id, ho_va_ten, so_hieu_vbcc 
             FROM diplomas 
             WHERE ma_nguoi_hoc = $1 
             AND nam_tot_nghiep = $2 
             AND ma_nganh_dao_tao = $3 
             AND is_active = TRUE`,
            [rowData.ma_nguoi_hoc, rowData.nam_tot_nghiep, rowData.ma_nganh_dao_tao]
          );
          
          if (checkMaSV.rows.length > 0) {
            throw new Error(`DUPLICATE|Mã sinh viên "${rowData.ma_nguoi_hoc}" đã có văn bằng năm ${rowData.nam_tot_nghiep} ngành ${rowData.ma_nganh_dao_tao} (Số hiệu: ${checkMaSV.rows[0].so_hieu_vbcc})`);
          }
          
          // Generate UUID
          const maDinhDanh = uuidv4();
          
          // Convert dates
          const ngaySinh = parseVNDateToISO(rowData.ngay_sinh);
          const ngayQD = parseVNDateToISO(rowData.ngay_quyet_dinh_cong_nhan_tot_nghiep);
          const ngayCap = parseVNDateToISO(rowData.ngay_cap_vbcc);
          const ngayNhapHoc = rowData.ngay_nhap_hoc ? parseVNDateToISO(rowData.ngay_nhap_hoc) : null;
          
          if (!ngaySinh || !ngayQD || !ngayCap) {
            throw new Error('DATE_ERROR|Lỗi chuyển đổi ngày tháng');
          }
          
          // Insert diploma
          await client.query(`
            INSERT INTO diplomas (
              ma_dinh_danh_vbcc, phien_ban, thong_tu, ten_vbcc,
              nganh_dao_tao, ma_nganh_dao_tao, so_hieu_vbcc, so_ddcn,
              ma_nguoi_hoc, ho_va_ten, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
              ten_truong, ma_co_so_dao_tao, nam_tot_nghiep,
              so_quyet_dinh_cong_nhan_tot_nghiep, ngay_quyet_dinh_cong_nhan_tot_nghiep,
              so_quyet_dinh_hoi_dong_danh_gia, so_vao_so, xep_loai,
              don_vi_cap_bang, ma_don_vi_cap_bang,
              ho_ten_nguoi_ky_vbcc, so_ddcn_nguoi_ky_vbcc, chuc_danh_nguoi_ky_vbcc,
              ho_ten_nguoi_ky_vbcc_ban_giay, chuc_danh_nguoi_ky_vbcc_ban_giay,
              dia_danh_cap_vbcc, ngay_tao_vbcc, ngay_cap_vbcc,
              chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao,
              tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia,
              hinh_thuc_dao_tao, ghi_chu, created_by
            ) VALUES (
              $1, '1.0', '27/2019', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
              $29, CURRENT_DATE, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
            )
          `, [
            maDinhDanh, rowData.ten_vbcc, rowData.nganh_dao_tao, rowData.ma_nganh_dao_tao,
            rowData.so_hieu_vbcc, rowData.so_ddcn, rowData.ma_nguoi_hoc, rowData.ho_va_ten,
            ngaySinh, rowData.noi_sinh, rowData.gioi_tinh, rowData.dan_toc, rowData.quoc_tich,
            rowData.ten_truong, rowData.ma_co_so_dao_tao, rowData.nam_tot_nghiep,
            rowData.so_quyet_dinh_cong_nhan_tot_nghiep, ngayQD,
            rowData.so_quyet_dinh_hoi_dong_danh_gia, rowData.so_vao_so, rowData.xep_loai,
            rowData.don_vi_cap_bang, rowData.ma_don_vi_cap_bang,
            rowData.ho_ten_nguoi_ky_vbcc, rowData.so_ddcn_nguoi_ky_vbcc, rowData.chuc_danh_nguoi_ky_vbcc,
            rowData.ho_ten_nguoi_ky_vbcc_ban_giay, rowData.chuc_danh_nguoi_ky_vbcc_ban_giay,
            rowData.dia_danh_cap_vbcc, ngayCap,
            rowData.chuyen_nganh_dao_tao, ngayNhapHoc, rowData.ngon_ngu_dao_tao, rowData.thoi_gian_dao_tao,
            rowData.tong_so_tin_chi, rowData.trinh_do_theo_khung_quoc_gia, rowData.bac_trinh_do_theo_khung_quoc_gia,
            rowData.hinh_thuc_dao_tao, rowData.ghi_chu, admin.username
          ]);
        });
        
        results.success++;
        
        // Log progress every 50 records
        if (results.success % 50 === 0) {
          console.log(`✅ Imported ${results.success}/${rows.length} records...`);
        }
        
      } catch (error) {
        results.failed++;
        
        const errorMessage = error.message || 'Lỗi không xác định';
        const errorType = errorMessage.split('|')[0];
        const errorDetail = errorMessage.split('|')[1] || errorMessage;
        
        const errorRecord = {
          row: rowIndex,
          so_hieu: rowData.so_hieu_vbcc,
          ma_sv: rowData.ma_nguoi_hoc,
          ho_ten: rowData.ho_va_ten,
          error: errorDetail,
          type: errorType
        };
        
        // Categorize errors
        if (errorType === 'DUPLICATE') {
          results.duplicates.push(errorRecord);
        } else if (errorType === 'DATE_ERROR') {
          results.errors.push(errorRecord);
        } else {
          results.dbErrors.push(errorRecord);
        }
        
        console.error(`❌ Row ${rowIndex} failed: ${errorDetail}`);
      }
    }
    
    console.log(`✨ Import completed: ${results.success} success, ${results.failed} failed`);
    
    // Combine all errors for response
    const allErrors = [
      ...results.errors,
      ...results.duplicates,
      ...results.dbErrors
    ];
    
    // Clear cache after successful import
    if (results.success > 0) {
      try {
        searchCache.clear();
        console.log('🗑️ Cache cleared after import');
      } catch (cacheError) {
        console.error('Cache clear error:', cacheError);
      }
    }
    
    // Log admin action
    await logAdminAction(
      admin.id,
      'IMPORT',
      'diplomas',
      null,
      null,
      { 
        total: results.total, 
        success: results.success, 
        failed: results.failed,
        validationErrors: validationErrors.length,
        duplicates: results.duplicates.length,
        dbErrors: results.dbErrors.length
      },
      `Import ${results.success}/${results.total} văn bằng từ Excel`,
      ipAddress
    );
    
    // Generate detailed message
    let message = '';
    if (results.failed === 0) {
      message = `🎉 Import thành công ${results.success} văn bằng!`;
    } else {
      message = `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`;
      
      if (validationErrors.length > 0) {
        message += `\n- ${validationErrors.length} dòng lỗi validation`;
      }
      if (results.duplicates.length > 0) {
        message += `\n- ${results.duplicates.length} dòng trùng lặp`;
      }
      if (results.dbErrors.length > 0) {
        message += `\n- ${results.dbErrors.length} dòng lỗi database`;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message,
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: allErrors,
        summary: {
          validationErrors: validationErrors.length,
          duplicates: results.duplicates.length,
          dbErrors: results.dbErrors.length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Lỗi khi import dữ liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}