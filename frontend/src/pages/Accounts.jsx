import { useState, useEffect } from 'react';

const API_BASE = '/api';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    cookies: 0
  });

  useEffect(() => {
    fetchAccounts();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchAccounts();
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE}/accounts`);
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/accounts/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats({
          total: data.data.total,
          active: data.data.active,
          cookies: data.data.withCookies
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleImportCSV = async (file) => {
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/accounts/import`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        let message = `✅ Import Successful!\n\n`;
        message += `Imported: ${data.data.imported}\n`;
        message += `Skipped: ${data.data.skipped}\n`;
        message += `Errors: ${data.data.errors}\n`;
        
        if (data.data.skippedDetails && data.data.skippedDetails.length > 0) {
          message += `\nSkipped accounts:\n`;
          data.data.skippedDetails.slice(0, 5).forEach(item => {
            message += `- ${item.email || 'Line ' + item.line}: ${item.reason}\n`;
          });
          if (data.data.skippedDetails.length > 5) {
            message += `... and ${data.data.skippedDetails.length - 5} more\n`;
          }
        }

        alert(message);
        fetchAccounts();
        fetchStats();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      handleImportCSV(file);
    }
    event.target.value = '';
  };

  const handleSimpleLogin = async (accountId) => {
    if (!confirm('⚠️ Browser will open on SERVER desktop.\n\nMake sure you have Remote Desktop access.\n\nContinue?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/accounts/${accountId}/simple-login`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Browser opened on server!\n\nGo to server desktop and complete login manually.\n\n' + data.data.message);
        fetchAccounts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Simple login error:', error);
      alert('❌ Failed to start login: ' + error.message);
    }
  };

  const handleExtractCookie = async (accountId) => {
    try {
      const response = await fetch(`${API_BASE}/accounts/${accountId}/extract-cookie`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Cookie extraction started!\n\n' + data.data.message);
        fetchAccounts();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Extract cookie error:', error);
      alert('❌ Failed to extract cookie: ' + error.message);
    }
  };

  const handleDelete = async (accountId) => {
    if (!confirm('Delete this account?')) return;

    try {
      const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Deleted');
        fetchAccounts();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Failed: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'active': { color: 'bg-green-100 text-green-800', text: '✅ Active' },
      'login-required': { color: 'bg-yellow-100 text-yellow-800', text: '⏳ Login Required' },
      'suspended': { color: 'bg-red-100 text-red-800', text: '❌ Suspended' },
      'login-pending': { color: 'bg-blue-100 text-blue-800', text: '⏳ Pending' },
      'simple-login-pending': { color: 'bg-purple-100 text-purple-800', text: '🔓 Logging in' }
    };

    const badge = config[status] || config['login-required'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    const now = new Date();
    const hours = Math.floor((now - d) / 3600000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">
            Total: {stats.total} | Active: {stats.active} | Cookies: {stats.cookies} active
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchAccounts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🔄 Refresh
          </button>
          
          <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
            {isImporting ? '⏳ Importing...' : '📤 Import CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isImporting}
            />
          </label>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-2xl">⏳</p>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl">👥</p>
            <p className="mt-2 text-sm text-gray-500">No accounts. Import CSV to start.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cookie Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Update</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">2FA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{account.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(account.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {account.sessionCookie ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        ❌ No Cookie
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(account.lastCookieUpdate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {account.twoFASecret ? '✅' : '❌'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.source || 'manual'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      {/* Login button: ONLY show if status = 'login-required' */}
                      {account.status === 'login-required' && (
                        <button
                          onClick={() => handleSimpleLogin(account._id)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Login
                        </button>
                      )}
                      
                      {/* Get Cookie button: show if NOT 'login-required' AND no cookie yet */}
                      {account.status !== 'login-required' && !account.sessionCookie && (
                        <button
                          onClick={() => handleExtractCookie(account._id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Get Cookie
                        </button>
                      )}
                      
                      {/* Delete button: ALWAYS show */}
                      <button
                        onClick={() => handleDelete(account._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}