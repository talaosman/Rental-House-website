import api from './api';

export const chatService = {
  send: (message: string, username?: string, userId?: number) =>
    api.post('/api/chat', { message, username, userId }),
};
