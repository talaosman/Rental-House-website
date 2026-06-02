import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/fonts';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${BASE_URL}/oauth2/authorization/google`,
      'renthouse://oauth-success'
    );
    if (result.type === 'success') {
      const userId = new URLSearchParams(result.url.split('?')[1]).get('userId');
      if (userId) router.push(`/(auth)/oauth-success?userId=${userId}`);
    }
  };

  const handleGithubLogin = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${BASE_URL}/oauth2/authorization/github`,
      'renthouse://oauth-success'
    );
    if (result.type === 'success') {
      const userId = new URLSearchParams(result.url.split('?')[1]).get('userId');
      if (userId) router.push(`/(auth)/oauth-success?userId=${userId}`);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Ionicons name="home" size={60} color="#2C3E50" />
          <Text style={styles.appName}>RentHouse</Text>
          <Text style={styles.subtitle}>Find your perfect home</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/otp')}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={[styles.oauthBtn, { backgroundColor: '#DB4437' }]} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={18} color="#fff" />
            <Text style={styles.oauthBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.oauthBtn, { backgroundColor: '#333' }]} onPress={handleGithubLogin}>
            <Ionicons name="logo-github" size={18} color="#fff" />
            <Text style={styles.oauthBtnText}>Continue with GitHub</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    color: '#2C3E50',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
    fontFamily: FONTS.body,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: '#2C3E50',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 6,
    fontFamily: FONTS.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  forgotPassword: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 20,
    fontFamily: FONTS.body,
  },
  loginButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontFamily: FONTS.body,
  },
  registerLink: {
    color: '#2C3E50',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dfe6e9',
  },
  dividerText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontFamily: FONTS.medium,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 13,
    gap: 10,
    marginBottom: 10,
  },
  oauthBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
});
