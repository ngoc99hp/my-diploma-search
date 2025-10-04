// src/app/api/admin/auth/route.js
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';

export async function POST(request) {
  try {
    const { username, password, action } = await request.json();

    // Logout
    if (action === 'logout') {
      return new Response(
        JSON.stringify({ success: true, message: 'Đăng xuất thành công' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
          }
        }
      );
    }

    // Login validation
    if (!username || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find admin user
    const result = await query(
      `SELECT id, username, password_hash, full_name, email, role, is_active
       FROM admin_users 
       WHERE username = $1 AND is_active = TRUE`,
      [username]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update last login
    await query(
      `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
      [admin.id]
    );

    // Create JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Đăng nhập thành công',
        admin: {
          id: admin.id,
          username: admin.username,
          full_name: admin.full_name,
          email: admin.email,
          role: admin.role
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}`
        }
      }
    );

  } catch (error) {
    console.error('Admin auth error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Đã có lỗi xảy ra, vui lòng thử lại' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await query(
      `SELECT id, username, full_name, email, role 
       FROM admin_users 
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập không hợp lệ' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        admin: result.rows[0]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return new Response(
        JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Token verify error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xác thực' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}