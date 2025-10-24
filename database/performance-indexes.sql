-- ============================================
-- PERFORMANCE INDEXES
-- Thêm các indexes để tăng tốc độ tra cứu
-- ============================================

-- Index cho tra cứu theo số hiệu (đã có, verify)
CREATE INDEX IF NOT EXISTS idx_so_hieu_vbcc 
ON diplomas(so_hieu_vbcc) 
WHERE is_active = TRUE;

-- Index cho tra cứu combo: Mã SV
CREATE INDEX IF NOT EXISTS idx_ma_nguoi_hoc 
ON diplomas(ma_nguoi_hoc) 
WHERE is_active = TRUE;

-- ✅ QUAN TRỌNG: Index cho UPPER() function
-- Giúp tăng tốc query: UPPER(ho_va_ten) = UPPER($1)
CREATE INDEX IF NOT EXISTS idx_ho_va_ten_upper 
ON diplomas(UPPER(ho_va_ten)) 
WHERE is_active = TRUE;

-- Index cho ngày sinh (search combo)
CREATE INDEX IF NOT EXISTS idx_ngay_sinh 
ON diplomas(ngay_sinh) 
WHERE is_active = TRUE;

-- ✅ Composite Index cho tra cứu combo
-- Tăng tốc query: ma_nguoi_hoc + ho_va_ten + is_active
CREATE INDEX IF NOT EXISTS idx_combo_search 
ON diplomas(ma_nguoi_hoc, UPPER(ho_va_ten)) 
WHERE is_active = TRUE;

-- ✅ Composite Index cho tra cứu combo với ngày sinh
CREATE INDEX IF NOT EXISTS idx_combo_search_birthday 
ON diplomas(ma_nguoi_hoc, ngay_sinh) 
WHERE is_active = TRUE;

-- Index cho mã định danh
CREATE INDEX IF NOT EXISTS idx_ma_dinh_danh_vbcc 
ON diplomas(ma_dinh_danh_vbcc) 
WHERE is_active = TRUE;

-- ✅ Partial Index cho năm tốt nghiệp gần đây (thường được tra cứu nhiều)
CREATE INDEX IF NOT EXISTS idx_recent_graduates 
ON diplomas(nam_tot_nghiep, so_hieu_vbcc) 
WHERE is_active = TRUE 
  AND nam_tot_nghiep >= EXTRACT(YEAR FROM CURRENT_DATE) - 5;

-- Index cho admin search
CREATE INDEX IF NOT EXISTS idx_admin_search 
ON diplomas(created_at DESC) 
WHERE is_active = TRUE;

-- Analyze tables để PostgreSQL update statistics
ANALYZE diplomas;
ANALYZE search_logs;

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public' 
  AND tablename IN ('diplomas', 'search_logs')
ORDER BY tablename, indexname;