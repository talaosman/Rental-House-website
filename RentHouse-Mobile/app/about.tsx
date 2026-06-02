import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Linking, Image, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { FONTS } from '../constants/fonts';

const WHATSAPP_URL =
  'https://wa.me/96178841333?text=Hello%20RentalHub%2C%20I%20would%20like%20to%20inquire%20about%20your%20services';

const VALUES = [
  {
    icon: 'eye-outline' as const,
    title: 'Transparency',
    desc: 'Clear, accurate, verified property details. No hidden fees, no surprises.',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    icon: 'layers-outline' as const,
    title: 'Innovation',
    desc: 'Intuitive tools that make the rental process smarter, faster, and more efficient.',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    icon: 'people-outline' as const,
    title: 'Community',
    desc: 'An engaged, supportive network of renters and landlords that grows every day.',
    color: '#10b981',
    bg: '#ecfdf5',
  },
];

const TEAM = [
  {
    name: 'Tala Osman',
    role: 'CEO & Co-Founder',
    bio: 'Visionary leader with 10+ years in real estate technology',
    photo: 'https://ui-avatars.com/api/?name=Tala+Osman&background=1e3a5f&color=fff&size=200',
  },
  {
    name: 'Ali Ibrahim',
    role: 'Chief Technology Officer',
    bio: 'Tech innovator building scalable solutions for modern living',
    photo: 'https://ui-avatars.com/api/?name=Ali+Ibrahim&background=2d5a8c&color=fff&size=200',
  },
  {
    name: 'Yasmina BouSaid',
    role: 'Head of User Experience',
    bio: 'Design expert creating intuitive, beautiful interfaces',
    photo: 'https://ui-avatars.com/api/?name=Yasmina+BouSaid&background=1e3a5f&color=fff&size=200',
  },
];

const SOCIAL_LINKS = [
  { icon: 'logo-facebook' as const,  color: '#1877f2', url: 'https://facebook.com' },
  { icon: 'logo-instagram' as const, color: '#e1306c', url: 'https://instagram.com' },
  { icon: 'logo-linkedin' as const,  color: '#0a66c2', url: 'https://linkedin.com' },
];

const OFFICE_INFO = [
  { emoji: '📍', label: 'Beirut, Lebanon' },
  { emoji: '🕐', label: 'Mon–Fri, 9AM–6PM' },
  { emoji: '📞', label: '+961 78 841 333' },
];

