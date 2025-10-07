// src/app/api/admin/import/route.js
import { query, logAdminAction } from '@/lib/db';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000; // Maximum rows to import at once

// Verify admin token
function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * POST /api/admin/import - Import văn bằng từ Excel
 */
export async function POST(request) {
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Vui lòng chọn file Excel để import' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `File quá lớn! Kích thước tối đa: ${MAX_FILE_SIZE / 1024 / 1024}MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Định dạng file không hợp lệ! Vui lòng chọn file Excel (.xlsx hoặc .xls)' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Không thể đọc file. Vui lòng kiểm tra file và thử lại.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    
    // Parse Excel with error handling
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error) {
      console.error('Excel parse error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File Excel bị lỗi hoặc không đúng định dạng. Vui lòng kiểm tra lại file.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File Excel không có sheet nào. Vui lòng kiểm tra lại file.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with error handling
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: null 
      });
    } catch (error) {
      console.error('Sheet to JSON error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Không thể đọc dữ liệu từ sheet Excel. Vui lòng kiểm tra định dạng file.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate data exists
    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'File Excel không có dữ liệu hoặc thiếu header. Vui lòng sử dụng file template mẫu.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check max rows
    if (jsonData.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `File có quá nhiều dòng! Tối đa: ${MAX_ROWS} dòng. File của bạn có ${jsonData.length} dòng. Vui lòng chia nhỏ file và import từng phần.` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate headers
    const firstRow = jsonData[0];
    const requiredHeaders = [
      'Số hiệu văn bằng',
      'Số vào sổ', 
      'Ngày cấp',
      'Ngành',
      'Mã sinh viên',
      'Họ và tên',
      'Năm tốt nghiệp'
    ];

    const missingHeaders = requiredHeaders.filter(header => 
      !(header in firstRow) && 
      !Object.keys(firstRow).some(key => key.toLowerCase().includes(header.toLowerCase().replace(/[^a-z0-9]/g, '')))
    );

    if (missingHeaders.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `File Excel thiếu các cột bắt buộc: ${missingHeaders.join(', ')}. Vui lòng sử dụng file template mẫu.` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process data
    const results = {
      total: jsonData.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel rows start at 1, +1 for header

      try {
        // Map Excel columns
        const diplomaData = {
          diploma_number: row['Số hiệu văn bằng'] || row['So hieu'] || row['diploma_number'],
          registry_number: row['Số vào sổ'] || row['So vao so'] || row['registry_number'],
          issue_date: row['Ngày cấp'] || row['Ngay cap'] || row['issue_date'],
          school_name: row['Tên trường'] || row['Ten truong'] || row['school_name'] || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
          major: row['Ngành'] || row['Nganh'] || row['major'],
          specialization: row['Chuyên ngành'] || row['Chuyen nganh'] || row['specialization'],
          student_code: row['Mã sinh viên'] || row['Ma SV'] || row['student_code'],
          full_name: row['Họ và tên'] || row['Ho ten'] || row['full_name'],
          training_system: row['Hệ đào tạo'] || row['He dao tao'] || row['training_system'] || 'Đại học chính quy',
          graduation_year: row['Năm tốt nghiệp'] || row['Nam TN'] || row['graduation_year'],
          classification: row['Xếp loại'] || row['Xep loai'] || row['classification']
        };

        // Validate required fields
        const requiredFields = ['diploma_number', 'registry_number', 'issue_date', 'major', 'student_code', 'full_name', 'graduation_year'];
        const missingFields = requiredFields.filter(field => !diplomaData[field]);

        if (missingFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            diploma_number: diplomaData.diploma_number || 'N/A',
            message: `Thiếu dữ liệu: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Format date
        if (diplomaData.issue_date) {
          try {
            const date = new Date(diplomaData.issue_date);
            if (isNaN(date.getTime())) {
              // Try parsing DD/MM/YYYY format
              const parts = diplomaData.issue_date.toString().split('/');
              if (parts.length === 3) {
                diplomaData.issue_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else {
                throw new Error('Invalid date format');
              }
            } else {
              diplomaData.issue_date = date.toISOString().split('T')[0];
            }
          } catch (dateError) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              diploma_number: diplomaData.diploma_number,
              message: `Ngày cấp không hợp lệ: ${diplomaData.issue_date}. Định dạng đúng: DD/MM/YYYY hoặc YYYY-MM-DD`
            });
            continue;
          }
        }

        // Validate and convert graduation_year
        const year = parseInt(diplomaData.graduation_year);
        if (isNaN(year) || year < 1950 || year > new Date().getFullYear() + 10) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            diploma_number: diplomaData.diploma_number,
            message: `Năm tốt nghiệp không hợp lệ: ${diplomaData.graduation_year}`
          });
          continue;
        }
        diplomaData.graduation_year = year;

        // Check if diploma_number already exists
        const existingCheck = await query(
          'SELECT id FROM diplomas WHERE diploma_number = $1',
          [diplomaData.diploma_number]
        );

        if (existingCheck.rows.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            diploma_number: diplomaData.diploma_number,
            message: 'Số hiệu văn bằng đã tồn tại trong hệ thống'
          });
          continue;
        }

        // Insert into database
        await query(
          `INSERT INTO diplomas (
            diploma_number, registry_number, issue_date, school_name,
            major, specialization, student_code, full_name, training_system,
            graduation_year, classification
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            diplomaData.diploma_number,
            diplomaData.registry_number,
            diplomaData.issue_date,
            diplomaData.school_name,
            diplomaData.major,
            diplomaData.specialization || null,
            diplomaData.student_code,
            diplomaData.full_name,
            diplomaData.training_system,
            diplomaData.graduation_year,
            diplomaData.classification || null
          ]
        );

        results.success++;

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          diploma_number: row['Số hiệu văn bằng'] || row['diploma_number'] || 'N/A',
          message: error.message || 'Lỗi không xác định'
        });
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
        fileName: file.name,
        fileSize: file.size,
        results 
      },
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
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.name === 'TokenExpiredError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Đã có lỗi xảy ra khi import file. Vui lòng thử lại.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /api/admin/import - Download template Excel
 */
export async function GET(request) {
  try {
    verifyAdmin(request);

    // Create template workbook
    const templateData = [
      {
        'Số hiệu văn bằng': '123456',
        'Số vào sổ': 'SV2024-0001',
        'Ngày cấp': '2024-06-15',
        'Tên trường': 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        'Ngành': 'Công nghệ Thông tin',
        'Chuyên ngành': 'Phát triển phần mềm',
        'Mã sinh viên': '2020600001',
        'Họ và tên': 'Nguyễn Văn A',
        'Hệ đào tạo': 'Đại học chính quy',
        'Năm tốt nghiệp': 2024,
        'Xếp loại': 'Khá'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Set column widths
    const columnWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 50 },
      { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = columnWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_vanbang.xlsx"'
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