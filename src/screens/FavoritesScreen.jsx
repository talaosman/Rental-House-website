
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, overlay, shadow } from '../theme/colors';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchFavorites = async () => {
    if (!userId) {
      setFetchError('You must be logged in to view favorites.');
      return;
    }
    try {
      const res = await API.get(`/api/favorites/user/${userId}`);
      setFavorites(res.data);
      setFetchError(null);
    } catch (err) {
      setFetchError(err.message || 'Error fetching favorites');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFavorites().finally(() => setLoading(false));
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleRemove = async (propertyId) => {
    try {
      await API.delete(`/api/favorites/remove?userId=${userId}&propertyId=${propertyId}`);
      setFavorites((prev) => prev.filter((fav) => fav.property.id !== propertyId));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to remove favorite');
    }
  };

  const handleViewProperty = (propertyId) => {
    navigation.navigate('PropertyDetails', { id: propertyId });
  };

  const getImageUri = (image) => {
    if (!image) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop';
    return image.startsWith('http') ? image : `http://10.0.2.2:5000/uploads/${image}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.navyDark} />
          <Text style={styles.centerText}>Loading your favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.centerText}>{fetchError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>My Favorites</Text>
          <Text style={styles.heroSubtitle}>Properties you love, all in one place</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.centerText}>
            Start exploring and save properties you love to see them here
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.exploreBtnText}>🔍 Explore Properties</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const { property } = item;
    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUri(property.image) }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemove(property.id)}
          >
            <Text style={styles.removeBtnText}>❤️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{property.title}</Text>
          <Text style={styles.cardLocation} numberOfLines={1}>📍 {property.location}</Text>

          <View style={styles.featuresRow}>
            <Text style={styles.featureBadge}>🛏 {property.nbOfBedrooms} Beds</Text>
            <Text style={styles.featureBadge}>🏠 {property.propertyType}</Text>
          </View>

          <View style={styles.pricingRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Per Day</Text>
              <Text style={styles.priceValue}>${property.pricePerDay}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Per Month</Text>
              <Text style={styles.priceValue}>${property.pricePerMonth}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => handleViewProperty(property.id)}
          >
            <Text style={styles.viewBtnText}>View Property</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>My Favorites</Text>
        <Text style={styles.heroSubtitle}>
          {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
        </Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.navyDark}
            colors={[brand.navyDark]}
          />
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.browseMoreBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.browseMoreText}>🔍 Browse All Properties</Text>
          </TouchableOpacity>
        }
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
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: text.primary },
  emptyIcon: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: text.primary },

  hero: {
    backgroundColor: brand.navyDark,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: brand.white, marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  listContainer: { padding: 16, gap: 16 },

  card: {
    backgroundColor: background.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  removeBtn: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: overlay.modalBg,
    borderRadius: 20, padding: 8,
  },
  removeBtnText: { fontSize: 18 },

  cardInfo: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: text.primary, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: text.muted, marginBottom: 10 },

  featuresRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  featureBadge: {
    backgroundColor: background.chip,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, fontSize: 12, color: text.slate,
    borderWidth: 1, borderColor: border.DEFAULT,
  },

  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: background.userInfo,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 11, color: text.muted, marginBottom: 4 },
  priceValue: { fontSize: 16, fontWeight: '700', color: brand.navyDark },
  priceDivider: { width: 1, height: 30, backgroundColor: border.DEFAULT },

  viewBtn: {
    backgroundColor: brand.navyDark,
    borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  viewBtnText: { color: brand.white, fontWeight: '700', fontSize: 15 },

  exploreBtn: {
    backgroundColor: brand.navyDark,
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28,
    marginTop: 8,
  },
  exploreBtnText: { color: brand.white, fontWeight: '700', fontSize: 15 },

  browseMoreBtn: {
    backgroundColor: background.card,
    borderRadius: 14, padding: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: brand.navyDark,
    marginTop: 8, marginBottom: 24,
  },
  browseMoreText: { color: brand.navyDark, fontWeight: '700', fontSize: 15 },
});
