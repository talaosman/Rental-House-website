
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/AuthContext';
import API, { BASE_URL } from '../api/baseAPI';
import { brand, background, text, border } from '../theme/colors';

// Must match app.json "scheme"
const REDIRECT_URI  = 'renthousemobile://oauth-success';
const OAUTH_GOOGLE  = `${BASE_URL}/oauth2/authorization/google`;
const OAUTH_GITHUB  = `${BASE_URL}/oauth2/authorization/github`;

export default function LoginScreen() {
  const navigation      = useNavigation();
  const { loginUser }   = useAuth();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  const passwordRef = useRef(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await API.post('/api/auth/login', {
        email:    email.trim(),
        password,
      });
      await loginUser(res.data, { email: email.trim(), password });
    } catch {
      Alert.alert('Login failed', 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (url) => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);

      if (result.type === 'cancel') return;

      if (result.type === 'success') {
        const query = result.url.split('?')[1] ?? '';
        const params = new URLSearchParams(query);
        const userId = params.get('userId');

        if (userId) {
          navigation.navigate('OAuthSuccess', { userId });
        } else {
          Alert.alert('Sign-in incomplete', 'No user data returned by server.');
        }
      } else {
        Alert.alert('Sign-in failed', 'OAuth did not complete. Please try again.');
      }
    } catch {
      Alert.alert('Browser error', 'Could not open the sign-in page. Please use email login.');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={background.page} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoBlock}>
            <Text style={s.logoText}>RentalHub</Text>
            <Text style={s.logoSub}>Find your perfect home</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.heading}>Sign In</Text>
            <Text style={s.subheading}>
              Welcome back. Sign in to continue.
            </Text>

            {/* Email */}
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color={brand.navyDark} style={s.icon} />
              <TextInput
                style={s.input}
                placeholder="Your Email"
                placeholderTextColor={text.hint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading}
              />
            </View>

            {/* Password */}
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={brand.navyDark} style={s.icon} />
              <TextInput
                ref={passwordRef}
                style={s.input}
                placeholder="Password"
                placeholderTextColor={text.hint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={text.hint}
                />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, isLoading && s.btnDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={brand.white} size="small" />
                : <Text style={s.btnLabel}>Sign In</Text>}
            </TouchableOpacity>

            {/* Toggle */}
            <TouchableOpacity
              style={s.toggleRow}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={s.toggleText}>
                Don&apos;t have an account?{' '}
                <Text style={s.toggleLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>

            {/* OAuth divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[s.oauthBtn, s.googleBtn]}
              onPress={() => handleOAuth(OAUTH_GOOGLE)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: 'https://www.svgrepo.com/show/475656/google-color.svg' }}
                style={s.oauthIcon}
              />
              <Text style={s.googleLabel}>Continue with Google</Text>
            </TouchableOpacity>

            {/* GitHub */}
            <TouchableOpacity
              style={[s.oauthBtn, s.githubBtn]}
              onPress={() => handleOAuth(OAUTH_GITHUB)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: 'https://www.svgrepo.com/show/512317/github-142.svg' }}
                style={s.oauthIcon}
              />
              <Text style={s.githubLabel}>Continue with GitHub</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: background.page },
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  /* Logo */
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
    color: brand.navyDark,
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 13,
    color: text.muted,
    marginTop: 4,
    letterSpacing: 0.4,
  },

  /* Card */
  card: {
    backgroundColor: background.card,
    borderRadius: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: 'rgba(30,58,95,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.navyDark,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: text.muted,
    marginBottom: 22,
    lineHeight: 19,
  },

  /* Inputs */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: background.userInfo,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 50,
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: text.primary },

  /* Button */
  btn: {
    backgroundColor: brand.navyDark,
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: 'rgba(30,58,95,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnLabel:    { fontSize: 16, fontWeight: '700', color: brand.white },

  /* Toggle */
  toggleRow: { alignItems: 'center', paddingVertical: 18 },
  toggleText: { fontSize: 13, color: text.muted },
  toggleLink: { color: brand.navyDark, fontWeight: '600' },

  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine:  { flex: 1, height: 1, backgroundColor: border.DEFAULT },
  dividerLabel: { fontSize: 11, color: text.muted, fontWeight: '500' },

  /* OAuth */
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    height: 46,
    marginBottom: 10,
    gap: 10,
  },
  oauthIcon:   { width: 20, height: 20 },
  googleBtn:   { backgroundColor: brand.white, borderWidth: 1, borderColor: border.DEFAULT },
  googleLabel: { fontSize: 14, fontWeight: '600', color: text.googleLabel },
  githubBtn:   { backgroundColor: text.github, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  githubLabel: { fontSize: 14, fontWeight: '600', color: brand.white },
});
