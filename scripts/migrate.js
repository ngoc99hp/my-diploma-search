// scripts/migrate.js
// Script để tạo database schema

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

async function migrate() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Đọc file SQL schema
    const schemaPath = join(__dirname, '../database/schema.sql');
    console.log('📄 Reading schema from:', schemaPath);
    
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    console.log('📊 Executing migration...\n');
    
    // Thực thi SQL
    await query(schemaSql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Kiểm tra kết quả
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    const viewsResult = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (viewsResult.rows.length > 0) {
      console.log('\n👁️  Created views:');
      viewsResult.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }
    
    console.log('\n🎉 Database is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    
    if (error.position) {
      console.error('Position:', error.position);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();