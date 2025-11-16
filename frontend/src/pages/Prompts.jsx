import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api';

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: 'active', search: '' });
  const [stats, setStats] = useState(null);
  
  const [formData, setFormData] = useState({
    text: '',
    category: 'general',
    tags: [],
    status: 'active',
    metadata: {
      aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      imageModel: 'IMAGEN_3_5',
      mediaCategory: 'MEDIA_CATEGORY_BOARD',
      seed: null
    }
  });

  useEffect(() => {
    fetchPrompts();
    fetchCategories();
    fetchStats();
  }, [filter]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      
      const response = await axios.get(`${API_BASE}/prompts?${params}`);
      setPrompts(response.data.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      alert('Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/prompts/categories`);
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/prompts/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPrompt) {
        await axios.put(`${API_BASE}/prompts/${editingPrompt._id}`, formData);
      } else {
        await axios.post(`${API_BASE}/prompts`, formData);
      }
      
      setShowForm(false);
      setEditingPrompt(null);
      resetForm();
      fetchPrompts();
      fetchStats();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert(error.response?.data?.error || 'Failed to save prompt');
    }
  };

  const handleEdit = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      text: prompt.text,
      category: prompt.category,
      tags: prompt.tags || [],
      status: prompt.status,
      metadata: prompt.metadata
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      await axios.delete(`${API_BASE}/prompts/${id}`);
      fetchPrompts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt');
    }
  };

  const handleImportJSON = async () => {
    const input = prompt('Paste JSON array of prompts:');
    if (!input) return;
    
    try {
      const prompts = JSON.parse(input);
      const response = await axios.post(`${API_BASE}/prompts/import`, { prompts });
      alert(response.data.message);
      fetchPrompts();
      fetchStats();
    } catch (error) {
      console.error('Error importing prompts:', error);
      alert(error.response?.data?.error || 'Failed to import prompts');
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      category: 'general',
      tags: [],
      status: 'active',
      metadata: {
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        imageModel: 'IMAGEN_3_5',
        mediaCategory: 'MEDIA_CATEGORY_BOARD',
        seed: null
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prompts</h1>
          <p className="text-gray-600 mt-1">Manage your text prompts for image generation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportJSON}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📥 Import JSON
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingPrompt(null);
              resetForm();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Add Prompt
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Prompts</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-green-600">Active</div>
            <div className="text-2xl font-bold text-green-900">{stats.active}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-900">{stats.inactive}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <div className="text-sm text-blue-600">Categories</div>
            <div className="text-2xl font-bold text-blue-900">{Object.keys(stats.byCategory).length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search prompts..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Text *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  required
                  placeholder="A cute orange kitten playing with a ball of yarn..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="general, animals, nature..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="cute, kitten, fluffy"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Generation Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                    <select
                      value={formData.metadata.aspectRatio}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, aspectRatio: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape</option>
                      <option value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait</option>
                      <option value="IMAGE_ASPECT_RATIO_SQUARE">Square</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Model</label>
                    <select
                      value={formData.metadata.imageModel}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, imageModel: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="IMAGEN_3">Imagen 3</option>
                      <option value="IMAGEN_3_5">Imagen 3.5</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPrompt(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPrompt ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prompts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : prompts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No prompts found. Click "Add Prompt" to create one.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prompt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prompts.map((prompt) => (
                <tr key={prompt._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={prompt.text}>
                      {prompt.text}
                    </div>
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {prompt.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{prompt.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{prompt.aspectRatioName}</div>
                    <div className="text-xs text-gray-500">{prompt.metadata.imageModel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {prompt.generationCount} times
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      prompt.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prompt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prompt._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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