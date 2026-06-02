import api from './api';

export const feedbackService = {
  submit: (message: string, username: string, email: string) =>
    api.post('/api/feedback', { message, username, email }),

  getAll: () => api.get('/api/feedback'),

  remove: (id: number) => api.delete(`/api/feedback/${id}`),
};
