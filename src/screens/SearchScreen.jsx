/**
 * SearchScreen.jsx
 * Converted from SearchListingsPage.js
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, success, error as errorColors, shadow } from '../theme/colors';

export default function SearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAdmin } = useAuth();

  const [allListings, setAllListings] = useState([]);
  const [initialListings, setInitialListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mostRentedHouseIds, setMostRentedHouseIds] = useState([]);

  const [filters, setFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    propertyType: '',
    priceMode: 'perMonth',
  });

  useEffect(() => {
    if (route.params?.query) {
      setFilters((prev) => ({ ...prev, location: route.params.query }));
    }
  }, [route.params?.query]);

  useEffect(() => {
    API.get('/api/houses/most-rented')
      .then((res) => setMostRentedHouseIds(res.data.map((h) => h.id)))
      .catch(() => {});
  }, []);

  const fetchListings = async () => {
    const res = await API.get('/api/houses');
    setInitialListings(res.data);
    setAllListings(res.data);
  };

  useEffect(() => {
    setLoading(true);
    fetchListings()
      .catch(() => Alert.alert('Error', 'Failed to fetch properties'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings().catch(() => {});
    setRefreshing(false);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const relRes = await API.get(`/api/houses/${id}/related-count`);
              const relatedCount = relRes.data.count || 0;
              const deleteUrl = relatedCount > 0 ? `/api/houses/${id}?force=true` : `/api/houses/${id}`;
              await API.delete(deleteUrl);
              Alert.alert('Success', 'Property deleted successfully!');
              setAllListings((prev) => prev.filter((h) => h.id !== id));
              setInitialListings((prev) => prev.filter((h) => h.id !== id));
            } catch (err) {
              Alert.alert('Error', err.response?.data || 'Failed to delete property.');
            }
          },
        },
      ]
    );
  };

  const handleSearch = () => {
    const isEmpty =
      !filters.location &&
      !filters.propertyType &&
      (!filters.bedrooms || filters.bedrooms === '0') &&
      (!filters.minPrice || filters.minPrice === '0') &&
      (!filters.maxPrice || filters.maxPrice === '5000');

    if (isEmpty) {
      setAllListings(initialListings);
      return;
    }

    const filtered = initialListings.filter((listing) => {
      const matchesLocation = filters.location
        ? listing.location.toLowerCase().includes(filters.location.toLowerCase())
        : true;

      const priceField = filters.priceMode === 'perDay' ? listing.pricePerDay : listing.pricePerMonth;
      const matchesPrice =
        (filters.minPrice === '' || priceField >= parseFloat(filters.minPrice)) &&
        (filters.maxPrice === '' || priceField <= parseFloat(filters.maxPrice));

      const matchesType = filters.propertyType
        ? listing.propertyType === filters.propertyType
        : true;

      const matchesBedrooms = filters.bedrooms
        ? listing.nbOfBedrooms === parseInt(filters.bedrooms)
        : true;

      return matchesLocation && matchesPrice && matchesType && matchesBedrooms;
    });

    setAllListings(filtered);
  };

  const handleViewDetails = (id) => {
    navigation.navigate('PropertyDetails', { id });
  };

  const propertyTypes = Array.from(new Set(initialListings.map((l) => l.propertyType).filter(Boolean)));

  const getImageUri = (image) => {
    if (!image) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop';
    return image.startsWith('http') ? image : `http://10.0.2.2:5000/uploads/${image}`;
  };

  const renderCard = ({ item: listing }) => (
    <View style={styles.card}>
      {/* Badges */}
      <View style={styles.badgesRow}>
        {mostRentedHouseIds.includes(listing.id) && (
          <View style={styles.badgeRecommended}>
            <Text style={styles.badgeRecommendedText}>⭐ Recommended</Text>
          </View>
        )}
        {listing.isNew && (
          <View style={styles.badgeNew}>
            <Text style={styles.badgeNewText}>New Listing</Text>
          </View>
        )}
      </View>

      <Image
        source={{ uri: getImageUri(listing.image) }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>📍 {listing.location}</Text>

        <View style={styles.detailsRow}>
          <Text style={styles.detailItem}>🛏 {listing.nbOfBedrooms} Bedrooms</Text>
          {listing.propertyType ? (
            <Text style={styles.detailItem}>🏠 {listing.propertyType}</Text>
          ) : null}
        </View>

        <View style={styles.priceDisplayRow}>
          {listing.pricePerMonth ? (
            <Text style={styles.priceMain}>
              ${listing.pricePerMonth.toLocaleString()}
              <Text style={styles.pricePeriod}>/month</Text>
            </Text>
          ) : null}
          {listing.pricePerDay ? (
            <Text style={styles.priceSecondary}>
              ${listing.pricePerDay.toLocaleString()}/day
            </Text>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => handleViewDetails(listing.id)}
          >
            <Text style={styles.viewDetailsBtnText}>View Details</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(listing.id)}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.navyDark}
            colors={[brand.navyDark]}
          />
        }
      >

        {/* Filters Panel */}
        <View style={styles.filtersPanel}>
          <Text style={styles.pageTitle}>Search Listings</Text>

          <TextInput
            style={styles.filterInput}
            placeholder="Location (e.g. Downtown)"
            placeholderTextColor={text.hint}
            value={filters.location}
            onChangeText={(v) => setFilters((prev) => ({ ...prev, location: v }))}
          />

          {/* Price Mode Toggle */}
          <View style={styles.priceModeRow}>
            <Text style={styles.filterLabel}>Price Mode:</Text>
            {['perMonth', 'perDay'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, filters.priceMode === mode && styles.modeBtnActive]}
                onPress={() => setFilters((prev) => ({ ...prev, priceMode: mode }))}
              >
                <Text style={[styles.modeBtnText, filters.priceMode === mode && styles.modeBtnTextActive]}>
                  {mode === 'perMonth' ? 'Per Month' : 'Per Day'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.priceRow}>
            <TextInput
              style={[styles.filterInput, { flex: 1, marginRight: 8, marginBottom: 0 }]}
              placeholder="Min Price"
              placeholderTextColor={text.hint}
              value={filters.minPrice}
              onChangeText={(v) => setFilters((prev) => ({ ...prev, minPrice: v }))}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.filterInput, { flex: 1, marginBottom: 0 }]}
              placeholder="Max Price"
              placeholderTextColor={text.hint}
              value={filters.maxPrice}
              onChangeText={(v) => setFilters((prev) => ({ ...prev, maxPrice: v }))}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={styles.filterInput}
            placeholder="Bedrooms (e.g. 2)"
            placeholderTextColor={text.hint}
            value={filters.bedrooms}
            onChangeText={(v) => setFilters((prev) => ({ ...prev, bedrooms: v }))}
            keyboardType="numeric"
          />

          {/* Property Type */}
          <Text style={styles.filterLabel}>Property Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            <TouchableOpacity
              style={[styles.typeChip, !filters.propertyType && styles.typeChipActive]}
              onPress={() => setFilters((prev) => ({ ...prev, propertyType: '' }))}
            >
              <Text style={[styles.typeChipText, !filters.propertyType && styles.typeChipTextActive]}>Any</Text>
            </TouchableOpacity>
            {propertyTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, filters.propertyType === type && styles.typeChipActive]}
                onPress={() => setFilters((prev) => ({ ...prev, propertyType: type }))}
              >
                <Text style={[styles.typeChipText, filters.propertyType === type && styles.typeChipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>🔍 Search</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={brand.navyDark} />
            <Text style={styles.loadingText}>Loading properties...</Text>
          </View>
        ) : allListings.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsIcon}>🏚️</Text>
            <Text style={styles.noResultsTitle}>No Properties Found</Text>
            <Text style={styles.noResultsText}>Try adjusting your filters to see more results</Text>
          </View>
        ) : (
          <FlatList
            data={allListings}
            renderItem={renderCard}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  scroll: { flex: 1 },

  filtersPanel: {
    backgroundColor: background.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
  },
  pageTitle: {
    fontSize: 22, fontWeight: '800', color: text.primary,
    marginBottom: 16,
  },
  filterLabel: { color: text.muted, fontSize: 12, marginBottom: 6, marginTop: 8 },
  filterInput: {
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: text.primary, marginBottom: 10,
  },
  priceModeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: border.DEFAULT,
    backgroundColor: background.userInfo,
  },
  modeBtnActive: { backgroundColor: brand.navyDark, borderColor: brand.navyDark },
  modeBtnText: { color: text.muted, fontSize: 13 },
  modeBtnTextActive: { color: brand.white, fontWeight: '700' },
  priceRow: { flexDirection: 'row', marginBottom: 10 },
  typeScroll: { marginBottom: 12 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: border.DEFAULT,
    backgroundColor: background.chip, marginRight: 8,
  },
  typeChipActive: { backgroundColor: brand.navyDark, borderColor: brand.navyDark },
  typeChipText: { color: text.slate, fontSize: 13 },
  typeChipTextActive: { color: brand.white, fontWeight: '700' },
  searchBtn: {
    backgroundColor: brand.navyDark, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  searchBtnText: { color: brand.white, fontWeight: '700', fontSize: 16 },

  loadingContainer: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: text.muted, fontSize: 14 },
  noResults: { padding: 40, alignItems: 'center', gap: 10 },
  noResultsIcon: { fontSize: 48 },
  noResultsTitle: { fontSize: 20, fontWeight: '700', color: text.primary },
  noResultsText: { color: text.muted, fontSize: 14, textAlign: 'center' },

  listContainer: { padding: 12, gap: 14 },
  card: {
    backgroundColor: background.card,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgesRow: { flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 10 },
  badgeRecommended: {
    backgroundColor: '#fffbeb',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#f59e0b',
  },
  badgeRecommendedText: { fontSize: 11, color: '#b45309', fontWeight: '600' },
  badgeNew: {
    backgroundColor: '#ecfdf5',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: success.DEFAULT,
  },
  badgeNewText: { fontSize: 11, color: success.dark, fontWeight: '600' },
  cardImage: { width: '100%', height: 160, resizeMode: 'cover' },
  cardContent: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: text.primary, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: text.muted, marginBottom: 10 },
  detailsRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  detailItem: { fontSize: 13, color: text.slate },
  priceDisplayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 12 },
  priceMain: { fontSize: 20, fontWeight: '800', color: brand.navyDark },
  pricePeriod: { fontSize: 12, fontWeight: '400', color: text.muted },
  priceSecondary: { fontSize: 13, color: text.muted },
  cardActions: { flexDirection: 'row', gap: 10 },
  viewDetailsBtn: {
    flex: 1, backgroundColor: brand.navyDark,
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  viewDetailsBtnText: { color: brand.white, fontWeight: '700', fontSize: 14 },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16,
    alignItems: 'center', borderWidth: 1, borderColor: errorColors.vivid,
  },
  deleteBtnText: { fontSize: 18 },
});
