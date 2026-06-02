import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { houseService } from '../../../services/house.service';
import { BASE_URL } from '../../../services/api';
import { FONTS } from '../../../constants/fonts';

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Studio', 'Condo'];

export default function EditHouseScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [nbOfBedrooms, setNbOfBedrooms] = useState('');
  const [location, setLocation] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [pricePerMonth, setPricePerMonth] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [existingImageUri, setExistingImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'HOUSE_OWNER') return;
    houseService.getById(Number(id)).then((res) => {
      const h = res.data;
      setTitle(h.title || '');
      setPropertyType(h.propertyType || 'Apartment');
      setNbOfBedrooms(String(h.nbOfBedrooms || h.bedrooms || ''));
      setLocation(h.location || '');
      setPricePerDay(h.pricePerDay ? String(h.pricePerDay) : '');
      setPricePerMonth(h.pricePerMonth ? String(h.pricePerMonth) : '');
      setDescription(h.description || '');
      setOwnerName(h.owner?.name || h.ownerName || '');
      setOwnerEmail(h.owner?.email || h.ownerEmail || '');
      setOwnerPhone(h.owner?.phone || h.ownerPhone || '');
      if (h.latitude) setLatitude(String(h.latitude));
      if (h.longitude) setLongitude(String(h.longitude));
      if (h.virtualTourUrl) setVirtualTourUrl(h.virtualTourUrl);
      if (h.image) setExistingImageUri(`${BASE_URL}${h.image}`);
    }).catch(() => {
      Alert.alert('Error', 'Failed to load property');
    }).finally(() => setLoading(false));
  }, [id, user?.role]);

  const geocodeLocation = async (locationText: string) => {
    if (!locationText || locationText.trim().length < 5) {
      setGeocodeStatus('idle'); setLatitude(''); setLongitude(''); return;
    }
    setGeocodeStatus('loading');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText.trim())}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setLatitude(parseFloat(data[0].lat).toFixed(6));
        setLongitude(parseFloat(data[0].lon).toFixed(6));
        setGeocodeStatus('found');
      } else {
        setGeocodeStatus('not_found'); setLatitude(''); setLongitude('');
      }
    } catch {
      setGeocodeStatus('not_found');
    }
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeLocation(value), 800);
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'HOUSE_OWNER') {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="lock-closed" size={48} color="#bdc3c7" />
        <Text style={styles.unauthorizedText}>Access restricted</Text>
      </View>
    );
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    setImageLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !location || !pricePerMonth || !nbOfBedrooms) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await houseService.update(Number(id), {
        title,
        propertyType,
        nbOfBedrooms: parseInt(nbOfBedrooms),
        location,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        pricePerMonth: parseFloat(pricePerMonth),
        description,
        ownerName,
        ownerEmail,
        ownerPhone,
        ...(latitude ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude ? { longitude: parseFloat(longitude) } : {}),
        ...(virtualTourUrl.trim() ? { virtualTourUrl: virtualTourUrl.trim() } : {}),
        ...(imageBase64 ? { imageData: imageBase64, imageFilename: 'house_photo.jpg' } : {}),
      });
      Alert.alert('Success', 'Property updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.log('[EditHouse] error status:', err.response?.status);
      console.log('[EditHouse] error data:', JSON.stringify(err.response?.data));
      Alert.alert('Error', err.response?.data?.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2C3E50" style={{ flex: 1, marginTop: 60 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Image Picker */}
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={imageLoading}>
        {imageLoading ? (
          <ActivityIndicator size="large" color="#2C3E50" />
        ) : imageBase64 ? (
          <Image source={{ uri: imageBase64 }} style={styles.imagePreview} resizeMode="cover" />
        ) : existingImageUri ? (
          <Image source={{ uri: existingImageUri }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera" size={36} color="#bdc3c7" />
            <Text style={styles.imagePlaceholderText}>Tap to change photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Cozy 2BR Apartment" placeholderTextColor="#999999" />

        <Text style={styles.label}>Property Type *</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, propertyType === type && styles.chipActive]}
              onPress={() => setPropertyType(type)}
            >
              <Text style={[styles.chipText, propertyType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Number of Bedrooms *</Text>
        <TextInput
          style={styles.input}
          value={nbOfBedrooms}
          onChangeText={setNbOfBedrooms}
          placeholder="e.g. 2"
          placeholderTextColor="#999999"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={handleLocationChange}
          placeholder="City, neighborhood..."
          placeholderTextColor="#999999"
        />
        {geocodeStatus === 'loading' && (
          <Text style={styles.geocodeHint}>📍 Finding coordinates...</Text>
        )}
        {geocodeStatus === 'found' && latitude ? (
          <Text style={styles.geocodeSuccess}>📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</Text>
        ) : null}
        {geocodeStatus === 'not_found' && (
          <Text style={styles.geocodeError}>Location not found — coordinates will not be saved</Text>
        )}

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price/Month ($) *</Text>
            <TextInput
              style={styles.input}
              value={pricePerMonth}
              onChangeText={setPricePerMonth}
              placeholder="e.g. 1200"
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price/Day ($)</Text>
            <TextInput
              style={styles.input}
              value={pricePerDay}
              onChangeText={setPricePerDay}
              placeholder="e.g. 60"
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the property..."
          placeholderTextColor="#999999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.sectionLabel}>Owner Information</Text>

        <Text style={styles.label}>Owner Name</Text>
        <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Full name" placeholderTextColor="#999999" />

        <Text style={styles.label}>Owner Email</Text>
        <TextInput
          style={styles.input}
          value={ownerEmail}
          onChangeText={setOwnerEmail}
          placeholder="email@example.com"
          placeholderTextColor="#999999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Owner Phone</Text>
        <TextInput
          style={styles.input}
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          placeholder="+961..."
          placeholderTextColor="#999999"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionLabel}>Virtual Tour</Text>

        <Text style={styles.label}>360° Tour URL (optional)</Text>
        <TextInput
          style={styles.input}
          value={virtualTourUrl}
          onChangeText={setVirtualTourUrl}
          placeholder="https://..."
          placeholderTextColor="#999999"
          autoCapitalize="none"
          keyboardType="url"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  unauthorized: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  unauthorizedText: { fontSize: 16, color: '#7f8c8d' },

  imagePicker: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePreview: { width: '100%', height: 200 },
  imagePlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: { fontSize: 14, color: '#bdc3c7' },

  form: { paddingHorizontal: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 6 },
  sectionLabel: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    marginBottom: 14,
    color: '#2C3E50',
  },
  textarea: { height: 100 },
  priceRow: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#f8f9fa',
  },
  chipActive: { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  chipText: { fontSize: 13, color: '#2C3E50' },
  chipTextActive: { color: '#fff' },

  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 16 },
  geocodeHint: { fontSize: 12, color: '#7f8c8d', marginTop: -10, marginBottom: 10, fontFamily: FONTS.body },
  geocodeSuccess: { fontSize: 12, color: '#27ae60', marginTop: -10, marginBottom: 10, fontFamily: FONTS.body },
  geocodeError: { fontSize: 12, color: '#e67e22', marginTop: -10, marginBottom: 10, fontFamily: FONTS.body },
});
