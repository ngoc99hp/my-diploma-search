// src/app/admin/dashboard/components/DiplomasTable.js - Updated for Schema v2.0
import { toast } from 'sonner';
import Pagination from './Pagination';

export default function DiplomasTable({
  diplomas,
  searchTerm,
  setSearchTerm,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onAddNew,
  onImport
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý văn bằng</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tổng: {pagination.total} văn bằng
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onImport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Excel
          </button>
          <button
            onClick={onAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
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
          placeholder="🔍 Tìm kiếm theo số hiệu, họ tên, mã SV, ngành, mã định danh..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã định danh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số hiệu VB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã SV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngành</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Năm TN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {diplomas.map((diploma) => (
                <tr key={diploma.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-blue-600">
                    {diploma.ma_dinh_danh_vbcc}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {diploma.so_hieu_vbcc}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {diploma.ho_va_ten}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {diploma.ma_nguoi_hoc}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={diploma.nganh_dao_tao}>
                      {diploma.nganh_dao_tao}
                    </div>
                    {diploma.chuyen_nganh_dao_tao && (
                      <div className="text-xs text-gray-400 truncate" title={diploma.chuyen_nganh_dao_tao}>
                        {diploma.chuyen_nganh_dao_tao}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{diploma.nam_tot_nghiep}</div>
                    {diploma.xep_loai && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {diploma.xep_loai}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <button
                      onClick={() => onEdit(diploma)}
                      className="text-blue-600 hover:text-blue-800 mr-3 font-medium transition-colors"
                      title="Chỉnh sửa"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => {
                        toast(
                          <div>
                            <p className="font-medium">⚠️ Xác nhận xóa văn bằng?</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Số hiệu: <strong>{diploma.so_hieu_vbcc}</strong>
                            </p>
                            <p className="text-sm text-gray-600">
                              Họ tên: <strong>{diploma.ho_va_ten}</strong>
                            </p>
                          </div>,
                          {
                            action: {
                              label: 'Xóa',
                              onClick: () => onDelete(diploma.id, diploma.so_hieu_vbcc)
                            },
                            cancel: {
                              label: 'Hủy'
                            },
                            duration: 5000
                          }
                        );
                      }}
                      className="text-red-600 hover:text-red-800 font-medium transition-colors"
                      title="Xóa"
                    >
                      🗑️ Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {diplomas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">Không tìm thấy văn bằng nào</p>
            <p className="text-sm mt-1">Thử tìm kiếm với từ khóa khác hoặc thêm văn bằng mới</p>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}