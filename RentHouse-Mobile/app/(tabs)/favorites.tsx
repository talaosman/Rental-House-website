import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { favoriteService } from '../../services/favorite.service';
import PropertyCard from '../../components/PropertyCard';
import { FONTS } from '../../constants/fonts';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await favoriteService.getUserFavorites(user.id);
      console.log('[Favorites] API response:', JSON.stringify(res.data));
      setFavorites(res.data);
    } catch (err) {
      console.error('[Favorites] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchFavorites(); }, [user]));

  const handleRemoveFavorite = async (houseId: number) => {
    if (!user) return;
    try {
      await favoriteService.remove(user.id, houseId);
      setFavorites((prev) => prev.filter((f) => f.property?.id !== houseId));
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} />}
        >
          {favorites.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={70} color="#bdc3c7" />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySubtitle}>Properties you save will appear here</Text>
            </View>
          ) : (
            favorites.filter((fav) => fav.property != null).map((fav) => (
              <PropertyCard
                key={fav.id}
                house={fav.property}
                isFavorite={true}
                onToggleFavorite={handleRemoveFavorite}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    backgroundColor: '#2C3E50',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontFamily: FONTS.heading, color: '#fff' },
  list: { padding: 16, paddingBottom: 30 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: '#2C3E50',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 6,
    fontFamily: FONTS.body,
  },
});
