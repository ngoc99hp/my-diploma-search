"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

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
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
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
        toast.success(`Chào mừng trở lại, ${data.admin.full_name}! 👋`);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error('Không thể xác thực, vui lòng đăng nhập lại');
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
      toast.success('Đăng xuất thành công');
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Đăng xuất thất bại');
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
      toast.error('Không thể tải danh sách văn bằng');
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
      toast.error('Không thể tải nhật ký tra cứu');
    }
  };

  const handleDeleteDiploma = async (id, diplomaNumber) => {
    toast.promise(
      (async () => {
        const response = await fetch(`/api/admin/diplomas?id=${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
          loadDiplomas();
          return data.message;
        } else {
          throw new Error(data.message || 'Xóa thất bại');
        }
      })(),
      {
        loading: 'Đang xóa văn bằng...',
        success: (message) => message || 'Xóa văn bằng thành công! 🗑️',
        error: (err) => err.message || 'Xóa văn bằng thất bại'
      }
    );
  };

  const handleSaveDiploma = async (formData) => {
    const isEditing = !!editingDiploma;
    
    toast.promise(
      (async () => {
        const url = isEditing 
          ? `/api/admin/diplomas?id=${editingDiploma.id}`
          : '/api/admin/diplomas';
        
        const response = await fetch(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
          setShowModal(false);
          setEditingDiploma(null);
          loadDiplomas();
          return data.message;
        } else {
          throw new Error(data.message || 'Lưu thất bại');
        }
      })(),
      {
        loading: isEditing ? 'Đang cập nhật...' : 'Đang thêm văn bằng...',
        success: (message) => {
          return isEditing 
            ? `${message || 'Cập nhật thành công'} ✅` 
            : `${message || 'Thêm văn bằng thành công'} 🎉`;
        },
        error: (err) => err.message || 'Có lỗi xảy ra'
      }
    );
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/import');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import_vanbang.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Tải template thành công! 📥');
      } else {
        toast.error('Không thể tải template');
      }
    } catch (error) {
      console.error('Download template failed:', error);
      toast.error('Lỗi khi tải template');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }

    setImporting(true);

    const formData = new FormData();
    formData.append('file', importFile);

    toast.promise(
      (async () => {
        const response = await fetch('/api/admin/import', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          setShowImportModal(false);
          setImportFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          loadDiplomas();

          if (data.results.failed > 0) {
            return {
              message: data.message,
              showErrors: true,
              errors: data.results.errors
            };
          }
          return data.message;
        } else {
          throw new Error(data.message || 'Import thất bại');
        }
      })(),
      {
        loading: 'Đang import dữ liệu...',
        success: (result) => {
          if (result.showErrors) {
            setTimeout(() => {
              toast.error(
                <div className="max-h-48 overflow-y-auto">
                  <p className="font-semibold mb-2">Có {result.errors.length} lỗi:</p>
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <p key={idx} className="text-xs">
                      Dòng {err.row}: {err.message}
                    </p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs mt-1 italic">... và {result.errors.length - 5} lỗi khác</p>
                  )}
                </div>,
                { duration: 10000 }
              );
            }, 500);
          }
          return result.message || 'Import thành công! 📊';
        },
        error: (err) => err.message || 'Import thất bại',
        finally: () => setImporting(false)
      }
    );
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
    <>
      <Toaster position="top-right" richColors />
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
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Import Excel
                    </button>
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
                      Thêm văn bằng
                    </button>
                  </div>
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
                              onClick={() => {
                                toast(
                                  <div>
                                    <p className="font-medium">Xác nhận xóa văn bằng?</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Số hiệu: {diploma.diploma_number}
                                    </p>
                                  </div>,
                                  {
                                    action: {
                                      label: 'Xóa',
                                      onClick: () => handleDeleteDiploma(diploma.id, diploma.diploma_number)
                                    },
                                    cancel: {
                                      label: 'Hủy'
                                    }
                                  }
                                );
                              }}
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

        {/* Import Excel Modal */}
        {showImportModal && (
          <ImportModal
            file={importFile}
            importing={importing}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDownloadTemplate={handleDownloadTemplate}
            onImport={handleImport}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          />
        )}
      </div>
    </>
  );
}

function ImportModal({ file, importing, fileInputRef, onFileSelect, onDownloadTemplate, onImport, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Import văn bằng từ Excel</h3>
          <button onClick={onClose} disabled={importing} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Hướng dẫn:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tải file template mẫu</li>
                  <li>Điền đầy đủ thông tin vào file Excel</li>
                  <li>Chọn file và nhấn "Import"</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={onDownloadTemplate}
            disabled={importing}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Tải file template mẫu (.xlsx)
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn file Excel để import
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileSelect}
              disabled={importing}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p>Các văn bằng có số hiệu trùng sẽ bị bỏ qua. Vui lòng kiểm tra kỹ dữ liệu trước khi import.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={onImport}
            disabled={!file || importing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {importing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang import...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
              </>
            )}
          </button>
        </div>
      </div>
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