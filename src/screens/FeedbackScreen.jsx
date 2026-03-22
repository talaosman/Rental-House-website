
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, success, error as errorColors } from '../theme/colors';

export default function FeedbackScreen() {
  const { username, email } = useAuth();

  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); // 'success' | 'error' | ''
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setStatus('');

    try {
      const res = await API.post('/api/feedback', {
        message,
        username: username || 'Guest',
        email: email || '',
      });

      if (res.status === 201) {
        setStatus('success');
        setMessage('');
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Share Your Experience</Text>
            <Text style={styles.heroSubtitle}>
              Your feedback helps us create better rental experiences for everyone
            </Text>
          </View>

          <View style={styles.contentWrapper}>

            {/* Feedback Form Card */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💬</Text>
                <Text style={styles.cardTitle}>Tell Us Your Story</Text>
                <Text style={styles.cardSubtitle}>
                  We value your opinion and strive to improve our services
                </Text>
              </View>

              {/* User info display */}
              <View style={styles.userInfoDisplay}>
                <View style={styles.userInfoItem}>
                  <Text style={styles.userInfoIcon}>👤</Text>
                  <Text style={styles.userInfoText}>{username || 'Guest User'}</Text>
                </View>
                <View style={styles.userInfoItem}>
                  <Text style={styles.userInfoIcon}>✉️</Text>
                  <Text style={styles.userInfoText}>{email || 'No email provided'}</Text>
                </View>
              </View>

              {/* Textarea */}
              <Text style={styles.fieldLabel}>Your Feedback</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Share your experience with us... What did you like? What could we improve?"
                placeholderTextColor={text.hint}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{message.length} characters</Text>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, (loading || !message.trim()) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading || !message.trim()}
              >
                {loading
                  ? <ActivityIndicator color={brand.white} />
                  : <Text style={styles.submitBtnText}>Send Feedback →</Text>
                }
              </TouchableOpacity>

              {/* Status */}
              {status === 'success' && (
                <View style={[styles.statusBox, styles.statusSuccess]}>
                  <Text style={styles.statusSuccessText}>
                    ✅ Thank you for your feedback! We appreciate your input.
                  </Text>
                </View>
              )}
              {status === 'error' && (
                <View style={[styles.statusBox, styles.statusError]}>
                  <Text style={styles.statusErrorText}>
                    ⚠️ Unable to send feedback. Please try again later.
                  </Text>
                </View>
              )}
            </View>

            {/* Info Cards */}
            <View style={styles.infoCards}>

              {/* Contact Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardIcon}>📞</Text>
                <Text style={styles.infoCardTitle}>Need Help?</Text>
                <Text style={styles.infoCardDesc}>
                  Our support team is available 24/7 to assist you with any questions or concerns.
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('tel:+96112345678')}>
                  <Text style={styles.infoCardLink}>📱 +961-12345678</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:support@rentalhub.com')}>
                  <Text style={styles.infoCardLink}>✉️ support@rentalhub.com</Text>
                </TouchableOpacity>
              </View>

              {/* Emergency Card */}
              <View style={[styles.infoCard, styles.emergencyCard]}>
                <Text style={styles.infoCardIcon}>🚨</Text>
                <Text style={styles.infoCardTitle}>Emergency Support</Text>
                <Text style={styles.infoCardDesc}>
                  For urgent matters requiring immediate attention, contact our emergency line.
                </Text>
                <TouchableOpacity
                  style={styles.emergencyBtn}
                  onPress={() => Linking.openURL('tel:+96112345678')}
                >
                  <Text style={styles.emergencyBtnText}>📞 Call Now: +961-12345678</Text>
                </TouchableOpacity>
              </View>

              {/* Why Feedback Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardIcon}>⭐</Text>
                <Text style={styles.infoCardTitle}>Why Your Feedback Matters</Text>
                {[
                  'Helps us improve our services',
                  'Shapes future features',
                  'Enhances user experience',
                ].map((item, i) => (
                  <View key={i} style={styles.benefitItem}>
                    <Text style={styles.benefitCheck}>✅</Text>
                    <Text style={styles.benefitText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  flex: { flex: 1 },
  scroll: { flex: 1 },

  hero: {
    backgroundColor: brand.navyDark,
    padding: 28, alignItems: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: brand.white, textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },

  contentWrapper: { padding: 16, gap: 16 },

  formCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { alignItems: 'center', marginBottom: 20 },
  cardIcon: { fontSize: 36, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: text.primary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: text.muted, textAlign: 'center' },

  userInfoDisplay: {
    backgroundColor: background.userInfo, borderRadius: 12, padding: 14,
    gap: 8, marginBottom: 16,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  userInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userInfoIcon: { fontSize: 16 },
  userInfoText: { fontSize: 14, color: text.slate },

  fieldLabel: { fontSize: 13, color: text.medium, marginBottom: 8, fontWeight: '600' },
  textArea: {
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: text.primary, minHeight: 140,
    textAlignVertical: 'top', marginBottom: 6,
  },
  charCount: { fontSize: 12, color: text.gray, textAlign: 'right', marginBottom: 16 },

  submitBtn: {
    backgroundColor: brand.navyDark, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: brand.white, fontWeight: '700', fontSize: 16 },

  statusBox: { borderRadius: 10, padding: 14, marginTop: 4 },
  statusSuccess: { backgroundColor: success.bg, borderWidth: 1, borderColor: success.border },
  statusSuccessText: { fontSize: 14, color: success.muted, lineHeight: 20 },
  statusError: { backgroundColor: errorColors.bg, borderWidth: 1, borderColor: errorColors.border },
  statusErrorText: { fontSize: 14, color: errorColors.text, lineHeight: 20 },

  infoCards: { gap: 14 },
  infoCard: {
    backgroundColor: background.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyCard: { borderColor: errorColors.vivid },
  infoCardIcon: { fontSize: 32, marginBottom: 8 },
  infoCardTitle: { fontSize: 16, fontWeight: '700', color: text.primary, marginBottom: 8 },
  infoCardDesc: { fontSize: 13, color: text.muted, lineHeight: 18, marginBottom: 12 },
  infoCardLink: { fontSize: 14, color: brand.navyDark, marginBottom: 6, fontWeight: '600' },

  emergencyBtn: {
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: errorColors.vivid,
  },
  emergencyBtnText: { color: errorColors.DEFAULT, fontWeight: '700', fontSize: 15 },

  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  benefitCheck: { fontSize: 14 },
  benefitText: { fontSize: 14, color: text.slate },
});
