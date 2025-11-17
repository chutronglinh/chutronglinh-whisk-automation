import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Accounts API
export const accountsAPI = {
  getAll: (params) => api.get('/accounts', { params }),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  importCSV: (formData) => api.post('/accounts/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  simpleLogin: (id) => api.post(`/accounts/${id}/simple-login`),
  getStats: () => api.get('/accounts/stats')
};

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
};

// Images API
export const imagesAPI = {
  getAll: (params) => api.get('/images', { params }),
  getById: (id) => api.get(`/images/${id}`),
  download: (id) => api.get(`/images/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/images/${id}`)
};

// Jobs API
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  getStats: () => api.get('/jobs/stats'),
  generate: (data) => api.post('/jobs/generate', data),
  retry: (id) => api.post(`/jobs/${id}/retry`),
  cancel: (id) => api.delete(`/jobs/${id}`)
};

// Prompts API
export const promptsAPI = {
  getAll: (params) => api.get('/prompts', { params }),
  getById: (id) => api.get(`/prompts/${id}`),
  create: (data) => api.post('/prompts', data),
  update: (id, data) => api.put(`/prompts/${id}`, data),
  delete: (id) => api.delete(`/prompts/${id}`)
};

export default api;