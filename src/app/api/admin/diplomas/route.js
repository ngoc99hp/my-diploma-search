// src/app/api/admin/diplomas/route.js - Complete CRUD for Diplomas
import { query, transaction, logAdminAction } from '@/lib/db';
import { searchCache } from '@/lib/cache';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

/**
 * Verify admin token and return admin info
 */
function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Validate diploma data
 */
function validateDiplomaData(data) {
  const errors = [];
  
  // Required fields validation
  const requiredFields = [
    'so_hieu_vbcc', 'so_ddcn', 'ma_nguoi_hoc', 'ho_va_ten',
    'ngay_sinh', 'noi_sinh', 'gioi_tinh', 'dan_toc',
    'nganh_dao_tao', 'ma_nganh_dao_tao', 'chuyen_nganh_dao_tao',
    'nam_tot_nghiep', 'so_quyet_dinh_cong_nhan_tot_nghiep',
    'ngay_quyet_dinh_cong_nhan_tot_nghiep', 'so_vao_so',
    'don_vi_cap_bang', 'ma_don_vi_cap_bang', 'ngay_cap_vbcc',
    'ho_ten_nguoi_ky_vbcc', 'so_ddcn_nguoi_ky_vbcc', 
    'chuc_danh_nguoi_ky_vbcc', 'hinh_thuc_dao_tao',
    'thoi_gian_dao_tao', 'ngon_ngu_dao_tao',
    'trinh_do_theo_khung_quoc_gia', 'bac_trinh_do_theo_khung_quoc_gia'
  ];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`Trường ${field} là bắt buộc`);
    }
  });
  
  // Date format validation (dd/MM/yyyy)
  const dateFields = ['ngay_sinh', 'ngay_quyet_dinh_cong_nhan_tot_nghiep', 'ngay_cap_vbcc'];
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  
  dateFields.forEach(field => {
    if (data[field] && !dateRegex.test(data[field])) {
      errors.push(`${field} phải có định dạng dd/MM/yyyy`);
    }
  });
  
  // Gender validation
  if (data.gioi_tinh && !['Nam', 'Nữ'].includes(data.gioi_tinh)) {
    errors.push('Giới tính phải là "Nam" hoặc "Nữ"');
  }
  
  // Year validation
  const currentYear = new Date().getFullYear();
  if (data.nam_tot_nghiep) {
    const year = parseInt(data.nam_tot_nghiep);
    if (year < 1950 || year > currentYear + 1) {
      errors.push(`Năm tốt nghiệp không hợp lệ (${1950}-${currentYear + 1})`);
    }
  }
  
  return errors;
}

/**
 * Convert dd/MM/yyyy to PostgreSQL DATE format (yyyy-MM-dd)
 */
