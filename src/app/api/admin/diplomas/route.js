// src/app/api/admin/diplomas/route.js
import { query, logAdminAction } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify admin token
function verifyAdmin(request) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * GET /api/admin/diplomas - Lấy danh sách văn bằng
 */
export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await query(
      `SELECT id, diploma_number, registry_number, issue_date, school_name,
              major, specialization, student_code, full_name, training_system,
              graduation_year, classification, is_active, created_at, updated_at
       FROM diplomas
       WHERE is_active = TRUE
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as total FROM diplomas WHERE is_active = TRUE');
    
    return new Response(
      JSON.stringify({
        success: true,
        diplomas: result.rows,
        total: parseInt(countResult.rows[0].total)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
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
    
    // Validate required fields
    const required = ['diploma_number', 'registry_number', 'issue_date', 'major', 
                     'student_code', 'full_name', 'graduation_year'];
    
    for (const field of required) {
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

    // Check duplicate diploma_number
    const checkResult = await query(
      'SELECT id FROM diplomas WHERE diploma_number = $1',
      [data.diploma_number]
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

    // Insert new diploma
    const result = await query(
      `INSERT INTO diplomas (
        diploma_number, registry_number, issue_date, school_name,
        major, specialization, student_code, full_name, training_system,
        graduation_year, classification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        data.diploma_number,
        data.registry_number,
        data.issue_date,
        data.school_name || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.major,
        data.specialization || null,
        data.student_code,
        data.full_name,
        data.training_system || 'Đại học chính quy',
        data.graduation_year,
        data.classification || null
      ]
    );

    // Log action
    await logAdminAction(
      admin.id,
      'CREATE',
      'diplomas',
      result.rows[0].id,
      null,
      data,
      `Thêm văn bằng mới: ${data.diploma_number}`,
      ipAddress
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thêm văn bằng thành công',
        id: result.rows[0].id
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

    // Get old data for logging
    const oldDataResult = await query(
      'SELECT * FROM diplomas WHERE id = $1',
      [id]
    );

    if (oldDataResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy văn bằng' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update diploma
    await query(
      `UPDATE diplomas SET
        diploma_number = $1,
        registry_number = $2,
        issue_date = $3,
        school_name = $4,
        major = $5,
        specialization = $6,
        student_code = $7,
        full_name = $8,
        training_system = $9,
        graduation_year = $10,
        classification = $11,
        updated_at = NOW()
      WHERE id = $12`,
      [
        data.diploma_number,
        data.registry_number,
        data.issue_date,
        data.school_name || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        data.major,
        data.specialization || null,
        data.student_code,
        data.full_name,
        data.training_system || 'Đại học chính quy',
        data.graduation_year,
        data.classification || null,
        id
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
      `Cập nhật văn bằng: ${data.diploma_number}`,
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

    // Get data before delete for logging
    const dataResult = await query(
      'SELECT * FROM diplomas WHERE id = $1',
      [id]
    );

    if (dataResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy văn bằng' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete
    await query(
      'UPDATE diplomas SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    // Log action
    await logAdminAction(
      admin.id,
      'DELETE',
      'diplomas',
      id,
      dataResult.rows[0],
      null,
      `Xóa văn bằng: ${dataResult.rows[0].diploma_number}`,
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