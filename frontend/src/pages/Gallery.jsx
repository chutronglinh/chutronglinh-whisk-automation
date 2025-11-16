import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    accountId: '',
    projectId: '',
    promptId: '',
    status: 'success'
  });
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchImages();
    fetchAccounts();
    fetchProjects();
    fetchPrompts();
    fetchStats();
  }, [filter]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.accountId) params.append('accountId', filter.accountId);
      if (filter.projectId) params.append('projectId', filter.projectId);
      if (filter.promptId) params.append('promptId', filter.promptId);
      if (filter.status) params.append('status', filter.status);
      params.append('limit', '100');
      
      const response = await axios.get(`${API_BASE}/generated-images?${params}`);
      setImages(response.data.data);
    } catch (error) {
      console.error('Error fetching images:', error);
      alert('Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/accounts?limit=100`);
      setAccounts(response.data.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects?limit=100`);
      setProjects(response.data.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/prompts?limit=100`);
      setPrompts(response.data.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/generate/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await axios.delete(`${API_BASE}/generated-images/${id}`);
      fetchImages();
      fetchStats();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = `${API_BASE.replace('/api', '')}${image.imageUrl}`;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getImageUrl = (image) => {
    return `${API_BASE.replace('/api', '')}${image.imageUrl}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600 mt-1">View and manage generated images</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg ${
              viewMode === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            🔲 Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg ${
              viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📋 List
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Generated</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-green-600">Success</div>
            <div className="text-2xl font-bold text-green-900">{stats.success}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-red-600">Failed</div>
            <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-yellow-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={filter.accountId}
              onChange={(e) => setFilter({ ...filter, accountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filter.projectId}
              onChange={(e) => setFilter({ ...filter, projectId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Projects</option>
              {projects.map(proj => (
                <option key={proj._id} value={proj._id}>{proj.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
            <select
              value={filter.promptId}
              onChange={(e) => setFilter({ ...filter, promptId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Prompts</option>
              {prompts.map(prompt => (
                <option key={prompt._id} value={prompt._id}>
                  {prompt.text.substring(0, 50)}...
                </option>
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
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Images */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No images found. Generate some images first!
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image._id} className="bg-white rounded-lg shadow overflow-hidden group">
              <div className="relative aspect-video bg-gray-100">
                {image.status === 'success' ? (
                  <>
                    <img
                      src={getImageUrl(image)}
                      alt={image.prompt}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="px-3 py-2 bg-white text-gray-900 rounded-lg mr-2"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDownload(image)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  </>
                ) : image.status === 'failed' ? (
                  <div className="w-full h-full flex items-center justify-center text-red-600">
                    ❌ Failed
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-yellow-600">
                    ⏳ Pending
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm text-gray-900 truncate" title={image.prompt}>
                  {image.prompt}
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{new Date(image.generatedAt).toLocaleDateString()}</span>
                  <span>{image.metadata?.generationTime ? `${(image.metadata.generationTime / 1000).toFixed(1)}s` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prompt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {images.map((image) => (
                <tr key={image._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {image.status === 'success' && (
                      <img
                        src={getImageUrl(image)}
                        alt={image.prompt}
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                        }}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={image.prompt}>
                      {image.prompt}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {image.accountId?.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {image.projectId?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      image.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : image.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {image.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(image.generatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {image.status === 'success' && (
                      <>
                        <button
                          onClick={() => setSelectedImage(image)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(image)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Download
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(image._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Image Details</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.prompt}
                className="w-full rounded-lg mb-4"
              />
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prompt:</label>
                  <p className="text-gray-900 mt-1">{selectedImage.prompt}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account:</label>
                    <p className="text-gray-900">{selectedImage.accountId?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Project:</label>
                    <p className="text-gray-900">{selectedImage.projectId?.name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Image Model:</label>
                    <p className="text-gray-900">{selectedImage.metadata?.imageModel}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Aspect Ratio:</label>
                    <p className="text-gray-900">
                      {selectedImage.metadata?.aspectRatio?.replace('IMAGE_ASPECT_RATIO_', '')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Generation Time:</label>
                    <p className="text-gray-900">
                      {selectedImage.metadata?.generationTime 
                        ? `${(selectedImage.metadata.generationTime / 1000).toFixed(2)}s`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Filename:</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedImage.filename}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Generated At:</label>
                  <p className="text-gray-900">{new Date(selectedImage.generatedAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedImage._id);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}