// src/app/api/admin/diplomas/route.js - Updated for Schema v2
import { query, logAdminAction } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not configured');
}

function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Sinh mã định danh tự động: HPU-YYYY-TYPE-NNNNNN
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
 * GET /api/admin/diplomas - Lấy danh sách văn bằng
 */
export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    let searchCondition = 'WHERE is_active = TRUE';
    let searchValues = [];
    
    if (search) {
      searchCondition += ` AND (
        so_hieu_vbcc ILIKE $1 OR 
        ho_va_ten ILIKE $1 OR 
        ma_nguoi_hoc ILIKE $1 OR
        nganh_dao_tao ILIKE $1 OR
        ma_dinh_danh_vbcc ILIKE $1
      )`;
      searchValues.push(`%${search}%`);
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM diplomas ${searchCondition}`;
    const countResult = await query(countQuery, searchValues);
    const total = parseInt(countResult.rows[0].total);
    
    const dataQuery = `
      SELECT 
        id, ma_dinh_danh_vbcc, so_hieu_vbcc, 
        ho_va_ten, ma_nguoi_hoc, ngay_sinh,
        nganh_dao_tao, chuyen_nganh_dao_tao,
        xep_loai, nam_tot_nghiep, 
        hinh_thuc_dao_tao, ngay_cap_vbcc,
        created_at, updated_at
      FROM diplomas
      ${searchCondition}
      ORDER BY created_at DESC
      LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}
    `;
    
    const result = await query(dataQuery, [...searchValues, limit, offset]);
    
    return new Response(
      JSON.stringify({
        success: true,
        diplomas: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get diplomas error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/admin/diplomas - Thêm văn bằng mới
 */
export async function POST(request) {
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    const data = await request.json();
    
    // Validate trường bắt buộc (33 trường)
    const requiredFields = [
      'ten_vbcc', 'nganh_dao_tao', 'ma_nganh_dao_tao', 'so_hieu_vbcc',
      'so_ddcn', 'ma_nguoi_hoc', 'ho_va_ten', 'ngay_sinh', 'noi_sinh', 
      'gioi_tinh', 'dan_toc', 'nam_tot_nghiep',
      'so_quyet_dinh_cong_nhan_tot_nghiep', 'ngay_quyet_dinh_cong_nhan_tot_nghiep',
      'so_vao_so', 'don_vi_cap_bang', 'ma_don_vi_cap_bang',
      'ho_ten_nguoi_ky_vbcc', 'so_ddcn_nguoi_ky_vbcc', 'chuc_danh_nguoi_ky_vbcc',
      'ngay_cap_vbcc', 'chuyen_nganh_dao_tao', 'ngon_ngu_dao_tao', 'thoi_gian_dao_tao',
      'trinh_do_theo_khung_quoc_gia', 'bac_trinh_do_theo_khung_quoc_gia', 'hinh_thuc_dao_tao'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Thiếu trường bắt buộc: ${field}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Kiểm tra trùng số hiệu
    const checkResult = await query(
      'SELECT id FROM diplomas WHERE so_hieu_vbcc = $1',
      [data.so_hieu_vbcc]
    );

    if (checkResult.rows.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Số hiệu văn bằng đã tồn tại' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sinh mã định danh tự động
    const maDinhDanh = await generateMaDinhDanh(data.nam_tot_nghiep, data.ten_vbcc);

    // Lấy ngày hiện tại cho ngay_tao_vbcc
    const today = new Date();
    const ngayTaoVBCC = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    // Insert văn bằng mới với tất cả 44 trường
    const result = await query(
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
        chuyen_nganh_dao_tao, ngay_nhap_hoc, ngon_ngu_dao_tao, thoi_gian_dao_tao,
        tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia,
        hinh_thuc_dao_tao, ghi_chu, attachment_name, attachment_content_base64,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45
      ) RETURNING id`,
      [
        data.phien_ban || '1.0',
        data.thong_tu || '27/2019',
        maDinhDanh,
        data.ten_vbcc,
        data.nganh_dao_tao,
        data.ma_nganh_dao_tao,
        data.so_hieu_vbcc,
        data.so_ddcn,
        data.ma_nguoi_hoc,
        data.ho_va_ten,
        data.ngay_sinh,
        data.noi_sinh,
        data.gioi_tinh,
        data.dan_toc,
        data.quoc_tich || 'Việt Nam',
        data.ten_truong || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.ma_co_so_dao_tao || 'HPU01',
        data.nam_tot_nghiep,
        data.so_quyet_dinh_cong_nhan_tot_nghiep,
        data.ngay_quyet_dinh_cong_nhan_tot_nghiep,
        data.so_quyet_dinh_hoi_dong_danh_gia || null,
        data.so_vao_so,
        data.xep_loai || null,
        data.don_vi_cap_bang,
        data.ma_don_vi_cap_bang,
        data.ho_ten_nguoi_ky_vbcc,
        data.so_ddcn_nguoi_ky_vbcc,
        data.chuc_danh_nguoi_ky_vbcc,
        data.ho_ten_nguoi_ky_vbcc_ban_giay || null,
        data.chuc_danh_nguoi_ky_vbcc_ban_giay || null,
        data.dia_danh_cap_vbcc || 'Hải Phòng',
        ngayTaoVBCC,
        data.ngay_cap_vbcc,
        data.chuyen_nganh_dao_tao,
        data.ngay_nhap_hoc || null,
        data.ngon_ngu_dao_tao,
        data.thoi_gian_dao_tao,
        data.tong_so_tin_chi || null,
        data.trinh_do_theo_khung_quoc_gia,
        data.bac_trinh_do_theo_khung_quoc_gia,
        data.hinh_thuc_dao_tao,
        data.ghi_chu || null,
        data.attachment_name || null,
        data.attachment_content_base64 || null,
        admin.username
      ]
    );

    // Log action
    await logAdminAction(
      admin.id,
      'CREATE',
      'diplomas',
      result.rows[0].id,
      null,
      { ...data, ma_dinh_danh_vbcc: maDinhDanh },
      `Thêm văn bằng mới: ${data.so_hieu_vbcc}`,
      ipAddress
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thêm văn bằng thành công',
        id: result.rows[0].id,
        ma_dinh_danh_vbcc: maDinhDanh
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * PUT /api/admin/diplomas?id=X - Cập nhật văn bằng
 */
export async function PUT(request) {
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu ID văn bằng' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Get old data
    const oldDataResult = await query('SELECT * FROM diplomas WHERE id = $1', [id]);

    if (oldDataResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy văn bằng' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update (44 trường, không update ma_dinh_danh_vbcc)
    await query(
      `UPDATE diplomas SET
        ten_vbcc = $1, nganh_dao_tao = $2, ma_nganh_dao_tao = $3, so_hieu_vbcc = $4,
        so_ddcn = $5, ma_nguoi_hoc = $6, ho_va_ten = $7, ngay_sinh = $8, noi_sinh = $9,
        gioi_tinh = $10, dan_toc = $11, quoc_tich = $12, ten_truong = $13, ma_co_so_dao_tao = $14,
        nam_tot_nghiep = $15, so_quyet_dinh_cong_nhan_tot_nghiep = $16, ngay_quyet_dinh_cong_nhan_tot_nghiep = $17,
        so_quyet_dinh_hoi_dong_danh_gia = $18, so_vao_so = $19, xep_loai = $20,
        don_vi_cap_bang = $21, ma_don_vi_cap_bang = $22, ho_ten_nguoi_ky_vbcc = $23,
        so_ddcn_nguoi_ky_vbcc = $24, chuc_danh_nguoi_ky_vbcc = $25,
        ho_ten_nguoi_ky_vbcc_ban_giay = $26, chuc_danh_nguoi_ky_vbcc_ban_giay = $27,
        dia_danh_cap_vbcc = $28, ngay_cap_vbcc = $29, chuyen_nganh_dao_tao = $30,
        ngay_nhap_hoc = $31, ngon_ngu_dao_tao = $32, thoi_gian_dao_tao = $33,
        tong_so_tin_chi = $34, trinh_do_theo_khung_quoc_gia = $35, bac_trinh_do_theo_khung_quoc_gia = $36,
        hinh_thuc_dao_tao = $37, ghi_chu = $38, attachment_name = $39, attachment_content_base64 = $40,
        updated_by = $41, updated_at = NOW()
      WHERE id = $42`,
      [
        data.ten_vbcc, data.nganh_dao_tao, data.ma_nganh_dao_tao, data.so_hieu_vbcc,
        data.so_ddcn, data.ma_nguoi_hoc, data.ho_va_ten, data.ngay_sinh, data.noi_sinh,
        data.gioi_tinh, data.dan_toc, data.quoc_tich || 'Việt Nam', 
        data.ten_truong || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.ma_co_so_dao_tao || 'HPU01',
        data.nam_tot_nghiep, data.so_quyet_dinh_cong_nhan_tot_nghiep, data.ngay_quyet_dinh_cong_nhan_tot_nghiep,
        data.so_quyet_dinh_hoi_dong_danh_gia || null, data.so_vao_so, data.xep_loai || null,
        data.don_vi_cap_bang, data.ma_don_vi_cap_bang, data.ho_ten_nguoi_ky_vbcc,
        data.so_ddcn_nguoi_ky_vbcc, data.chuc_danh_nguoi_ky_vbcc,
        data.ho_ten_nguoi_ky_vbcc_ban_giay || null, data.chuc_danh_nguoi_ky_vbcc_ban_giay || null,
        data.dia_danh_cap_vbcc || 'Hải Phòng', data.ngay_cap_vbcc, data.chuyen_nganh_dao_tao,
        data.ngay_nhap_hoc || null, data.ngon_ngu_dao_tao, data.thoi_gian_dao_tao,
        data.tong_so_tin_chi || null, data.trinh_do_theo_khung_quoc_gia, data.bac_trinh_do_theo_khung_quoc_gia,
        data.hinh_thuc_dao_tao, data.ghi_chu || null, data.attachment_name || null, data.attachment_content_base64 || null,
        admin.username, id
      ]
    );

    // Log action
    await logAdminAction(
      admin.id,
      'UPDATE',
      'diplomas',
      id,
      oldDataResult.rows[0],
      data,
      `Cập nhật văn bằng: ${data.so_hieu_vbcc}`,
      ipAddress
    );

    return new Response(
      JSON.stringify({ success: true, message: 'Cập nhật thành công' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * DELETE /api/admin/diplomas?id=X - Xóa văn bằng (soft delete)
 */
export async function DELETE(request) {
  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu ID văn bằng' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dataResult = await query('SELECT * FROM diplomas WHERE id = $1', [id]);

    if (dataResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy văn bằng' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await query('UPDATE diplomas SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);

    await logAdminAction(
      admin.id,
      'DELETE',
      'diplomas',
      id,
      dataResult.rows[0],
      null,
      `Xóa văn bằng: ${dataResult.rows[0].so_hieu_vbcc}`,
      ipAddress
    );

    return new Response(
      JSON.stringify({ success: true, message: 'Xóa văn bằng thành công' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete diploma error:', error);
    
    if (error.message === 'Unauthorized' || error.name === 'JsonWebTokenError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}