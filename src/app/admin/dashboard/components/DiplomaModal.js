// src/app/admin/dashboard/components/DiplomaModal.js
import { useState, useEffect } from 'react';

export default function DiplomaModal({ diploma, onClose, onSave }) {
  const [formData, setFormData] = useState({
    diploma_number: diploma?.diploma_number || '',
    registry_number: diploma?.registry_number || '',
    issue_date: diploma?.issue_date?.split('T')[0] || '',
    school_name: diploma?.school_name || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
    major: diploma?.major || '',
    specialization: diploma?.specialization || '',
    student_code: diploma?.student_code || '',
    full_name: diploma?.full_name || '',
    training_system: diploma?.training_system || 'Đại học chính quy',
    graduation_year: diploma?.graduation_year || new Date().getFullYear(),
    classification: diploma?.classification || ''
  });

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h3 className="text-xl font-bold text-gray-800">
            {diploma ? '✏️ Chỉnh sửa văn bằng' : '➕ Thêm văn bằng mới'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số hiệu văn bằng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.diploma_number}
                onChange={(e) => setFormData({...formData, diploma_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số vào sổ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.registry_number}
                onChange={(e) => setFormData({...formData, registry_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã sinh viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.student_code}
                onChange={(e) => setFormData({...formData, student_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngành đào tạo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.major}
                onChange={(e) => setFormData({...formData, major: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chuyên ngành
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hệ đào tạo
              </label>
              <select
                value={formData.training_system}
                onChange={(e) => setFormData({...formData, training_system: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              >
                <option value="Đại học chính quy">Đại học chính quy</option>
                <option value="Đại học từ xa">Đại học từ xa</option>
                <option value="Liên thông">Liên thông</option>
                <option value="Văn bằng 2">Văn bằng 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Năm tốt nghiệp <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.graduation_year}
                onChange={(e) => setFormData({...formData, graduation_year: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xếp loại tốt nghiệp
              </label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({...formData, classification: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              >
                <option value="">Chọn xếp loại</option>
                <option value="Xuất sắc">Xuất sắc</option>
                <option value="Giỏi">Giỏi</option>
                <option value="Khá">Khá</option>
                <option value="Trung bình">Trung bình</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên trường
              </label>
              <input
                type="text"
                value={formData.school_name}
                onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm hover:shadow-md"
            >
              {diploma ? '💾 Cập nhật' : '✨ Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}