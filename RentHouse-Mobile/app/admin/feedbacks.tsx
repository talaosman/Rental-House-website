import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { feedbackService } from '../../services/feedback.service';
import { FONTS } from '../../constants/fonts';

export default function AdminFeedbacksScreen() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      const res = await feedbackService.getAll();
      setFeedbacks(res.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load feedbacks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchFeedbacks();
  }, [user?.role]);

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="lock-closed" size={48} color="#bdc3c7" />
        <Text style={styles.unauthorizedText}>Admin access required</Text>
      </View>
    );
  }

  const handleDelete = (id: number) => {
    Alert.alert('Delete Feedback', 'Remove this feedback permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await feedbackService.remove(id);
            setFeedbacks((prev) => prev.filter((f) => f.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete feedback');
          }
        },
      },
    ]);
  };

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeedbacks(); }} />}
    >
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#3498db" />
          <Text style={styles.summaryCount}>{feedbacks.length}</Text>
          <Text style={styles.summaryLabel}>Total Feedbacks</Text>
        </View>
      </View>

      {feedbacks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-outline" size={56} color="#bdc3c7" />
          <Text style={styles.emptyText}>No feedbacks yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {feedbacks.map((fb) => (
            <View key={fb.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(fb.username || fb.user?.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{fb.username || fb.user?.username || 'Unknown'}</Text>
                  <Text style={styles.userEmail}>{fb.email || fb.user?.email || ''}</Text>
                </View>
                <Text style={styles.date}>{formatDate(fb.createdAt || fb.date || '')}</Text>
              </View>

              <Text style={styles.message}>{fb.message}</Text>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(fb.id)}>
                <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
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
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  summaryCount: { fontSize: 28, fontFamily: FONTS.heading, color: '#fff' },
  summaryLabel: { fontSize: 13, color: '#bdc3c7' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#7f8c8d' },

  list: { padding: 16, gap: 12 },
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
    marginBottom: 12,
    gap: 10,
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
  userEmail: { fontSize: 12, color: '#7f8c8d', marginTop: 1 },
  date: { fontSize: 11, color: '#bdc3c7' },

  message: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 21,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 13, fontFamily: FONTS.semiBold },
});
