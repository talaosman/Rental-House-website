
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/baseAPI';
import { brand, background, text, border, error as errorColors, shadow } from '../theme/colors';

export default function AdminFeedbackScreen() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const res = await API.get('/api/feedback');
      setFeedbacks(res.data);
    } catch (err) {
      setFetchError(err.message || 'Error fetching feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/api/feedback/${id}`);
              setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete feedback');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.navyDark} />
          <Text style={styles.centerText}>Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Feedback Found</Text>
          <Text style={styles.centerText}>There is currently no feedback submitted by users.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackUsername}>{item.username || 'Anonymous'}</Text>
        <Text style={styles.feedbackDate}>
          {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ''}
        </Text>
      </View>
      <Text style={styles.feedbackMessage}>{item.message}</Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>🗑️ Delete Feedback</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>User Feedbacks</Text>
        <Text style={styles.pageSubtitle}>{feedbacks.length} submissions</Text>
      </View>

      <FlatList
        data={feedbacks}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  errorText: { color: errorColors.DEFAULT, fontSize: 14 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: text.primary },

  pageHeader: {
    backgroundColor: brand.navyDark,
    padding: 20,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: brand.white, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  listContainer: { padding: 16, gap: 14 },

  feedbackCard: {
    backgroundColor: background.card,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  feedbackUsername: { fontSize: 15, fontWeight: '700', color: brand.navyDark },
  feedbackDate: { fontSize: 12, color: text.muted },
  feedbackMessage: {
    fontSize: 14, color: text.slate, lineHeight: 20, marginBottom: 14,
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: errorColors.vivid,
  },
  deleteBtnText: { color: errorColors.DEFAULT, fontWeight: '700', fontSize: 14 },
});
