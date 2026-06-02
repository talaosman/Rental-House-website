import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ratingService } from '../../services/rating.service';
import { FONTS } from '../../constants/fonts';

type SortOrder = 'desc' | 'asc';

export default function AdminRatingsScreen() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<any[]>([]);
  const [sorted, setSorted] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRatings = async () => {
    try {
      const res = await ratingService.getAll();
      const data = res.data || [];
      setRatings(data);
      setSorted([...data].sort((a, b) => (b.stars ?? b.rating ?? 0) - (a.stars ?? a.rating ?? 0)));
    } catch {
      Alert.alert('Error', 'Failed to load ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchRatings();
  }, [user?.role]);

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="lock-closed" size={48} color="#bdc3c7" />
        <Text style={styles.unauthorizedText}>Admin access required</Text>
      </View>
    );
  }

  const toggleSort = () => {
    const newOrder: SortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    setSorted((prev) =>
      [...prev].sort((a, b) => {
        const bv = b.stars ?? b.rating ?? 0;
        const av = a.stars ?? a.rating ?? 0;
        return newOrder === 'desc' ? bv - av : av - bv;
      })
    );
  };

  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + (r.stars ?? r.rating ?? 0), 0) / ratings.length).toFixed(1)
    : '0.0';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2C3E50" style={{ flex: 1, marginTop: 60 }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRatings(); }} />}
    >
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="star" size={24} color="#f1c40f" />
            <Text style={styles.summaryCount}>{avgRating}</Text>
            <Text style={styles.summaryLabel}>Avg Rating</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="list" size={24} color="#3498db" />
            <Text style={styles.summaryCount}>{ratings.length}</Text>
            <Text style={styles.summaryLabel}>Total Reviews</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="star" size={24} color="#2ecc71" />
            <Text style={styles.summaryCount}>
              {ratings.filter((r) => (r.stars ?? r.rating ?? 0) >= 4).length}
            </Text>
            <Text style={styles.summaryLabel}>4+ Stars</Text>
          </View>
        </View>
      </View>

      {/* Sort Header */}
      <View style={styles.sortHeader}>
        <Text style={styles.sortHeaderTitle}>{ratings.length} Reviews</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={toggleSort}>
          <Ionicons
            name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={16}
            color="#2C3E50"
          />
          <Text style={styles.sortBtnText}>
            {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}
          </Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={56} color="#bdc3c7" />
          <Text style={styles.emptyText}>No ratings yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sorted.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(r.user?.name || r.user?.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{r.user?.name || r.user?.username || 'User'}</Text>
                  <Text style={styles.propertyName}>{r.house?.location || 'Unknown Property'}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#f1c40f" />
                  <Text style={styles.ratingValue}>{r.stars ?? r.rating ?? 0}</Text>
                </View>
              </View>

              {/* Stars row */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name="star"
                    size={16}
                    color={s <= (r.stars ?? r.rating ?? 0) ? '#f1c40f' : '#dfe6e9'}
                  />
                ))}
                {r.createdAt && (
                  <Text style={styles.dateText}>{formatDate(r.createdAt)}</Text>
                )}
              </View>

              {r.comment && (
                <Text style={styles.comment}>{r.comment}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  unauthorized: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  unauthorizedText: { fontSize: 16, color: '#7f8c8d' },

  summary: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingBottom: 28,
  },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  summaryCount: { fontSize: 22, fontFamily: FONTS.heading, color: '#fff' },
  summaryLabel: { fontSize: 11, color: '#bdc3c7' },

  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortHeaderTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sortBtnText: { fontSize: 13, color: '#2C3E50', fontFamily: FONTS.semiBold },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#7f8c8d' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: FONTS.semiBold },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  propertyName: { fontSize: 12, color: '#7f8c8d', marginTop: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef9e7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingValue: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#f39c12' },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  dateText: { fontSize: 11, color: '#bdc3c7', marginLeft: 8 },
  comment: { fontSize: 13, color: '#636e72', lineHeight: 19 },
});
