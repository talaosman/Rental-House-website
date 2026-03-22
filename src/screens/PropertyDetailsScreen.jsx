
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, success, error as errorColors, warning, overlay, shadow } from '../theme/colors';

const dateToStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseSpringDate = (raw) => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [y, m, d] = raw;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(raw).slice(0, 10);
};

const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isActiveLease = (startRaw, endRaw) => {
  const today = todayStr();
  const start = parseSpringDate(startRaw);
  const end = parseSpringDate(endRaw);
  if (!start || !end) return false;
  return today >= start && today <= end;
};

export default function PropertyDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params || {};
  const { userId, userRole, isAdmin } = useAuth();

  const [property, setProperty] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFavoriteMessage, setShowFavoriteMessage] = useState(false);
  const [startDateObj, setStartDateObj] = useState(null);
  const [endDateObj, setEndDateObj] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // Android: temp values held while the Modal spinner is open
  const [tempStartDateObj, setTempStartDateObj] = useState(new Date());
  const [tempEndDateObj, setTempEndDateObj] = useState(new Date());
  const [rentSuccess, setRentSuccess] = useState(false);
  const [rentType, setRentType] = useState('perDay');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState([]);
  const [showThankYou, setShowThankYou] = useState(false);
  const [currentRent, setCurrentRent] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const isUnavailable = !isAvailable && currentRent != null;

  const refetchRentStatus = useCallback(async () => {
    try {
      const res = await API.get(`/api/rents/is-rented/${id}`);
      const data = res.data;
      if (data.available === true) {
        setIsAvailable(true); setCurrentRent(null); return;
      }
      const startRaw = data.startDate;
      const endRaw = data.endDate;
      if (startRaw && endRaw) {
        if (isActiveLease(startRaw, endRaw)) {
          setCurrentRent({ ...data, startDate: parseSpringDate(startRaw), endDate: parseSpringDate(endRaw) });
          setIsAvailable(false);
        } else {
          setCurrentRent(null); setIsAvailable(true);
        }
      } else {
        setCurrentRent(null); setIsAvailable(true);
      }
    } catch {
      setCurrentRent(null); setIsAvailable(true);
    }
  }, [id]);

  const fetchRatings = async () => {
    try {
      const res = await API.get(`/api/ratings/house/${id}`);
      setRatings(res.data);
    } catch {}
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await API.get(`/api/houses/${id}`);
        setProperty(res.data);
      } catch {}
    };
    fetchProperty();
    fetchRatings();
    refetchRentStatus();
  }, [id, refetchRentStatus]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!property || !userId) { setIsFavorite(false); return; }
      try {
        const res = await API.get(`/api/favorites/user/${userId}`);
        setIsFavorite(Array.isArray(res.data) && res.data.some((fav) => fav.property.id === property.id));
      } catch { setIsFavorite(false); }
    };
    checkFavorite();
  }, [property, userId]);

  const getImageUri = (image) => {
    if (!image) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop';
    return image.startsWith('http') ? image : `http://10.0.2.2:5000/uploads/${image}`;
  };

  const calculateTotalRent = () => {
    if (!startDate || !endDate || !property?.pricePerDay) return 0;
    const days = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    return days * property.pricePerDay;
  };

  const handleRentHouse = async () => {
    const calculatedEndDate = rentType === 'perMonth'
      ? new Date(new Date(startDate).getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : endDate;

    if (paymentMethod === 'cash') {
      try {
        await API.post(`/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`);
        setRentSuccess(true);
        setIsAvailable(false);
        setCurrentRent({ startDate, endDate: calculatedEndDate });
        setProperty((prev) => ({ ...prev, status: 'rented' }));
        await refetchRentStatus();
      } catch (err) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to complete rental. Please try again.');
      }
    } else {
      Alert.alert('Coming Soon', 'Credit card payment is not yet available in the mobile app.');
    }
  };

  const handleVisitRequest = () => {
    if (!userId) {
      setModalMessage('You must be logged in to schedule a visit.');
      setShowLoginModal(true);
      return;
    }
    navigation.navigate('Schedule', { houseId: id });
  };

  const toggleFavorite = async () => {
    if (!userId) {
      setModalMessage('You must be logged in to manage favorites.');
      setShowLoginModal(true);
      return;
    }
    if (!property) return;
    try {
      if (isFavorite) {
        await API.delete(`/api/favorites/remove?userId=${userId}&propertyId=${property.id}`);
        setIsFavorite(false);
      } else {
        await API.post(`/api/favorites/add?userId=${userId}&propertyId=${property.id}`);
        setIsFavorite(true);
        setShowFavoriteMessage(true);
        setTimeout(() => setShowFavoriteMessage(false), 3000);
      }
    } catch {}
  };

  const submitRating = async () => {
    if (!userId) {
      setModalMessage('You must be logged in to rate.');
      setShowLoginModal(true);
      return;
    }
    try {
      await API.post(`/api/ratings/add?userId=${userId}&houseId=${id}&stars=${rating}&comment=${comment}`);
      setRating(0); setComment('');
      fetchRatings();
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch {}
  };

  const openMaps = () => {
    if (!property) return;
    let url;
    if (property.latitude && property.longitude) {
      url = `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`;
    } else if (property.location) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`;
    }
    if (url) Linking.openURL(url);
  };

  if (!property) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={brand.navyDark} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: getImageUri(property.image) }}
            style={styles.propertyImage}
            resizeMode="cover"
          />
          {userRole !== 'ADMIN' && (
            <TouchableOpacity style={styles.favoriteBtn} onPress={toggleFavorite}>
              <Text style={styles.favIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.location}>{property.location}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoTag}>{property.propertyType}</Text>
              <Text style={styles.infoTag}>• {property.nbOfBedrooms} Bedrooms</Text>
              <Text style={[styles.infoTag, isAvailable ? styles.available : styles.rented]}>
                • {isAvailable ? 'Available' : 'Rented'}
              </Text>
            </View>
            {isUnavailable && currentRent?.endDate && (
              <Text style={styles.availabilityMsg}>
                Available after {new Date(currentRent.endDate + 'T12:00:00').toLocaleDateString()}
              </Text>
            )}
            <View style={styles.pricingRow}>
              <Text style={styles.priceDay}>${property.pricePerDay}/day</Text>
              <Text style={styles.priceMonth}>${property.pricePerMonth}/month</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>📍 Location</Text>
            <Text style={styles.bodyText}>{property.location}</Text>
            <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
              <Text style={styles.mapBtnText}>View on Map</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>About</Text>
            <Text style={styles.bodyText}>
              {property.description || 'A beautiful, spacious property in a prime location.'}
            </Text>
          </View>

          {/* Owner */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Owner Contact</Text>
            {property.owner?.name && <Text style={styles.ownerText}>{property.owner.name}</Text>}
            {property.owner?.phone && <Text style={styles.ownerText}>{property.owner.phone}</Text>}
            {property.owner?.email && <Text style={styles.ownerText}>{property.owner.email}</Text>}
          </View>

          {/* Reviews */}
          {ratings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Reviews</Text>
              {ratings.map((r, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </Text>
                  {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {/* Booking — users only */}
          {userId && userRole !== 'ADMIN' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Book Your Stay</Text>

              <View style={styles.rentTypeRow}>
                {[
                  { label: '📅 Daily', value: 'perDay' },
                  { label: '🗓️ Monthly', value: 'perMonth' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.typeBtn, rentType === opt.value && styles.typeBtnActive]}
                    onPress={() => setRentType(opt.value)}
                  >
                    <Text style={[styles.typeBtnText, rentType === opt.value && styles.typeBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Start Date Picker ───────────────────────────── */}
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => { setTempStartDateObj(startDateObj || new Date()); setShowStartPicker(true); }}
              >
                <Text style={startDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                  {startDate || 'Start Date'}
                </Text>
                <Text style={styles.datePickerIcon}>📅</Text>
              </TouchableOpacity>

              {/* iOS inline */}
              {Platform.OS === 'ios' && showStartPicker && (
                <>
                  <DateTimePicker
                    value={startDateObj || new Date()}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    themeVariant="light"
                    accentColor="#1e3a5f"
                    onChange={(event, date) => {
                      if (event.type === 'dismissed') { setShowStartPicker(false); return; }
                      if (date) {
                        setStartDateObj(new Date(date));
                        setStartDate(dateToStr(date));
                        if (rentType === 'perMonth') {
                          const autoEnd = new Date(date.getTime() + 29 * 24 * 60 * 60 * 1000);
                          setEndDateObj(autoEnd);
                          setEndDate(dateToStr(autoEnd));
                        }
                      }
                    }}
                  />
                  <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Android Modal */}
              {Platform.OS === 'android' && (
                <Modal visible={showStartPicker} transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
                  <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                      <Text style={styles.pickerCardTitle}>Select Start Date</Text>
                      <DateTimePicker
                        value={tempStartDateObj}
                        mode="date"
                        display="spinner"
                        minimumDate={new Date()}
                        themeVariant="light"
                        onChange={(_, date) => { if (date) setTempStartDateObj(new Date(date)); }}
                      />
                      <View style={styles.pickerCardBtns}>
                        <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.pickerCancelBtn}>
                          <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pickerConfirmBtn}
                          onPress={() => {
                            setStartDateObj(tempStartDateObj);
                            setStartDate(dateToStr(tempStartDateObj));
                            if (rentType === 'perMonth') {
                              const autoEnd = new Date(tempStartDateObj.getTime() + 29 * 24 * 60 * 60 * 1000);
                              setEndDateObj(autoEnd);
                              setEndDate(dateToStr(autoEnd));
                            }
                            setShowStartPicker(false);
                          }}
                        >
                          <Text style={styles.pickerConfirmText}>Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              )}

              {/* ── End Date Picker — daily only ─────────────────── */}
              {rentType === 'perDay' && (
                <>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => {
                      const def = startDateObj ? new Date(startDateObj.getTime() + 86400000) : new Date();
                      setTempEndDateObj(endDateObj || def);
                      setShowEndPicker(true);
                    }}
                  >
                    <Text style={endDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                      {endDate || 'End Date'}
                    </Text>
                    <Text style={styles.datePickerIcon}>📅</Text>
                  </TouchableOpacity>

                  {/* iOS inline */}
                  {Platform.OS === 'ios' && showEndPicker && (
                    <>
                      <DateTimePicker
                        value={endDateObj || (startDateObj ? new Date(startDateObj.getTime() + 86400000) : new Date())}
                        mode="date"
                        display="spinner"
                        minimumDate={startDateObj ? new Date(startDateObj.getTime() + 86400000) : new Date()}
                        themeVariant="light"
                        accentColor="#1e3a5f"
                        onChange={(event, date) => {
                          if (event.type === 'dismissed') { setShowEndPicker(false); return; }
                          if (date) { setEndDateObj(new Date(date)); setEndDate(dateToStr(date)); }
                        }}
                      />
                      <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowEndPicker(false)}>
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Android Modal */}
                  {Platform.OS === 'android' && (
                    <Modal visible={showEndPicker} transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
                      <View style={styles.pickerOverlay}>
                        <View style={styles.pickerCard}>
                          <Text style={styles.pickerCardTitle}>Select End Date</Text>
                          <DateTimePicker
                            value={tempEndDateObj}
                            mode="date"
                            display="spinner"
                            minimumDate={startDateObj ? new Date(startDateObj.getTime() + 86400000) : new Date()}
                            themeVariant="light"
                            onChange={(_, date) => { if (date) setTempEndDateObj(new Date(date)); }}
                          />
                          <View style={styles.pickerCardBtns}>
                            <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.pickerCancelBtn}>
                              <Text style={styles.pickerCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.pickerConfirmBtn}
                              onPress={() => {
                                setEndDateObj(tempEndDateObj);
                                setEndDate(dateToStr(tempEndDateObj));
                                setShowEndPicker(false);
                              }}
                            >
                              <Text style={styles.pickerConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  )}
                </>
              )}

              {((rentType === 'perDay' && startDate && endDate) || (rentType === 'perMonth' && startDate)) && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>
                    ${rentType === 'perMonth' ? property.pricePerMonth : calculateTotalRent()}
                  </Text>
                </View>
              )}

              <View style={styles.paymentRow}>
                {[
                  { label: '💵 Cash', value: 'cash' },
                  { label: '💳 Card', value: 'credit' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.payBtn, paymentMethod === opt.value && styles.payBtnActive]}
                    onPress={() => setPaymentMethod(opt.value)}
                  >
                    <Text style={[styles.payBtnText, paymentMethod === opt.value && styles.payBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod === 'credit' && (
                <View style={styles.stripePlaceholder}>
                  <Text style={styles.stripePlaceholderText}>
                    💳 Card payment coming soon. Please use cash payment for now.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  (isUnavailable ||
                    (rentType === 'perDay' && (!startDate || !endDate)) ||
                    (rentType === 'perMonth' && !startDate))
                    && styles.bookBtnDisabled,
                ]}
                onPress={handleRentHouse}
                disabled={
                  isUnavailable ||
                  (rentType === 'perDay' && (!startDate || !endDate)) ||
                  (rentType === 'perMonth' && !startDate)
                }
              >
                <Text style={styles.bookBtnText}>
                  {isUnavailable ? 'Unavailable' : 'Confirm Booking'}
                </Text>
              </TouchableOpacity>

              {rentSuccess && (
                <View style={styles.successMsg}>
                  <Text style={styles.successText}>✓ Booking confirmed!</Text>
                </View>
              )}
              {showFavoriteMessage && (
                <View style={styles.successMsg}>
                  <Text style={styles.successText}>♥ Added to favorites!</Text>
                </View>
              )}

              {rentSuccess && (
                <View style={styles.ratingForm}>
                  <Text style={styles.sectionHeading}>Rate this property</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setRating(s)}>
                        <Text style={[styles.star, rating >= s && styles.starActive]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Your thoughts..."
                    placeholderTextColor={text.hint}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity style={styles.submitRatingBtn} onPress={submitRating}>
                    <Text style={styles.submitRatingText}>Submit Review</Text>
                  </TouchableOpacity>
                  {showThankYou && (
                    <Text style={styles.thankYouText}>Thanks for your review!</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Schedule Visit */}
          <View style={styles.visitSection}>
            <TouchableOpacity style={styles.visitBtn} onPress={handleVisitRequest}>
              <Text style={styles.visitBtnText}>📅 Schedule Visit</Text>
            </TouchableOpacity>
          </View>

          {/* Admin: Edit */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditHouse', { id: property.id })}
            >
              <Text style={styles.editBtnText}>✏️ Edit Property</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Login Required Modal */}
      <Modal transparent visible={showLoginModal} animationType="fade" onRequestClose={() => setShowLoginModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLoginModal(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Login Required</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => { setShowLoginModal(false); navigation.navigate('Login'); }}
              >
                <Text style={styles.modalBtnPrimaryText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  scroll: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: text.muted, fontSize: 14 },

  imageWrapper: { position: 'relative' },
  propertyImage: { width: '100%', height: 260, resizeMode: 'cover' },
  favoriteBtn: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24, padding: 10,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  favIcon: { fontSize: 22 },

  content: { padding: 16 },

  header: { marginBottom: 16 },
  location: { fontSize: 22, fontWeight: '800', color: text.primary, marginBottom: 8 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  infoTag: { fontSize: 13, color: text.slate },
  available: { color: success.DEFAULT },
  rented: { color: errorColors.vivid },
  availabilityMsg: { fontSize: 13, color: warning.dark, marginBottom: 8 },
  pricingRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  priceDay: { fontSize: 18, fontWeight: '700', color: brand.navyDark },
  priceMonth: { fontSize: 16, fontWeight: '600', color: text.muted },

  section: {
    backgroundColor: background.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    shadowColor: shadow.card,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeading: { fontSize: 17, fontWeight: '700', color: brand.navyDark, marginBottom: 10 },
  bodyText: { fontSize: 14, color: text.slate, lineHeight: 20 },
  mapBtn: {
    marginTop: 12,
    backgroundColor: background.lightBlue,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.navyMid,
  },
  mapBtnText: { color: brand.navyDark, fontWeight: '600', fontSize: 14 },
  ownerText: { fontSize: 14, color: text.slate, marginBottom: 4 },

  reviewCard: { backgroundColor: background.userInfo, borderRadius: 10, padding: 12, marginBottom: 8 },
  reviewStars: { fontSize: 18, color: '#f59e0b', marginBottom: 4 },
  reviewComment: { fontSize: 13, color: text.slate },

  rentTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: border.DEFAULT,
    backgroundColor: background.userInfo,
  },
  typeBtnActive: { backgroundColor: brand.navyDark, borderColor: brand.navyDark },
  typeBtnText: { color: text.muted, fontWeight: '600' },
  typeBtnTextActive: { color: brand.white },

  datePickerBtn: {
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  datePickerText: { fontSize: 15, color: text.primary, fontWeight: '500' },
  datePickerPlaceholder: { fontSize: 15, color: text.hint },
  datePickerIcon: { fontSize: 16 },
  pickerDoneBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14, marginBottom: 4 },
  pickerDoneText: { color: brand.navyDark, fontWeight: '700', fontSize: 14 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: background.userInfo, borderRadius: 10,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  totalLabel: { fontSize: 15, color: text.muted, fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: brand.navyDark },

  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  payBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: border.DEFAULT,
    backgroundColor: background.userInfo,
  },
  payBtnActive: { backgroundColor: background.lightBlue, borderColor: brand.navyDark },
  payBtnText: { color: text.muted, fontWeight: '600' },
  payBtnTextActive: { color: brand.navyDark },

  stripePlaceholder: {
    backgroundColor: background.chip,
    borderRadius: 10, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: border.DEFAULT,
  },
  stripePlaceholderText: { color: text.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  bookBtn: {
    backgroundColor: brand.navyDark, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: brand.white, fontWeight: '700', fontSize: 16 },

  successMsg: {
    backgroundColor: success.bg, borderRadius: 8,
    padding: 12, marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: success.border,
  },
  successText: { color: success.muted, fontWeight: '600' },

  ratingForm: {
    borderTopWidth: 1, borderTopColor: border.DEFAULT,
    paddingTop: 16, marginTop: 8,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { fontSize: 30, color: text.light },
  starActive: { color: '#f59e0b' },
  commentInput: {
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: text.primary, marginBottom: 10,
    minHeight: 80, textAlignVertical: 'top',
  },
  submitRatingBtn: {
    backgroundColor: success.bg, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: success.DEFAULT,
  },
  submitRatingText: { color: success.dark, fontWeight: '700' },
  thankYouText: { color: success.DEFAULT, textAlign: 'center', marginTop: 8, fontWeight: '600' },

  visitSection: { marginBottom: 14 },
  visitBtn: {
    backgroundColor: brand.navyDark,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  visitBtnText: { color: brand.white, fontWeight: '700', fontSize: 16 },

  editBtn: {
    backgroundColor: '#fffbeb',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#f59e0b', marginBottom: 14,
  },
  editBtnText: { color: '#b45309', fontWeight: '700', fontSize: 16 },

  modalOverlay: {
    flex: 1, backgroundColor: overlay.modalBg,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: background.card, borderRadius: 16,
    padding: 28, width: '80%', alignItems: 'center',
    borderWidth: 1, borderColor: border.DEFAULT,
    shadowColor: shadow.cardMd,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: text.primary, marginBottom: 10 },
  modalMessage: { fontSize: 14, color: text.muted, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: brand.navyDark },
  modalBtnPrimaryText: { color: brand.white, fontWeight: '700' },
  modalBtnSecondary: { backgroundColor: background.userInfo, borderWidth: 1, borderColor: border.DEFAULT },
  modalBtnSecondaryText: { color: text.slate, fontWeight: '600' },

  // ── Android date-picker Modal ───────────────────────────────────
  pickerOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12,
    width: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  pickerCardTitle: {
    fontSize: 16, fontWeight: '700', color: text.primary,
    textAlign: 'center', marginBottom: 8,
  },
  pickerCardBtns: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: border.DEFAULT,
  },
  pickerCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  pickerCancelText: { fontSize: 15, color: text.muted, fontWeight: '600' },
  pickerConfirmBtn: {
    backgroundColor: brand.navyDark, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  pickerConfirmText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
});
