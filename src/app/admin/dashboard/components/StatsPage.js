// src/app/admin/dashboard/components/StatsPage.js

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load stats
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else {
        toast.error(data.message || 'Không thể tải thống kê');
      }
    } catch (error) {
      console.error('Load stats error:', error);
      toast.error('Lỗi khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = async () => {
    if (!confirm('Xác nhận xóa toàn bộ cache?')) return;

    try {
      const response = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadStats();
      } else {
        toast.error(data.message || 'Không thể xóa cache');
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      toast.error('Lỗi khi xóa cache');
    }
  };

  // Auto refresh
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadStats();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">Không thể tải thống kê</p>
      </div>
    );
  }

  const { summary, cache, database, pool, system } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Performance Monitor</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time system statistics
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Auto Refresh'}
          </button>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={clearCache}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90 mb-1">Total Diplomas</div>
          <div className="text-3xl font-bold">{summary.quick.totalDiplomas?.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90 mb-1">Searches (24h)</div>
          <div className="text-3xl font-bold">{summary.quick.searches24h?.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90 mb-1">Cache Hit Rate</div>
          <div className="text-3xl font-bold">{summary.quick.cacheHitRate}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="text-sm opacity-90 mb-1">Success Rate</div>
          <div className="text-3xl font-bold">{summary.quick.successRate}</div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">💾</span>
          Cache Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-gray-500">Size</div>
            <div className="text-2xl font-bold text-gray-800">{cache.size}</div>
            <div className="text-xs text-gray-400">entries</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Hits</div>
            <div className="text-2xl font-bold text-green-600">{cache.hits}</div>
            <div className="text-xs text-gray-400">requests</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Misses</div>
            <div className="text-2xl font-bold text-red-600">{cache.misses}</div>
            <div className="text-xs text-gray-400">requests</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Hit Rate</div>
            <div className="text-2xl font-bold text-blue-600">{cache.hitRate}</div>
            <div className="text-xs text-gray-400">efficiency</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">TTL</div>
            <div className="text-2xl font-bold text-gray-800">{cache.ttl / 60000}m</div>
            <div className="text-xs text-gray-400">minutes</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Performance (Last 24h)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-2">Average Response Time</div>
            <div className="text-3xl font-bold text-blue-600">
              {database.performance.last24h.avg}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Max Response Time</div>
            <div className="text-3xl font-bold text-orange-600">
              {database.performance.last24h.max}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Min Response Time</div>
            <div className="text-3xl font-bold text-green-600">
              {database.performance.last24h.min}
            </div>
          </div>
        </div>
      </div>

      {/* Search Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🔍</span>
            Search Stats (24h)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Searches</span>
              <span className="font-bold text-gray-800">{database.searches.last24h.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Successful</span>
              <span className="font-bold text-green-600">{database.searches.last24h.successful}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Failed</span>
              <span className="font-bold text-red-600">{database.searches.last24h.failed}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-600 font-medium">Success Rate</span>
              <span className="font-bold text-blue-600 text-lg">{database.searches.last24h.successRate}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Search Stats (7 days)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Searches</span>
              <span className="font-bold text-gray-800">{database.searches.last7days.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Unique Visitors</span>
              <span className="font-bold text-purple-600">{database.searches.last7days.uniqueVisitors}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-600 font-medium">Avg per day</span>
              <span className="font-bold text-blue-600 text-lg">
                {Math.round(database.searches.last7days.total / 7)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Searched */}
      {database.topSearched && database.topSearched.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🔥</span>
            Top Searched Diplomas (7 days)
          </h3>
          <div className="space-y-2">
            {database.topSearched.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-300 mr-4">#{index + 1}</span>
                  <span className="font-mono font-medium text-gray-800">{item.diploma_number}</span>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {item.search_count} searches
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Pool */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🔗</span>
          Connection Pool
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-800">{pool.total}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Idle</div>
            <div className="text-2xl font-bold text-green-600">{pool.idle}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Waiting</div>
            <div className="text-2xl font-bold text-orange-600">{pool.waiting}</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⚙️</span>
          System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Node Version</div>
            <div className="font-mono text-sm text-gray-800">{system.nodeVersion}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Platform</div>
            <div className="font-mono text-sm text-gray-800">{system.platform}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Memory Used</div>
            <div className="font-mono text-sm text-gray-800">{system.memory.used}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Uptime</div>
            <div className="font-mono text-sm text-gray-800">{system.uptime}</div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(summary.timestamp).toLocaleString('vi-VN')}
        {autoRefresh && <span className="ml-2 text-green-600">(Auto-refreshing every 5s)</span>}
      </div>
    </div>
  );
}