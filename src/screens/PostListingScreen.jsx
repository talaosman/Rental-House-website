/**
 * PostListingScreen.jsx
 * Converted from PostListingPage.js
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/baseAPI';
import { brand, background, text, border, success, warning } from '../theme/colors';

export default function PostListingScreen() {
  const geocodeTimer = useRef(null);
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    title: '',
    pricePerDay: '',
    pricePerMonth: '',
    location: '',
    nbOfBedrooms: '',
    propertyType: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    description: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const geocodeLocation = async (locationText) => {
    if (!locationText || locationText.trim().length < 5) {
      setGeocodeStatus('');
      setForm((prev) => ({ ...prev, latitude: '', longitude: '' }));
      return;
    }
    setGeocodeStatus('loading');
    try {
      const encoded = encodeURIComponent(locationText.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm((prev) => ({
          ...prev,
          latitude: parseFloat(lat).toFixed(6),
          longitude: parseFloat(lon).toFixed(6),
        }));
        setGeocodeStatus('found');
      } else {
        setGeocodeStatus('not_found');
        setForm((prev) => ({ ...prev, latitude: '', longitude: '' }));
      }
    } catch {
      setGeocodeStatus('not_found');
    }
  };

  const handleLocationChange = (value) => {
    handleChange('location', value);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeLocation(value), 800);
  };

  const handleSubmit = async () => {
    if (
      !form.title || !form.nbOfBedrooms || !form.location ||
      !form.pricePerDay || !form.pricePerMonth || !form.description
    ) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }

    if (!form.latitude || !form.longitude) {
      Alert.alert(
        'Location Required',
        'Could not find GPS coordinates for this location.\n\nPlease enter a more specific address or manually enter latitude and longitude.'
      );
      return;
    }

    if (!imageFile) {
      Alert.alert('Image Required', 'Please select a property image.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        pricePerDay: form.pricePerDay,
        pricePerMonth: form.pricePerMonth,
        location: form.location,
        description: form.description,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone,
        nbOfBedrooms: form.nbOfBedrooms,
        propertyType: form.propertyType,
        imageFilename: imageFile.fileName || 'upload.jpg',
        imageData: imageFile.base64 ? `data:image/jpeg;base64,${imageFile.base64}` : '',
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      };

      await API.post('/api/houses/uploadBase64', payload);

      Alert.alert('Success', 'Listing added successfully!');

      setForm({
        title: '', pricePerDay: '', pricePerMonth: '', location: '',
        nbOfBedrooms: '', propertyType: '', ownerName: '', ownerEmail: '',
        ownerPhone: '', description: '', latitude: '', longitude: '',
      });
      setImageFile(null);
      setGeocodeStatus('');
    } catch (err) {
      Alert.alert('Error', err.response?.data || err.message || 'Failed to upload listing');
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ label, field, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={styles.formGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor={text.hint}
        value={form[field]}
        onChangeText={(v) => handleChange(field, v)}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Text style={styles.pageTitle}>Post a Property Listing</Text>

            <InputField label="Property Title *" field="title" placeholder="Enter property title" />
            <InputField label="Property Type *" field="propertyType" placeholder="e.g. Apartment, House, Villa" />
            <InputField label="Number of Bedrooms *" field="nbOfBedrooms" placeholder="e.g. 3" keyboardType="numeric" />

            {/* Location with auto-geocode */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Address / Location *
                <Text style={styles.labelHint}> — enter a full address for best accuracy</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 450 Pine St, Seattle, WA 98101"
                placeholderTextColor={text.hint}
                value={form.location}
                onChangeText={handleLocationChange}
              />
              {geocodeStatus === 'loading' && (
                <View style={styles.geocodeStatus}>
                  <ActivityIndicator size="small" color={brand.navyDark} />
                  <Text style={styles.geocodeText}>Looking up coordinates...</Text>
                </View>
              )}
              {geocodeStatus === 'found' && form.latitude && (
                <View style={[styles.geocodeStatus, styles.geocodeFound]}>
                  <Text style={styles.geocodeFoundText}>
                    ✅ Location found — {form.latitude}, {form.longitude}
                  </Text>
                </View>
              )}
              {geocodeStatus === 'not_found' && (
                <View style={[styles.geocodeStatus, styles.geocodeNotFound]}>
                  <Text style={styles.geocodeNotFoundText}>
                    ⚠️ Address not recognized. Enter coordinates manually below.
                  </Text>
                </View>
              )}
            </View>

            {/* Manual lat/lng */}
            <View style={styles.coordsRow}>
              <View style={styles.coordField}>
                <Text style={styles.fieldLabel}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 47.608013"
                  placeholderTextColor={text.hint}
                  value={form.latitude}
                  onChangeText={(v) => handleChange('latitude', v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordField}>
                <Text style={styles.fieldLabel}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. -122.335167"
                  placeholderTextColor={text.hint}
                  value={form.longitude}
                  onChangeText={(v) => handleChange('longitude', v)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <InputField label="Price per Day ($) *" field="pricePerDay" placeholder="Enter daily price" keyboardType="numeric" />
            <InputField label="Price per Month ($) *" field="pricePerMonth" placeholder="Enter monthly price" keyboardType="numeric" />
            <InputField label="Description *" field="description" placeholder="Enter a detailed description..." multiline />

            {/* Image Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Property Image *</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={() => Alert.alert('Coming Soon', 'Image picker will use expo-image-picker.')}
              >
                {imageFile ? (
                  <Text style={styles.imagePickerSelected}>
                    ✅ Image selected: {imageFile.fileName || 'image.jpg'}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.imagePickerIcon}>📷</Text>
                    <Text style={styles.imagePickerText}>Tap to select an image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <InputField label="Owner Name *" field="ownerName" placeholder="Enter owner's name" />
            <InputField label="Owner Email *" field="ownerEmail" placeholder="Enter owner's email" keyboardType="email-address" />
            <InputField label="Owner Phone *" field="ownerPhone" placeholder="Enter owner's phone number" keyboardType="phone-pad" />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={brand.white} />
                : <Text style={styles.submitBtnText}>Post Listing</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  container: { padding: 16 },
  pageTitle: {
    fontSize: 24, fontWeight: '800', color: text.primary,
    marginBottom: 24, textAlign: 'center',
  },
  formGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: text.medium, marginBottom: 6, fontWeight: '600' },
  labelHint: { fontSize: 12, color: text.gray, fontWeight: '400' },
  input: {
    backgroundColor: background.card,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: text.primary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  geocodeStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 6, padding: 10, borderRadius: 8,
    backgroundColor: background.userInfo,
  },
  geocodeText: { color: text.muted, fontSize: 13 },
  geocodeFound: { backgroundColor: success.bg, borderWidth: 1, borderColor: success.border },
  geocodeFoundText: { color: success.dark, fontSize: 13 },
  geocodeNotFound: { backgroundColor: warning.bg, borderWidth: 1, borderColor: warning.border },
  geocodeNotFoundText: { color: warning.dark, fontSize: 13 },

  coordsRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  coordField: { flex: 1 },

  imagePicker: {
    backgroundColor: background.userInfo,
    borderWidth: 2, borderColor: border.medium, borderStyle: 'dashed',
    borderRadius: 12, padding: 28,
    alignItems: 'center', gap: 8,
  },
  imagePickerIcon: { fontSize: 40 },
  imagePickerText: { color: text.slate, fontSize: 15, fontWeight: '600' },
  imagePickerSelected: { color: success.dark, fontSize: 14, fontWeight: '600' },

  submitBtn: {
    backgroundColor: brand.navyDark, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: brand.white, fontWeight: '800', fontSize: 17 },
});
