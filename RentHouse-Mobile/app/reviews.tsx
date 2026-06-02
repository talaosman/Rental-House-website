import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ratingService } from '../services/rating.service';
import { FONTS } from '../constants/fonts';

export default function ReviewsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await ratingService.getByUser(user.id);
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('REVIEWS DATA:', JSON.stringify(data[0]));
      setReviews(data);
    } catch (err: any) {
      console.log('[Reviews] error:', err.response?.status, JSON.stringify(err.response?.data));
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchReviews(); };

  const renderStars = (count: number) =>
    [1, 2, 3, 4, 5].map((s) => (
      <Ionicons key={s} name="star" size={14} color={s <= count ? '#f1c40f' : '#dfe6e9'} />
    ));

  const formatReviewDate = (raw: any): string | null => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: any }) => {
    const house = item.house ?? item.property ?? {};
    // field-name fallbacks — backend uses 'comment' but guard against alternatives
    const comment = item.comment ?? item.description ?? item.review ?? item.text ?? '';
    const stars   = item.stars   ?? item.rating     ?? item.score   ?? 0;
    const dateStr = formatReviewDate(
      item.createdAt ?? item.date ?? item.reviewDate ?? null
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => house.id && router.push(`/property/${house.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.houseTitle} numberOfLines={1}>
              {house.title || 'Property'}
            </Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={12} color="#7f8c8d" />
              <Text style={styles.houseLocation} numberOfLines={1}>
                {house.location || '—'}
              </Text>
            </View>
          </View>
          <View style={styles.starsRow}>{renderStars(stars)}</View>
        </View>

        {!!comment && (
          <Text style={styles.comment}>"{comment}"</Text>
        )}

        <View style={styles.cardFooter}>
          {dateStr && <Text style={styles.dateText}>{dateStr}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <Ionicons name="chevron-forward" size={14} color="#bdc3c7" />
            <Text style={styles.viewText}>View property</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2C3E50" style={styles.centered} />;
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={reviews.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={70} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySub}>Reviews you leave on properties will appear here</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseBtnText}>Browse Properties</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 30 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  houseTitle: { fontSize: 15, fontFamily: FONTS.heading, color: '#2C3E50', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  houseLocation: { fontSize: 12, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },
  starsRow: { flexDirection: 'row', gap: 2, marginLeft: 8 },
  comment: {
    fontSize: 14, color: '#444444', fontStyle: 'italic', fontFamily: FONTS.body,
    lineHeight: 20, marginTop: 4, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#dfe6e9', paddingLeft: 10,
  },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    gap: 3, marginTop: 4,
  },
  viewText:  { fontSize: 12, color: '#bdc3c7' },
  dateText:  { fontSize: 11, color: '#95a5a6', fontFamily: FONTS.body },
  emptyState: { alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', paddingHorizontal: 32, fontFamily: FONTS.body },
  browseBtn: {
    marginTop: 12, backgroundColor: '#2C3E50', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  browseBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },
});
