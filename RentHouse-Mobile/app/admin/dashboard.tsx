import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../services/api';
import { FONTS } from '../../constants/fonts';

interface Stats {
  totalHouses: number | string;
  totalUsers: number | string;
  totalRents: number | string;
  totalRevenue: number | string;
}

const STAT_CARDS = [
  { key: 'totalHouses',  label: 'Total Houses',  icon: 'home' as const },
  { key: 'totalUsers',   label: 'Total Users',   icon: 'people' as const },
  { key: 'totalRents',   label: 'Total Rentals', icon: 'stats-chart' as const },
  { key: 'totalRevenue', label: 'Total Revenue', icon: 'cash' as const },
];

const QUICK_ACTIONS = [
  { label: 'All Users',    icon: 'people-outline' as const,     route: '/admin/users' },
  { label: 'Post Listing', icon: 'add-circle-outline' as const, route: '/admin/post-listing' },
  { label: 'Feedbacks',   icon: 'chatbubbles-outline' as const, route: '/admin/feedbacks' },
  { label: 'Ratings',     icon: 'star-outline' as const,        route: '/admin/ratings' },
];

// Try the count/stats endpoint first; fall back to fetching the full list and
// using its length. Each stat is independent so one failure never breaks others.
async function fetchStatSafe(
  countUrl: string,
  fallbackUrl?: string,
): Promise<number | string> {
  try {
    const res = await api.get(countUrl);
    const d = res.data;
    if (typeof d === 'number') return d;
    return d?.count ?? d?.total ?? d?.revenue ?? '—';
  } catch {
    if (!fallbackUrl) return '—';
    try {
      const res = await api.get(fallbackUrl);
      return Array.isArray(res.data) ? res.data.length : '—';
    } catch {
      return '—';
    }
  }
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalHouses: '—', totalUsers: '—', totalRents: '—', totalRevenue: '—',
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [houses, setHouses] = useState<any[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    // Stats — four independent fetches so any single failure shows '—' for that card only
    Promise.all([
      fetchStatSafe('/api/houses/count', '/api/houses'),
      fetchStatSafe('/api/users/count',  '/api/users'),
      fetchStatSafe('/api/rents/count',  '/api/rents'),
      fetchStatSafe('/api/rents/total-revenue'),
    ]).then(([totalHouses, totalUsers, totalRents, totalRevenue]) => {
      setStats({ totalHouses, totalUsers, totalRents, totalRevenue });
    }).finally(() => setStatsLoading(false));

    // House list — independent from stats
    api.get('/api/houses')
      .then((res) => setHouses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setHouses([]))
      .finally(() => setHousesLoading(false));
  }, [user?.role]);

  const handleDeleteHouse = (id: number, title: string) => {
    Alert.alert(
      'Delete this house?',
      `"${title}" will be permanently removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mirror the web frontend: check for related data, force-delete if any
              let deleteUrl = `/api/houses/${id}`;
              try {
                const relRes = await api.get(`/api/houses/${id}/related-count`);
                if ((relRes.data?.count ?? 0) > 0) {
                  deleteUrl = `/api/houses/${id}?force=true`;
                }
              } catch {
                // endpoint absent — proceed with plain delete
              }
              await api.delete(deleteUrl);
              setHouses((prev) => prev.filter((h) => h.id !== id));
              setStats((prev) => ({
                ...prev,
                totalHouses:
                  typeof prev.totalHouses === 'number'
                    ? prev.totalHouses - 1
                    : prev.totalHouses,
              }));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data || 'Failed to delete property.');
            }
          },
        },
      ],
    );
  };

  const getImageUri = (image: string | null | undefined): string => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `${BASE_URL}${image}`;
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="lock-closed" size={48} color="#bdc3c7" />
        <Text style={styles.unauthorizedText}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a252f" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Platform-wide overview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Stats ── */}
        <Text style={styles.sectionLabel}>Platform Stats</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((card) => (
            <View key={card.key} style={styles.statCard}>
              <Ionicons name={card.icon} size={22} color="#8899aa" style={{ marginBottom: 8 }} />
              {statsLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Text style={styles.statValue}>{(stats as any)[card.key]}</Text>
              )}
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.75}
            >
              <Ionicons name={action.icon} size={28} color="#FFD700" />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.manageUsersBtn}
          onPress={() => router.push('/admin/users' as any)}
          activeOpacity={0.75}
        >
          <Ionicons name="people" size={20} color="#FFD700" />
          <Text style={styles.manageUsersBtnText}>Manage Users</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899aa" />
        </TouchableOpacity>

        {/* ── Houses list ── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Houses</Text>

        {housesLoading ? (
          <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 20 }} />
        ) : houses.length === 0 ? (
          <Text style={styles.emptyText}>No houses found.</Text>
        ) : (
          houses.map((house) => {
            const imgUri = getImageUri(house.image);
            const price = house.pricePerMonth
              ? `$${house.pricePerMonth}/mo`
              : house.pricePerDay
              ? `$${house.pricePerDay}/day`
              : '';
            return (
              <View key={house.id} style={styles.houseRow}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.houseThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.houseThumbnail, styles.thumbnailPlaceholder]}>
                    <Ionicons name="home-outline" size={22} color="#8899aa" />
                  </View>
                )}

                <View style={styles.houseInfo}>
                  <Text style={styles.houseTitle} numberOfLines={1}>
                    {house.title}
                  </Text>
                  <Text style={styles.houseLocation} numberOfLines={1}>
                    {house.location}
                  </Text>
                  {price ? <Text style={styles.housePrice}>{price}</Text> : null}
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteHouse(house.id, house.title)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1923' },
  header: {
    backgroundColor: '#1a252f',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C3E50',
  },
  headerTitle: { fontSize: 24, fontFamily: FONTS.heading, color: '#fff' },
  headerSub: { fontSize: 13, color: '#8899aa', marginTop: 4, fontFamily: FONTS.body },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#8899aa',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    width: '47%',
    backgroundColor: '#1a252f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C3E50',
  },
  statValue: { fontSize: 28, fontFamily: FONTS.heading, color: '#FFD700', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#8899aa', fontFamily: FONTS.body, textAlign: 'center', marginTop: 4 },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: '#1a252f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2C3E50',
  },
  actionLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#fff' },
  manageUsersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a252f',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2C3E50',
  },
  manageUsersBtnText: { flex: 1, fontSize: 15, fontFamily: FONTS.semiBold, color: '#fff' },

  // Misc
  unauthorized: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1923' },
  unauthorizedText: { marginTop: 12, color: '#8899aa', fontFamily: FONTS.body, fontSize: 15 },
  emptyText: { color: '#8899aa', fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // House rows
  houseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a252f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C3E50',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  houseThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#243342',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  houseInfo: { flex: 1 },
  houseTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#fff', marginBottom: 2 },
  houseLocation: { fontSize: 12, color: '#8899aa', fontFamily: FONTS.body, marginBottom: 2 },
  housePrice: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#FFD700' },
  deleteBtn: {
    padding: 9,
    backgroundColor: '#2a1515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5a2020',
  },
});