export default function AboutScreen() {
  // ── Contact form state ─────────────────────────────────────────
  const [contactName,    setContactName]    = useState('');
  const [contactEmail,   setContactEmail]   = useState('');
  const [contactPhone,   setContactPhone]   = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  const handleContactSubmit = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      Alert.alert('Missing Fields', 'Please fill in your name, email, and message.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/contact', {
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        message: contactMessage.trim(),
      });
      setSubmitted(true);
    } catch {
      // Fallback: open mailto if the endpoint doesn't exist
      const subject = encodeURIComponent('Inquiry from RentalHub Mobile App');
      const body = encodeURIComponent(
        `Name: ${contactName}\nEmail: ${contactEmail}\nPhone: ${contactPhone}\n\n${contactMessage}`
      );
      Linking.openURL(`mailto:contact@rentalhub.com?subject=${subject}&body=${body}`);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="home" size={48} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Welcome to RentalHub</Text>
        <Text style={styles.heroSubtitle}>
          Connecting people with exceptional rental spaces since 2020
        </Text>
        <View style={styles.statsDivider} />
        <View style={styles.statsRow}>
          {[
            { val: '5,000+', label: 'Properties Listed' },
            { val: '3,200+', label: 'Happy Tenants' },
            { val: '24/7',   label: 'Customer Support' },
          ].map(({ val, label }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Mission ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Our Mission</Text>
        <Text style={styles.sectionTitle}>Simplifying the Rental Experience</Text>
        <Text style={styles.bodyText}>
          At RentalHub, our mission is to revolutionize the way people find and list rental
          properties. We believe that everyone deserves a seamless, transparent, and trustworthy
          experience when searching for their next home or listing their property.
        </Text>
        <Text style={[styles.bodyText, { marginTop: 10 }]}>
          Through innovative technology, verified listings, and dedicated support, we connect
          landlords with quality tenants and help renters discover their perfect space. Our platform
          is built on trust, transparency, and a commitment to excellence.
        </Text>
        <View style={styles.highlightsBox}>
          {['Verified Property Listings', 'Real-Time Support', 'Secure Transactions'].map(
            (item) => (
              <View key={item} style={styles.checkRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ),
          )}
        </View>
      </View>

      {/* ── Values ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Our Principles</Text>
        <Text style={styles.sectionTitle}>Core Values That Drive Us</Text>
        {VALUES.map((v, i) => (
          <View
            key={v.title}
            style={[styles.valueCard, i < VALUES.length - 1 && styles.valueCardBorder]}
          >
            <View style={[styles.valueIcon, { backgroundColor: v.bg }]}>
              <Ionicons name={v.icon} size={26} color={v.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.valueTitle}>{v.title}</Text>
              <Text style={styles.valueDesc}>{v.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Team ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Our Team</Text>
        <Text style={styles.sectionTitle}>Meet the People Behind RentalHub</Text>
        {TEAM.map((member, i) => (
          <View
            key={member.name}
            style={[styles.teamCard, i < TEAM.length - 1 && styles.teamCardBorder]}
          >
            <Image source={{ uri: member.photo }} style={styles.teamPhoto} />
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName}>{member.name}</Text>
              <Text style={styles.teamRole}>{member.role}</Text>
              <Text style={styles.teamBio}>{member.bio}</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Linking.openURL('https://linkedin.com')}
                >
                  <Ionicons name="logo-linkedin" size={16} color="#0a66c2" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Linking.openURL('https://twitter.com')}
                >
                  <Ionicons name="logo-twitter" size={16} color="#1da1f2" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── FIX 2C: Office Info ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Find Us</Text>
        <Text style={styles.sectionTitle}>Office Information</Text>
        {OFFICE_INFO.map(({ emoji, label }) => (
          <View key={label} style={styles.officeRow}>
            <Text style={styles.officeEmoji}>{emoji}</Text>
            <Text style={styles.officeLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── FIX 2B: Social Media ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Follow Us</Text>
        <Text style={styles.sectionTitle}>Stay Connected</Text>
        <View style={styles.socialLinksRow}>
          {SOCIAL_LINKS.map(({ icon, color, url }) => (
            <TouchableOpacity
              key={icon}
              style={[styles.socialLinkBtn, { borderColor: color }]}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.75}
            >
              <Ionicons name={icon} size={28} color={color} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── FIX 2A: Contact Form ── */}
      <View style={styles.section}>
        <Text style={styles.badge}>Get in Touch</Text>
        <Text style={styles.sectionTitle}>Send Us a Message</Text>

        {submitted ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={44} color="#10b981" />
            <Text style={styles.successTitle}>Message Sent!</Text>
            <Text style={styles.successBody}>
              {"We'll get back to you as soon as possible."}
            </Text>
            <TouchableOpacity
              style={styles.successReset}
              onPress={() => {
                setSubmitted(false);
                setContactName('');
                setContactEmail('');
                setContactPhone('');
                setContactMessage('');
              }}
            >
              <Text style={styles.successResetText}>Send another message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.contactInput}
              placeholder="Your full name"
              placeholderTextColor="#94a3b8"
              value={contactName}
              onChangeText={setContactName}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.contactInput}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.contactInput}
              placeholder="+961 71 234 567"
              placeholderTextColor="#94a3b8"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.contactInput, styles.contactTextarea]}
              placeholder="How can we help you?"
              placeholderTextColor="#94a3b8"
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleContactSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── CTA ── */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Ready to Find Your Perfect Space?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of satisfied renters and landlords on RentalHub
        </Text>
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => Linking.openURL(WHATSAPP_URL)}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.whatsappText}>Contact Us on WhatsApp</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  // ── Hero ────────────────────────────────────────────────────────
  hero: {
    backgroundColor: '#1e3a5f',
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  statsDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 24,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem:  { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontFamily: FONTS.heading, color: '#fff' },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },

  // ── Section card ─────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 18,
    padding: 22,
    shadowColor: '#1e3a5f',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#2d5a8c',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: '#1e293b',
    marginBottom: 14,
    lineHeight: 26,
  },
  bodyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  highlightsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  checkRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontSize: 14, color: '#1e293b', fontFamily: FONTS.medium },

  // ── Values ───────────────────────────────────────────────────────
  valueCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  valueCardBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  valueIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#1e293b', marginBottom: 4 },
  valueDesc:  { fontSize: 13, color: '#64748b', lineHeight: 19, fontFamily: FONTS.body },

  // ── Team ─────────────────────────────────────────────────────────
  teamCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  teamCardBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  teamPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
  },
  teamName: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#1e293b' },
  teamRole: { fontSize: 13, color: '#2d5a8c', marginTop: 2, fontFamily: FONTS.medium },
  teamBio:  { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18, fontFamily: FONTS.body },
  socialRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  socialBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── FIX 2C: Office Info ───────────────────────────────────────────
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  officeEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  officeLabel: { fontSize: 15, color: '#1e293b', fontFamily: FONTS.body },

  // ── FIX 2B: Social media links ────────────────────────────────────
  socialLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  socialLinkBtn: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },

  // ── FIX 2A: Contact Form ─────────────────────────────────────────
  inputLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: '#475569',
    marginBottom: 6,
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontFamily: FONTS.body,
    marginBottom: 16,
  },
  contactTextarea: { minHeight: 100 },
  submitBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },

  // ── Success state ─────────────────────────────────────────────────
  successBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: '#1e293b',
    marginTop: 12,
  },
  successBody: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: FONTS.body,
    marginTop: 6,
    textAlign: 'center',
  },
  successReset: { marginTop: 16 },
  successResetText: { color: '#2d5a8c', fontFamily: FONTS.semiBold, fontSize: 14 },

  // ── CTA ──────────────────────────────────────────────────────────
  cta: {
    backgroundColor: '#1e3a5f',
    margin: 16,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#1e3a5f',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingHorizontal: 26,
    paddingVertical: 14,
    marginTop: 20,
    shadowColor: '#25D366',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },
});
