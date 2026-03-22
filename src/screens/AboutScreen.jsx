
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { brand, background, text, border, shadow } from '../theme/colors';

const teamMembers = [
  { name: 'Tala Osman', role: 'CEO & Co-Founder', bio: 'Visionary leader with 10+ years in real estate technology' },
  { name: 'Ali Ibrahim', role: 'Chief Technology Officer', bio: 'Tech innovator building scalable solutions for modern living' },
  { name: 'Yasmina BouSaid', role: 'Head of User Experience', bio: 'Design expert creating intuitive, beautiful interfaces' },
];

const values = [
  {
    icon: '👁️',
    title: 'Transparency',
    desc: 'We provide clear, accurate, and verified property details to build trust in every transaction. No hidden fees, no surprises.',
  },
  {
    icon: '🚀',
    title: 'Innovation',
    desc: 'We continuously develop intuitive tools that make the rental process smarter, faster, and more efficient for everyone.',
  },
  {
    icon: '👥',
    title: 'Community',
    desc: 'We empower both renters and landlords through an engaged, supportive network that grows stronger every day.',
  },
];

export default function AboutScreen() {
  const navigation = useNavigation();

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/96178841333?text=Hello%20RentalHub%2C%20I%20would%20like%20to%20inquire%20about%20your%20services');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome to RentalHub</Text>
          <Text style={styles.heroSubtitle}>
            Connecting people with exceptional rental spaces since 2020
          </Text>
          <View style={styles.heroStats}>
            {[
              { val: '5,000+', label: 'Properties Listed' },
              { val: '3,200+', label: 'Happy Tenants' },
              { val: '24/7', label: 'Customer Support' },
            ].map((s, i) => (
              <View key={i} style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>{s.val}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Our Mission</Text>
          </View>
          <Text style={styles.sectionTitle}>Simplifying the Rental Experience</Text>
          <Text style={styles.bodyText}>
            At RentalHub, our mission is to revolutionize the way people find and list rental properties.
            We believe that everyone deserves a seamless, transparent, and trustworthy experience when
            searching for their next home or listing their property.
          </Text>
          <Text style={styles.bodyText}>
            Through innovative technology, verified listings, and dedicated support, we connect landlords
            with quality tenants and help renters discover their perfect space.
          </Text>
          {['Verified Property Listings', 'Real-Time Support', 'Secure Transactions'].map((h, i) => (
            <View key={i} style={styles.highlightItem}>
              <Text style={styles.highlightCheck}>✅</Text>
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>

        {/* Values */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Our Principles</Text>
          </View>
          <Text style={styles.sectionTitle}>Core Values That Drive Us</Text>
          <Text style={styles.bodyText}>
            Our values shape every decision we make and every feature we build
          </Text>
          <View style={styles.valuesGrid}>
            {values.map((v, i) => (
              <View key={i} style={styles.valueCard}>
                <Text style={styles.valueIcon}>{v.icon}</Text>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueDesc}>{v.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Our Team</Text>
          </View>
          <Text style={styles.sectionTitle}>Meet the People Behind RentalHub</Text>
          <Text style={styles.bodyText}>
            A passionate team of real estate enthusiasts, tech experts, and community builders
          </Text>
          <View style={styles.teamGrid}>
            {teamMembers.map((member, i) => (
              <View key={i} style={styles.teamCard}>
                <View style={styles.teamAvatarContainer}>
                  <Image
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1e3a5f&color=ffffff&size=120` }}
                    style={styles.teamAvatar}
                  />
                </View>
                <Text style={styles.teamName}>{member.name}</Text>
                <Text style={styles.teamRole}>{member.role}</Text>
                <Text style={styles.teamBio}>{member.bio}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Find Your Perfect Space?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of satisfied renters and landlords on RentalHub today
          </Text>
          <View style={styles.ctaButtons}>
            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.ctaPrimaryText}>Get Started →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaSecondaryBtn} onPress={openWhatsApp}>
              <Text style={styles.ctaSecondaryText}>💬 Contact Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  scroll: { flex: 1 },

  hero: {
    backgroundColor: brand.navyDark,
    padding: 32, alignItems: 'center',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: brand.white, textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  heroStats: { flexDirection: 'row', gap: 24 },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { fontSize: 22, fontWeight: '800', color: brand.white, marginBottom: 4 },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
    backgroundColor: background.page,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: background.lightBlue,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 12, borderWidth: 1, borderColor: brand.navyMid,
  },
  sectionBadgeText: { color: brand.navyDark, fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: text.primary, marginBottom: 12 },
  bodyText: { fontSize: 14, color: text.muted, lineHeight: 22, marginBottom: 12 },

  highlightItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  highlightCheck: { fontSize: 16 },
  highlightText: { fontSize: 14, color: text.slate, fontWeight: '600' },

  valuesGrid: { gap: 14, marginTop: 8 },
  valueCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  valueIcon: { fontSize: 32, marginBottom: 10 },
  valueTitle: { fontSize: 16, fontWeight: '700', color: text.primary, marginBottom: 8 },
  valueDesc: { fontSize: 13, color: text.muted, lineHeight: 20 },

  teamGrid: { gap: 14, marginTop: 8 },
  teamCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  teamAvatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    overflow: 'hidden', marginBottom: 12,
    borderWidth: 2, borderColor: brand.navyDark,
  },
  teamAvatar: { width: '100%', height: '100%' },
  teamName: { fontSize: 17, fontWeight: '700', color: text.primary, marginBottom: 4 },
  teamRole: { fontSize: 13, color: brand.navyDark, marginBottom: 6, fontWeight: '600' },
  teamBio: { fontSize: 13, color: text.muted, textAlign: 'center', lineHeight: 18 },

  ctaSection: {
    margin: 20,
    backgroundColor: brand.navyDark,
    borderRadius: 16, padding: 28, alignItems: 'center',
  },
  ctaTitle: { fontSize: 22, fontWeight: '700', color: brand.white, textAlign: 'center', marginBottom: 10 },
  ctaSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  ctaButtons: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  ctaPrimaryBtn: {
    backgroundColor: brand.white, borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 24,
  },
  ctaPrimaryText: { color: brand.navyDark, fontWeight: '700', fontSize: 15 },
  ctaSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaSecondaryText: { color: brand.white, fontWeight: '600', fontSize: 15 },
});
