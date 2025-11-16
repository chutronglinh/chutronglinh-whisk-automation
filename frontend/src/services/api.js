import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  import: (data) => api.post('/accounts/import', data),
  setupProfile: (id) => api.post(`/accounts/${id}/setup-profile`),
  extractCookie: (id) => api.post(`/accounts/${id}/extract-cookie`)
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects/create', data),
  delete: (id) => api.delete(`/projects/${id}`)
};

export const promptsAPI = {
  getAll: () => api.get('/prompts'),
  create: (data) => api.post('/prompts', data),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/prompts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/prompts/${id}`)
};

export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getStats: () => api.get('/jobs/stats'),
  generate: (data) => api.post('/jobs/generate', data),
  retry: (id) => api.post(`/jobs/${id}/retry`),
  cancel: (id) => api.delete(`/jobs/${id}`)
};

export const imagesAPI = {
  getAll: (params) => api.get('/images', { params }),
  download: (id) => api.get(`/images/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/images/${id}`)
};

export default api;