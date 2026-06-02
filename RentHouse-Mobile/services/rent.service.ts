import api from './api';

export const rentService = {
  create: (rentData: {
    userId: number;
    houseId: number;
    startDate: string;
    endDate: string;
  }) => api.post('/api/rents/rent', null, { params: rentData }),

  isRented: (houseId: number) =>
    api.get(`/api/rents/is-rented/${houseId}`),

  getUserRents: (userId: number) =>
    api.get(`/api/rents/user/${userId}`),

  getHouseRents: (houseId: number) =>
    api.get(`/api/rents/house/${houseId}`),
};