function parseVNDateToISO(vnDate) {
  if (!vnDate) return null;
  const parts = vnDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * GET /api/admin/diplomas
 * Lấy danh sách văn bằng với pagination và tìm kiếm
 */
export async function GET(request) {
  try {
    // Verify admin
    verifyAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    // Build search query
    let whereClause = 'WHERE is_active = TRUE';
    let queryParams = [];
    
    if (search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereClause += ` AND (
        so_hieu_vbcc ILIKE $1 OR
        ma_dinh_danh_vbcc ILIKE $1 OR
        UPPER(ho_va_ten) LIKE UPPER($1) OR
        ma_nguoi_hoc ILIKE $1 OR
        nganh_dao_tao ILIKE $1 OR
        chuyen_nganh_dao_tao ILIKE $1
      )`;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM diplomas ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get diplomas
    const diplomasQuery = `
      SELECT 
        id, ma_dinh_danh_vbcc, so_hieu_vbcc, ho_va_ten,
        ma_nguoi_hoc, nganh_dao_tao, chuyen_nganh_dao_tao,
        nam_tot_nghiep, xep_loai, ngay_cap_vbcc,
        created_at, updated_at
      FROM diplomas
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const diplomasResult = await query(
      diplomasQuery, 
      [...queryParams, limit, offset]
    );
    
    return new Response(JSON.stringify({
      success: true,
      diplomas: diplomasResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get diplomas error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Lỗi khi tải danh sách văn bằng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/admin/diplomas
 * Thêm văn bằng mới
 */
export async function POST(request) {
  try {
    // Verify admin
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Parse request body
    const data = await request.json();
    
    // Validate data
    const errors = validateDiplomaData(data);
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Dữ liệu không hợp lệ',
          errors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate ma_dinh_danh_vbcc (UUID)
    const maDinhDanh = uuidv4();
    
    // Convert dates from dd/MM/yyyy to yyyy-MM-dd
    const ngaySinh = parseVNDateToISO(data.ngay_sinh);
    const ngayQD = parseVNDateToISO(data.ngay_quyet_dinh_cong_nhan_tot_nghiep);
    const ngayCap = parseVNDateToISO(data.ngay_cap_vbcc);
    const ngayNhapHoc = data.ngay_nhap_hoc ? parseVNDateToISO(data.ngay_nhap_hoc) : null;
    
    // Use transaction for data integrity
    const result = await transaction(async (client) => {
      // Check for duplicate so_hieu_vbcc
      const checkResult = await client.query(
        'SELECT id FROM diplomas WHERE so_hieu_vbcc = $1 AND is_active = TRUE',
        [data.so_hieu_vbcc]
      );
      
      if (checkResult.rows.length > 0) {
        throw new Error(`Số hiệu văn bằng "${data.so_hieu_vbcc}" đã tồn tại trong hệ thống`);
      }
      
      // Insert diploma
      const insertQuery = `
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, CURRENT_DATE, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
        )
        RETURNING id, ma_dinh_danh_vbcc, so_hieu_vbcc
      `;
      
      const insertResult = await client.query(insertQuery, [
        maDinhDanh,
        data.phien_ban || '1.0',
        data.thong_tu || '27/2019',
        data.ten_vbcc || 'Bằng Cử nhân',
        data.nganh_dao_tao,
        data.ma_nganh_dao_tao,
        data.so_hieu_vbcc,
        data.so_ddcn,
        data.ma_nguoi_hoc,
        data.ho_va_ten,
        ngaySinh,
        data.noi_sinh,
        data.gioi_tinh,
        data.dan_toc,
        data.quoc_tich || 'Việt Nam',
        data.ten_truong || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.ma_co_so_dao_tao || 'HPU01',
        data.nam_tot_nghiep,
        data.so_quyet_dinh_cong_nhan_tot_nghiep,
        ngayQD,
        data.so_quyet_dinh_hoi_dong_danh_gia || null,
        data.so_vao_so,
        data.xep_loai || null,
        data.don_vi_cap_bang,
        data.ma_don_vi_cap_bang || 'HPU01',
        data.ho_ten_nguoi_ky_vbcc,
        data.so_ddcn_nguoi_ky_vbcc,
        data.chuc_danh_nguoi_ky_vbcc,
        data.ho_ten_nguoi_ky_vbcc_ban_giay || null,
        data.chuc_danh_nguoi_ky_vbcc_ban_giay || null,
        data.dia_danh_cap_vbcc || 'Hải Phòng',
        ngayCap,
        data.chuyen_nganh_dao_tao,
        ngayNhapHoc,
        data.ngon_ngu_dao_tao || 'Tiếng Việt',
        data.thoi_gian_dao_tao,
        data.tong_so_tin_chi || null,
        data.trinh_do_theo_khung_quoc_gia,
        data.bac_trinh_do_theo_khung_quoc_gia,
        data.hinh_thuc_dao_tao,
        data.ghi_chu || null,
        admin.username
      ]);
      
      return insertResult.rows[0];
    });
    
    // Log admin action
    await logAdminAction(
      admin.id,
      'CREATE',
      'diplomas',
      result.id,
      null,
      { so_hieu_vbcc: result.so_hieu_vbcc, ma_dinh_danh_vbcc: result.ma_dinh_danh_vbcc },
      `Thêm văn bằng mới: ${result.so_hieu_vbcc}`,
      ipAddress
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: `Thêm văn bằng thành công: ${result.so_hieu_vbcc}`,
      data: result
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Create diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message?.includes('đã tồn tại')) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Lỗi khi thêm văn bằng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * PUT /api/admin/diplomas?id=123
 * Cập nhật văn bằng
 */
export async function PUT(request) {
  try {
    // Verify admin
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Get diploma ID
    const { searchParams } = new URL(request.url);
    const diplomaId = parseInt(searchParams.get('id'));
    
    if (!diplomaId || isNaN(diplomaId)) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID văn bằng không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const data = await request.json();
    
    // Validate data
    const errors = validateDiplomaData(data);
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Dữ liệu không hợp lệ',
          errors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert dates
    const ngaySinh = parseVNDateToISO(data.ngay_sinh);
    const ngayQD = parseVNDateToISO(data.ngay_quyet_dinh_cong_nhan_tot_nghiep);
    const ngayCap = parseVNDateToISO(data.ngay_cap_vbcc);
    const ngayNhapHoc = data.ngay_nhap_hoc ? parseVNDateToISO(data.ngay_nhap_hoc) : null;
    
    // Use transaction
    const result = await transaction(async (client) => {
      // Get old data for logging
      const oldDataResult = await client.query(
        'SELECT * FROM diplomas WHERE id = $1 AND is_active = TRUE',
        [diplomaId]
      );
      
      if (oldDataResult.rows.length === 0) {
        throw new Error('Không tìm thấy văn bằng');
      }
      
      const oldData = oldDataResult.rows[0];
      
      // Check for duplicate so_hieu_vbcc (exclude current record)
      const checkResult = await client.query(
        'SELECT id FROM diplomas WHERE so_hieu_vbcc = $1 AND id != $2 AND is_active = TRUE',
        [data.so_hieu_vbcc, diplomaId]
      );
      
      if (checkResult.rows.length > 0) {
        throw new Error(`Số hiệu văn bằng "${data.so_hieu_vbcc}" đã được sử dụng bởi văn bằng khác`);
      }
      
      // Update diploma
      const updateQuery = `
        UPDATE diplomas SET
          phien_ban = $1, thong_tu = $2, ten_vbcc = $3,
          nganh_dao_tao = $4, ma_nganh_dao_tao = $5, so_hieu_vbcc = $6,
          so_ddcn = $7, ma_nguoi_hoc = $8, ho_va_ten = $9,
          ngay_sinh = $10, noi_sinh = $11, gioi_tinh = $12,
          dan_toc = $13, quoc_tich = $14, ten_truong = $15,
          ma_co_so_dao_tao = $16, nam_tot_nghiep = $17,
          so_quyet_dinh_cong_nhan_tot_nghiep = $18, ngay_quyet_dinh_cong_nhan_tot_nghiep = $19,
          so_quyet_dinh_hoi_dong_danh_gia = $20, so_vao_so = $21, xep_loai = $22,
          don_vi_cap_bang = $23, ma_don_vi_cap_bang = $24,
          ho_ten_nguoi_ky_vbcc = $25, so_ddcn_nguoi_ky_vbcc = $26, chuc_danh_nguoi_ky_vbcc = $27,
          ho_ten_nguoi_ky_vbcc_ban_giay = $28, chuc_danh_nguoi_ky_vbcc_ban_giay = $29,
          dia_danh_cap_vbcc = $30, ngay_cap_vbcc = $31,
          chuyen_nganh_dao_tao = $32, ngay_nhap_hoc = $33, ngon_ngu_dao_tao = $34,
          thoi_gian_dao_tao = $35, tong_so_tin_chi = $36,
          trinh_do_theo_khung_quoc_gia = $37, bac_trinh_do_theo_khung_quoc_gia = $38,
          hinh_thuc_dao_tao = $39, ghi_chu = $40, updated_by = $41
        WHERE id = $42 AND is_active = TRUE
        RETURNING id, ma_dinh_danh_vbcc, so_hieu_vbcc
      `;
      
      const updateResult = await client.query(updateQuery, [
        data.phien_ban || '1.0',
        data.thong_tu || '27/2019',
        data.ten_vbcc || 'Bằng Cử nhân',
        data.nganh_dao_tao,
        data.ma_nganh_dao_tao,
        data.so_hieu_vbcc,
        data.so_ddcn,
        data.ma_nguoi_hoc,
        data.ho_va_ten,
        ngaySinh,
        data.noi_sinh,
        data.gioi_tinh,
        data.dan_toc,
        data.quoc_tich || 'Việt Nam',
        data.ten_truong || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.ma_co_so_dao_tao || 'HPU01',
        data.nam_tot_nghiep,
        data.so_quyet_dinh_cong_nhan_tot_nghiep,
        ngayQD,
        data.so_quyet_dinh_hoi_dong_danh_gia || null,
        data.so_vao_so,
        data.xep_loai || null,
        data.don_vi_cap_bang,
        data.ma_don_vi_cap_bang || 'HPU01',
        data.ho_ten_nguoi_ky_vbcc,
        data.so_ddcn_nguoi_ky_vbcc,
        data.chuc_danh_nguoi_ky_vbcc,
        data.ho_ten_nguoi_ky_vbcc_ban_giay || null,
        data.chuc_danh_nguoi_ky_vbcc_ban_giay || null,
        data.dia_danh_cap_vbcc || 'Hải Phòng',
        ngayCap,
        data.chuyen_nganh_dao_tao,
        ngayNhapHoc,
        data.ngon_ngu_dao_tao || 'Tiếng Việt',
        data.thoi_gian_dao_tao,
        data.tong_so_tin_chi || null,
        data.trinh_do_theo_khung_quoc_gia,
        data.bac_trinh_do_theo_khung_quoc_gia,
        data.hinh_thuc_dao_tao,
        data.ghi_chu || null,
        admin.username,
        diplomaId
      ]);
      
      return { updated: updateResult.rows[0], oldData };
    });
    
    // Invalidate cache for this diploma
    try {
      searchCache.invalidateByPattern(new RegExp(`diploma:.*${result.updated.so_hieu_vbcc}.*`));
      console.log(`🗑️ Cache invalidated for: ${result.updated.so_hieu_vbcc}`);
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
    }
    
    // Log admin action
    await logAdminAction(
      admin.id,
      'UPDATE',
      'diplomas',
      diplomaId,
      { 
        so_hieu_vbcc: result.oldData.so_hieu_vbcc,
        ho_va_ten: result.oldData.ho_va_ten 
      },
      { 
        so_hieu_vbcc: result.updated.so_hieu_vbcc,
        ho_va_ten: data.ho_va_ten 
      },
      `Cập nhật văn bằng: ${result.updated.so_hieu_vbcc}`,
      ipAddress
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: `Cập nhật văn bằng thành công: ${result.updated.so_hieu_vbcc}`,
      data: result.updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message === 'Không tìm thấy văn bằng') {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message?.includes('đã được sử dụng')) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Lỗi khi cập nhật văn bằng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * DELETE /api/admin/diplomas?id=123
 * Xóa văn bằng (soft delete)
 */
export async function DELETE(request) {
  try {
    // Verify admin
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Get diploma ID
    const { searchParams } = new URL(request.url);
    const diplomaId = parseInt(searchParams.get('id'));
    
    if (!diplomaId || isNaN(diplomaId)) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID văn bằng không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use transaction
    const result = await transaction(async (client) => {
      // Get diploma info before delete
      const diplomaResult = await client.query(
        'SELECT id, so_hieu_vbcc, ho_va_ten, ma_dinh_danh_vbcc FROM diplomas WHERE id = $1 AND is_active = TRUE',
        [diplomaId]
      );
      
      if (diplomaResult.rows.length === 0) {
        throw new Error('Không tìm thấy văn bằng');
      }
      
      const diploma = diplomaResult.rows[0];
      
      // Soft delete
      await client.query(
        'UPDATE diplomas SET is_active = FALSE, updated_by = $1 WHERE id = $2',
        [admin.username, diplomaId]
      );
      
      return diploma;
    });
    
    // Invalidate cache
    try {
      searchCache.invalidateByPattern(new RegExp(`diploma:.*${result.so_hieu_vbcc}.*`));
      console.log(`🗑️ Cache invalidated for deleted diploma: ${result.so_hieu_vbcc}`);
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
    }
    
    // Log admin action
    await logAdminAction(
      admin.id,
      'DELETE',
      'diplomas',
      diplomaId,
      { 
        so_hieu_vbcc: result.so_hieu_vbcc,
        ho_va_ten: result.ho_va_ten 
      },
      null,
      `Xóa văn bằng: ${result.so_hieu_vbcc} - ${result.ho_va_ten}`,
      ipAddress
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: `Đã xóa văn bằng: ${result.so_hieu_vbcc}`,
      data: { id: diplomaId }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message === 'Không tìm thấy văn bằng') {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Lỗi khi xóa văn bằng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}