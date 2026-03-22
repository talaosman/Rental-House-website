/**
 * EditHouseScreen.jsx
 * Source: RentHouse-FrontEnd/src/EditHouseForm.js
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import API from '../api/baseAPI';
import { brand, background, text, border, success } from '../theme/colors';

export default function EditHouseScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const id         = route.params?.id;

  const geocodeTimer = useRef(null);

  const [formData, setFormData] = useState({
    title:        '',
    location:     '',
    pricePerDay:  '',
    pricePerMonth:'',
    propertyType: '',
    nbOfBedrooms: '',
    status:       '',
    description:  '',
    ownerName:    '',
    ownerEmail:   '',
    ownerPhone:   '',
    latitude:     '',
    longitude:    '',
  });

  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);

  useEffect(() => {
    if (!id) return;
    API.get(`/api/houses/${id}`)
      .then(res => {
        const data = res.data;
        setFormData({
          title:         data.title         || '',
          location:      data.location      || '',
          pricePerDay:   String(data.pricePerDay   ?? ''),
          pricePerMonth: String(data.pricePerMonth ?? ''),
          propertyType:  data.propertyType  || '',
          nbOfBedrooms:  String(data.nbOfBedrooms  ?? ''),
          status:        data.status        || '',
          description:   data.description   || '',
          ownerName:     data.owner?.name   || '',
          ownerEmail:    data.owner?.email  || '',
          ownerPhone:    data.owner?.phone  || '',
          latitude:      String(data.latitude  ?? ''),
          longitude:     String(data.longitude ?? ''),
        });
        if (data.latitude && data.longitude) setGeocodeStatus('found');
        if (data.image) {
          setSelectedImage(
            data.image.startsWith('http')
              ? data.image
              : `http://10.0.2.2:5000/uploads/${data.image}`,
          );
        }
      })
      .catch(() => Alert.alert('Error', 'Failed to load property data.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  const setField = (name, value) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const geocodeLocation = async (locationText) => {
    if (!locationText || locationText.trim().length < 5) {
      setGeocodeStatus('');
      setField('latitude', '');
      setField('longitude', '');
      return;
    }
    setGeocodeStatus('loading');
    try {
      const encoded = encodeURIComponent(locationText.trim());
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude:  parseFloat(data[0].lat).toFixed(6),
          longitude: parseFloat(data[0].lon).toFixed(6),
        }));
        setGeocodeStatus('found');
      } else {
        setGeocodeStatus('not_found');
        setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
      }
    } catch {
      setGeocodeStatus('not_found');
    }
  };

  const handleLocationChange = (value) => {
    setField('location', value);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeLocation(value), 800);
  };

  const handlePickImage = () => {
    Alert.alert('Image picker', 'expo-image-picker integration needed.');
  };

  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      Alert.alert(
        'No GPS coordinates',
        'No GPS coordinates found for this location.\n\nContinue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: submitUpdate },
        ],
      );
      return;
    }
    await submitUpdate();
  };

  const submitUpdate = async () => {
    setIsSaving(true);
    try {
      await API.put(`/api/houses/update/${id}`, {
        ...formData,
        latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      });
      Alert.alert('Success', 'House updated successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('PropertyDetails', { id }) },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update house. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const geocodeLabel = {
    loading:   '🔍 Looking up coordinates…',
    found:     '✅ GPS coordinates found',
    not_found: '⚠️ No coordinates found — will use address text',
  }[geocodeStatus] ?? '';

  const Field = ({ label, field, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={s.fieldBlock}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMulti]}
        value={formData[field]}
        onChangeText={v => setField(field, v)}
        placeholder={placeholder}
        placeholderTextColor={text.hint}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        editable={!isSaving}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={brand.navyDark} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.pageTitle}>Edit Property</Text>

          <Field label="Title"        field="title"        placeholder="Title" />

          {/* Location with geocode feedback */}
          <View style={s.fieldBlock}>
            <Text style={s.label}>Location / Address</Text>
            <TextInput
              style={s.input}
              value={formData.location}
              onChangeText={handleLocationChange}
              placeholder="e.g. 450 Pine St, Seattle, WA 98101"
              placeholderTextColor={text.hint}
              editable={!isSaving}
            />
            {!!geocodeLabel && (
              <Text style={[
                s.geocodeHint,
                geocodeStatus === 'found' && s.geocodeHintFound,
                geocodeStatus === 'not_found' && s.geocodeHintWarn,
              ]}>{geocodeLabel}</Text>
            )}
          </View>

          {/* Coordinates row */}
          <View style={s.coordsRow}>
            <View style={[s.fieldBlock, s.coordField]}>
              <Text style={s.label}>Latitude</Text>
              <TextInput
                style={s.input}
                value={formData.latitude}
                onChangeText={v => setField('latitude', v)}
                placeholder="e.g. 47.608013"
                placeholderTextColor={text.hint}
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>
            <View style={[s.fieldBlock, s.coordField]}>
              <Text style={s.label}>Longitude</Text>
              <TextInput
                style={s.input}
                value={formData.longitude}
                onChangeText={v => setField('longitude', v)}
                placeholder="e.g. -122.335167"
                placeholderTextColor={text.hint}
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>
          </View>

          <Field label="Price Per Day"   field="pricePerDay"   placeholder="Price per day"   keyboardType="numeric" />
          <Field label="Price Per Month" field="pricePerMonth" placeholder="Price per month" keyboardType="numeric" />
          <Field label="Property Type"   field="propertyType"  placeholder="e.g. Apartment, Villa" />
          <Field label="Bedrooms"        field="nbOfBedrooms"  placeholder="Number of bedrooms" keyboardType="numeric" />
          <Field label="Status"          field="status"        placeholder="e.g. Available, Rented" />

          {/* Image picker */}
          <View style={s.fieldBlock}>
            <Text style={s.label}>Property Image</Text>
            <TouchableOpacity style={s.imagePicker} onPress={handlePickImage}>
              <Text style={s.imagePickerLabel}>
                {selectedImage ? '📷 Change Image' : '📷 Choose Image'}
              </Text>
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={s.imagePreview} />
            )}
          </View>

          <Field label="Description" field="description" placeholder="Describe the property…" multiline />

          <View style={s.sectionDivider} />
          <Text style={s.sectionTitle}>Owner Information</Text>

          <Field label="Owner Name"  field="ownerName"  placeholder="Owner name" />
          <Field label="Owner Email" field="ownerEmail" placeholder="owner@email.com" keyboardType="email-address" />
          <Field label="Owner Phone" field="ownerPhone" placeholder="Phone number" keyboardType="phone-pad" />

          <TouchableOpacity
            style={[s.submitBtn, isSaving && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving
              ? <ActivityIndicator color={brand.white} size="small" />
              : <Text style={s.submitBtnLabel}>Update Property</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: background.page },
  flex:  { flex: 1 },
  center:{ justifyContent: 'center', alignItems: 'center' },
  scroll:{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 },

  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: text.primary,
    marginBottom: 20,
  },

  fieldBlock:  { marginBottom: 16 },
  label:       { fontSize: 13, color: text.medium, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: background.card,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: text.primary,
    fontSize: 14,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },

  geocodeHint:     { fontSize: 12, color: text.muted, marginTop: 5 },
  geocodeHintFound:{ color: success.dark },
  geocodeHintWarn: { color: '#b45309' },

  coordsRow:  { flexDirection: 'row', gap: 12 },
  coordField: { flex: 1 },

  imagePicker: {
    backgroundColor: background.userInfo,
    borderWidth: 1,
    borderColor: border.medium,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  imagePickerLabel: { color: brand.navyDark, fontSize: 14, fontWeight: '600' },
  imagePreview:     { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },

  sectionDivider: { height: 1, backgroundColor: border.DEFAULT, marginVertical: 20 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: text.primary, marginBottom: 14 },

  submitBtn: {
    backgroundColor: brand.navyDark,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnLabel:    { fontSize: 16, fontWeight: '700', color: brand.white },
});
