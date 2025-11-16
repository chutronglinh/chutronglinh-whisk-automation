import { useEffect, useState } from 'react';
import { Upload, Download, Trash2, User, Plus, RefreshCw, Key, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://192.168.163.149/api';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    recoveryEmail: '',
    twoFASecret: '',
    phone: ''
  });

  useEffect(() => {
    loadAccounts();
    loadStats();
    
    // Auto refresh mỗi 10 giây
    const interval = setInterval(() => {
      loadAccounts();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/accounts`);
      setAccounts(res.data.data);
    } catch (error) {
      toast.error('Failed to load accounts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/accounts/stats`);
      setStats(res.data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/accounts/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(res.data.message || `Imported ${res.data.imported} accounts`);
      
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn('Import errors:', res.data.errors);
      }
      
      loadAccounts();
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to import CSV');
    }
    
    e.target.value = '';
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/accounts`, formData);
      toast.success(res.data.message || 'Account added successfully');
      setShowAddForm(false);
      setFormData({
        email: '',
        password: '',
        recoveryEmail: '',
        twoFASecret: '',
        phone: ''
      });
      loadAccounts();
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add account');
    }
  };

  // Simple login - 100% thủ công
  const handleSimpleLogin = async (accountId) => {
    try {
      const res = await axios.post(`${API_BASE}/accounts/${accountId}/simple-login`);
      toast.success(res.data.message || 'Browser opening on server. Please login manually.');
      
      setTimeout(() => {
        loadAccounts();
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start manual login');
    }
  };

  // Extract cookie - LUÔN CHO PHÉP
  const handleExtractCookie = async (accountId) => {
    try {
      const res = await axios.post(`${API_BASE}/accounts/${accountId}/extract-cookie`);
      toast.success(res.data.message || 'Extracting session cookie...');
      
      setTimeout(() => {
        loadAccounts();
      }, 5000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to extract cookie');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await axios.delete(`${API_BASE}/accounts/${id}`);
      toast.success('Account deleted');
      loadAccounts();
      loadStats();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const downloadTemplate = () => {
    const csv = `email,password,recover_mail,twoFA
example1@gmail.com,Password123,,SECRETKEY123
example2@gmail.com,Password456,recovery@gmail.com,SECRETKEY456`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounts-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'login-required': 'bg-blue-100 text-blue-800',
      'processing': 'bg-purple-100 text-purple-800',
      'blocked': 'bg-red-100 text-red-800',
      'error': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCookieStatusBadge = (acc) => {
    const cookieStatus = acc.metadata?.cookieStatus || 'none';
    
    const badges = {
      'active': <span className="text-xs text-green-600 flex items-center gap-1">✓ Active</span>,
      'extracting': <span className="text-xs text-blue-600 flex items-center gap-1">⏳ Extracting...</span>,
      'failed': <span className="text-xs text-red-600 flex items-center gap-1" title={acc.metadata?.cookieError}>✗ Failed</span>,
      'expired': <span className="text-xs text-orange-600 flex items-center gap-1">⚠ Expired</span>,
      'none': <span className="text-xs text-gray-400">➖ No Cookie</span>
    };
    
    return badges[cookieStatus] || badges['none'];
  };

  const formatTimeAgo = (date) => {
    if (!date) return '-';
    
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getCookieButtonText = (acc) => {
    if (acc.metadata?.cookieStatus === 'extracting') return 'Extracting...';
    if (acc.sessionCookie) return 'Refresh';
    return 'Get Cookie';
  };

  const getCookieButtonTitle = (acc) => {
    if (acc.metadata?.cookieStatus === 'extracting') return 'Extracting cookie...';
    if (acc.sessionCookie) {
      const lastUpdate = acc.lastCookieUpdate 
        ? new Date(acc.lastCookieUpdate).toLocaleString() 
        : 'Unknown';
      return `Last updated: ${lastUpdate}. Click to refresh.`;
    }
    return 'Extract session cookie from Whisk';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-gray-600 mt-1">
            Total: {stats.total || 0} | Active: {stats.byStatus?.active || 0} | 
            Cookies: {stats.byCookieStatus?.active || 0} active
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={loadAccounts}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button 
            onClick={() => setShowAddForm(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Manual
          </button>

          <button 
            onClick={downloadTemplate}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV Template
          </button>

          <label className="btn-primary cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCSVImport} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Account Manually</h2>
          <form onSubmit={handleAddManual} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recovery Email</label>
              <input
                type="email"
                value={formData.recoveryEmail}
                onChange={(e) => setFormData({...formData, recoveryEmail: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">2FA Secret</label>
              <input
                type="text"
                value={formData.twoFASecret}
                onChange={(e) => setFormData({...formData, twoFASecret: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Optional: Base32 secret"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">
                Add Account
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cookie Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Cookie Update
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                2FA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((acc) => (
              <tr key={acc._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{acc.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(acc.status)}`}>
                    {acc.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getCookieStatusBadge(acc)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(acc.lastCookieUpdate)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {acc.twoFASecret ? '✓ Yes' : '-'}
                </td>
                <td className="px-6 py-4 text-sm">{acc.source}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 items-center">
                    {/* LUÔN HIỂN THỊ GET COOKIE */}
                    <button 
                      onClick={() => handleExtractCookie(acc._id)}
                      className={`flex items-center gap-1 ${
                        acc.metadata?.cookieStatus === 'extracting'
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-purple-600 hover:text-purple-800'
                      }`}
                      disabled={acc.metadata?.cookieStatus === 'extracting'}
                      title={getCookieButtonTitle(acc)}
                    >
                      <Key className="w-4 h-4" />
                      <span className="text-xs">{getCookieButtonText(acc)}</span>
                    </button>
                    
                    {/* Login button - chỉ hiện khi chưa login */}
                    {(acc.status === 'login-required' || acc.status === 'error') && (
                      <button 
                        onClick={() => handleSimpleLogin(acc._id)}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1"
                        title="Manual Login"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-xs">Login</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDelete(acc._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {accounts.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No accounts yet. Import CSV or add manually.
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-gray-500">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}