import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth.service';
import { FONTS } from '../../constants/fonts';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  const dots = '•'.repeat(Math.max(3, local.length - 2));
  return `${visible}${dots}@${domain}`;
}

const RESEND_COOLDOWN = 60;

export default function VerifyOtpScreen() {
  const { email: rawEmail } = useLocalSearchParams<{ email: string }>();
  const email = rawEmail ?? '';
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCooldown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Enter the OTP code from your email');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      Alert.alert('Email Verified', 'Your email has been verified. You can now log in.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 410) {
        Alert.alert('Code Expired', 'Your OTP has expired. Please request a new one.');
      } else {
        Alert.alert('Invalid Code', 'The OTP is incorrect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await authService.resendOtp(email);
      Alert.alert('Code Sent', 'A new OTP has been sent to your email.');
      startCooldown();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        Alert.alert('Session Expired', 'Please sign up again.', [
          { text: 'Sign Up', onPress: () => router.replace('/(auth)/register') },
        ]);
      } else {
        Alert.alert('Error', 'Could not resend OTP. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <View style={styles.iconRow}>
            <Ionicons name="mail-outline" size={44} color="#2C3E50" />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.description}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{maskEmail(email)}</Text>
          </Text>

          <Text style={styles.label}>OTP Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#999"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Verify Email</Text>}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code? </Text>
            {resendCooldown > 0 ? (
              <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending
                  ? <ActivityIndicator size="small" color="#2C3E50" />
                  : <Text style={styles.resendLink}>Resend</Text>}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.back}>Back to Sign In</Text>
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
    marginBottom: 16,
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
    marginBottom: 28,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#2C3E50',
    fontFamily: FONTS.semiBold,
  },
  label: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 8,
    fontFamily: FONTS.medium,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#dfe6e9',
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    fontFamily: FONTS.heading,
    color: '#2C3E50',
  },
  button: {
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontFamily: FONTS.body,
  },
  resendLink: {
    fontSize: 13,
    color: '#2C3E50',
    fontFamily: FONTS.semiBold,
  },
  cooldownText: {
    fontSize: 13,
    color: '#b2bec3',
    fontFamily: FONTS.body,
  },
  back: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 13,
    fontFamily: FONTS.body,
  },
});
