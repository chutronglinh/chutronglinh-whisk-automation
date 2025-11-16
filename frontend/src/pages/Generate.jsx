import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function Generate() {
  const [prompts, setPrompts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [selections, setSelections] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);

  useEffect(() => {
    fetchPrompts();
    fetchAccounts();
    fetchQueueStatus();
    
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/prompts?status=active&limit=100`);
      setPrompts(response.data.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/accounts?status=active&limit=100`);
      const accs = response.data.data;
      setAccounts(accs);
      
      // Fetch projects for each account
      const projectsMap = {};
      for (const acc of accs) {
        try {
          const projRes = await axios.get(`${API_BASE}/accounts/${acc._id}/projects`);
          projectsMap[acc._id] = projRes.data.data;
        } catch (err) {
          projectsMap[acc._id] = [];
        }
      }
      setProjects(projectsMap);
      
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/generate/queue-status`);
      setQueueStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching queue status:', error);
    }
  };

  const togglePrompt = (promptId) => {
    setSelectedPrompts(prev => 
      prev.includes(promptId) 
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    );
  };

  const addSelection = () => {
    setSelections([...selections, { accountId: '', projectId: '' }]);
  };

  const updateSelection = (index, field, value) => {
    const newSelections = [...selections];
    newSelections[index][field] = value;
    
    // Reset projectId if accountId changed
    if (field === 'accountId') {
      newSelections[index].projectId = '';
    }
    
    setSelections(newSelections);
  };

  const removeSelection = (index) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    // Validation
    if (selectedPrompts.length === 0) {
      alert('Please select at least one prompt');
      return;
    }

    if (selections.length === 0) {
      alert('Please add at least one account-project selection');
      return;
    }

    for (let i = 0; i < selections.length; i++) {
      if (!selections[i].accountId || !selections[i].projectId) {
        alert(`Selection ${i + 1}: Please select both account and project`);
        return;
      }
    }

    // Build API payload
    const payload = {
      selections: selections.map(sel => ({
        accountId: sel.accountId,
        projectId: sel.projectId,
        promptIds: selectedPrompts
      }))
    };

    try {
      setGenerating(true);
      const response = await axios.post(`${API_BASE}/generate/start`, payload);
      
      alert(`✅ Started ${response.data.data.totalJobs} generation job(s)!\n\nCheck the Gallery page to see results.`);
      
      // Reset
      setSelectedPrompts([]);
      setSelections([]);
      
      // Refresh queue status
      fetchQueueStatus();
      
    } catch (error) {
      console.error('Error starting generation:', error);
      alert(error.response?.data?.error || 'Failed to start generation');
    } finally {
      setGenerating(false);
    }
  };

  const selectAllPrompts = () => {
    setSelectedPrompts(prompts.map(p => p._id));
  };

  const clearAllPrompts = () => {
    setSelectedPrompts([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Images</h1>
        <p className="text-gray-600 mt-1">Select prompts and accounts to generate images</p>
      </div>

      {/* Queue Status */}
      {queueStatus && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Queue Status</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{queueStatus.waiting}</div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{queueStatus.active}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{queueStatus.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{queueStatus.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{queueStatus.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Prompts Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select Prompts</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllPrompts}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={clearAllPrompts}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Selected: {selectedPrompts.length} / {prompts.length}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {prompts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No prompts available. Please create prompts first.
                </div>
              ) : (
                prompts.map((prompt) => (
                  <div
                    key={prompt._id}
                    onClick={() => togglePrompt(prompt._id)}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedPrompts.includes(prompt._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPrompts.includes(prompt._id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{prompt.text}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {prompt.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {prompt.aspectRatioName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Account-Project Selections */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select Accounts & Projects</h2>
              <button
                onClick={addSelection}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ➕ Add
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Click "Add" to select accounts and projects
                </div>
              ) : (
                selections.map((selection, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Selection {index + 1}
                      </span>
                      <button
                        onClick={() => removeSelection(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Account</label>
                        <select
                          value={selection.accountId}
                          onChange={(e) => updateSelection(index, 'accountId', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded"
                        >
                          <option value="">Select Account</option>
                          {accounts.map(acc => (
                            <option key={acc._id} value={acc._id}>
                              {acc.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Project</label>
                        <select
                          value={selection.projectId}
                          onChange={(e) => updateSelection(index, 'projectId', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded"
                          disabled={!selection.accountId}
                        >
                          <option value="">Select Project</option>
                          {selection.accountId && projects[selection.accountId]?.map(proj => (
                            <option key={proj._id} value={proj._id}>
                              {proj.name}
                            </option>
                          ))}
                        </select>
                        {selection.accountId && (!projects[selection.accountId] || projects[selection.accountId].length === 0) && (
                          <p className="text-xs text-red-600 mt-1">
                            No projects for this account. Create one first.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">
              Ready to generate: <strong>{selectedPrompts.length}</strong> prompts × <strong>{selections.length}</strong> selections = <strong>{selectedPrompts.length * selections.length}</strong> jobs
            </div>
            {selectedPrompts.length > 0 && selections.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Each job will generate multiple images (usually 2-4)
              </div>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedPrompts.length === 0 || selections.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? '🔄 Generating...' : '🚀 Start Generation'}
          </button>
        </div>
      </div>
    </div>
  );
}