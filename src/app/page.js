// src/app/page.js - Updated for Schema v2.0
"use client";

import { useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

function SearchForm() {
  const [searchType, setSearchType] = useState("so_hieu"); // 'so_hieu' hoặc 'combo'

  // Form data
  const [soHieuVBCC, setSoHieuVBCC] = useState("");
  const [maNguoiHoc, setMaNguoiHoc] = useState("");
  const [hoVaTen, setHoVaTen] = useState("");
  const [ngaySinh, setNgaySinh] = useState("");

  // State
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const { executeRecaptcha } = useGoogleReCaptcha();

  const formatDate = (isoString) => {
  if (!isoString) return "Chưa cập nhật";
  try {
    const date = new Date(isoString);
    // Kiểm tra xem có phải là ngày hợp lệ không
    if (isNaN(date.getTime())) return "Chưa cập nhật";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return "Chưa cập nhật";
  }
};

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validation
    if (searchType === "so_hieu") {
      if (!soHieuVBCC.trim()) {
        setError("Vui lòng nhập số hiệu văn bằng");
        return;
      }
    } else if (searchType === "combo") {
      if (!maNguoiHoc.trim()) {
        setError("Vui lòng nhập mã sinh viên");
        return;
      }
      if (!hoVaTen.trim() && !ngaySinh.trim()) {
        setError("Vui lòng nhập thêm Họ tên hoặc Ngày sinh");
        return;
      }
    }

    if (!executeRecaptcha) {
      setError("Không thể xác minh CAPTCHA, vui lòng thử lại");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowDetail(false);

    try {
      const recaptchaToken = await executeRecaptcha("search_diploma");

      const requestBody = {
        searchType,
        recaptchaToken,
      };

      if (searchType === "so_hieu") {
        requestBody.soHieuVBCC = soHieuVBCC.trim();
      } else {
        requestBody.maNguoiHoc = maNguoiHoc.trim();
        requestBody.hoVaTen = hoVaTen.trim() || null;
        requestBody.ngaySinh = ngaySinh.trim() || null;
      }

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else if (response.status === 429) {
        setError(
          data.message ||
            "Bạn đã vượt quá số lần tra cứu cho phép. Vui lòng thử lại sau."
        );
      } else if (response.status === 403) {
        setError(
          data.message || "Xác minh CAPTCHA thất bại. Vui lòng thử lại."
        );
      } else {
        setError(data.message || "Không tìm thấy thông tin văn bằng!");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSoHieuVBCC("");
    setMaNguoiHoc("");
    setHoVaTen("");
    setNgaySinh("");
    setResult(null);
    setError(null);
    setShowDetail(false);
  };

  const renderField = (label, value, highlight = false) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
      <label className="text-sm font-medium text-gray-600 mb-1 sm:mb-0 sm:w-1/3 sm:pr-4">
        {label}
      </label>
      <div
        className={`font-medium sm:w-2/3 ${
          highlight ? "text-blue-600 text-lg" : "text-gray-900"
        }`}
      >
        {value || "Chưa cập nhật"}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4">
            {/* LOGO + TITLE - FLEX ROW */}
            <div className="flex items-center mb-2">
              {/* LOGO */}
              <img
                src="/images/logoblue.png"
                alt="HPU Logo"
                className="h-12 w-auto mr-4 object-contain flex-shrink-0"
              />
              {/* TITLE */}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Hệ thống tra cứu thông tin văn bằng
                </h1>
                <p className="text-sm text-gray-600">
                  Trường Đại học Quản lý và Công nghệ Hải Phòng
                </p>
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-[#0083c2] to-transparent mt-2"></div>
          </div>
        </div>

        {/* Form tra cứu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Thông tin tra cứu
            </h2>
          </div>

          <div className="px-6 py-6">
            {/* Chọn phương thức tra cứu */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Chọn phương thức tra cứu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchType("so_hieu");
                    handleReset();
                  }}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    searchType === "so_hieu"
                      ? "border-[#0083c2] bg-blue-50 text-[#0083c2]"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Tra cứu bằng Số hiệu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchType("combo");
                    handleReset();
                  }}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    searchType === "combo"
                      ? "border-[#0083c2] bg-blue-50 text-[#0083c2]"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Tra cứu bằng Mã SV
                  </div>
                </button>
              </div>
            </div>

            {/* Form theo loại tra cứu */}
            <form onSubmit={handleSubmit}>
              {searchType === "so_hieu" ? (
                // Form tra cứu bằng số hiệu
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số hiệu văn bằng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={soHieuVBCC}
                    onChange={(e) => setSoHieuVBCC(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                    placeholder="Ví dụ: 001/ĐHCN-2024"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Số hiệu văn bằng được in trên văn bằng giấy của bạn
                  </p>
                </div>
              ) : (
                // Form tra cứu bằng Mã SV + Họ tên/Ngày sinh
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã sinh viên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={maNguoiHoc}
                      onChange={(e) => setMaNguoiHoc(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                      placeholder="Ví dụ: 2020600001"
                      disabled={loading}
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Vui lòng nhập <strong>ít nhất 1 trong 2</strong> trường
                      dưới đây:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={hoVaTen}
                        onChange={(e) => setHoVaTen(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                        placeholder="NGUYỄN VĂN AN"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Viết hoa, có dấu
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ngày sinh
                      </label>
                      <input
                        type="text"
                        value={ngaySinh}
                        onChange={(e) => setNgaySinh(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                        placeholder="dd/MM/yyyy"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ví dụ: 15/03/2002
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-[#0083c2] text-white font-medium rounded-md hover:bg-[#0066a0] focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang tìm kiếm...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Tra cứu thông tin
                    </div>
                  )}
                </button>

                {(soHieuVBCC || maNguoiHoc || hoVaTen || ngaySinh) &&
                  !loading && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                    >
                      Xóa
                    </button>
                  )}
              </div>
            </form>
          </div>
        </div>

        {/* Error message */}
        {error && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Kết quả tra cứu
              </h2>
            </div>
            <div className="px-6 py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium">{error}</p>
                    <p className="text-red-600 text-sm mt-1">
                      Vui lòng kiểm tra lại thông tin và thử lại
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success result */}
        {result && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Kết quả tra cứu
              </h2>
              <div className="h-0.5 bg-gradient-to-r from-[#0083c2] to-transparent mt-2"></div>
            </div>

            <div className="px-6 py-6">
              {/* Trạng thái xác thực */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <svg
                    className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-green-800 font-medium text-lg">
                      ✅ Văn bằng hợp lệ
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Thông tin văn bằng đã được xác thực và có trong hệ thống
                    </p>
                  </div>
                </div>
              </div>

              {/* Thông tin định danh */}
              {/* <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  🔖 Mã định danh
                </h3>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">
                    Mã định danh văn bằng số
                  </p>
                  <p className="text-2xl font-bold text-blue-600 font-mono">
                    {result.ma_dinh_danh_vbcc}
                  </p>
                </div>
              </div> */}

              {/* Thông tin sinh viên */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  👤 Thông tin sinh viên
                </h3>
                <div className="space-y-0">
                  {renderField("Họ và tên", result.ho_va_ten, true)}
                  {renderField("Ngày sinh", formatDate(result.ngay_sinh))}
                  {renderField("Nơi sinh", result.noi_sinh)}
                  {renderField("Giới tính", result.gioi_tinh)}
                  {renderField("Mã sinh viên", result.ma_nguoi_hoc)}
                </div>
              </div>

              {/* Thông tin văn bằng */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  🎓 Thông tin văn bằng
                </h3>
                <div className="space-y-0">
                  {renderField("Số hiệu văn bằng", result.so_hieu_vbcc)}
                  {renderField("Ngành đào tạo", result.nganh_dao_tao)}
                  {renderField("Chuyên ngành", result.chuyen_nganh_dao_tao)}
                  {renderField("Xếp loại tốt nghiệp", result.xep_loai)}
                  {renderField("Năm tốt nghiệp", result.nam_tot_nghiep)}
                </div>
              </div>

              {/* Nút xem chi tiết */}
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setShowDetail(!showDetail)}
                  className="px-6 py-2.5 bg-blue-50 text-[#0083c2] font-medium rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:ring-offset-2 transition-colors border border-blue-200"
                >
                  {showDetail ? (
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                      Ẩn thông tin chi tiết
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Xem thông tin chi tiết
                    </div>
                  )}
                </button>
              </div>

              {/* Thông tin chi tiết */}
              {showDetail && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-blue-700 text-sm">
                        Thông tin chi tiết về quá trình đào tạo và cấp văn bằng
                      </p>
                    </div>
                  </div>

                  {/* Thông tin đào tạo */}
                  <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                    📚 Thông tin đào tạo
                  </h3>
                  <div className="space-y-0 mb-6">
                    {renderField("Hình thức đào tạo", result.hinh_thuc_dao_tao)}
                    {renderField("Thời gian đào tạo", result.thoi_gian_dao_tao)}
                    {renderField(
                      "Trình độ theo Khung Quốc gia",
                      result.trinh_do_theo_khung_quoc_gia
                    )}
                    {renderField(
                      "Bậc đào tạo",
                      result.bac_trinh_do_theo_khung_quoc_gia
                    )}
                  </div>

                  {/* Thông tin cấp bằng */}
                  <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                    🏛️ Thông tin cấp bằng
                  </h3>
                  <div className="space-y-0">
                    {renderField("Đơn vị cấp bằng", result.don_vi_cap_bang)}
                    {renderField("Ngày cấp", formatDate(result.ngay_cap_vbcc))}
                    {renderField("Nơi cấp", result.dia_danh_cap_vbcc)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Hệ thống tra cứu thông tin văn bằng - Trường Đại học Quản lý và Công nghệ
            Hải Phòng
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Mọi thắc mắc xin liên hệ: Phòng Đào tạo - Email: daotao@hpu.edu.vn
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2025 Trường Đại học HPU. Phiên bản 2.0 - Tuân thủ Phụ lục 1.2
            BGDĐT
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      <SearchForm />
    </GoogleReCaptchaProvider>
  );
}
