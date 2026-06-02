import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FONTS } from '../../constants/fonts';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Offer {
  discountPercentage: number;
  active: boolean;
  used: boolean;
  expiryDate?: string;
  house?: { title: string };
}

interface Row {
  user: User;
  offers: Offer[];
}

function initials(name: string): string {
  return (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#e74c3c',
  HOUSE_OWNER: '#f39c12',
  USER: '#2ecc71',
};

export default function AdminUsersScreen() {
  const { user: authUser } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleDelete = (userId: number, username: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${username}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/users/${userId}`);
              setRows(prev => prev.filter(r => r.user.id !== userId));
            } catch {
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            }
          },
        },
      ],
    );
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users');
      const users: User[] = Array.isArray(res.data) ? res.data : [];
      const now = new Date();

      const settled = await Promise.allSettled(
        users.map((u) =>
          api
            .get(`/api/offers/user/${u.id}`)
            .then((r) => ({
              user: u,
              offers: Array.isArray(r.data)
                ? r.data.filter((o: Offer) => {
                    const exp = o.expiryDate ? new Date(o.expiryDate) : null;
                    return o.active && (!exp || exp >= now);
                  })
                : [] as Offer[],
            }))
            .catch(() => ({ user: u, offers: [] as Offer[] }))
        )
      );

      setRows(
        settled
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<Row>).value)
      );
    } catch {
      // silent — empty list shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser?.role === 'ADMIN') fetchAll();
  }, [authUser?.role]);

  if (authUser?.role !== 'ADMIN') {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="lock-closed" size={48} color="#bdc3c7" />
        <Text style={styles.unauthorizedText}>Admin access required</Text>
      </View>
    );
  }

  const filtered = rows.filter(({ user }) => {
    const q = search.toLowerCase();
    return (
      user.username?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q)
    );
  });

  const renderRow = ({ item, index }: { item: Row; index: number }) => {
    const { user, offers } = item;
    const isOpen = expanded === index;
    const roleLabel = user.role === 'HOUSE_OWNER' ? 'OWNER' : user.role;
    const roleColor = ROLE_COLOR[user.role] ?? '#7f8c8d';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => setExpanded(isOpen ? null : index)}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.username)}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.username}>{user.username || `User #${user.id}`}</Text>
            <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
          </View>

          <View style={styles.userRight}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
            {offers.length > 0 && (
              <Text style={styles.offerCount}>
                {offers.length} offer{offers.length !== 1 ? 's' : ''}
              </Text>
            )}
            <View style={styles.rowActions}>
              {user.role !== 'ADMIN' && user.id !== authUser?.id && (
                <TouchableOpacity
                  onPress={() => handleDelete(user.id, user.username || `User #${user.id}`)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
              )}
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#8899aa" />
            </View>
          </View>
        </TouchableOpacity>

        {isOpen && offers.length > 0 && (
          <View style={styles.offersWrap}>
            {offers.map((offer, oi) => (
              <View key={oi} style={styles.offerPill}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.discount}>🔥 {offer.discountPercentage}% OFF</Text>
                  <Text style={styles.property} numberOfLines={1}>
                    {offer.house ? `For: ${offer.house.title}` : 'Any property'}
                  </Text>
                </View>
                <View style={styles.offerMeta}>
                  <View style={[styles.dot, { backgroundColor: offer.used ? '#e74c3c' : '#2ecc71' }]} />
                  <Text style={styles.metaText}>{offer.used ? 'Used' : 'Active'}</Text>
                  <Text style={styles.metaText}>
                    {offer.expiryDate ? fmtDate(offer.expiryDate) : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {isOpen && offers.length === 0 && (
          <View style={styles.noOffers}>
            <Text style={styles.noOffersText}>No active offers</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a252f" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management ({rows.length} users)</Text>
        <Text style={styles.headerSub}>Tap a user to view offers · Admins cannot be deleted</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#8899aa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor="#8899aa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#8899aa" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#2C3E50" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a252f',
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2C3E50',
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.body, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#1a252f',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C3E50',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFD700', fontFamily: FONTS.semiBold, fontSize: 15 },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#fff' },
  email: { fontSize: 12, color: '#8899aa', marginTop: 2, fontFamily: FONTS.body },
  userRight: { alignItems: 'flex-end', gap: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#fff' },
  offerCount: { fontSize: 11, color: '#FFD700', fontFamily: FONTS.body },

  offersWrap: {
    borderTopWidth: 1,
    borderTopColor: '#2C3E50',
    padding: 12,
    gap: 8,
  },
  offerPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1923',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  discount: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#FFD700' },
  property: { fontSize: 11, color: '#8899aa', marginTop: 2, fontFamily: FONTS.body },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  metaText: { fontSize: 11, color: '#8899aa', fontFamily: FONTS.body },

  noOffers: {
    borderTopWidth: 1,
    borderTopColor: '#2C3E50',
    padding: 14,
    alignItems: 'center',
  },
  noOffersText: { color: '#8899aa', fontFamily: FONTS.body, fontSize: 13 },

  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#8899aa', fontFamily: FONTS.body, fontSize: 15, marginTop: 12 },

  unauthorized: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1923' },
  unauthorizedText: { marginTop: 12, color: '#8899aa', fontFamily: FONTS.body, fontSize: 15 },
});
