// src/app/page.js
"use client";

import { useState } from "react";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function SearchForm() {
  const [diplomaNumber, setDiplomaNumber] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!diplomaNumber.trim()) {
      setError("Vui lòng nhập số hiệu bằng tốt nghiệp");
      return;
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
      // Lấy token reCAPTCHA
      const recaptchaToken = await executeRecaptcha('search_diploma');

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diplomaNumber: diplomaNumber.trim(), recaptchaToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else if (response.status === 429) {
        setError(data.message || "Bạn đã vượt quá số lần tra cứu cho phép. Vui lòng thử lại sau.");
      } else if (response.status === 403) {
        setError(data.message || "Xác minh CAPTCHA thất bại. Vui lòng thử lại.");
      } else {
        setError(data.message || "Không có số hiệu bằng Tốt nghiệp này!");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    const [year, month, day] = dateString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const renderField = (label, value) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
      <label className="text-sm font-medium text-gray-600 mb-1 sm:mb-0 sm:w-1/3 sm:pr-4">
        {label}
      </label>
      <div className="text-gray-900 font-medium sm:w-2/3">
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Hệ thống tra cứu văn bằng
            </h1>
            <p className="text-sm text-gray-600">
              Trường Đại học Quản lý và Công nghệ Hải Phòng
            </p>
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số hiệu bằng tốt nghiệp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={diplomaNumber}
                onChange={(e) => setDiplomaNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                placeholder="Nhập số hiệu bằng tốt nghiệp"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Ví dụ: 123456, ABC-2023-001, v.v.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-[#0083c2] text-white font-medium rounded-md hover:bg-[#0066a0] focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

              {diplomaNumber && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    setDiplomaNumber("");
                    setResult(null);
                    setError(null);
                    setShowDetail(false);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                >
                  Xóa
                </button>
              )}
            </div>
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
                      Vui lòng kiểm tra lại số hiệu bằng và thử lại
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
                      Văn bằng hợp lệ
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Thông tin văn bằng đã được xác thực và có trong hệ thống
                    </p>
                  </div>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  Thông tin văn bằng
                </h3>
                <div className="space-y-0">
                  {renderField("Số hiệu văn bằng", result.diploma_number)}
                  {renderField("Số vào sổ", result.registry_number)}
                  {renderField("Ngày cấp", formatDate(result.issue_date))}
                </div>
              </div>

              {/* Thông tin trường học */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  Thông tin đào tạo
                </h3>
                <div className="space-y-0">
                  {renderField("Tên trường cấp văn bằng", result.school_name)}
                  {renderField("Ngành đào tạo", result.major)}
                  {renderField("Chuyên ngành đào tạo", result.specialization)}
                </div>
              </div>

              {/* Nút xem chi tiết */}
              <div className="flex justify-center pt-4">
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

              {/* Thông tin chi tiết sinh viên */}
              {showDetail && result.student_info && (
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
                        Thông tin chi tiết về người được cấp văn bằng
                      </p>
                    </div>
                  </div>

                  <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                    Thông tin sinh viên
                  </h3>
                  <div className="space-y-0">
                    {renderField("Mã sinh viên", result.student_info.student_code)}
                    {renderField("Họ và tên", result.student_info.full_name)}
                    {renderField("Ngành học", result.student_info.major)}
                    {renderField("Hệ đào tạo", result.student_info.training_system)}
                    {renderField("Năm tốt nghiệp", result.student_info.graduation_year)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Hệ thống tra cứu văn bằng - Trường Đại học Quản lý và Công nghệ Hải Phòng
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Mọi thắc mắc xin liên hệ: Phòng Đào tạo - Email: daotao@hpu.edu.vn
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2025 Trường Đại học HPU. Phát triển bởi Trung tâm Công nghệ Thông tin
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
        appendTo: 'head',
      }}
    >
      <SearchForm />
    </GoogleReCaptchaProvider>
  );
}