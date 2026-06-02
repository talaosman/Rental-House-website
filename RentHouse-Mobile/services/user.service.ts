import api from './api';

export const userService = {
  // Backend expects "userId" (not "id") — confirmed from frontend UserProfile.js line 504
  update: (data: {
    id: number;
    username?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    profileImage?: string;
  }) => {
    const { id, ...rest } = data;
    return api.put('/api/users/update', { userId: id, ...rest });
  },

  // Backend expects JSON with "profileImage" as base64 data URL, not FormData
  uploadProfileImage: (userId: number, base64DataUrl: string) =>
    api.put('/api/users/update', { userId, profileImage: base64DataUrl }),
};
