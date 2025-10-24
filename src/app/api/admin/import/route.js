// src/app/api/admin/import/route.js - FULLY FIXED VERSION
import { query, logAdminAction } from "@/lib/db";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET not configured");
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;
const BATCH_INSERT_SIZE = 100; // Insert 100 rows at a time

// ✅ ENUM VALUES
const ALLOWED_VALUES = {
  xep_loai: ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Trung bình khá"],
  gioi_tinh: ["Nam", "Nữ"],
  hinh_thuc_dao_tao: ["Chính quy", "Từ xa", "Liên thông", "Văn bằng 2"],
};

// ✅ CONFIG
const DEFAULT_CONFIG = {
  ten_truong: "Trường Đại học Quản lý và Công nghệ Hải Phòng",
  ma_co_so_dao_tao: "HPU01",
  dia_danh_cap_vbcc: "Hải Phòng",
  phien_ban: "1.0",
  thong_tu: "27/2019",
};

function verifyAdmin(request) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  return jwt.verify(token, JWT_SECRET);
}

/**
 * ✅ HASH FILE for deduplication
 */
function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

/**
 * ✅ HASH STRING to NUMBER for advisory lock
 */
function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * ✅ PARSE VIETNAMESE DATE - Fixed with strict type checking
 */
function parseVietnameseDate(dateStr, fieldName = "Ngày") {
  if (!dateStr) return null;

  const str = dateStr.toString().trim();

  // Format 1: dd/MM/yyyy
  const match1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    const [_, day, month, year] = match1;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const date = new Date(y, m - 1, d);

    if (
      date.getDate() === d &&
      date.getMonth() === m - 1 &&
      date.getFullYear() === y
    ) {
      return date.toISOString().split("T")[0];
    }
  }

  // Format 2: dd-MM-yyyy
  const match2 = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match2) {
    const [_, day, month, year] = match2;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const date = new Date(y, m - 1, d);

    if (
      date.getDate() === d &&
      date.getMonth() === m - 1 &&
      date.getFullYear() === y
    ) {
      return date.toISOString().split("T")[0];
    }
  }

  // Format 3: ISO 8601 (yyyy-MM-dd)
  const match3 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match3) {
    const [_, year, month, day] = match3;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const date = new Date(y, m - 1, d);

    if (
      date.getDate() === d &&
      date.getMonth() === m - 1 &&
      date.getFullYear() === y
    ) {
      return date.toISOString().split("T")[0];
    }
  }

  throw new Error(
    `${fieldName} không hợp lệ: "${dateStr}" (yêu cầu dd/MM/yyyy)`
  );
}

/**
 * ✅ VALIDATE YEAR
 */
function validateYear(yearStr, fieldName = "Năm") {
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(
      `${fieldName} không hợp lệ: "${yearStr}" (phải từ 1900-2100)`
    );
  }
  return year;
}

/**
 * ✅ VALIDATE ENUM
 */
function validateEnum(value, allowedValues, fieldName) {
  if (!value) return null;
  if (!allowedValues.includes(value)) {
    throw new Error(
      `${fieldName} không hợp lệ: "${value}" (chỉ chấp nhận: ${allowedValues.join(
        ", "
      )})`
    );
  }
  return value;
}

/**
 * ✅ VALIDATE DATE LOGIC - NEW
 */
function validateDateLogic(data) {
  const now = new Date();
  const ngaySinh = new Date(data.ngay_sinh);
  const ngayQD = new Date(data.ngay_quyet_dinh_cong_nhan_tot_nghiep);
  const ngayTao = new Date(data.ngay_tao_vbcc);
  const ngayCap = new Date(data.ngay_cap_vbcc);

  // Ngày sinh không thể trong tương lai
  if (ngaySinh > now) {
    throw new Error("Ngày sinh không thể trong tương lai");
  }

  // Tuổi tối thiểu 18 khi tốt nghiệp
  const ageAtGraduation = data.nam_tot_nghiep - ngaySinh.getFullYear();
  if (ageAtGraduation < 18) {
    throw new Error("Sinh viên phải ít nhất 18 tuổi khi tốt nghiệp");
  }

  // Ngày quyết định không thể trong tương lai
  if (ngayQD > now) {
    throw new Error("Ngày quyết định không thể trong tương lai");
  }

  // Ngày tạo VB phải sau ngày QĐ
  if (ngayTao < ngayQD) {
    throw new Error("Ngày tạo văn bằng phải sau ngày quyết định");
  }

  // Ngày cấp phải sau ngày tạo
  if (ngayCap < ngayTao) {
    throw new Error("Ngày cấp văn bằng phải sau ngày tạo văn bằng");
  }

  // Ngày cấp không nên quá xa trong tương lai (1 năm)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (ngayCap > oneYearFromNow) {
    throw new Error("Ngày cấp văn bằng quá xa trong tương lai");
  }
}

