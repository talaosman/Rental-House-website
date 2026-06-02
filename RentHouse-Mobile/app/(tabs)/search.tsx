import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { houseService } from '../../services/house.service';
import PropertyCard from '../../components/PropertyCard';
import { useAuth } from '../../context/AuthContext';
import { FONTS } from '../../constants/fonts';

const PROPERTY_TYPES = ['Any', 'Apartment', 'House', 'Villa', 'Studio', 'Condo'];
const BEDROOM_OPTIONS = ['Any', '1', '2', '3', '4', '5+'];

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [query,          setQuery]          = useState((params.query as string) || '');
  const [locationFilter, setLocationFilter] = useState('');  // FIX 3
  const [allHouses,      setAllHouses]      = useState<any[]>([]);
  const [filtered,       setFiltered]       = useState<any[]>([]);
  const [mostRentedIds,  setMostRentedIds]  = useState<Set<number>>(new Set());
  const [loading,        setLoading]        = useState(true);
  const [showFilter,     setShowFilter]     = useState(false);

  const [selectedType, setSelectedType] = useState('Any');
  const [selectedBeds, setSelectedBeds] = useState('Any');
  const [priceMode, setPriceMode]       = useState<'perDay' | 'perMonth'>('perMonth');
  const [minPrice,  setMinPrice]        = useState('');
  const [maxPrice,  setMaxPrice]        = useState('');

  // FIX 4 — threshold date for "New" badge (7 days ago, stable reference)
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  // Initial data load
  useEffect(() => {
    Promise.all([
      houseService.getAll(),
      houseService.getMostRented(),
    ]).then(([allRes, mostRentedRes]) => {
      setAllHouses(allRes.data);
      setFiltered(allRes.data);
      const ids = new Set<number>((mostRentedRes.data || []).map((h: any) => h.id as number));
      setMostRentedIds(ids);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applyFilters();
  }, [query, locationFilter, selectedType, selectedBeds, priceMode, minPrice, maxPrice, allHouses]);

  const applyFilters = () => {
    let results = [...allHouses];

    // Main search bar (title / location / type)
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (h) =>
          h.title?.toLowerCase().includes(q) ||
          h.location?.toLowerCase().includes(q) ||
          h.propertyType?.toLowerCase().includes(q)
      );
    }

    // FIX 3 — location-only text filter
    if (locationFilter.trim()) {
      const loc = locationFilter.toLowerCase();
      results = results.filter((h) => h.location?.toLowerCase().includes(loc));
    }

    if (selectedType !== 'Any') {
      results = results.filter((h) => h.propertyType?.toLowerCase() === selectedType.toLowerCase());
    }

    if (selectedBeds !== 'Any') {
      const beds = selectedBeds === '5+' ? 5 : parseInt(selectedBeds);
      results = results.filter((h) =>
        selectedBeds === '5+' ? h.nbOfBedrooms >= 5 : h.nbOfBedrooms === beds
      );
    }

    const priceField = priceMode === 'perDay' ? 'pricePerDay' : 'pricePerMonth';

    if (minPrice) {
      results = results.filter((h) => (h[priceField] ?? 0) >= parseInt(minPrice));
    }

    if (maxPrice) {
      results = results.filter((h) => (h[priceField] ?? 0) <= parseInt(maxPrice));
    }

    setFiltered(results);
  };

  const handleDelete = async (houseId: number) => {
    try {
      const countRes = await houseService.getRelatedCount(houseId);
      const count = countRes.data?.count ?? 0;

      if (count > 0) {
        Alert.alert(
          'Active Rentals Found',
          `This house has ${count} active rental(s). Force delete anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Force Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await houseService.forceDelete(houseId);
                  setAllHouses((prev) => prev.filter((h) => h.id !== houseId));
                } catch {
                  Alert.alert('Error', 'Failed to delete property');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Delete Property', 'Are you sure you want to delete this property?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await houseService.delete(houseId);
                setAllHouses((prev) => prev.filter((h) => h.id !== houseId));
              } catch {
                Alert.alert('Error', 'Failed to delete property');
              }
            },
          },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not check rental status');
    }
  };

  const resetFilters = () => {
    setSelectedType('Any');
    setSelectedBeds('Any');
    setPriceMode('perMonth');
    setMinPrice('');
    setMaxPrice('');
    setLocationFilter('');  // FIX 3
    setShowFilter(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Properties</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Location, type..."
            placeholderTextColor="#999999"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="options" size={22} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      <Text style={styles.resultCount}>{filtered.length} properties found</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2C3E50" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={60} color="#bdc3c7" />
              <Text style={styles.emptyText}>No properties match your search</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetLink}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.filter(Boolean).map((house) => {
              // FIX 4 — "New" if house was created within the last 7 days
              const isNew = house.createdAt
                ? new Date(house.createdAt) > sevenDaysAgo
                : false;

              return (
                <PropertyCard
                  key={house.id}
                  house={house}
                  isRecommended={mostRentedIds.has(house.id)}
                  onDelete={isAdmin ? handleDelete : undefined}
                  isNew={isNew}
                />
              );
            })
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            {/* FIX 3 — Location filter (first, above all other filters) */}
            <Text style={styles.filterLabel}>Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#7f8c8d" />
              <TextInput
                style={styles.locationInput}
                placeholder="Filter by location..."
                placeholderTextColor="#999999"
                value={locationFilter}
                onChangeText={setLocationFilter}
              />
              {locationFilter.length > 0 && (
                <TouchableOpacity onPress={() => setLocationFilter('')}>
                  <Ionicons name="close-circle" size={16} color="#bdc3c7" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.filterLabel}>Property Type</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selectedType === type && styles.chipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Bedrooms</Text>
            <View style={styles.chipRow}>
              {BEDROOM_OPTIONS.map((bed) => (
                <TouchableOpacity
                  key={bed}
                  style={[styles.chip, selectedBeds === bed && styles.chipActive]}
                  onPress={() => setSelectedBeds(bed)}
                >
                  <Text style={[styles.chipText, selectedBeds === bed && styles.chipTextActive]}>
                    {bed}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Price Mode</Text>
            <View style={[styles.chipRow, { marginBottom: 16 }]}>
              {(['perMonth', 'perDay'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.chip, priceMode === mode && styles.chipActive]}
                  onPress={() => setPriceMode(mode)}
                >
                  <Text style={[styles.chipText, priceMode === mode && styles.chipTextActive]}>
                    {mode === 'perMonth' ? 'Per Month' : 'Per Day'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>
              Price Range ({priceMode === 'perDay' ? '/day' : '/month'}) ($)
            </Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.priceInput, { flex: 1 }]}
                placeholder="Min"
                placeholderTextColor="#999999"
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="number-pad"
              />
              <Text style={styles.priceSep}>–</Text>
              <TextInput
                style={[styles.priceInput, { flex: 1 }]}
                placeholder="Max"
                placeholderTextColor="#999999"
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultCount: {
    marginHorizontal: 20,
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
    fontFamily: FONTS.body,
  },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#7f8c8d', marginTop: 12, fontFamily: FONTS.body },
  resetLink: { color: '#3498db', marginTop: 10, fontSize: 14, fontFamily: FONTS.body },

  // ── Filter Modal ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: FONTS.heading, color: '#2C3E50' },
  filterLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 10 },

  // FIX 3 — location filter row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  locationInput: { flex: 1, fontSize: 15, color: '#2C3E50', fontFamily: FONTS.body },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#f8f9fa',
  },
  chipActive:     { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  chipText:       { fontSize: 13, color: '#2C3E50', fontFamily: FONTS.body },
  chipTextActive: { color: '#fff', fontFamily: FONTS.body },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
  },
  priceSep: { fontSize: 16, color: '#7f8c8d', fontWeight: '600' },

  filterActions: { flexDirection: 'row', gap: 12 },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2C3E50',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  resetBtnText: { color: '#2C3E50', fontFamily: FONTS.semiBold },
  applyBtn: {
    flex: 2,
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontFamily: FONTS.semiBold },
});
