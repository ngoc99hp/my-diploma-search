// src/app/admin/dashboard/components/Sidebar.js
export default function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen, 
  currentPage, 
  setCurrentPage, 
  admin, 
  handleLogout 
}) {
  return (
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
        <button
          onClick={() => setCurrentPage('stats')}
          className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-colors ${
            currentPage === 'stats' ? 'bg-blue-800' : 'hover:bg-blue-800'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {sidebarOpen && <span className="ml-3">📊 Performance</span>}
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
  );
}