"use client";

import { useState } from "react";
import { debounce } from "lodash";
import { IMaskInput } from "react-imask";

export default function Home() {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hàm kiểm tra định dạng ngày hợp lệ (DD/MM/YYYY)
  const isValidDate = (dateString) => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getDate() === day &&
      date.getMonth() === month - 1 &&
      date.getFullYear() === year &&
      year >= 1900 &&
      year <= new Date().getFullYear()
    );
  };

  const handleSubmit = debounce(async (e) => {
    if (e) e.preventDefault();

    if (!fullName.trim() || !birthDate.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!isValidDate(birthDate)) {
      setError("Ngày sinh không hợp lệ. Vui lòng nhập theo định dạng DD/MM/YYYY");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [day, month, year] = birthDate.split("/");
      const apiBirthDate = `${year}-${month}-${day}`;

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, birthDate: apiBirthDate }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || "Không tìm thấy thông tin");
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }, 300);

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
      {/* Container chính */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Hệ thống tra cứu văn bằng
            </h1>
            <div className="h-0.5 bg-gradient-to-r from-[#0083c2] to-transparent"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                  placeholder="Nhập họ và tên đầy đủ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày sinh
                </label>
                <IMaskInput
                  mask="00/00/0000"
                  value={birthDate}
                  onAccept={(value) => setBirthDate(value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:border-[#0083c2] transition-colors"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 bg-[#0083c2] text-white font-medium rounded-md hover:bg-[#0066a0] focus:outline-none focus:ring-2 focus:ring-[#0083c2] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang tìm kiếm...
                  </div>
                ) : (
                  "Tra cứu thông tin"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Kết quả tra cứu
              </h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0083c2] mb-4"></div>
              <p className="text-gray-600">Đang tải thông tin...</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Kết quả tra cứu
              </h2>
            </div>
            <div className="px-6 py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success result */}
        {result && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Kết quả tra cứu
              </h2>
              <div className="h-0.5 bg-gradient-to-r from-[#0083c2] to-transparent mt-2"></div>
            </div>

            <div className="px-6 py-6">
              {/* Thông tin trường học */}
              <div className="mb-8">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  Thông tin trường học
                </h3>
                <div className="space-y-0">
                  {renderField("Tên trường", result.school_name)}
                  {renderField("Ngành đào tạo", result.major)}
                  {renderField("Chuyên ngành", result.specialization)}
                </div>
              </div>

              {/* Thông tin văn bằng */}
              <div className="mb-8">
                <h3 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  Thông tin văn bằng
                </h3>
                <div className="space-y-0">
                  {renderField("Số hiệu văn bằng", result.diploma_number)}
                  {renderField("Số vào sổ", result.registry_number)}
                  {renderField("Ngày cấp", formatDate(result.issue_date))}
                </div>
              </div>

              {/* Trạng thái xác thực */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
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
                    <p className="text-green-800 font-medium">
                      Văn bằng hợp lệ
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Thông tin văn bằng đã được xác thực và có trong hệ thống
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Hệ thống tra cứu văn bằng - Trường Đại học Quản lý và Công nghệ Hải
            Phòng
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Mọi thắc mắc xin liên hệ hotline: 1900-xxx-xxx
          </p>
        </div>
      </div>
    </div>
  );
}