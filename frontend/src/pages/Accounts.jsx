import { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { accountsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await accountsAPI.getAll();
      setAccounts(res.data.data);
    } catch (error) {
      toast.error('Failed to load accounts');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await accountsAPI.import({ accounts: data.accounts || data });
      toast.success('Accounts imported');
      loadAccounts();
    } catch (error) {
      toast.error('Import failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <label className="btn-primary cursor-pointer">
          <Upload className="w-4 h-4 mr-2" />
          Import JSON
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((acc) => (
              <tr key={acc._id}>
                <td className="px-6 py-4">{acc.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    acc.status === 'active' ? 'bg-green-100 text-green-800' :
                    acc.status === 'blocked' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {acc.status}
                  </span>
                </td>
                <td className="px-6 py-4">{acc.projects?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}