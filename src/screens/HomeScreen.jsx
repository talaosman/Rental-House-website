
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, shadow } from '../theme/colors';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState(0);
  const [users, setUsers] = useState(0);
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated counters
  useEffect(() => {
    let pVal = 0;
    const pTimer = setInterval(() => {
      pVal += 50;
      if (pVal >= 5000) { pVal = 5000; clearInterval(pTimer); }
      setProperties(pVal);
    }, 20);

    let uVal = 0;
    const uTimer = setInterval(() => {
      uVal += 40;
      if (uVal >= 3200) { uVal = 3200; clearInterval(uTimer); }
      setUsers(uVal);
    }, 20);

    return () => { clearInterval(pTimer); clearInterval(uTimer); };
  }, []);

  const fetchMostRented = async () => {
    try {
      const res = await API.get('/api/houses/most-rented');
      setFeaturedProperties(res.data);
    } catch {
      setFeaturedProperties([]);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await API.get('/api/feedback');
      // show latest 10, most recent first
      const sorted = [...res.data].sort((a, b) => {
        const da = a.submittedAt ? new Date(a.submittedAt) : 0;
        const db = b.submittedAt ? new Date(b.submittedAt) : 0;
        return db - da;
      });
      setFeedbacks(sorted.slice(0, 10));
    } catch {
      setFeedbacks([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMostRented(), fetchFeedbacks()]).finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMostRented(), fetchFeedbacks()]);
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery.trim() });
    }
  };

  const handlePropertyClick = (propertyId) => {
    navigation.navigate('PropertyDetails', { id: propertyId });
  };

  const getImageUri = (image) => {
    if (!image) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop';
    return image.startsWith('http') ? image : `http://10.0.2.2:5000/uploads/${image}`;
  };

  const renderProperty = ({ item: property }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => handlePropertyClick(property.id)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: getImageUri(property.image) }}
        style={styles.propertyImage}
      />
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName} numberOfLines={1}>{property.title}</Text>
        <Text style={styles.propertyLocation} numberOfLines={1}>
          📍 {property.location}
        </Text>
        <View style={styles.propertyFeatures}>
          <Text style={styles.featureItem}>
            🛏 {property.nbOfBedrooms} {property.nbOfBedrooms === 1 ? 'Bed' : 'Beds'}
          </Text>
          <Text style={styles.featureItem}>🏠 {property.propertyType}</Text>
        </View>
        <Text style={styles.propertyPrice}>
          ${(property.pricePerMonth || property.pricePerDay || 0).toLocaleString()}
          <Text style={styles.priceUnit}>/month</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.navyDark}
            colors={[brand.navyDark]}
          />
        }
      >

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Finding Your New Home Is Simple</Text>
          <Text style={styles.heroSubtitle}>
            We provide high-quality rental listings to help you find the perfect home
          </Text>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for properties..."
              placeholderTextColor={text.hint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Most Rented */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Rented</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={brand.navyDark} />
              <Text style={styles.loadingText}>Loading properties...</Text>
            </View>
          ) : featuredProperties.length > 0 ? (
            <FlatList
              data={featuredProperties}
              renderItem={renderProperty}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.propertiesList}
              scrollEnabled
            />
          ) : (
            <View style={styles.noProperties}>
              <Text style={styles.noPropertiesText}>No properties available at the moment.</Text>
            </View>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {[
            { icon: '🔍', title: 'Find Properties', desc: 'Explore verified rentals by area, price, and amenities.' },
            { icon: '🏠', title: 'Post a Listing', desc: 'Reach potential tenants fast with our powerful tools.' },
            { icon: '👥', title: 'Join the Community', desc: 'Get exclusive access to deals, alerts, and our trusted network.' },
          ].map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{properties.toLocaleString()}+</Text>
            <Text style={styles.statLabel}>Properties Listed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.toLocaleString()}+</Text>
            <Text style={styles.statLabel}>Satisfied Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Support Available</Text>
          </View>
        </View>

        {/* User Feedback */}
        {feedbacks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Our Users Say</Text>
            <FlatList
              data={feedbacks}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.feedbackList}
              renderItem={({ item }) => {
                const initials = (item.username || 'U').slice(0, 1).toUpperCase();
                const dateStr = item.submittedAt
                  ? new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : '';
                return (
                  <View style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <View style={styles.feedbackAvatar}>
                        <Text style={styles.feedbackAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.feedbackMeta}>
                        <Text style={styles.feedbackUsername}>{item.username || 'Anonymous'}</Text>
                        {dateStr ? <Text style={styles.feedbackDate}>{dateStr}</Text> : null}
                      </View>
                    </View>
                    <Text style={styles.feedbackMessage} numberOfLines={4}>{item.message}</Text>
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* CTA — only for guests */}
        {!isLoggedIn && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Ready to Find Your Dream Home?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of satisfied renters and landlords on RentalHub
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.ctaButtonText}>Get Started Now →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: background.page,
  },
  scroll: { flex: 1 },

  // Hero
  hero: {
    backgroundColor: brand.navyDark,
    padding: 28,
    paddingTop: 48,
    paddingBottom: 36,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: brand.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: brand.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: text.primary,
  },
  searchButton: {
    backgroundColor: brand.navyMid,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: brand.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Section
  section: {
    paddingTop: 28,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: text.primary,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  propertiesList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  propertyCard: {
    width: 220,
    backgroundColor: background.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '700',
    color: text.primary,
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 12,
    color: text.muted,
    marginBottom: 8,
  },
  propertyFeatures: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 12,
    color: text.slate,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.navyDark,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: text.muted,
  },

  // Loading / empty
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: text.muted, fontSize: 14 },
  noProperties: { padding: 24, alignItems: 'center' },
  noPropertiesText: { color: text.muted, fontSize: 14 },

  // Features
  featuresSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'center',
    backgroundColor: background.pageFade,
  },
  featureCard: {
    backgroundColor: background.card,
    borderRadius: 14,
    padding: 20,
    width: '44%',
    minWidth: 150,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: { fontSize: 32, marginBottom: 10 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.navyDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    color: text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: brand.navyDark,
    paddingVertical: 28,
    marginTop: 8,
  },
  statCard: { alignItems: 'center' },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: brand.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // Feedback
  feedbackList: {
    paddingHorizontal: 12,
    gap: 12,
    paddingBottom: 4,
  },
  feedbackCard: {
    width: 240,
    backgroundColor: background.card,
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  feedbackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackAvatarText: {
    color: brand.white,
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackMeta: { flex: 1 },
  feedbackUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: text.primary,
  },
  feedbackDate: {
    fontSize: 11,
    color: text.muted,
    marginTop: 2,
  },
  feedbackMessage: {
    fontSize: 13,
    color: text.slate,
    lineHeight: 20,
  },

  // CTA
  ctaSection: {
    margin: 20,
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: text.muted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: brand.navyDark,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  ctaButtonText: {
    color: brand.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
