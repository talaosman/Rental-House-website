/**
 * AdminRatingsScreen.jsx
 * Converted from AdminRatingsDashboard.js
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/baseAPI';
import { brand, background, text, border, shadow } from '../theme/colors';

export default function AdminRatingsScreen() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/ratings');
      const data = res.data;
      setRatings(Array.isArray(data) ? data : data.ratings || []);
    } catch {
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const sortByStars = () => {
    setRatings((prev) => [...prev].sort((a, b) => b.stars - a.stars));
  };

  const renderRating = ({ item: r }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <Text style={styles.houseName} numberOfLines={1}>
          {r.house?.location || 'Unknown Property'}
        </Text>
        <Text style={styles.userName}>by {r.user?.username || 'Anonymous'}</Text>
      </View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Text key={s} style={[styles.star, s <= r.stars ? styles.starFilled : styles.starEmpty]}>
            ★
          </Text>
        ))}
        <Text style={styles.starsCount}>{r.stars}/5</Text>
      </View>
      {r.comment ? (
        <Text style={styles.comment}>&quot;{r.comment}&quot;</Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.navyDark} />
          <Text style={styles.centerText}>Loading ratings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>🏆 Admin Ratings Dashboard</Text>
        <Text style={styles.pageSubtitle}>View all user ratings across properties</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={sortByStars}>
          <Text style={styles.sortBtnText}>Sort by Stars ⭐</Text>
        </TouchableOpacity>
      </View>

      {ratings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No Ratings Available</Text>
          <Text style={styles.centerText}>No user ratings have been submitted yet.</Text>
        </View>
      ) : (
        <FlatList
          data={ratings}
          renderItem={renderRating}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, gap: 12,
  },
  centerText: { color: text.muted, fontSize: 14, textAlign: 'center' },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: text.primary },

  pageHeader: {
    backgroundColor: brand.navyDark,
    padding: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: brand.white, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  sortBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  sortBtnText: { color: brand.white, fontWeight: '700', fontSize: 14 },

  listContainer: { padding: 16, gap: 14 },

  ratingCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  houseName: { fontSize: 15, fontWeight: '700', color: text.primary, flex: 1 },
  userName: { fontSize: 12, color: text.muted },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  star: { fontSize: 22 },
  starFilled: { color: '#f59e0b' },
  starEmpty: { color: border.medium },
  starsCount: { fontSize: 13, color: text.muted, marginLeft: 6 },
  comment: { fontSize: 14, color: text.slate, fontStyle: 'italic', lineHeight: 20 },
});
