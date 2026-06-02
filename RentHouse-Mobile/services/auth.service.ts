import api from './api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  signup: (username: string, email: string, password: string, phoneNumber: string) =>
    api.post('/api/auth/signup', { username, email, password, phoneNumber, role: 'USER' }),

  sendOtp: (email: string) =>
    api.post('/api/auth/send-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post('/api/auth/verify-otp', { email, otp }),

  resendOtp: (email: string) =>
    api.post('/api/auth/resend-otp', { email }),

  forgotPasswordSendCode: (email: string) =>
    api.post('/api/auth/forgot-password/send-code', { email }),

  forgotPasswordReset: (email: string, code: string, newPassword: string, confirmPassword: string) =>
    api.post('/api/auth/forgot-password/reset', { email, code, newPassword, confirmPassword }),

  resolveOwner: (userId: number) =>
    api.get(`/api/owner/resolve?userId=${userId}`),
};
