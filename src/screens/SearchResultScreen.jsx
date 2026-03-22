/**
 * SearchResultScreen.jsx
 * Source: RentHouse-FrontEnd/src/SearchResult.js
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import API from '../api/baseAPI';
import { brand, background, text, border, shadow } from '../theme/colors';

export default function SearchResultScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  const query = route.params?.query?.trim() ?? '';

  const [allListings,      setAllListings]      = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showNoResults,    setShowNoResults]     = useState(false);

  useEffect(() => {
    setLoading(true);
    API.get('/api/houses')
      .then(res => {
        setAllListings(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!query) {
      setFilteredListings([]);
      setShowNoResults(false);
      return;
    }

    const q = query.toLowerCase();
    const filtered = allListings.filter(
      l =>
        l.location?.toLowerCase().includes(q) ||
        l.title?.toLowerCase().includes(q) ||
        l.propertyType?.toLowerCase().includes(q),
    );

    setFilteredListings(filtered);
    setShowNoResults(filtered.length === 0);
  }, [allListings, query, loading]);

  const handleViewDetails = (id) => {
    navigation.navigate('PropertyDetails', { id });
  };

  const closeModal = () => {
    setShowNoResults(false);
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const imageUri = item.image?.startsWith('http')
      ? item.image
      : `http://10.0.2.2:5000/uploads/${item.image}`;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleViewDetails(item.id)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: imageUri }} style={s.cardImage} />
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardMeta}>📍 {item.location}</Text>
          <Text style={s.cardMeta}>💰 ${item.price ?? item.pricePerMonth}/mo</Text>
          <Text style={s.cardMeta}>🏠 {item.propertyType}</Text>
          <Text style={s.cardMeta}>🛏 {item.nbOfBedrooms} bedrooms</Text>
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={() => handleViewDetails(item.id)}
          >
            <Text style={s.detailsBtnLabel}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root}>

      <Text style={s.heading}>Results for &quot;{query}&quot;</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={brand.navyDark} />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !showNoResults ? (
              <View style={s.center}>
                <Text style={s.emptyText}>Enter a search term to see results.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* No-results modal */}
      <Modal visible={showNoResults} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>No Properties Found</Text>
            <Text style={s.modalBody}>
              Sorry, we couldn&apos;t find any properties matching your search.
            </Text>
            <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
              <Text style={s.closeBtnLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: background.page },

  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: text.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: { color: text.muted, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: background.card,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    overflow: 'hidden',
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 180, backgroundColor: background.chip },
  cardBody:  { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: text.primary, marginBottom: 6 },
  cardMeta:  { fontSize: 13, color: text.muted, marginBottom: 3 },

  detailsBtn: {
    marginTop: 10,
    backgroundColor: brand.navyDark,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  detailsBtnLabel: { fontSize: 14, fontWeight: '700', color: brand.white },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.cardMd,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: text.primary, marginBottom: 10 },
  modalBody:  { fontSize: 14, color: text.muted, textAlign: 'center', marginBottom: 20 },
  closeBtn: {
    backgroundColor: brand.navyDark,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  closeBtnLabel: { fontSize: 14, fontWeight: '700', color: brand.white },
});
