import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { authService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface User {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  profileImage?: string;
  ownerId?: number; // resolved owner entity ID for HOUSE_OWNER role
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, phoneNumber: string) => Promise<void>;
  loginOAuth: (oauthUser: User, oauthToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title || 'New Notification';
      const body = notification.request.content.body || '';
      Alert.alert(title, body);
    });

    return () => subscription.remove();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser  = await AsyncStorage.getItem('user');
      // Restore the session whenever a user object is stored — the token may be
      // an empty string for session-cookie-based logins, so we don't gate on it.
      if (storedUser) {
        setToken(storedToken ?? '');
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const data = response.data;
    const newUser: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      phoneNumber: data.phoneNumber,
      profileImage: data.profileImage,
    };

    // Resolve the owner entity ID so all owner API calls use the correct ownerId
    if (newUser.role === 'HOUSE_OWNER') {
      try {
        const ownerRes = await authService.resolveOwner(newUser.id);
        const resolved: number | null = ownerRes.data?.ownerId ?? ownerRes.data?.id ?? null;
        if (resolved) newUser.ownerId = resolved;
      } catch {
        // non-critical — falls back to userId in API calls
      }
    }

    const jwt = data.token || data.accessToken || '';
    await AsyncStorage.setItem('token', jwt);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setToken(jwt);
    setUser(newUser);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus === 'granted') {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        await notificationService.saveFcmToken(newUser.id, tokenData.data);
      }
    } catch {
      // Push token registration is non-critical — silently skip
    }
  };

  const signup = async (username: string, email: string, password: string, phoneNumber: string) => {
    await authService.signup(username, email, password, phoneNumber);
  };

  const loginOAuth = async (oauthUser: User, oauthToken: string) => {
    await AsyncStorage.setItem('token', oauthToken);
    await AsyncStorage.setItem('user', JSON.stringify(oauthUser));
    setToken(oauthToken);
    setUser(oauthUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, loginOAuth, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
