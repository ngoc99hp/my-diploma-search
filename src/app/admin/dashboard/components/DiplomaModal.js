// src/app/admin/dashboard/components/DiplomaModal.js - FIXED EDIT MODE
import { useState, useEffect } from 'react';

export default function DiplomaModal({ diploma, onClose, onSave }) {
  const [formData, setFormData] = useState({
    // A. Thông tin chung (33 trường bắt buộc)
    phien_ban: '1.0',
    thong_tu: '27/2019',
    ten_vbcc: 'Bằng Cử nhân',
    nganh_dao_tao: '',
    ma_nganh_dao_tao: '',
    so_hieu_vbcc: '',
    so_ddcn: '',
    ma_nguoi_hoc: '',
    ho_va_ten: '',
    ngay_sinh: '',
    noi_sinh: '',
    gioi_tinh: 'Nam',
    dan_toc: 'Kinh',
    quoc_tich: 'Việt Nam',
    ten_truong: 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
    ma_co_so_dao_tao: 'HPU01',
    nam_tot_nghiep: new Date().getFullYear(),
    so_quyet_dinh_cong_nhan_tot_nghiep: '',
    ngay_quyet_dinh_cong_nhan_tot_nghiep: '',
    so_quyet_dinh_hoi_dong_danh_gia: '',
    so_vao_so: '',
    xep_loai: '',
    don_vi_cap_bang: 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
    ma_don_vi_cap_bang: 'HPU01',
    ho_ten_nguoi_ky_vbcc: '',
    so_ddcn_nguoi_ky_vbcc: '',
    chuc_danh_nguoi_ky_vbcc: 'Hiệu trưởng',
    ho_ten_nguoi_ky_vbcc_ban_giay: '',
    chuc_danh_nguoi_ky_vbcc_ban_giay: '',
    dia_danh_cap_vbcc: 'Hải Phòng',
    ngay_cap_vbcc: '',
    
    // B. Phụ lục bằng (11 trường)
    chuyen_nganh_dao_tao: '',
    ngay_nhap_hoc: '',
    ngon_ngu_dao_tao: 'Tiếng Việt',
    thoi_gian_dao_tao: '4 năm',
    tong_so_tin_chi: '',
    trinh_do_theo_khung_quoc_gia: 'Trình độ 6',
    bac_trinh_do_theo_khung_quoc_gia: 'Đại học',
    hinh_thuc_dao_tao: 'Chính quy',
    ghi_chu: '',
    attachment_name: '',
    attachment_content_base64: ''
  });

  const [activeTab, setActiveTab] = useState('basic'); // basic, education, certification

  // ✅ FIX: Load data khi edit
  useEffect(() => {
    if (diploma) {
      console.log('📝 Loading diploma for edit:', diploma);
      
      // Helper function để format date từ ISO sang dd/MM/yyyy
      const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        
        // Nếu đã có format dd/MM/yyyy thì giữ nguyên
        if (dateStr.includes('/')) return dateStr;
        
        // Nếu là ISO date (yyyy-MM-dd), convert sang dd/MM/yyyy
        try {
          const date = new Date(dateStr);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          return dateStr;
        }
      };

      setFormData({
        phien_ban: diploma.phien_ban || '1.0',
        thong_tu: diploma.thong_tu || '27/2019',
        ten_vbcc: diploma.ten_vbcc || 'Bằng Cử nhân',
        nganh_dao_tao: diploma.nganh_dao_tao || '',
        ma_nganh_dao_tao: diploma.ma_nganh_dao_tao || '',
        so_hieu_vbcc: diploma.so_hieu_vbcc || '',
        so_ddcn: diploma.so_ddcn || '',
        ma_nguoi_hoc: diploma.ma_nguoi_hoc || '',
        ho_va_ten: diploma.ho_va_ten || '',
        ngay_sinh: formatDateForInput(diploma.ngay_sinh),
        noi_sinh: diploma.noi_sinh || '',
        gioi_tinh: diploma.gioi_tinh || 'Nam',
        dan_toc: diploma.dan_toc || 'Kinh',
        quoc_tich: diploma.quoc_tich || 'Việt Nam',
        ten_truong: diploma.ten_truong || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        ma_co_so_dao_tao: diploma.ma_co_so_dao_tao || 'HPU01',
        nam_tot_nghiep: diploma.nam_tot_nghiep || new Date().getFullYear(),
        so_quyet_dinh_cong_nhan_tot_nghiep: diploma.so_quyet_dinh_cong_nhan_tot_nghiep || '',
        ngay_quyet_dinh_cong_nhan_tot_nghiep: formatDateForInput(diploma.ngay_quyet_dinh_cong_nhan_tot_nghiep),
        so_quyet_dinh_hoi_dong_danh_gia: diploma.so_quyet_dinh_hoi_dong_danh_gia || '',
        so_vao_so: diploma.so_vao_so || '',
        xep_loai: diploma.xep_loai || '',
        don_vi_cap_bang: diploma.don_vi_cap_bang || 'Trường Đại học Quản lý và Công nghệ Hải Phòng',
        ma_don_vi_cap_bang: diploma.ma_don_vi_cap_bang || 'HPU01',
        ho_ten_nguoi_ky_vbcc: diploma.ho_ten_nguoi_ky_vbcc || '',
        so_ddcn_nguoi_ky_vbcc: diploma.so_ddcn_nguoi_ky_vbcc || '',
        chuc_danh_nguoi_ky_vbcc: diploma.chuc_danh_nguoi_ky_vbcc || 'Hiệu trưởng',
        ho_ten_nguoi_ky_vbcc_ban_giay: diploma.ho_ten_nguoi_ky_vbcc_ban_giay || '',
        chuc_danh_nguoi_ky_vbcc_ban_giay: diploma.chuc_danh_nguoi_ky_vbcc_ban_giay || '',
        dia_danh_cap_vbcc: diploma.dia_danh_cap_vbcc || 'Hải Phòng',
        ngay_cap_vbcc: formatDateForInput(diploma.ngay_cap_vbcc),
        
        // B. Phụ lục bằng
        chuyen_nganh_dao_tao: diploma.chuyen_nganh_dao_tao || '',
        ngay_nhap_hoc: formatDateForInput(diploma.ngay_nhap_hoc),
        ngon_ngu_dao_tao: diploma.ngon_ngu_dao_tao || 'Tiếng Việt',
        thoi_gian_dao_tao: diploma.thoi_gian_dao_tao || '4 năm',
        tong_so_tin_chi: diploma.tong_so_tin_chi || '',
        trinh_do_theo_khung_quoc_gia: diploma.trinh_do_theo_khung_quoc_gia || 'Trình độ 6',
        bac_trinh_do_theo_khung_quoc_gia: diploma.bac_trinh_do_theo_khung_quoc_gia || 'Đại học',
        hinh_thuc_dao_tao: diploma.hinh_thuc_dao_tao || 'Chính quy',
        ghi_chu: diploma.ghi_chu || '',
        attachment_name: diploma.attachment_name || '',
        attachment_content_base64: diploma.attachment_content_base64 || ''
      });
    }
  }, [diploma]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
    console.log('💾 Saving diploma data:', formData);
    onSave(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
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

        {/* Tabs */}
        <div className="border-b bg-gray-50 px-6">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👤 Thông tin cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('education')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'education'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🎓 Thông tin đào tạo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('certification')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'certification'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📜 Thông tin cấp bằng
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            {/* Tab: Thông tin cơ bản */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số hiệu văn bằng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.so_hieu_vbcc}
                      onChange={(e) => updateField('so_hieu_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="001/ĐHCN-2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số vào sổ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.so_vao_so}
                      onChange={(e) => updateField('so_vao_so', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="001/2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên văn bằng <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.ten_vbcc}
                      onChange={(e) => updateField('ten_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Bằng Cử nhân">Bằng Cử nhân</option>
                      <option value="Bằng Kỹ sư">Bằng Kỹ sư</option>
                      <option value="Bằng Thạc sĩ">Bằng Thạc sĩ</option>
                      <option value="Bằng Tiến sĩ">Bằng Tiến sĩ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã sinh viên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ma_nguoi_hoc}
                      onChange={(e) => updateField('ma_nguoi_hoc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="2020600001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ho_va_ten}
                      onChange={(e) => updateField('ho_va_ten', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="NGUYỄN VĂN AN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày sinh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ngay_sinh}
                      onChange={(e) => updateField('ngay_sinh', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="15/03/2002"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nơi sinh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.noi_sinh}
                      onChange={(e) => updateField('noi_sinh', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Hải Phòng"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giới tính <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.gioi_tinh}
                      onChange={(e) => updateField('gioi_tinh', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dân tộc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.dan_toc}
                      onChange={(e) => updateField('dan_toc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Kinh"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số CCCD <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.so_ddcn}
                      onChange={(e) => updateField('so_ddcn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="001202003456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quốc tịch
                    </label>
                    <input
                      type="text"
                      value={formData.quoc_tich}
                      onChange={(e) => updateField('quoc_tich', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Thông tin đào tạo */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngành đào tạo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nganh_dao_tao}
                      onChange={(e) => updateField('nganh_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Công nghệ Thông tin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã ngành <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ma_nganh_dao_tao}
                      onChange={(e) => updateField('ma_nganh_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="7480201"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chuyên ngành <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.chuyen_nganh_dao_tao}
                      onChange={(e) => updateField('chuyen_nganh_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Kỹ thuật Phần mềm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình thức đào tạo <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.hinh_thuc_dao_tao}
                      onChange={(e) => updateField('hinh_thuc_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Chính quy">Chính quy</option>
                      <option value="Liên thông">Liên thông</option>
                      <option value="Từ xa">Từ xa</option>
                      <option value="Văn bằng 2">Văn bằng 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian đào tạo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.thoi_gian_dao_tao}
                      onChange={(e) => updateField('thoi_gian_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="4 năm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày nhập học
                    </label>
                    <input
                      type="text"
                      value={formData.ngay_nhap_hoc}
                      onChange={(e) => updateField('ngay_nhap_hoc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="01/09/2020"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tổng số tín chỉ
                    </label>
                    <input
                      type="number"
                      value={formData.tong_so_tin_chi}
                      onChange={(e) => updateField('tong_so_tin_chi', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="128"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngôn ngữ đào tạo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ngon_ngu_dao_tao}
                      onChange={(e) => updateField('ngon_ngu_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trình độ theo KHQG <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.trinh_do_theo_khung_quoc_gia}
                      onChange={(e) => updateField('trinh_do_theo_khung_quoc_gia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Trình độ 6">Trình độ 6</option>
                      <option value="Trình độ 7">Trình độ 7</option>
                      <option value="Trình độ 8">Trình độ 8</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bậc đào tạo <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.bac_trinh_do_theo_khung_quoc_gia}
                      onChange={(e) => updateField('bac_trinh_do_theo_khung_quoc_gia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Đại học">Đại học</option>
                      <option value="Thạc sĩ">Thạc sĩ</option>
                      <option value="Tiến sĩ">Tiến sĩ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Năm tốt nghiệp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.nam_tot_nghiep}
                      onChange={(e) => updateField('nam_tot_nghiep', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Xếp loại tốt nghiệp
                    </label>
                    <select
                      value={formData.xep_loai}
                      onChange={(e) => updateField('xep_loai', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Chọn xếp loại</option>
                      <option value="Xuất sắc">Xuất sắc</option>
                      <option value="Giỏi">Giỏi</option>
                      <option value="Khá">Khá</option>
                      <option value="Trung bình">Trung bình</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      value={formData.ghi_chu}
                      onChange={(e) => updateField('ghi_chu', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Thông tin bổ sung..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Thông tin cấp bằng */}
            {activeTab === 'certification' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số QĐ công nhận TN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.so_quyet_dinh_cong_nhan_tot_nghiep}
                      onChange={(e) => updateField('so_quyet_dinh_cong_nhan_tot_nghiep', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="1234/QĐ-HPU"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày QĐ công nhận TN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ngay_quyet_dinh_cong_nhan_tot_nghiep}
                      onChange={(e) => updateField('ngay_quyet_dinh_cong_nhan_tot_nghiep', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="15/06/2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số QĐ hội đồng đánh giá
                    </label>
                    <input
                      type="text"
                      value={formData.so_quyet_dinh_hoi_dong_danh_gia}
                      onChange={(e) => updateField('so_quyet_dinh_hoi_dong_danh_gia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="(Nếu có)"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn vị cấp bằng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.don_vi_cap_bang}
                      onChange={(e) => updateField('don_vi_cap_bang', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã đơn vị cấp bằng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ma_don_vi_cap_bang}
                      onChange={(e) => updateField('ma_don_vi_cap_bang', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa danh cấp VB <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.dia_danh_cap_vbcc}
                      onChange={(e) => updateField('dia_danh_cap_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày cấp văn bằng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ngay_cap_vbcc}
                      onChange={(e) => updateField('ngay_cap_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="20/06/2024"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">👨‍💼 Người ký văn bằng</h4>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ tên người ký <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ho_ten_nguoi_ky_vbcc}
                      onChange={(e) => updateField('ho_ten_nguoi_ky_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="PGS.TS. Nguyễn Văn B"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số CCCD người ký <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.so_ddcn_nguoi_ky_vbcc}
                      onChange={(e) => updateField('so_ddcn_nguoi_ky_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="001987654321"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chức danh người ký <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.chuc_danh_nguoi_ky_vbcc}
                      onChange={(e) => updateField('chuc_danh_nguoi_ky_vbcc', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Hiệu trưởng"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">📝 Người ký bản giấy (nếu có)</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ tên người ký bản giấy
                    </label>
                    <input
                      type="text"
                      value={formData.ho_ten_nguoi_ky_vbcc_ban_giay}
                      onChange={(e) => updateField('ho_ten_nguoi_ky_vbcc_ban_giay', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chức danh người ký bản giấy
                    </label>
                    <input
                      type="text"
                      value={formData.chuc_danh_nguoi_ky_vbcc_ban_giay}
                      onChange={(e) => updateField('chuc_danh_nguoi_ky_vbcc_ban_giay', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">🏫 Thông tin trường</h4>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên trường
                    </label>
                    <input
                      type="text"
                      value={formData.ten_truong}
                      onChange={(e) => updateField('ten_truong', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã cơ sở đào tạo
                    </label>
                    <input
                      type="text"
                      value={formData.ma_co_so_dao_tao}
                      onChange={(e) => updateField('ma_co_so_dao_tao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-xl">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Trường bắt buộc
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition-colors"
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
          </div>
        </form>
      </div>
    </div>
  );
}