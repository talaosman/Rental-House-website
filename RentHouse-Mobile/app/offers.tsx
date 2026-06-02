import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FONTS } from '../constants/fonts';

interface Offer {
  id: number;
  discountPercentage: number;
  expiryDate: string | null;
  used: boolean;
  active: boolean;
  house?: { id: number; title: string; location?: string };
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function formatExpiry(expiryDate: string | null): string {
  if (!expiryDate) return 'No expiry';
  return new Date(expiryDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OffersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await api.get(`/api/offers/user/${user.id}`);
      setOffers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOffers(); }, [user]));

  const onRefresh = () => { setRefreshing(true); fetchOffers(); };

  // Active = not used, still active flag set, and not expired
  const activeOffers = offers.filter(
    (o) => !o.used && o.active && !isExpired(o.expiryDate)
  );
  // Past = used or expired
  const pastOffers = offers.filter(
    (o) => o.used || !o.active || isExpired(o.expiryDate)
  );

  const renderOffer = (offer: Offer, isPast: boolean) => {
    const expired = isExpired(offer.expiryDate);
    const label = offer.used ? 'Used' : expired ? 'Expired' : 'Active';
    const labelColor = offer.used ? '#7f8c8d' : expired ? '#e74c3c' : '#27ae60';

    return (
      <View key={offer.id} style={[styles.card, isPast && styles.cardPast]}>
        {/* Discount badge */}
        <View style={[styles.discountBadge, isPast && styles.discountBadgePast]}>
          <Text style={styles.discountPct}>{offer.discountPercentage}%</Text>
          <Text style={styles.discountOff}>OFF</Text>
        </View>

        {/* Details */}
        <View style={styles.cardBody}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {offer.house ? offer.house.title : 'Any property · same owner'}
          </Text>
          {offer.house?.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#7f8c8d" />
              <Text style={styles.locationText} numberOfLines={1}>
                {offer.house.location}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#7f8c8d" />
            <Text style={styles.expiryText}>
              {offer.expiryDate ? `Expires ${formatExpiry(offer.expiryDate)}` : 'No expiry'}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: labelColor + '20' }]}>
          <Text style={[styles.statusText, { color: labelColor }]}>{label}</Text>
        </View>

        {/* Navigate to property if exists */}
        {offer.house && !isPast && (
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push(`/property/${offer.house!.id}`)}
          >
            <Ionicons name="arrow-forward" size={18} color="#2C3E50" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
      contentContainerStyle={offers.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={[]}           // we render via ListHeaderComponent
      keyExtractor={() => ''}
      renderItem={null}
      ListHeaderComponent={
        <>
          {/* Active offers */}
          <View style={styles.groupHeader}>
            <Ionicons name="pricetag" size={18} color="#27ae60" />
            <Text style={styles.groupTitle}>Active Offers</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{activeOffers.length}</Text>
            </View>
          </View>

          {activeOffers.length === 0 ? (
            <View style={styles.emptyGroup}>
              <Ionicons name="pricetag-outline" size={44} color="#bdc3c7" />
              <Text style={styles.emptyGroupText}>No active offers</Text>
              <Text style={styles.emptyGroupSub}>
                Complete 3 rentals to earn a 20% discount offer
              </Text>
            </View>
          ) : (
            activeOffers.map((o) => renderOffer(o, false))
          )}

          {/* Past offers */}
          {pastOffers.length > 0 && (
            <>
              <View style={[styles.groupHeader, { marginTop: 8 }]}>
                <Ionicons name="time-outline" size={18} color="#7f8c8d" />
                <Text style={[styles.groupTitle, { color: '#7f8c8d' }]}>Past Offers</Text>
              </View>
              {pastOffers.map((o) => renderOffer(o, true))}
            </>
          )}

          {/* Empty state if no offers at all */}
          {offers.length === 0 && (
            <View style={styles.fullEmpty}>
              <Ionicons name="gift-outline" size={72} color="#bdc3c7" />
              <Text style={styles.fullEmptyTitle}>No offers yet</Text>
              <Text style={styles.fullEmptyDesc}>
                Rent properties to earn loyalty points.{'\n'}
                Every 3 rentals unlocks a 20% discount offer.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={styles.browseBtnText}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 24 },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  groupTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: '#2C3E50',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 12, fontFamily: FONTS.semiBold },

  // Offer card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  cardPast: { opacity: 0.6 },

  discountBadge: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgePast: { backgroundColor: '#95a5a6' },
  discountPct: { fontSize: 18, fontFamily: FONTS.heading, color: '#fff', lineHeight: 20 },
  discountOff: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#bdc3c7', letterSpacing: 1 },

  cardBody: { flex: 1 },
  propertyName: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  locationText: { fontSize: 12, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold },

  viewBtn: {
    padding: 6,
  },

  emptyGroup: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    gap: 6,
  },
  emptyGroupText: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#2C3E50', marginTop: 6 },
  emptyGroupSub: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: FONTS.body,
  },

  fullEmpty: { alignItems: 'center', gap: 10 },
  fullEmptyTitle: { fontSize: 20, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  fullEmptyDesc: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: FONTS.body,
  },
  browseBtn: {
    marginTop: 12,
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  browseBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },
});
