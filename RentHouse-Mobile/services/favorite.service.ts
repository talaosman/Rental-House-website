import api from './api';

export const favoriteService = {
  add: (userId: number, houseId: number) =>
    api.post('/api/favorites/add', null, { params: { userId, propertyId: houseId } }),

  remove: (userId: number, houseId: number) =>
    api.delete('/api/favorites/remove', { params: { userId, propertyId: houseId } }),

  getUserFavorites: (userId: number) =>
    api.get(`/api/favorites/user/${userId}`),
};
