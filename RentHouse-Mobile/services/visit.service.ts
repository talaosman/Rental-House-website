import api from './api';

export const visitService = {
  request: (data: {
    userId: number;
    houseId: number;
    visitorName: string;
    visitorEmail: string;
    date: string;
    time: string;
  }) => api.post('/api/visits/request', null, { params: data }),

  getByHouse: (houseId: number) =>
    api.get(`/api/visits/house/${houseId}`),

  getOwnerVisits: (ownerId: number) =>
    api.get(`/api/visits/owner/${ownerId}`),

  respond: (requestId: number, status: 'ACCEPTED' | 'REJECTED') =>
    api.put(`/api/visits/respond/${requestId}`, null, { params: { accepted: status === 'ACCEPTED' } }),
};
