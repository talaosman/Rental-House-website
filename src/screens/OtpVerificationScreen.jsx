
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border } from '../theme/colors';

export default function OtpVerificationScreen() {
  const navigation = useNavigation();
  const { pendingEmail, completeVerification } = useAuth();

  const [otp, setOtp] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP.');
      return;
    }

    try {
      await API.post('/api/auth/verify-otp', { email: pendingEmail, otp });
      await completeVerification();
      Alert.alert('Success', 'OTP Verified! Login successful.');
    } catch {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to your email
            </Text>
            {pendingEmail ? (
              <Text style={styles.emailHint}>{pendingEmail}</Text>
            ) : null}

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="------"
              placeholderTextColor={text.hint}
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={otp.length !== 6}
            >
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: background.page,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: 'rgba(30,58,95,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: brand.navyDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: text.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  emailHint: {
    fontSize: 13,
    color: brand.navyDark,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: background.userInfo,
    borderWidth: 2,
    borderColor: brand.navyDark,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: '700',
    color: text.primary,
    letterSpacing: 12,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    backgroundColor: brand.navyDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: brand.white,
    fontSize: 17,
    fontWeight: '700',
  },
  backLink: {
    paddingVertical: 8,
  },
  backText: {
    color: text.muted,
    fontSize: 14,
  },
});
