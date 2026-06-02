import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function OAuthSuccessScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { loginOAuth } = useAuth();
  const router = useRouter();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasError(true);
      Alert.alert('Login Failed', 'No user ID returned from OAuth provider.', [
        { text: 'Back to Login', onPress: () => router.replace('/(auth)/login') },
      ]);
      return;
    }

    const fetchOAuthUser = async () => {
      try {
        const res = await api.get('/api/auth/oauth2/user', {
          params: { userId },
          withCredentials: true,
        });
        const data = res.data;
        const oauthUser = {
          id: data.id,
          username: data.username || data.name || 'User',
          email: data.email || '',
          role: data.role || 'USER',
          phoneNumber: data.phoneNumber,
        };
        await loginOAuth(oauthUser, data.token || '');
        router.replace('/(tabs)');
      } catch (err: any) {
        const msg = err.response?.data?.message || 'OAuth login failed. Please try again.';
        setHasError(true);
        Alert.alert('Login Failed', msg, [
          { text: 'Back to Login', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    };

    fetchOAuthUser();
  }, [userId]);

  return (
    <View style={styles.container}>
      {hasError ? (
        <Text style={styles.errorText}>Login failed. Redirecting...</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color="#2C3E50" />
          <Text style={styles.text}>Logging you in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: '#e74c3c',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
