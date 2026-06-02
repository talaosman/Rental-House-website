import api from './api';

export const ratingService = {
  add: (userId: number, houseId: number, rating: number, comment: string) =>
    api.post('/api/ratings/add', null, { params: { userId, houseId, stars: rating, comment } }),

  getByHouse: (houseId: number) =>
    api.get(`/api/ratings/house/${houseId}`),

  getByUser: (userId: number) =>
    api.get(`/api/ratings/user/${userId}`),

  getAll: () => api.get('/api/ratings'),
};
