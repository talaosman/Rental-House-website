import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { rentService } from '../services/rent.service';
import { BASE_URL } from '../services/api';
import { FONTS } from '../constants/fonts';

export default function RentalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRentals = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await rentService.getUserRents(user.id);
      console.log('[Rentals] API response:', JSON.stringify(res.data));
      setRentals(res.data);
    } catch (err) {
      console.error('[Rentals] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRentals(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchRentals(); };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const getStatus = (endDate: string) => {
    if (!endDate) return { label: 'Active', color: '#27ae60' };
    return new Date(endDate) >= new Date()
      ? { label: 'Active', color: '#27ae60' }
      : { label: 'Completed', color: '#7f8c8d' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const house = item.house ?? item.property ?? {};
    const rawImage = house.image;
    const imageUri = rawImage
      ? (rawImage.startsWith('/') ? `${BASE_URL}${rawImage}` : rawImage)
      : 'https://ui-avatars.com/api/?name=House&background=random';
    const status = getStatus(item.endDate);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => house.id && router.push(`/property/${house.id}`)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{house.title || 'Property'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color="#7f8c8d" />
            <Text style={styles.cardSub} numberOfLines={1}>{house.location || '—'}</Text>
          </View>

          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color="#bdc3c7" />
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
            </View>
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
      data={rentals}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={rentals.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={70} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No rentals yet</Text>
          <Text style={styles.emptySub}>Properties you rent will appear here</Text>
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
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: { width: '100%', height: 150 },
  cardBody: { padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.heading, color: '#2C3E50', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 12, fontFamily: FONTS.semiBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  cardSub: { fontSize: 13, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },
  datesRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 10, gap: 8,
  },
  dateBlock: { alignItems: 'center', flex: 1 },
  dateLabel: { fontSize: 11, color: '#7f8c8d', marginBottom: 2, fontFamily: FONTS.body },
  dateValue: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  emptyState: { alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#7f8c8d', fontFamily: FONTS.body },
  browseBtn: {
    marginTop: 12, backgroundColor: '#2C3E50', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  browseBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },
});
