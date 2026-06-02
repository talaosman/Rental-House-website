import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { houseService } from '../../services/house.service';
import { notificationService } from '../../services/notification.service';
import { feedbackService } from '../../services/feedback.service';
import PropertyCard from '../../components/PropertyCard';
import { FONTS } from '../../constants/fonts';
import OwnerDashboard from '../owner/dashboard';
import AdminDashboardScreen from '../admin/dashboard';

const COUNTER_TARGETS = [
  { label: 'Properties', target: 5000, suffix: '+' },
  { label: 'Tenants', target: 3200, suffix: '+' },
  { label: 'Support', target: 0, suffix: '24/7' },
];


// ─── Thin wrapper — renders owner dashboard or regular home based on role ────
// This keeps the tab bar visible for owners without a stack-screen push.
export default function HomeTabScreen() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboardScreen />;
  if (user?.role === 'HOUSE_OWNER') return <OwnerDashboard />;
  return <HomeScreen />;
}

function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [mostRented,    setMostRented]    = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [testimonials,  setTestimonials]  = useState<any[]>([]);

  // Animated counters
  const [counters, setCounters] = useState([0, 0, 0]);
  const countersStarted = useRef(false);

  const fetchData = async () => {
    try {
      const res = await houseService.getMostRented();
      setMostRented(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount(user.id);
      setUnreadCount(res.data?.count || 0);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds while the home screen is mounted
    const poll = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    feedbackService.getAll()
      .then((res) => setTestimonials(Array.isArray(res.data) ? res.data : []))
      .catch(() => {/* non-critical */});
  }, []);

  // Re-fetch unread count whenever this tab regains focus (e.g. back from /notifications)
  useFocusEffect(useCallback(() => { fetchUnreadCount(); }, [user]));

  useEffect(() => {
    if (countersStarted.current) return;
    countersStarted.current = true;
    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounters([
        Math.min(Math.floor(5000 * progress), 5000),
        Math.min(Math.floor(3200 * progress), 3200),
        0,
      ]);
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({ pathname: '/(tabs)/search', params: { query: searchQuery } });
    } else {
      router.push('/(tabs)/search');
    }
  };

  const formatCounter = (index: number) => {
    if (index === 2) return '24/7';
    return counters[index].toLocaleString() + '+';
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.username?.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>Find your perfect home</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications" size={24} color="#2C3E50" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/chatbot')} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, type..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Animated Counters */}
        <View style={styles.countersRow}>
          {COUNTER_TARGETS.map((item, i) => (
            <View key={item.label} style={styles.counterCard}>
              <Text style={styles.counterValue}>{formatCounter(i)}</Text>
              <Text style={styles.counterLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="home" size={24} color="#2C3E50" />
            <Text style={styles.statLabel}>Browse</Text>
            <Text style={styles.statSub}>All Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/favorites')}>
            <Ionicons name="heart" size={24} color="#e74c3c" />
            <Text style={styles.statLabel}>Favorites</Text>
            <Text style={styles.statSub}>Saved Homes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/chatbot')}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#3498db" />
            <Text style={styles.statLabel}>AI Chat</Text>
            <Text style={styles.statSub}>Get Help</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {[
            { icon: 'search', title: 'Find Properties', desc: 'Explore verified rentals by area, price, and amenities.' },
            { icon: 'home', title: 'Post a Listing', desc: 'Reach tenants fast with our powerful listing tools.' },
            { icon: 'people', title: 'Join the Community', desc: 'Exclusive access to deals, alerts, and our trusted network.' },
          ].map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={26} color="#2C3E50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Most Rented */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Rented</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 20 }} />
          ) : mostRented.length === 0 ? (
            <Text style={styles.empty}>No properties available</Text>
          ) : (
            mostRented.filter(Boolean).map((house) => (
              <PropertyCard key={house.id} house={house} isRecommended />
            ))
          )}
        </View>

        {/* Testimonials — hidden when no feedback exists */}
        {testimonials.length > 0 && (
          <View style={styles.testimonialsSection}>
            <Text style={styles.sectionTitle}>What Our Users Say</Text>
            <FlatList
              horizontal
              data={testimonials}
              keyExtractor={(item, i) => String(item.id ?? i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.testimonialsList}
              renderItem={({ item }) => (
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialName} numberOfLines={1}>
                    {item.username || item.userName || 'Anonymous'}
                  </Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < Math.round(item.rating ?? 0) ? 'star' : 'star-outline'}
                        size={13}
                        color="#f1c40f"
                      />
                    ))}
                  </View>
                  <Text style={styles.testimonialComment} numberOfLines={4}>
                    {item.message || item.comment}
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#2C3E50',
  },
  greeting: { fontSize: 22, fontFamily: FONTS.heading, color: '#fff' },
  subtitle: { fontSize: 14, color: '#bdc3c7', marginTop: 2, fontFamily: FONTS.body },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerIconBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 8, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.semiBold },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  searchBtn: {
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 13 },

  countersRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  counterCard: {
    flex: 1,
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  counterValue: { fontSize: 20, fontFamily: FONTS.heading, color: '#fff' },
  counterLabel: { fontSize: 11, color: '#bdc3c7', marginTop: 4, fontFamily: FONTS.body },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50', marginTop: 6 },
  statSub: { fontSize: 11, color: '#7f8c8d', marginTop: 2, fontFamily: FONTS.body },

  featuresSection: { marginHorizontal: 20, marginBottom: 24, gap: 10 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 3 },
  featureDesc: { fontSize: 12, color: '#7f8c8d', lineHeight: 17, fontFamily: FONTS.body },
  section: { paddingHorizontal: 20, paddingBottom: 24 },

  // ── Testimonials ─────────────────────────────────────────────
  testimonialsSection: { paddingHorizontal: 20, paddingBottom: 28 },
  testimonialsList: { gap: 12, paddingRight: 20 },
  testimonialCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  testimonialName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#2C3E50',
    marginBottom: 6,
  },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  testimonialComment: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 19,
    fontFamily: FONTS.body,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginBottom: 12 },
  seeAll: { color: '#3498db', fontSize: 14, fontFamily: FONTS.body },
  empty: { textAlign: 'center', color: '#7f8c8d', marginTop: 20, fontFamily: FONTS.body },
});
