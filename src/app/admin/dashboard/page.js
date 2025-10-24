"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

// Import components
import Sidebar from './components/Sidebar';
import DiplomasTable from './components/DiplomasTable';
import LogsTable from './components/LogsTable';
import DiplomaModal from './components/DiplomaModal';
import ImportModal from './components/ImportModal';
import StatsPage from './components/StatsPage';

export default function AdminDashboard() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // UI State
  const [currentPage, setCurrentPage] = useState('diplomas');
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Diplomas State
  const [diplomas, setDiplomas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiploma, setEditingDiploma] = useState(null);
  const [diplomasPagination, setDiplomasPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  
  // Logs State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Effects
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (admin) loadData();
  }, [currentPage, admin, diplomasPagination.page, logsPagination.page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 'diplomas') {
        setDiplomasPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Error Handler
  const handleApiError = async (response) => {
    if (response.status === 401) {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      setTimeout(() => router.push('/admin/login'), 1500);
      return true;
    }
    return false;
  };

  // Auth Functions
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
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

  // Data Loading Functions
  const loadData = () => {
    if (currentPage === 'diplomas') loadDiplomas();
    else if (currentPage === 'logs') loadLogs();
  };

  const loadDiplomas = async () => {
    try {
      const params = new URLSearchParams({
        page: diplomasPagination.page.toString(),
        limit: diplomasPagination.limit.toString(),
        search: searchTerm
      });
      const response = await fetch(`/api/admin/diplomas?${params}`);
      if (await handleApiError(response)) return;
      const data = await response.json();
      if (data.success) {
        setDiplomas(data.diplomas);
        setDiplomasPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        toast.error(data.message || 'Không thể tải danh sách văn bằng');
      }
    } catch (error) {
      console.error('Load diplomas failed:', error);
      toast.error('Không thể tải danh sách văn bằng');
    }
  };

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: logsPagination.page.toString(),
        limit: logsPagination.limit.toString(),
        days: '7'
      });
      const response = await fetch(`/api/admin/logs?${params}`);
      if (await handleApiError(response)) return;
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
        setLogsPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        toast.error(data.message || 'Không thể tải nhật ký tra cứu');
      }
    } catch (error) {
      console.error('Load logs failed:', error);
      toast.error('Không thể tải nhật ký tra cứu');
    }
  };

  // Diploma CRUD Functions
  const handleDeleteDiploma = async (id) => {
    toast.promise(
      (async () => {
        const response = await fetch(`/api/admin/diplomas?id=${id}`, { method: 'DELETE' });
        if (await handleApiError(response)) throw new Error('Session expired');
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
        error: (err) => err.message === 'Session expired' ? '' : (err.message || 'Xóa văn bằng thất bại')
      }
    );
  };

  const handleSaveDiploma = async (formData) => {
    const isEditing = !!editingDiploma;
    toast.promise(
      (async () => {
        const url = isEditing ? `/api/admin/diplomas?id=${editingDiploma.id}` : '/api/admin/diplomas';
        const response = await fetch(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (await handleApiError(response)) throw new Error('Session expired');
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
        success: (message) => isEditing ? `${message || 'Cập nhật thành công'} ✅` : `${message || 'Thêm văn bằng thành công'} 🎉`,
        error: (err) => err.message === 'Session expired' ? '' : (err.message || 'Có lỗi xảy ra')
      }
    );
  };

  // Import Functions
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/import');
      if (await handleApiError(response)) return;
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
        const response = await fetch('/api/admin/import', { method: 'POST', body: formData });
        if (await handleApiError(response)) throw new Error('Session expired');
        const data = await response.json();
        if (data.success) {
          setShowImportModal(false);
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          loadDiplomas();
          if (data.results.failed > 0) {
            return { message: data.message, showErrors: true, errors: data.results.errors };
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
                    <p key={idx} className="text-xs">Dòng {err.row}: {err.message}</p>
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
        error: (err) => err.message === 'Session expired' ? '' : (err.message || 'Import thất bại'),
        finally: () => setImporting(false)
      }
    );
  };

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
        {/* Sidebar - Fixed width, no shrink */}
        <div className="flex-shrink-0">
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            admin={admin}
            handleLogout={handleLogout}
          />
        </div>

        {/* Main Content - Proper overflow handling */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {currentPage === 'diplomas' && (
                <DiplomasTable
                  diplomas={diplomas}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  pagination={diplomasPagination}
                  onPageChange={(page) => setDiplomasPagination(prev => ({ ...prev, page }))}
                  onEdit={(diploma) => {
                    setEditingDiploma(diploma);
                    setShowModal(true);
                  }}
                  onDelete={handleDeleteDiploma}
                  onAddNew={() => {
                    setEditingDiploma(null);
                    setShowModal(true);
                  }}
                  onImport={() => setShowImportModal(true)}
                />
              )}

              {currentPage === 'logs' && (
                <LogsTable
                  logs={logs}
                  stats={stats}
                  pagination={logsPagination}
                  onPageChange={(page) => setLogsPagination(prev => ({ ...prev, page }))}
                />
              )}

              {currentPage === 'stats' && (
                <StatsPage />
              )}
            </div>
          </div>
        </div>

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
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        )}
      </div>
    </>
  );
}