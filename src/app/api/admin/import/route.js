// src/app/api/admin/import/route.js - Import diplomas from Excel
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
 * Validate row data
 */
function validateRow(row, rowNumber) {
  const errors = [];
  
  // Required fields
  if (!row.so_hieu_vbcc?.trim()) errors.push('Thiếu số hiệu văn bằng');
  if (!row.ma_nguoi_hoc?.trim()) errors.push('Thiếu mã sinh viên');
  if (!row.ho_va_ten?.trim()) errors.push('Thiếu họ tên');
  if (!row.ngay_sinh) errors.push('Thiếu ngày sinh');
  if (!row.nganh_dao_tao?.trim()) errors.push('Thiếu ngành đào tạo');
  if (!row.ma_nganh_dao_tao?.trim()) errors.push('Thiếu mã ngành');
  
  // Gender validation
  if (row.gioi_tinh && !['Nam', 'Nữ'].includes(row.gioi_tinh)) {
    errors.push('Giới tính phải là "Nam" hoặc "Nữ"');
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
 * Import diplomas from Excel file
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
    const errors = [];
    let rowNumber = 1;
    
    worksheet.eachRow((row, index) => {
      // Skip header row
      if (index === 1) return;
      
      rowNumber = index;
      
      // Skip empty rows
      if (!row.getCell('A').value) return;
      
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
        errors.push({
          row: index,
          errors: rowErrors
        });
        return;
      }
      
      rows.push(rowData);
    });
    
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File không có dữ liệu hợp lệ',
          results: { errors }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Import data in transaction
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [...errors]
    };
    
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const rowIndex = i + 2; // +2 because: 1 for header, 1 for 0-based index
      
      try {
        await transaction(async (client) => {
          // Check duplicate
          const checkResult = await client.query(
            'SELECT id FROM diplomas WHERE so_hieu_vbcc = $1 AND is_active = TRUE',
            [rowData.so_hieu_vbcc]
          );
          
          if (checkResult.rows.length > 0) {
            throw new Error(`Số hiệu "${rowData.so_hieu_vbcc}" đã tồn tại`);
          }
          
          // Generate UUID
          const maDinhDanh = uuidv4();
          
          // Convert dates
          const ngaySinh = parseVNDateToISO(rowData.ngay_sinh);
          const ngayQD = parseVNDateToISO(rowData.ngay_quyet_dinh_cong_nhan_tot_nghiep);
          const ngayCap = parseVNDateToISO(rowData.ngay_cap_vbcc);
          const ngayNhapHoc = rowData.ngay_nhap_hoc ? parseVNDateToISO(rowData.ngay_nhap_hoc) : null;
          
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
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowIndex,
          data: rowData.so_hieu_vbcc,
          message: error.message
        });
      }
    }
    
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
        failed: results.failed 
      },
      `Import ${results.success} văn bằng từ Excel`,
      ipAddress
    );
    
    // Return results
    const message = results.failed === 0
      ? `Import thành công ${results.success} văn bằng! 🎉`
      : `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`;
    
    return new Response(JSON.stringify({
      success: true,
      message,
      results
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