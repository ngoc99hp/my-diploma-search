"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('diplomas');
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Diplomas state
  const [diplomas, setDiplomas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiploma, setEditingDiploma] = useState(null);
  
  // Logs state
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (admin) {
      loadData();
    }
  }, [currentPage, admin]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAdmin(data.admin);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loadData = async () => {
    if (currentPage === 'diplomas') {
      loadDiplomas();
    } else if (currentPage === 'logs') {
      loadLogs();
    }
  };

  const loadDiplomas = async () => {
    try {
      const response = await fetch('/api/admin/diplomas');
      const data = await response.json();
      if (data.success) {
        setDiplomas(data.diplomas);
      }
    } catch (error) {
      console.error('Load diplomas failed:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Load logs failed:', error);
    }
  };

  const handleDeleteDiploma = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa văn bằng này?')) return;
    
    try {
      const response = await fetch(`/api/admin/diplomas?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Xóa thành công!');
        loadDiplomas();
      } else {
        alert(data.message || 'Xóa thất bại');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Đã có lỗi xảy ra');
    }
  };

  const handleSaveDiploma = async (formData) => {
    try {
      const url = editingDiploma 
        ? `/api/admin/diplomas?id=${editingDiploma.id}`
        : '/api/admin/diplomas';
      
      const response = await fetch(url, {
        method: editingDiploma ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(editingDiploma ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setShowModal(false);
        setEditingDiploma(null);
        loadDiplomas();
      } else {
        alert(data.message || 'Lưu thất bại');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Đã có lỗi xảy ra');
    }
  };

  const filteredDiplomas = diplomas.filter(d => 
    d.diploma_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-blue-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-blue-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">Admin Panel</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-blue-800 p-2 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4">
          <button
            onClick={() => setCurrentPage('diplomas')}
            className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentPage === 'diplomas' ? 'bg-blue-800' : 'hover:bg-blue-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {sidebarOpen && <span className="ml-3">Quản lý văn bằng</span>}
          </button>

          <button
            onClick={() => setCurrentPage('logs')}
            className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentPage === 'logs' ? 'bg-blue-800' : 'hover:bg-blue-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {sidebarOpen && <span className="ml-3">Nhật ký tra cứu</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800">
          {sidebarOpen && (
            <div className="mb-4 text-sm">
              <p className="font-medium">{admin?.full_name}</p>
              <p className="text-blue-300 text-xs">{admin?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span className="ml-3">Đăng xuất</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Diplomas Management */}
          {currentPage === 'diplomas' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý văn bằng</h2>
                <button
                  onClick={() => {
                    setEditingDiploma(null);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm văn bằng mới
                </button>
              </div>

              <div className="bg-white rounded-lg shadow mb-6 p-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo số hiệu, họ tên, mã SV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số hiệu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngành</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Năm TN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDiplomas.map((diploma) => (
                      <tr key={diploma.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{diploma.diploma_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{diploma.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{diploma.major}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{diploma.graduation_year}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setEditingDiploma(diploma);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteDiploma(diploma.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDiplomas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Không tìm thấy văn bằng nào
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Viewer */}
          {currentPage === 'logs' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Nhật ký tra cứu</h2>

              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Tổng tra cứu</div>
                    <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Thành công</div>
                    <div className="text-3xl font-bold text-green-600">{stats.successful}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Thất bại</div>
                    <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Tỷ lệ thành công</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số hiệu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(log.search_time).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.diploma_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.ip_address}</td>
                        <td className="px-6 py-4 text-sm">
                          {log.found ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Thành công
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Thất bại
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.response_time_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có nhật ký tra cứu nào
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Diploma */}
      {showModal && (
        <DiplomaModal
          diploma={editingDiploma}
          onClose={() => {
            setShowModal(false);
            setEditingDiploma(null);
          }}
          onSave={handleSaveDiploma}
        />
      )}
    </div>
  );
}

function DiplomaModal({ diploma, onClose, onSave }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {diploma ? 'Chỉnh sửa văn bằng' : 'Thêm văn bằng mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hệ đào tạo
              </label>
              <select
                value={formData.training_system}
                onChange={(e) => setFormData({...formData, training_system: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xếp loại tốt nghiệp
              </label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({...formData, classification: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {diploma ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}