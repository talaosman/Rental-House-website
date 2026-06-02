import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { FONTS } from '../../constants/fonts';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) { Alert.alert('Error', 'Enter your email'); return; }
    setLoading(true);
    try {
      await authService.forgotPasswordSendCode(email);
      setStep('reset');
    } catch {
      Alert.alert('Error', 'Failed to send reset code. Check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPasswordReset(email, code, newPassword, confirmPassword);
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      Alert.alert('Error', 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <View style={styles.iconRow}>
                <Ionicons name="lock-closed-outline" size={36} color="#2C3E50" />
              </View>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.description}>
                Enter your account email and we'll send you a reset code.
              </Text>
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
              <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconRow}>
                <Ionicons name="mail-outline" size={36} color="#2C3E50" />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.description}>
                We sent a 6-digit code to{' '}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <Text style={styles.label}>Reset Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#999999"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#999999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.mismatch}>Passwords do not match</Text>
              )}

              <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Reset Password</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setNewPassword(''); setConfirmPassword(''); }}>
                <Text style={styles.back}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
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
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailHighlight: {
    color: '#2C3E50',
    fontFamily: FONTS.semiBold,
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
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  mismatch: {
    color: '#e74c3c',
    fontSize: 12,
    fontFamily: FONTS.body,
    marginTop: -10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  back: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 13,
    marginTop: 4,
    fontFamily: FONTS.body,
  },
});
