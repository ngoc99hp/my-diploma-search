// src/app/api/admin/auth/route.js - With Debug Logging
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Validate JWT_SECRET on startup
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

// CRITICAL: Validate JWT secret exists and is strong
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

if (JWT_SECRET === 'your-secret-key-change-in-production' || 
    JWT_SECRET === 'change-this-to-a-very-long-random-secret-key-minimum-32-characters') {
  throw new Error('FATAL: JWT_SECRET is using default value. Please change it in .env.local');
}

if (JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters long');
}

// Log warning in development
if (process.env.NODE_ENV === 'development') {
  console.log('✅ JWT_SECRET validated:', JWT_SECRET.substring(0, 8) + '...');
}

export async function POST(request) {
  console.log('🔐 Login attempt started');
  
  try {
    const { username, password, action } = await request.json();
    console.log('📝 Received data:', { username, action, hasPassword: !!password });

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
      console.log('❌ Missing username or password');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find admin user
    console.log('🔍 Searching for user:', username);
    const result = await query(
      `SELECT id, username, password_hash, full_name, email, role, is_active
       FROM admin_users 
       WHERE username = $1`,
      [username]
    );

    console.log('📊 Query result:', {
      rowCount: result.rows.length,
      found: result.rows.length > 0,
      isActive: result.rows[0]?.is_active
    });

    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = result.rows[0];
    
    // Check if user is active
    if (!admin.is_active) {
      console.log('❌ User is inactive');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tài khoản đã bị vô hiệu hóa' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔐 Verifying password...');
    console.log('   Input password length:', password.length);
    console.log('   Hash from DB:', admin.password_hash.substring(0, 29) + '...');
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    console.log('   Verification result:', isValidPassword ? '✅ VALID' : '❌ INVALID');
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
    }

    // Update last login
    console.log('✅ Password valid, updating last login...');
    await query(
      `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
      [admin.id]
    );

    // Create JWT token
    console.log('🎫 Creating JWT token...');
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('✅ Login successful for user:', admin.username);
    
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
    console.error('❌ Admin auth error:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Đã có lỗi xảy ra, vui lòng thử lại',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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