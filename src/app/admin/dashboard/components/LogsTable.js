// src/app/admin/dashboard/components/LogsTable.js
import Pagination from './Pagination';

export default function LogsTable({ logs, stats, pagination, onPageChange }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Nhật ký tra cứu</h2>
        <p className="text-sm text-gray-600 mt-1">
          Tổng: {pagination.total} lượt tra cứu (7 ngày gần nhất)
        </p>
      </div>

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
            {logs.map((log) => (
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