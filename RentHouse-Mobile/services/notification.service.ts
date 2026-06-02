import api from './api';

export const notificationService = {
  saveFcmToken: (userId: number, fcmToken: string) =>
    api.post(`/api/users/${userId}/fcm-token`, { fcmToken }),

  getNotifications: (userId: number) =>
    api.get(`/api/notifications/user/${userId}`),

  getUnreadCount: (userId: number) =>
    api.get(`/api/notifications/user/${userId}/unread-count`),

  markRead: (notificationId: number) =>
    api.put(`/api/notifications/${notificationId}/read`),

  markAllRead: (userId: number) =>
    api.put(`/api/notifications/user/${userId}/read-all`),
};
