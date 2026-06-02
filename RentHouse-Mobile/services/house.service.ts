import api from './api';

export const houseService = {
  getAll: () => api.get('/api/houses'),

  getById: (id: number) => api.get(`/api/houses/${id}`),

  getMostRented: () => api.get('/api/houses/most-rented'),

  getRelatedCount: (id: number) => api.get(`/api/houses/${id}/related-count`),

  create: (data: any) => api.post('/api/houses/uploadBase64', data),

  update: (id: number, data: any) =>
    api.put(`/api/houses/update/${id}`, data),

  delete: (id: number) => api.delete(`/api/houses/${id}`),

  forceDelete: (id: number) => api.delete(`/api/houses/${id}?force=true`),
};
