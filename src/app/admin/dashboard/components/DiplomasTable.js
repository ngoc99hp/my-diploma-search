// src/app/admin/dashboard/components/DiplomasTable.js
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Excel
          </button>
          <button
            onClick={onAddNew}
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
          placeholder="Tìm kiếm theo số hiệu, họ tên, mã SV, ngành..."
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
            {diplomas.map((diploma) => (
              <tr key={diploma.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{diploma.diploma_number}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{diploma.full_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{diploma.major}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{diploma.graduation_year}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => onEdit(diploma)}
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
                            onClick: () => onDelete(diploma.id, diploma.diploma_number)
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
        {diplomas.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không tìm thấy văn bằng nào
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