/**
 * ✅ GENERATE MA DINH DANH - Fixed with Advisory Lock
 */
async function generateMaDinhDanh(client, namTotNghiep, tenVBCC) {
  let type = "CNH";
  if (tenVBCC.includes("Kỹ sư")) type = "KSU";
  else if (tenVBCC.includes("Thạc sĩ")) type = "THS";
  else if (tenVBCC.includes("Tiến sĩ")) type = "TSI";

  const key = `${namTotNghiep}-${type}`;
  const lockId = hashStringToInt(key);

  // ✅ GET ADVISORY LOCK (auto-released at transaction end)
  await client.query("SELECT pg_advisory_xact_lock($1)", [lockId]);

  // Now safe to query without race condition
  const result = await client.query(
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
    const parts = lastCode.split("-");
    if (parts.length >= 4) {
      const lastSeq = parseInt(parts[3], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
  }

  return `HPU-${namTotNghiep}-${type}-${sequence.toString().padStart(6, "0")}`;
}

/**
 * ✅ VALIDATE & PARSE ROW DATA
 */
function parseRowData(row, rowNumber) {
  const data = {
    ten_vbcc: (row["Tên văn bằng"] || "Bằng Cử nhân").trim(),
    so_hieu_vbcc: (row["Số hiệu VB"] || "").trim(),
    so_vao_so: (row["Số vào sổ"] || "").trim(),
    ma_nguoi_hoc: (row["Mã SV"] || "").trim(),
    so_ddcn: (row["Số CCCD SV"] || "").trim(),
    ho_va_ten: (row["Họ và tên"] || "").trim().toUpperCase(),
    ngay_sinh_raw: row["Ngày sinh"],
    noi_sinh: (row["Nơi sinh"] || "").trim(),
    gioi_tinh: (row["Giới tính"] || "Nam").trim(),
    dan_toc: (row["Dân tộc"] || "Kinh").trim(),
    quoc_tich: (row["Quốc tịch"] || "Việt Nam").trim(),

    nganh_dao_tao: (row["Ngành đào tạo"] || "").trim(),
    ma_nganh_dao_tao: (row["Mã ngành"] || "").trim(),
    chuyen_nganh_dao_tao: (row["Chuyên ngành"] || "").trim(),
    nam_tot_nghiep_raw: row["Năm TN"],
    xep_loai: (row["Xếp loại"] || "").trim(),
    so_quyet_dinh_cong_nhan_tot_nghiep: (
      row["Số QĐ công nhận TN"] || ""
    ).trim(),
    ngay_quyet_dinh_cong_nhan_tot_nghiep_raw: row["Ngày QĐ TN"],
    so_quyet_dinh_hoi_dong_danh_gia:
      (row["Số QĐ hội đồng"] || "").trim() || null,
    ngay_tao_vbcc_raw: row["Ngày tạo VB"],
    ngay_cap_vbcc_raw: row["Ngày cấp"],

    hinh_thuc_dao_tao: (row["Hình thức ĐT"] || "Chính quy").trim(),
    thoi_gian_dao_tao: (row["Thời gian ĐT"] || "4 năm").trim(),
    tong_so_tin_chi: parseInt(row["Tổng TC"], 10) || null,

    trinh_do_theo_khung_quoc_gia: (row["Trình độ KHQG"] || "Trình độ 6").trim(),
    bac_trinh_do_theo_khung_quoc_gia: (row["Bậc ĐT"] || "Đại học").trim(),
    ngon_ngu_dao_tao: (row["Ngôn ngữ ĐT"] || "Tiếng Việt").trim(),

    don_vi_cap_bang: (
      row["Đơn vị cấp bằng"] || DEFAULT_CONFIG.ten_truong
    ).trim(),
    ma_don_vi_cap_bang: (
      row["Mã đơn vị CB"] || DEFAULT_CONFIG.ma_co_so_dao_tao
    ).trim(),
    ho_ten_nguoi_ky_vbcc: (row["Họ tên người ký"] || "").trim(),
    so_ddcn_nguoi_ky_vbcc: (row["CCCD người ký"] || "").trim(),
    chuc_danh_nguoi_ky_vbcc: (
      row["Chức danh người ký"] || "Hiệu trưởng"
    ).trim(),
    ho_ten_nguoi_ky_vbcc_ban_giay:
      (row["Họ tên người ký bản giấy"] || "").trim() || null,
    chuc_danh_nguoi_ky_vbcc_ban_giay:
      (row["Chức danh người ký bản giấy"] || "").trim() || null,
  };

  // ✅ VALIDATE REQUIRED FIELDS
  const required = {
    "Số hiệu VB": data.so_hieu_vbcc,
    "Số vào sổ": data.so_vao_so,
    "Mã SV": data.ma_nguoi_hoc,
    "Số CCCD SV": data.so_ddcn,
    "Họ và tên": data.ho_va_ten,
    "Ngày sinh": data.ngay_sinh_raw,
    "Nơi sinh": data.noi_sinh,
    "Ngành đào tạo": data.nganh_dao_tao,
    "Mã ngành": data.ma_nganh_dao_tao,
    "Chuyên ngành": data.chuyen_nganh_dao_tao,
    "Số QĐ công nhận TN": data.so_quyet_dinh_cong_nhan_tot_nghiep,
    "Ngày QĐ TN": data.ngay_quyet_dinh_cong_nhan_tot_nghiep_raw,
    "Ngày tạo VB": data.ngay_tao_vbcc_raw,
    "Ngày cấp": data.ngay_cap_vbcc_raw,
    "Họ tên người ký": data.ho_ten_nguoi_ky_vbcc,
    "CCCD người ký": data.so_ddcn_nguoi_ky_vbcc,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([field, _]) => field);

  if (missing.length > 0) {
    throw new Error(`Thiếu trường bắt buộc: ${missing.join(", ")}`);
  }

  // ✅ PARSE & VALIDATE DATES
  try {
    data.ngay_sinh = parseVietnameseDate(data.ngay_sinh_raw, "Ngày sinh");
    data.ngay_quyet_dinh_cong_nhan_tot_nghiep = parseVietnameseDate(
      data.ngay_quyet_dinh_cong_nhan_tot_nghiep_raw,
      "Ngày QĐ TN"
    );
    data.ngay_tao_vbcc = parseVietnameseDate(
      data.ngay_tao_vbcc_raw,
      "Ngày tạo VB"
    );
    data.ngay_cap_vbcc = parseVietnameseDate(
      data.ngay_cap_vbcc_raw,
      "Ngày cấp"
    );
  } catch (error) {
    throw new Error(`Lỗi ngày tháng: ${error.message}`);
  }

  // ✅ VALIDATE YEAR
  data.nam_tot_nghiep = validateYear(
    data.nam_tot_nghiep_raw || new Date().getFullYear(),
    "Năm TN"
  );

  // ✅ VALIDATE ENUMS
  data.gioi_tinh = validateEnum(
    data.gioi_tinh,
    ALLOWED_VALUES.gioi_tinh,
    "Giới tính"
  );
  data.hinh_thuc_dao_tao = validateEnum(
    data.hinh_thuc_dao_tao,
    ALLOWED_VALUES.hinh_thuc_dao_tao,
    "Hình thức ĐT"
  );
  if (data.xep_loai) {
    data.xep_loai = validateEnum(
      data.xep_loai,
      ALLOWED_VALUES.xep_loai,
      "Xếp loại"
    );
  }

  // ✅ VALIDATE DATE LOGIC
  validateDateLogic(data);

  return data;
}

/**
 * ✅ BATCH INSERT - NEW for performance
 */
async function batchInsert(client, dataArray, admin) {
  const chunks = [];
  for (let i = 0; i < dataArray.length; i += BATCH_INSERT_SIZE) {
    chunks.push(dataArray.slice(i, i + BATCH_INSERT_SIZE));
  }

  for (const chunk of chunks) {
    const values = chunk
      .map((_, idx) => {
        const offset = idx * 41;
        return `(${Array.from(
          { length: 41 },
          (_, i) => `$${offset + i + 1}`
        ).join(",")})`;
      })
      .join(",");

    const flatParams = chunk.flatMap((data) => [
      DEFAULT_CONFIG.phien_ban,
      DEFAULT_CONFIG.thong_tu,
      data.ma_dinh_danh_vbcc,
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
      data.quoc_tich,
      DEFAULT_CONFIG.ten_truong,
      DEFAULT_CONFIG.ma_co_so_dao_tao,
      data.nam_tot_nghiep,
      data.so_quyet_dinh_cong_nhan_tot_nghiep,
      data.ngay_quyet_dinh_cong_nhan_tot_nghiep,
      data.so_quyet_dinh_hoi_dong_danh_gia,
      data.so_vao_so,
      data.xep_loai,
      data.don_vi_cap_bang,
      data.ma_don_vi_cap_bang,
      data.ho_ten_nguoi_ky_vbcc,
      data.so_ddcn_nguoi_ky_vbcc,
      data.chuc_danh_nguoi_ky_vbcc,
      data.ho_ten_nguoi_ky_vbcc_ban_giay,
      data.chuc_danh_nguoi_ky_vbcc_ban_giay,
      DEFAULT_CONFIG.dia_danh_cap_vbcc,
      data.ngay_tao_vbcc,
      data.ngay_cap_vbcc,
      data.chuyen_nganh_dao_tao,
      data.ngon_ngu_dao_tao,
      data.thoi_gian_dao_tao,
      data.tong_so_tin_chi,
      data.trinh_do_theo_khung_quoc_gia,
      data.bac_trinh_do_theo_khung_quoc_gia,
      data.hinh_thuc_dao_tao,
      admin.username,
    ]);

    await client.query(
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
        chuyen_nganh_dao_tao, ngon_ngu_dao_tao, thoi_gian_dao_tao,
        tong_so_tin_chi, trinh_do_theo_khung_quoc_gia, bac_trinh_do_theo_khung_quoc_gia,
        hinh_thuc_dao_tao, created_by
      ) VALUES ${values}`,
      flatParams
    );
  }
}

/**
 * ✅ POST - Import with Transaction
 */
export async function POST(request) {
  let client;

  try {
    const admin = verifyAdmin(request);
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    const formData = await request.formData();
    const file = formData.get("file");
    const action = formData.get("action") || "import"; // 'preview' or 'import'

    // ✅ VALIDATE FILE
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: "Vui lòng chọn file Excel" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `File quá lớn! Tối đa: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Chỉ chấp nhận file Excel (.xlsx, .xls)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ PARSE EXCEL with error handling
    let arrayBuffer, workbook, jsonData;
    try {
      arrayBuffer = await file.arrayBuffer();
      workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        dateNF: "dd/mm/yyyy",
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      });
    } catch (error) {
      console.error("Excel parse error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "File Excel bị lỗi hoặc không đúng định dạng",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "File Excel không có dữ liệu",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (jsonData.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `File quá nhiều dòng! Tối đa ${MAX_ROWS} dòng, file có ${jsonData.length} dòng`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ CALCULATE FILE HASH for deduplication
    const fileHash = hashBuffer(arrayBuffer);

    // ✅ CHECK IF FILE WAS ALREADY IMPORTED
    const hashCheck = await query(
      `SELECT COUNT(*) as count FROM admin_logs 
       WHERE action = 'IMPORT' 
       AND metadata->>'fileHash' = $1 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [fileHash]
    );

    if (parseInt(hashCheck.rows[0].count) > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "⚠️ File này đã được import trong 24h qua. Vui lòng kiểm tra lại.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = {
      total: jsonData.length,
      success: 0,
      failed: 0,
      errors: [],
      importedDiplomas: [],
    };

    // ✅ GET DB CLIENT FOR TRANSACTION
    client = await query.connect();

    // ✅ BEGIN TRANSACTION with SERIALIZABLE isolation
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");

    // ✅ BATCH CHECK DUPLICATES
    const allSoHieuVBCC = jsonData
      .map((row) => row["Số hiệu VB"])
      .filter(Boolean);

    const duplicateCheck = await client.query(
      `SELECT so_hieu_vbcc FROM diplomas WHERE so_hieu_vbcc = ANY($1::text[])`,
      [allSoHieuVBCC]
    );

    const existingSoHieuSet = new Set(
      duplicateCheck.rows.map((r) => r.so_hieu_vbcc)
    );

    // ✅ PARSE & VALIDATE ALL ROWS
    const validRows = [];
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      try {
        const data = parseRowData(row, rowNumber);

        // Check duplicate in DB
        if (existingSoHieuSet.has(data.so_hieu_vbcc)) {
          throw new Error("Số hiệu văn bằng đã tồn tại trong hệ thống");
        }

        // Check duplicate in current file
        const duplicateInFile = jsonData
          .slice(0, i)
          .find((r) => r["Số hiệu VB"] === data.so_hieu_vbcc);
        if (duplicateInFile) {
          throw new Error(
            "Số hiệu văn bằng bị trùng trong file (dòng trước đó)"
          );
        }

        // Generate ma_dinh_danh
        const maDinhDanh = await generateMaDinhDanh(
          client,
          data.nam_tot_nghiep,
          data.ten_vbcc
        );
        data.ma_dinh_danh_vbcc = maDinhDanh;

        validRows.push(data);
        results.importedDiplomas.push({
          so_hieu_vbcc: data.so_hieu_vbcc,
          ho_va_ten: data.ho_va_ten,
          ma_dinh_danh_vbcc: maDinhDanh,
        });
      } catch (error) {
        console.error(`Error row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          diploma_number: row["Số hiệu VB"] || "N/A",
          student_name: row["Họ và tên"] || "N/A",
          message: error.message || "Lỗi không xác định",
        });
      }
    }

    // ✅ PREVIEW MODE - Return without inserting
    if (action === "preview") {
      await client.query("ROLLBACK");
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          results: {
            total: results.total,
            valid: validRows.length,
            invalid: results.failed,
            errors: results.errors, // Trả về tất cả lỗi
            sampleData: validRows.slice(0, 10), // Tăng số dòng mẫu
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ BATCH INSERT valid rows
    if (validRows.length > 0) {
      await batchInsert(client, validRows, admin);
      results.success = validRows.length;
    }

    // ✅ COMMIT TRANSACTION
    await client.query("COMMIT");

    // ✅ LOG ADMIN ACTION with detailed info
    await logAdminAction(
      admin.id,
      "IMPORT",
      "diplomas",
      null,
      null,
      {
        fileName: file.name,
        fileSize: file.size,
        fileHash: fileHash,
        totalRows: jsonData.length,
        successCount: results.success,
        failedCount: results.failed,
        duplicatesFound: existingSoHieuSet.size,
        errors: results.errors,
        importedDiplomas: results.importedDiplomas.map((d) => ({
          so_hieu: d.so_hieu_vbcc,
          ma_dinh_danh: d.ma_dinh_danh_vbcc,
          ten: d.ho_va_ten,
        })),
      },
      `Import Excel: ${results.success} thành công, ${results.failed} thất bại`,
      ipAddress
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
        results: {
          total: results.total,
          success: results.success,
          failed: results.failed,
          errors: results.errors,
          importedCount: results.importedDiplomas.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // ✅ ROLLBACK on error
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Import error:", error);

    if (
      error.message === "Unauthorized" ||
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phiên đăng nhập đã hết hạn",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Lỗi khi import file",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    // ✅ RELEASE CLIENT
    if (client) {
      client.release();
    }
  }
}

/**
 * ✅ GET - Download Template
 */
export async function GET(request) {
  try {
    verifyAdmin(request);

    const templateData = [
      {
        "Tên văn bằng": "Bằng Cử nhân",
        "Số hiệu VB": "001/ĐHCN-2024",
        "Số vào sổ": "001/2024",
        "Mã SV": "2020600001",
        "Số CCCD SV": "001202003456",
        "Họ và tên": "NGUYỄN VĂN AN",
        "Ngày sinh": "15/03/2002",
        "Nơi sinh": "Hải Phòng",
        "Giới tính": "Nam",
        "Dân tộc": "Kinh",
        "Quốc tịch": "Việt Nam",
        "Ngành đào tạo": "Công nghệ Thông tin",
        "Mã ngành": "7480201",
        "Chuyên ngành": "Kỹ thuật Phần mềm",
        "Năm TN": 2024,
        "Xếp loại": "Khá",
        "Số QĐ công nhận TN": "1234/QĐ-HPU",
        "Ngày QĐ TN": "15/06/2024",
        "Số QĐ hội đồng": "1200/QĐ-HĐTN",
        "Ngày tạo VB": "20/06/2024",
        "Ngày cấp": "20/06/2024",
        "Hình thức ĐT": "Chính quy",
        "Thời gian ĐT": "4 năm",
        "Tổng TC": 128,
        "Trình độ KHQG": "Trình độ 6",
        "Bậc ĐT": "Đại học",
        "Ngôn ngữ ĐT": "Tiếng Việt",
        "Đơn vị cấp bằng": "Trường Đại học Quản lý và Công nghệ Hải Phòng",
        "Mã đơn vị CB": "HPU01",
        "Họ tên người ký": "PGS.TS. Nguyễn Văn B",
        "CCCD người ký": "001987654321",
        "Chức danh người ký": "Hiệu trưởng",
        "Họ tên người ký bản giấy": "",
        "Chức danh người ký bản giấy": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // ✅ COLUMN WIDTHS
    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 20 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 26 },
      { wch: 13 },
      { wch: 22 },
      { wch: 11 },
      { wch: 11 },
      { wch: 13 },
      { wch: 32 },
      { wch: 11 },
      { wch: 26 },
      { wch: 9 },
      { wch: 13 },
      { wch: 19 },
      { wch: 13 },
      { wch: 19 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 13 },
      { wch: 9 },
      { wch: 16 },
      { wch: 13 },
      { wch: 16 },
      { wch: 52 },
      { wch: 13 },
      { wch: 26 },
      { wch: 16 },
      { wch: 16 },
      { wch: 26 },
      { wch: 21 },
    ];

    // ✅ COLOR HEADERS
    const requiredCols = [
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "L",
      "M",
      "N",
      "Q",
      "R",
      "T",
      "U",
      "AC",
      "AD",
    ];
    const optionalCols = [
      "A",
      "I",
      "J",
      "K",
      "O",
      "P",
      "S",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      "AA",
      "AB",
      "AE",
      "AF",
      "AG",
      "AH",
    ];

    requiredCols.forEach((col) => {
      const cell = `${col}1`;
      if (!worksheet[cell]) worksheet[cell] = { v: "" };
      worksheet[cell].s = {
        fill: { fgColor: { rgb: "FFE6E6" } },
        font: { bold: true, color: { rgb: "CC0000" } },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
      };
    });

    optionalCols.forEach((col) => {
      const cell = `${col}1`;
      if (!worksheet[cell]) worksheet[cell] = { v: "" };
      worksheet[cell].s = {
        fill: { fgColor: { rgb: "E6F7E6" } },
        font: { bold: true, color: { rgb: "006600" } },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
      };
    });

    // ✅ NOTES
    const notes = {
      A1: {
        c: [
          {
            a: "Hệ thống",
            t: "Mặc định: Bằng Cử nhân\nCác loại khác: Bằng Kỹ sư, Bằng Thạc sĩ, Bằng Tiến sĩ",
          },
        ],
      },
      B1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nPhải duy nhất, không trùng với bằng đã có trong hệ thống",
          },
        ],
      },
      C1: {
        c: [{ a: "Hệ thống", t: "BẮT BUỘC\nSố thứ tự trong sổ cấp bằng" }],
      },
      D1: { c: [{ a: "Hệ thống", t: "BẮT BUỘC\nMã sinh viên (Student ID)" }] },
      E1: {
        c: [{ a: "Hệ thống", t: "BẮT BUỘC\nSố CCCD hoặc CMND của sinh viên" }],
      },
      F1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nHọ và tên đầy đủ\nHệ thống tự động chuyển IN HOA",
          },
        ],
      },
      G1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nFormat: dd/MM/yyyy\nVí dụ: 15/03/2002\nPhải ít nhất 18 tuổi khi TN",
          },
        ],
      },
      H1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nTỉnh/Thành phố sinh\nVí dụ: Hải Phòng, Hà Nội",
          },
        ],
      },
      I1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Nam)\nChỉ chấp nhận: Nam hoặc Nữ",
          },
        ],
      },
      J1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Kinh)\nVí dụ: Kinh, Tày, Mường, ...",
          },
        ],
      },
      K1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Việt Nam)\nVí dụ: Việt Nam, Lào, Campuchia, ...",
          },
        ],
      },
      L1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nTên đầy đủ của ngành đào tạo\nVí dụ: Công nghệ Thông tin",
          },
        ],
      },
      M1: {
        c: [
          { a: "Hệ thống", t: "BẮT BUỘC\nMã ngành 7 chữ số\nVí dụ: 7480201" },
        ],
      },
      N1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nChuyên ngành cụ thể\nVí dụ: Kỹ thuật Phần mềm",
          },
        ],
      },
      O1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: năm hiện tại)\nChỉ chấp nhận số từ 1900-2100",
          },
        ],
      },
      P1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nChỉ chấp nhận: Xuất sắc, Giỏi, Khá, Trung bình, Trung bình khá",
          },
        ],
      },
      Q1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nSố quyết định công nhận tốt nghiệp\nVí dụ: 1234/QĐ-HPU",
          },
        ],
      },
      R1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nNgày ký quyết định công nhận TN\nFormat: dd/MM/yyyy\nKhông được trong tương lai",
          },
        ],
      },
      S1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nSố quyết định thành lập hội đồng\nĐể trống nếu không có",
          },
        ],
      },
      T1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nNgày tạo văn bằng\nFormat: dd/MM/yyyy\nPhải sau ngày QĐ",
          },
        ],
      },
      U1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nNgày cấp văn bằng cho sinh viên\nFormat: dd/MM/yyyy\nPhải sau ngày tạo VB",
          },
        ],
      },
      V1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Chính quy)\nChỉ chấp nhận: Chính quy, Từ xa, Liên thông, Văn bằng 2",
          },
        ],
      },
      W1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: 4 năm)\nVí dụ: 4 năm, 5 năm, 4.5 năm",
          },
        ],
      },
      X1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nTổng số tín chỉ tích lũy\nVí dụ: 128",
          },
        ],
      },
      Y1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Trình độ 6)\nTheo khung năng lực quốc gia Việt Nam",
          },
        ],
      },
      Z1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Đại học)\nVí dụ: Đại học, Thạc sĩ, Tiến sĩ",
          },
        ],
      },
      AA1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Tiếng Việt)\nVí dụ: Tiếng Việt, Tiếng Anh",
          },
        ],
      },
      AB1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nMặc định: Trường Đại học Quản lý và Công nghệ Hải Phòng",
          },
        ],
      },
      AC1: {
        c: [
          {
            a: "Hệ thống",
            t: "BẮT BUỘC\nHọ và tên người ký văn bằng\nVí dụ: PGS.TS. Nguyễn Văn B",
          },
        ],
      },
      AD1: { c: [{ a: "Hệ thống", t: "BẮT BUỘC\nSố CCCD/CMND của người ký" }] },
      AE1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc (mặc định: Hiệu trưởng)\nVí dụ: Hiệu trưởng, Phó Hiệu trưởng",
          },
        ],
      },
      AF1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nNgười ký bản sao (nếu có)\nĐể trống nếu không có",
          },
        ],
      },
      AG1: {
        c: [
          {
            a: "Hệ thống",
            t: "Không bắt buộc\nChức danh người ký bản sao\nĐể trống nếu không có",
          },
        ],
      },
    };

    Object.keys(notes).forEach((cell) => {
      if (!worksheet[cell]) worksheet[cell] = { v: "" };
      worksheet[cell].c = notes[cell].c;
    });

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_vanbang_v3_fixed.xlsx"',
      },
    });
  } catch (error) {
    console.error("Template download error:", error);

    if (
      error.message === "Unauthorized" ||
      error.name === "JsonWebTokenError"
    ) {
      return new Response(
        JSON.stringify({ success: false, message: "Chưa đăng nhập" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Lỗi khi tạo template" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
