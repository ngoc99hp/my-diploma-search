// src/app/admin/dashboard/components/ImportModal.js
import { useEffect, useState } from 'react';

export default function ImportModal({ 
  file, 
  importing, 
  fileInputRef, 
  onFileSelect, 
  onDownloadTemplate, 
  onImport, 
  onClose 
}) {
  const [importResults, setImportResults] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !importing) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, importing]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !importing) {
      onClose();
    }
  };

  const handleImport = async () => {
    const result = await onImport();
    if (result && result.results) {
      setImportResults(result.results);
      if (result.results.errors && result.results.errors.length > 0) {
        setShowErrorDetails(true);
      }
    }
    return result;
  };

  const downloadErrorReport = () => {
    if (!importResults || !importResults.errors) return;
    
    const csvContent = [
      ['Dòng', 'Số hiệu VB', 'Mã SV', 'Họ tên', 'Lỗi'].join(','),
      ...importResults.errors.map(err => [
        err.row,
        err.so_hieu || '',
        err.ma_sv || '',
        err.ho_ten || '',
        `"${err.error || err.errors?.join('; ') || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import_errors_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center rounded-t-xl flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">📊</span>
            Import văn bằng từ Excel
          </h3>
          <button 
            onClick={onClose} 
            disabled={importing} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Import Results */}
            {importResults && (
              <div className="space-y-4 mb-4">
                {/* Success Summary */}
                <div className={`border rounded-lg p-4 ${
                  importResults.failed === 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      importResults.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {importResults.failed === 0 ? (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">
                        {importResults.failed === 0 ? '🎉 Import thành công!' : '⚠️ Import hoàn tất với một số lỗi'}
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tổng số:</span>
                          <span className="ml-2 font-semibold">{importResults.total}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Thành công:</span>
                          <span className="ml-2 font-semibold text-green-600">{importResults.success}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Thất bại:</span>
                          <span className="ml-2 font-semibold text-red-600">{importResults.failed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Summary */}
                {importResults.summary && importResults.failed > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Phân loại lỗi
                    </h5>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {importResults.summary.validationErrors > 0 && (
                        <div className="bg-white p-3 rounded border border-red-200">
                          <div className="text-red-600 font-semibold text-lg">{importResults.summary.validationErrors}</div>
                          <div className="text-gray-600 text-xs">Lỗi validation</div>
                        </div>
                      )}
                      {importResults.summary.duplicates > 0 && (
                        <div className="bg-white p-3 rounded border border-orange-200">
                          <div className="text-orange-600 font-semibold text-lg">{importResults.summary.duplicates}</div>
                          <div className="text-gray-600 text-xs">Trùng lặp</div>
                        </div>
                      )}
                      {importResults.summary.dbErrors > 0 && (
                        <div className="bg-white p-3 rounded border border-purple-200">
                          <div className="text-purple-600 font-semibold text-lg">{importResults.summary.dbErrors}</div>
                          <div className="text-gray-600 text-xs">Lỗi database</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg">
                    <div 
                      className="p-4 cursor-pointer flex items-center justify-between hover:bg-red-100 transition-colors"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                    >
                      <h5 className="font-medium flex items-center text-red-800">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Chi tiết {importResults.errors.length} lỗi
                      </h5>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadErrorReport();
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Tải báo cáo lỗi
                        </button>
                        <svg 
                          className={`w-5 h-5 text-red-600 transition-transform ${showErrorDetails ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {showErrorDetails && (
                      <div className="border-t border-red-200 max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-red-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-red-800">Dòng</th>
                              <th className="px-4 py-2 text-left font-medium text-red-800">Số hiệu VB</th>
                              <th className="px-4 py-2 text-left font-medium text-red-800">Mã SV</th>
                              <th className="px-4 py-2 text-left font-medium text-red-800">Họ tên</th>
                              <th className="px-4 py-2 text-left font-medium text-red-800">Lỗi</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-red-100">
                            {importResults.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-red-50">
                                <td className="px-4 py-2 font-mono text-gray-900">{err.row}</td>
                                <td className="px-4 py-2 text-gray-700">{err.so_hieu || '-'}</td>
                                <td className="px-4 py-2 text-gray-700">{err.ma_sv || '-'}</td>
                                <td className="px-4 py-2 text-gray-700">{err.ho_ten || '-'}</td>
                                <td className="px-4 py-2 text-red-700">
                                  {err.errors ? (
                                    <ul className="list-disc list-inside space-y-1">
                                      {err.errors.map((e, i) => (
                                        <li key={i}>{e}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    err.error
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!importResults && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">📋 Hướng dẫn:</p>
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
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-50 group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span className="font-medium">Tải file template mẫu (.xlsx)</span>
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📁 Chọn file Excel để import
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={onFileSelect}
                    disabled={importing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                  />
                  {file && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center bg-green-50 border border-green-200 rounded-lg p-2">
                      <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{file.name}</span>
                      <span className="ml-auto text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p>⚠️ Các văn bằng có số hiệu trùng sẽ bị bỏ qua. Vui lòng kiểm tra kỹ dữ liệu trước khi import.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 flex-shrink-0">
          {importResults ? (
            <>
              <button
                onClick={() => {
                  setImportResults(null);
                  setShowErrorDetails(false);
                  onClose();
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm hover:shadow-md"
              >
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={importing}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition-colors shadow-sm hover:shadow-md"
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
                    🚀 Import
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}