/**
 * OAuthSuccessScreen.jsx
 *
 * Landing screen after Google / GitHub OAuth redirect.
 * RN flow: Linking.openURL(oauthUrl) opens system browser
 *          → backend redirects to deep link: renthousemobile://oauth-success?userId=123
 *          → app opens OAuthSuccessScreen via deep link params
 *          → fetch /api/auth/oauth2/user?userId=X → loginOAuth() → RootNavigator auto-swaps
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import API         from '../api/baseAPI';
import { brand, background, error as errorColors } from '../theme/colors';

export default function OAuthSuccessScreen() {
  const route               = useRoute();
  const { loginOAuth }      = useAuth();

  const [status, setStatus] = useState('loading'); // 'loading' | 'error'

  useEffect(() => {
    const userId = route.params?.userId;

    if (!userId) {
      Alert.alert('OAuth login failed', 'No user ID returned from provider.');
      setStatus('error');
      return;
    }

    API.get('/api/auth/oauth2/user')
      .then(async res => {
        const user = res.data;

        const profileImage =
          user.profileImage && user.profileImage !== 'null'
            ? user.profileImage
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username ?? 'User')}&background=random`;

        await loginOAuth({
          id:           user.id,
          username:     user.username    ?? '',
          email:        user.email       ?? '',
          userRole:     user.role        ?? 'USER',
          profileImage,
          password:     user.password    ?? '',
          phoneNumber:  user.phoneNumber ?? '',
        });
      })
      .catch(err => {
        console.error('Failed to fetch OAuth user:', err);
        Alert.alert('Login failed', 'Could not complete sign-in. Please try again.');
        setStatus('error');
      });
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        {status === 'loading' ? (
          <>
            <ActivityIndicator size="large" color={brand.navyDark} />
            <Text style={s.message}>Logging you in…</Text>
          </>
        ) : (
          <Text style={s.errorText}>Sign-in failed. Please go back and try again.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: background.page },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  message:   { fontSize: 15, color: 'rgba(30,58,95,0.6)', marginTop: 12 },
  errorText: { fontSize: 15, color: errorColors.DEFAULT, textAlign: 'center', paddingHorizontal: 32 },
});
