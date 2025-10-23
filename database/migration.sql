-- ============================================
-- MIGRATION: Fix Search Logs
-- Thêm cột diploma_number để hiển thị trong admin
-- ============================================

-- 1. Thêm cột diploma_number
ALTER TABLE search_logs 
ADD COLUMN IF NOT EXISTS diploma_number VARCHAR(50);

-- 2. Tạo index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_diploma_number 
ON search_logs(diploma_number);

-- 3. Update search_logs với data hiện có (nếu có)
-- Lưu ý: Không thể reverse hash về plaintext, chỉ update logs mới

-- 4. Kiểm tra kết quả
SELECT 
    COUNT(*) as total_logs,
    COUNT(diploma_number) as logs_with_number,
    COUNT(search_value_hash) as logs_with_hash
FROM search_logs;

-- 5. Test query
SELECT 
    id, 
    diploma_number, 
    ip_address, 
    found, 
    search_time
FROM search_logs
ORDER BY search_time DESC
LIMIT 10;

-- ============================================
-- KẾT QUẢ MONG ĐỢI:
-- - Cột diploma_number đã được thêm
-- - Index đã được tạo
-- - Logs mới sẽ có cả diploma_number và hash
-- ============================================

SELECT '✅ Migration completed successfully!' AS status;