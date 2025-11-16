import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { promptsAPI, accountsAPI, jobsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Generate() {
  const [prompts, setPrompts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, a] = await Promise.all([
        promptsAPI.getAll(),
        accountsAPI.getAll()
      ]);
      setPrompts(p.data.data);
      setAccounts(a.data.data.filter(acc => acc.status === 'active'));
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleGenerate = async () => {
    if (selectedPrompts.length === 0 || selectedAccounts.length === 0) {
      toast.error('Select prompts and accounts');
      return;
    }

    try {
      await jobsAPI.generate({
        promptIds: selectedPrompts,
        accountIds: selectedAccounts,
        config: {}
      });
      toast.success('Generation started!');
    } catch (error) {
      toast.error('Failed to start generation');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Generate Images</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Select Items</h2>
        <p className="text-gray-600 mb-4">Prompts: {selectedPrompts.length} | Accounts: {selectedAccounts.length}</p>
        
        <button onClick={handleGenerate} className="btn-primary">
          <Play className="w-4 h-4 mr-2" />
          Start Generation ({selectedPrompts.length} × {selectedAccounts.length})
        </button>
      </div>
    </div>
  );
}