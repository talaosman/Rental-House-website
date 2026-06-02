import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { feedbackService } from '../../services/feedback.service';
import { FONTS } from '../../constants/fonts';
import AdminFeedbacksScreen from '../admin/feedbacks';

const MAX_CHARS = 500;

export default function FeedbackScreen() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminFeedbacksScreen />;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await feedbackService.submit(message.trim(), user.username, user.email);
      Alert.alert('Thank you! 🎉', 'Your feedback has been submitted successfully.');
      setMessage('');
    } catch {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubble-ellipses" size={44} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Share Your Feedback</Text>
          <Text style={styles.heroSubtitle}>
            Your opinion helps us improve RentHouse for everyone
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* User info row */}
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.username}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          <Text style={styles.label}>Your Feedback</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Share your experience... What did you like? What can we improve?"
            placeholderTextColor="#bdc3c7"
            value={message}
            onChangeText={(t) => t.length <= MAX_CHARS && setMessage(t)}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, message.length >= MAX_CHARS && styles.charMax]}>
            {message.length} / {MAX_CHARS}
          </Text>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!message.trim() || loading) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!message.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Send Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info cards */}
        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: '#ebf5fb' }]}>
            <Ionicons name="call-outline" size={22} color="#3498db" />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Need Help?</Text>
            <Text style={styles.infoDesc}>24/7 support — +961-12345678</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: '#fef9e7' }]}>
            <Ionicons name="star-outline" size={22} color="#f1c40f" />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Why Your Feedback Matters</Text>
            <Text style={styles.infoDesc}>
              Helps improve services, shape features, and enhance your experience
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: '#e9f7ef' }]}>
            <Ionicons name="warning-outline" size={22} color="#2ecc71" />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Emergency Support</Text>
            <Text style={styles.infoDesc}>Call now: +961-12345678</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },

  hero: {
    backgroundColor: '#2C3E50',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.body,
  },

  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: FONTS.semiBold },
  userName: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  userEmail: { fontSize: 13, color: '#7f8c8d', marginTop: 1, fontFamily: FONTS.body },

  label: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 8 },
  textarea: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    minHeight: 130,
    color: '#2C3E50',
  },
  charCount: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  charMax: { color: '#e74c3c' },

  submitBtn: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#bdc3c7' },
  submitBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 16 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBody: { flex: 1 },
  infoTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  infoDesc: { fontSize: 13, color: '#7f8c8d', marginTop: 2, lineHeight: 18, fontFamily: FONTS.body },
});
