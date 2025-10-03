// scripts/test-connection.js
// Script để test kết nối database

import dotenv from 'dotenv';
import { testConnection, query, closePool } from '../src/lib/db.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log('🔍 Testing Database Connection...\n');
  console.log('Configuration:');
  console.log('- Database URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
  console.log('- Node ENV:', process.env.NODE_ENV || 'not set');
  console.log('');

  try {
    // Test 1: Basic Connection
    console.log('Test 1: Basic Connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Connection successful\n');

    // Test 2: Check Tables
    console.log('Test 2: Checking tables...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Found tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Test 3: Count Records
    console.log('Test 3: Counting records...');
    
    const diplomasCount = await query('SELECT COUNT(*) FROM diplomas');
    console.log(`  - Diplomas: ${diplomasCount.rows[0].count} records`);
    
    const searchLogsCount = await query('SELECT COUNT(*) FROM search_logs');
    console.log(`  - Search Logs: ${searchLogsCount.rows[0].count} records`);
    
    const adminUsersCount = await query('SELECT COUNT(*) FROM admin_users');
    console.log(`  - Admin Users: ${adminUsersCount.rows[0].count} records`);
    console.log('');

    // Test 4: Sample Data
    console.log('Test 4: Fetching sample diploma...');
    const sampleDiploma = await query(`
      SELECT diploma_number, full_name, major, graduation_year
      FROM diplomas
      LIMIT 1
    `);
    
    if (sampleDiploma.rows.length > 0) {
      const sample = sampleDiploma.rows[0];
      console.log('  Sample record:');
      console.log(`    - Diploma: ${sample.diploma_number}`);
      console.log(`    - Name: ${sample.full_name}`);
      console.log(`    - Major: ${sample.major}`);
      console.log(`    - Year: ${sample.graduation_year}`);
    } else {
      console.log('  ⚠️  No diploma records found');
    }
    console.log('');

    // Test 5: Search Function
    console.log('Test 5: Testing search function...');
    if (sampleDiploma.rows.length > 0) {
      const testDiplomaNumber = sampleDiploma.rows[0].diploma_number;
      const searchResult = await query(`
        SELECT * FROM search_diploma($1)
      `, [testDiplomaNumber]);
      
      if (searchResult.rows.length > 0) {
        console.log(`  ✅ Search function works! Found: ${searchResult.rows[0].full_name}`);
      } else {
        console.log('  ⚠️  Search function returned no results');
      }
    }
    console.log('');

    // Test 6: Rate Limit Function
    console.log('Test 6: Testing rate limit function...');
    const rateLimitResult = await query(`
      SELECT check_rate_limit($1, $2, $3) as allowed
    `, ['127.0.0.1', 60, 100]);
    console.log(`  Rate limit check: ${rateLimitResult.rows[0].allowed ? '✅ Allowed' : '❌ Blocked'}`);
    console.log('');

    // Test 7: Views
    console.log('Test 7: Testing views...');
    const viewsResult = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log('Found views:');
    viewsResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    console.log('✅ All tests passed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Tables: ${tablesResult.rows.length}`);
    console.log(`  - Diplomas: ${diplomasCount.rows[0].count}`);
    console.log(`  - Search Logs: ${searchLogsCount.rows[0].count}`);
    console.log(`  - Admin Users: ${adminUsersCount.rows[0].count}`);
    console.log(`  - Views: ${viewsResult.rows.length}`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify DATABASE_URL in .env.local');
    console.error('3. Ensure database exists and schema is created');
    console.error('4. Check network connectivity to database server');
    console.error('5. Verify user permissions');
    
    process.exit(1);
  } finally {
    await closePool();
    console.log('\n🔌 Database connection closed');
  }
}

// Run tests
runTests();