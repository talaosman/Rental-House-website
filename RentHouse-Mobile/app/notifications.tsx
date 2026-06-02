import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notification.service';
import { FONTS } from '../constants/fonts';

interface Notification {
  id: number;
  title: string;
  body: string;
  houseId?: number;
  isRead: boolean;
  read: boolean;          // Jackson may serialize boolean isRead as "read"
  createdAt: string;
}

function isRead(n: Notification): boolean {
  return n.isRead ?? n.read ?? false;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationService.getNotifications(user.id);
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh whenever this screen gains focus (e.g. navigating back)
  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchNotifications();
  }, [user]));

  const handleMarkOne = async (notif: Notification) => {
    if (isRead(notif)) {
      // Already read — just navigate to the property if there is one
      if (notif.houseId) router.push(`/property/${notif.houseId}` as any);
      return;
    }
    try {
      await notificationService.markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, isRead: true, read: true } : n)
      );
    } catch {
      // silent — still navigate
    }
    if (notif.houseId) router.push(`/property/${notif.houseId}` as any);
  };

  const handleMarkAll = async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

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
      contentContainerStyle={
        notifications.length === 0 ? styles.emptyContainer : styles.list
      }
      data={notifications}
      keyExtractor={(n) => String(n.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
        />
      }
      ListHeaderComponent={
        notifications.length > 0 ? (
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={handleMarkAll}
                disabled={markingAll}
              >
                {markingAll
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.markAllText}>Mark all read</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={72} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            You'll be notified when a favourited property becomes available.
          </Text>
        </View>
      }
      renderItem={({ item: notif }) => {
        const read = isRead(notif);
        return (
          <TouchableOpacity
            style={[styles.card, !read && styles.cardUnread]}
            onPress={() => handleMarkOne(notif)}
            activeOpacity={0.75}
          >
            {/* Icon */}
            <View style={[styles.iconWrap, !read && styles.iconWrapUnread]}>
              <Ionicons
                name={notif.houseId ? 'home' : 'notifications'}
                size={20}
                color={read ? '#7f8c8d' : '#2C3E50'}
              />
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, !read && styles.cardTitleUnread]} numberOfLines={1}>
                  {notif.title}
                </Text>
                {!read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.cardMsg} numberOfLines={2}>{notif.body}</Text>
              <Text style={styles.cardTime}>{timeAgo(notif.createdAt)}</Text>
            </View>

            {/* Chevron if navigable */}
            {!!notif.houseId && (
              <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 24 },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  listHeaderText: { fontSize: 13, color: '#7f8c8d', fontFamily: FONTS.body },
  markAllBtn: {
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  markAllText: { color: '#fff', fontSize: 12, fontFamily: FONTS.semiBold },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2C3E50',
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapUnread: { backgroundColor: '#dbeafe' },

  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { fontSize: 14, fontFamily: FONTS.medium, color: '#7f8c8d', flex: 1 },
  cardTitleUnread: { color: '#2C3E50', fontFamily: FONTS.semiBold },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#3498db',
  },
  cardMsg: { fontSize: 13, color: '#636e72', lineHeight: 18, fontFamily: FONTS.body },
  cardTime: { fontSize: 11, color: '#bdc3c7', marginTop: 4, fontFamily: FONTS.body },

  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub: {
    fontSize: 13, color: '#7f8c8d', textAlign: 'center',
    lineHeight: 19, fontFamily: FONTS.body, paddingHorizontal: 20,
  },
});
