import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../services/api';
import { FONTS } from '../../constants/fonts';

interface House {
  id: number;
  title: string;
  location: string;
  image?: string;
  nbOfBedrooms: number;
  propertyType: string;
  pricePerMonth: number;
  status?: string;
  activeRents?: number;
  activeOffers?: number;
}

function imageUri(raw: string | undefined): string {
  if (!raw) return 'https://ui-avatars.com/api/?name=House&background=random';
  if (raw.startsWith('http')) return raw;
  return `${BASE_URL}/uploads/${raw}`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function MyPropertiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [houses, setHouses]     = useState<House[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHouses = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/api/owner/${user.id}/houses`);
      setHouses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHouses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchHouses(); }, [user]));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={houses.length === 0 ? styles.emptyContainer : styles.list}
      data={houses}
      keyExtractor={(h) => String(h.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHouses(); }} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={64} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptySub}>
            Make sure your owner email matches your account email.
          </Text>
        </View>
      }
      renderItem={({ item: house }) => (
        <View style={styles.card}>
          <Image
            source={{ uri: imageUri(house.image) }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {/* Status badge */}
          <View style={[styles.statusBadge, house.status?.toLowerCase() === 'available' ? styles.badgeAvail : styles.badgeRented]}>
            <Text style={styles.statusText}>{house.status || 'available'}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{house.title}</Text>

            <View style={styles.row}>
              <Ionicons name="location-outline" size={13} color="#7f8c8d" />
              <Text style={styles.cardSub} numberOfLines={1}>{house.location}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>
                <Ionicons name="bed-outline" size={13} color="#7f8c8d" /> {house.nbOfBedrooms} bed
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaItem}>{house.propertyType}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaPrice}>{formatCurrency(house.pricePerMonth)}/mo</Text>
            </View>

            {/* Active rentals & offers counts */}
            <View style={styles.badgeRow}>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>
                  {house.activeRents ?? 0} rental{(house.activeRents ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.infoBadge, { backgroundColor: '#ec4899' + '20' }]}>
                <Text style={[styles.infoBadgeText, { color: '#ec4899' }]}>
                  {house.activeOffers ?? 0} offer{(house.activeOffers ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/property/${house.id}` as any)}
            >
              <Ionicons name="eye-outline" size={18} color="#3498db" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  cardImage: { width: '100%', height: 160 },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAvail:  { backgroundColor: '#22c55e' },
  badgeRented: { backgroundColor: '#e74c3c' },
  statusText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },

  cardBody: { padding: 14 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.heading, color: '#2C3E50', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  cardSub: { fontSize: 13, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  metaItem:  { fontSize: 13, color: '#636e72', fontFamily: FONTS.body },
  metaDot:   { fontSize: 13, color: '#bdc3c7' },
  metaPrice: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50' },

  badgeRow: { flexDirection: 'row', gap: 8 },
  infoBadge: {
    backgroundColor: '#22c55e20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  infoBadgeText: { fontSize: 11, fontFamily: FONTS.semiBold, color: '#22c55e' },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub:   { fontSize: 13, color: '#7f8c8d', textAlign: 'center', fontFamily: FONTS.body, lineHeight: 19 },
});
