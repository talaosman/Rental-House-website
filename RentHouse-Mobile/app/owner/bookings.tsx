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

interface Rent {
  rentId: number;
  houseId?: number;
  houseTitle: string;
  houseImage?: string;
  houseLocation: string;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'active' | 'completed' | 'expired' | string;
}

function houseImageUri(raw: string | undefined): string {
  if (!raw) return 'https://ui-avatars.com/api/?name=House&background=random';
  if (raw.startsWith('http')) return raw;
  return `${BASE_URL}/uploads/${raw}`;
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n || 0);
}

const STATUS_COLORS: Record<string, string> = {
  active:    '#22c55e',
  completed: '#3498db',
  expired:   '#e74c3c',
  used:      '#f59e0b',
  inactive:  '#94a3b8',
};

function statusColor(s: string): string {
  return STATUS_COLORS[s?.toLowerCase()] ?? '#94a3b8';
}

export default function OwnerBookingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rents, setRents]         = useState<Rent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRents = async () => {
    if (!user) return;
    try {
      // Exact endpoint from OwnerDashboard.js: /api/owner/:userId/rents
      const res = await api.get(`/api/owner/${user.id}/rents`);
      setRents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchRents(); }, [user]));

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
      contentContainerStyle={rents.length === 0 ? styles.emptyContainer : styles.list}
      data={rents}
      keyExtractor={(r) => String(r.rentId)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRents(); }} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No rental history yet</Text>
          <Text style={styles.emptySub}>Bookings for your properties will appear here.</Text>
        </View>
      }
      renderItem={({ item: rent }) => {
        const color = statusColor(rent.status);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => rent.houseId && router.push(`/property/${rent.houseId}` as any)}
            activeOpacity={rent.houseId ? 0.75 : 1}
          >
            <Image
              source={{ uri: houseImageUri(rent.houseImage) }}
              style={styles.cardImage}
              resizeMode="cover"
            />

            <View style={styles.cardBody}>
              {/* Title + status */}
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{rent.houseTitle}</Text>
                <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.statusText, { color }]}>{rent.status}</Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color="#7f8c8d" />
                <Text style={styles.cardSub} numberOfLines={1}>{rent.houseLocation}</Text>
              </View>

              {/* Meta grid — mirrors frontend: Tenant, Email, Period, Revenue */}
              <View style={styles.metaGrid}>
                <MetaItem icon="person-outline" label="Tenant" value={rent.tenantName || '—'} />
                <MetaItem icon="mail-outline"   label="Email"  value={rent.tenantEmail || '—'} />
                <MetaItem
                  icon="calendar-outline"
                  label="Period"
                  value={`${formatDate(rent.startDate)} → ${formatDate(rent.endDate)}`}
                />
                <MetaItem
                  icon="cash-outline"
                  label="Revenue"
                  value={formatCurrency(rent.totalPrice)}
                  highlight
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

function MetaItem({
  icon, label, value, highlight,
}: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaItemLeft}>
        <Ionicons name={icon} size={13} color="#7f8c8d" />
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text style={[styles.metaValue, highlight && styles.metaValueHighlight]} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  cardImage: { width: '100%', height: 130 },
  cardBody: { padding: 14 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontFamily: FONTS.heading, color: '#2C3E50', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  cardSub: { fontSize: 12, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },

  metaGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaLabel:    { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },
  metaValue:    { fontSize: 12, color: '#2C3E50', fontFamily: FONTS.semiBold, flex: 1, textAlign: 'right' },
  metaValueHighlight: { color: '#22c55e' },

  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub:   { fontSize: 13, color: '#7f8c8d', textAlign: 'center', fontFamily: FONTS.body },
});
