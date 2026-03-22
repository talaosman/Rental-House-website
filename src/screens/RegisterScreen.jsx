
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
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
import { brand, background, text, border, overlay } from '../theme/colors';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { isLoggedIn, signupPending } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigation.navigate('Home');
    }
  }, [isLoggedIn]);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setShowModal(true);

    try {
      const res = await API.post('/api/auth/signup', {
        username: name,
        email,
        password,
        role: 'USER',
        phoneNumber: '',
      });

      const userData = res.data;
      await signupPending(userData, { email, password });

      try {
        await API.post('/api/auth/send-otp', { email });
        setShowModal(false);
        Alert.alert('Success', 'Signup successful! OTP sent to your email.');
        navigation.navigate('VerifyOtp');
      } catch {
        setShowModal(false);
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setShowModal(false);
      if (err.response?.status === 409) {
        Alert.alert('Error', 'Email already exists.');
      } else {
        Alert.alert('Error', 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subtitle}>
              Enter your personal details and start your journey with us
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor={text.hint}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Your Email"
              placeholderTextColor={text.hint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={text.hint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.toggleText}>
                Already have an account?{' '}
                <Text style={styles.toggleBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Sending Modal */}
      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={brand.navyDark} />
            <Text style={styles.modalText}>
              Sending OTP to your email… Please wait.
            </Text>
          </View>
        </View>
      </Modal>
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
    padding: 24,
    shadowColor: 'rgba(30,58,95,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.navyDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: text.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: background.userInfo,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: text.primary,
    marginBottom: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: background.userInfo,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    borderRadius: 10,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: text.primary,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeText: { fontSize: 18 },
  button: {
    backgroundColor: brand.navyDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  toggleLink: {
    alignItems: 'center',
  },
  toggleText: {
    color: text.muted,
    fontSize: 14,
  },
  toggleBold: {
    color: brand.navyDark,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: overlay.modalBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 240,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  modalText: {
    color: text.primary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
});
