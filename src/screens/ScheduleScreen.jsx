/**
 * ScheduleScreen.jsx
 * Converted from Schedule.js
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, success, error as errorColors, shadow } from '../theme/colors';

const formatDate = (d) => {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (d) => {
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function ScheduleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { houseId } = route.params || {};
  const { userId, username, email } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [selectedTime, setSelectedTime] = useState(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Android only: temp values held while the spinner Modal is open
  const [tempDate, setTempDate] = useState(tomorrow);
  const [tempTime, setTempTime] = useState(tomorrow);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(new Date(date));
    setFormError('');
  };

  const onTimeChange = (event, date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedTime(new Date(date));
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!userId || !houseId) {
      setFormError('Missing user or house information. Please try again.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const params = new URLSearchParams({
        houseId,
        userId,
        visitorName: username || '',
        visitorEmail: email || '',
        date: formatDate(selectedDate),
        time: formatTime(selectedTime),
      });

      await API.post(`/api/visits/request?${params.toString()}`);

      setShowSuccess(true);
      setTimeout(() => {
        navigation.navigate('PropertyDetails', { id: houseId });
      }, 15000);
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError('This date and time are already taken. Please choose another slot.');
      } else {
        setFormError(err.response?.data || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/96178841333?text=Hello%20RentalHub%2C%20I%20would%20like%20to%20inquire%20about%20your%20services');
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
            <Text style={styles.heroIcon}>📅</Text>
            <Text style={styles.heroTitle}>Schedule Your Visit</Text>
            <Text style={styles.heroSubtitle}>Book a convenient time to view this property</Text>
          </View>

          <View style={styles.contentWrapper}>

            {/* Form Card */}
            <View style={styles.formCard}>
              {showSuccess ? (
                <View style={styles.successAnimation}>
                  <Text style={styles.successCheckmark}>✅</Text>
                  <Text style={styles.successTitle}>Visit Request Submitted!</Text>
                  <Text style={styles.successText}>
                    The landlord will contact you shortly to confirm your appointment.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.cardHeading}>Select Your Preferred Time</Text>
                  <Text style={styles.cardSubheading}>Choose a date and time that works best for you</Text>

                  {/* User info */}
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

                  {submitting ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator size="large" color={brand.navyDark} />
                      <Text style={styles.loadingText}>Submitting your request...</Text>
                    </View>
                  ) : (
                    <View>
                      {/* ── Date Picker ────────────────────── */}
                      <Text style={styles.fieldLabel}>📅 Select Date</Text>
                      <TouchableOpacity
                        style={styles.pickerBtn}
                        onPress={() => { setTempDate(selectedDate); setShowDatePicker(true); }}
                      >
                        <Text style={styles.pickerBtnText}>{formatDate(selectedDate)}</Text>
                        <Text style={styles.pickerBtnIcon}>▼</Text>
                      </TouchableOpacity>

                      {/* iOS — inline spinner + Done */}
                      {Platform.OS === 'ios' && showDatePicker && (
                        <>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="spinner"
                            minimumDate={minDate}
                            themeVariant="light"
                            accentColor={brand.navyDark}
                            onChange={onDateChange}
                          />
                          <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.pickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Android — Modal with explicit white background */}
                      {Platform.OS === 'android' && (
                        <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                          <View style={styles.pickerOverlay}>
                            <View style={styles.pickerCard}>
                              <Text style={styles.pickerCardTitle}>Select Date</Text>
                              <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                minimumDate={minDate}
                                themeVariant="light"
                                onChange={(_, date) => { if (date) setTempDate(new Date(date)); }}
                              />
                              <View style={styles.pickerCardBtns}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerCancelBtn}>
                                  <Text style={styles.pickerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.pickerConfirmBtn}
                                  onPress={() => { setSelectedDate(tempDate); setShowDatePicker(false); setFormError(''); }}
                                >
                                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </Modal>
                      )}

                      {/* ── Time Picker ────────────────────── */}
                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>🕐 Preferred Time</Text>
                      <TouchableOpacity
                        style={styles.pickerBtn}
                        onPress={() => { setTempTime(selectedTime); setShowTimePicker(true); }}
                      >
                        <Text style={styles.pickerBtnText}>{formatTime(selectedTime)}</Text>
                        <Text style={styles.pickerBtnIcon}>▼</Text>
                      </TouchableOpacity>

                      {/* iOS — inline spinner + Done */}
                      {Platform.OS === 'ios' && showTimePicker && (
                        <>
                          <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            display="spinner"
                            is24Hour
                            themeVariant="light"
                            accentColor={brand.navyDark}
                            onChange={onTimeChange}
                          />
                          <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
                            <Text style={styles.pickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Android — Modal with explicit white background */}
                      {Platform.OS === 'android' && (
                        <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
                          <View style={styles.pickerOverlay}>
                            <View style={styles.pickerCard}>
                              <Text style={styles.pickerCardTitle}>Select Time</Text>
                              <DateTimePicker
                                value={tempTime}
                                mode="time"
                                display="spinner"
                                is24Hour
                                themeVariant="light"
                                onChange={(_, date) => { if (date) setTempTime(new Date(date)); }}
                              />
                              <View style={styles.pickerCardBtns}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerCancelBtn}>
                                  <Text style={styles.pickerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.pickerConfirmBtn}
                                  onPress={() => { setSelectedTime(tempTime); setShowTimePicker(false); setFormError(''); }}
                                >
                                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </Modal>
                      )}

                      {formError ? (
                        <View style={styles.errorBox}>
                          <Text style={styles.errorText}>⚠️ {formError}</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        disabled={submitting}
                      >
                        <Text style={styles.submitBtnText}>Schedule Visit →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>What to Expect</Text>
              {[
                { icon: '✅', title: 'Confirmation', desc: "You'll receive a confirmation email shortly" },
                { icon: '📞', title: 'Landlord Contact', desc: 'The property owner will reach out to finalize details' },
                { icon: '⏱️', title: 'Tour Duration', desc: 'Property tours typically last 30–45 minutes' },
                { icon: '🪪', title: 'Bring ID', desc: 'Please bring a valid form of identification' },
              ].map((item, i) => (
                <View key={i} style={styles.infoListItem}>
                  <Text style={styles.infoItemIcon}>{item.icon}</Text>
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoItemTitle}>{item.title}</Text>
                    <Text style={styles.infoItemDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.contactSection}>
                <Text style={styles.contactLabel}>Need Help?</Text>
                <TouchableOpacity onPress={openWhatsApp}>
                  <Text style={styles.contactLink}>+961 78 841 333 (WhatsApp)</Text>
                </TouchableOpacity>
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
    padding: 32, alignItems: 'center',
  },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: brand.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  contentWrapper: { padding: 16, gap: 16 },

  formCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeading: { fontSize: 18, fontWeight: '700', color: text.primary, marginBottom: 6 },
  cardSubheading: { fontSize: 13, color: text.muted, marginBottom: 16 },

  userInfoDisplay: {
    backgroundColor: background.userInfo,
    borderRadius: 12, padding: 14, gap: 8, marginBottom: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  userInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userInfoIcon: { fontSize: 16 },
  userInfoText: { fontSize: 14, color: text.slate },

  loadingState: { alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: text.muted, fontSize: 14 },

  fieldLabel: { fontSize: 13, color: text.muted, marginBottom: 6, fontWeight: '600' },

  pickerBtn: {
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  pickerBtnText: { fontSize: 15, color: text.primary, fontWeight: '500' },
  pickerBtnIcon: { fontSize: 12, color: text.muted },
  pickerDoneBtn: {
    alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14,
    marginBottom: 8,
  },
  pickerDoneText: { color: brand.navyDark, fontWeight: '700', fontSize: 14 },

  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 10,
    padding: 12, marginTop: 12, marginBottom: 14,
    borderWidth: 1, borderColor: errorColors.border,
  },
  errorText: { color: errorColors.DEFAULT, fontSize: 13 },
  submitBtn: {
    backgroundColor: brand.navyDark, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  submitBtnText: { color: brand.white, fontWeight: '700', fontSize: 16 },

  successAnimation: { alignItems: 'center', padding: 24, gap: 12 },
  successCheckmark: { fontSize: 64 },
  successTitle: { fontSize: 20, fontWeight: '700', color: success.DEFAULT },
  successText: { fontSize: 14, color: text.muted, textAlign: 'center', lineHeight: 20 },

  infoCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoCardTitle: { fontSize: 17, fontWeight: '700', color: brand.navyDark, marginBottom: 16 },
  infoListItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 16,
  },
  infoItemIcon: { fontSize: 20, marginTop: 2 },
  infoItemContent: { flex: 1 },
  infoItemTitle: { fontSize: 14, fontWeight: '700', color: text.primary, marginBottom: 2 },
  infoItemDesc: { fontSize: 13, color: text.muted, lineHeight: 18 },
  contactSection: {
    borderTopWidth: 1, borderTopColor: border.DEFAULT,
    paddingTop: 16, marginTop: 4,
  },
  contactLabel: { fontSize: 13, color: text.muted, marginBottom: 6 },
  contactLink: { fontSize: 15, color: brand.navyDark, fontWeight: '600' },

  // ── Android picker Modal ────────────────────────────────────────
  pickerOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12,
    width: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  pickerCardTitle: {
    fontSize: 16, fontWeight: '700', color: text.primary,
    textAlign: 'center', marginBottom: 8,
  },
  pickerCardBtns: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: border.DEFAULT,
  },
  pickerCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  pickerCancelText: { fontSize: 15, color: text.muted, fontWeight: '600' },
  pickerConfirmBtn: {
    backgroundColor: brand.navyDark, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  pickerConfirmText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});
