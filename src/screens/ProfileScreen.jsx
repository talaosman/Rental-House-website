/**
 * ProfileScreen.jsx
 * Source reference: RentHouse-FrontEnd/src/UserProfile.js + UserProfile.css
 *
 * Full profile management:
 *  - Avatar display with tap-to-change (camera or gallery)
 *  - Editable fields: username, email, phone number
 *  - Password toggle visibility
 *  - Upload profile image via PUT /api/users/update
 *  - Logout
 */

import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border, error as errorColors, success } from '../theme/colors';

// ─── helpers ──────────────────────────────────────────────────────────────────
function defaultAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1e3a5f&color=fff&size=200`;
}

function getAvatarUri(profileImage, username) {
  if (!profileImage || profileImage === 'null' || profileImage === '') {
    return defaultAvatar(username);
  }
  if (
    profileImage.startsWith('data:') ||
    profileImage.startsWith('http') ||
    profileImage.startsWith('file')
  ) {
    return profileImage;
  }
  return `data:image/jpeg;base64,${profileImage}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation();
  const {
    userId, username, email, phoneNumber, password,
    profileImage, authHeader, updateProfile, logout,
  } = useAuth();

  const [form, setForm] = useState({
    username:    username    || '',
    email:       email       || '',
    phoneNumber: phoneNumber || '',
    password:    password    || '',
  });

  const [editing,      setEditing]      = useState({ username: false, email: false, phoneNumber: false });
  const [localImage,   setLocalImage]   = useState(null);
  const [localBase64,  setLocalBase64]  = useState(null);
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [fieldError,   setFieldError]   = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});

  const avatarUri = localImage || getAvatarUri(profileImage, username);

  const buildBody = (extra = {}) => ({
    userId,
    username:     form.username,
    email:        form.email,
    password:     form.password,
    phoneNumber:  form.phoneNumber,
    profileImage: profileImage || '',
    ...extra,
  });

  // ── Image picker ─────────────────────────────────────────────────────────
  const requestPerm = async (type) => {
    const fn = type === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await fn();
    return status === 'granted';
  };

  const launchCamera = async () => {
    if (!(await requestPerm('camera'))) {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLocalImage(result.assets[0].uri);
      setLocalBase64(result.assets[0].base64);
      setPreviewOpen(true);
    }
  };

  const launchGallery = async () => {
    if (!(await requestPerm('library'))) {
      Alert.alert('Permission required', 'Photo library access is needed to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLocalImage(result.assets[0].uri);
      setLocalBase64(result.assets[0].base64);
      setPreviewOpen(true);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) launchCamera(); if (i === 2) launchGallery(); },
      );
    } else {
      Alert.alert('Change Profile Photo', '', [
        { text: 'Cancel',               style: 'cancel' },
        { text: 'Take Photo',           onPress: launchCamera },
        { text: 'Choose from Gallery',  onPress: launchGallery },
      ]);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadImage = async () => {
    if (!localImage || !localBase64) return;
    setUploading(true);
    try {
      const dataUri = `data:image/jpeg;base64,${localBase64}`;

      await API.put('/api/users/update', buildBody({ profileImage: dataUri }), {
        headers: { Authorization: authHeader },
      });
      // Store the local file:// URI in AsyncStorage (not the huge base64 string —
      // AsyncStorage has a ~2 MB per-item limit which base64 images often exceed).
      await updateProfile({ profileImage: localImage });
      setPreviewOpen(false);
      setLocalImage(null);
      setLocalBase64(null);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (err) {
      const msg = err?.response?.data ?? err?.message ?? 'Unknown error';
      Alert.alert('Upload failed', `Could not update profile photo.\n\n${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // ── Save field ────────────────────────────────────────────────────────────
  const toggleEdit = async (field) => {
    if (!editing[field]) {
      setEditing(p => ({ ...p, [field]: true }));
      setFieldError(p => ({ ...p, [field]: '' }));
      return;
    }
    if (!form[field].trim()) {
      setFieldError(p => ({ ...p, [field]: 'This field cannot be empty.' }));
      return;
    }
    setSaving(true);
    try {
      await API.put('/api/users/update', buildBody(), { headers: { Authorization: authHeader } });
      await updateProfile({ [field]: form[field] });
      setEditing(p => ({ ...p, [field]: false }));
      setFieldSuccess(p => ({ ...p, [field]: 'Saved!' }));
      setTimeout(() => setFieldSuccess(p => ({ ...p, [field]: '' })), 2000);
    } catch {
      setFieldError(p => ({ ...p, [field]: 'Save failed. Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Field row ─────────────────────────────────────────────────────────────
  const renderField = (label, field, keyboardType = 'default') => (
    <View style={s.fieldRow} key={field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldValueRow}>
        {editing[field] ? (
          <TextInput
            style={s.fieldInput}
            value={form[field]}
            onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
            keyboardType={keyboardType}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => toggleEdit(field)}
          />
        ) : (
          <Text style={s.fieldValue}>{form[field] || '—'}</Text>
        )}
        <TouchableOpacity style={s.editBtn} onPress={() => toggleEdit(field)} disabled={saving}>
          <Ionicons
            name={editing[field] ? 'checkmark' : 'pencil-outline'}
            size={16}
            color={brand.navyDark}
          />
        </TouchableOpacity>
      </View>
      {fieldError[field]   ? <Text style={s.fieldErrorText}>{fieldError[field]}</Text>   : null}
      {fieldSuccess[field] ? <Text style={s.fieldSuccessText}>{fieldSuccess[field]}</Text> : null}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Header / Avatar */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleAvatarPress} style={s.avatarWrap} activeOpacity={0.85}>
              <Image source={{ uri: avatarUri }} style={s.avatar} />
              <View style={s.avatarBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={s.headerName}>{form.username || 'Your Name'}</Text>
            <Text style={s.headerHandle}>
              @{(form.username || 'user').toLowerCase().replace(/\s+/g, '')}
            </Text>
            {form.email ? <Text style={s.headerEmail}>{form.email}</Text> : null}
          </View>

          {/* Image preview */}
          {previewOpen && localImage && (
            <View style={s.previewCard}>
              <Text style={s.previewTitle}>New Profile Photo</Text>
              <Image source={{ uri: localImage }} style={s.previewImage} />
              <View style={s.previewActions}>
                <TouchableOpacity
                  style={[s.previewBtn, s.previewBtnSave]}
                  onPress={uploadImage}
                  disabled={uploading}
                >
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.previewBtnSaveText}>Save Photo</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.previewBtn, s.previewBtnCancel]}
                  onPress={() => { setLocalImage(null); setPreviewOpen(false); }}
                  disabled={uploading}
                >
                  <Text style={s.previewBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Account details card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Account Details</Text>

            {renderField('Username',     'username',    'default')}
            {renderField('Email',        'email',       'email-address')}
            {renderField('Phone Number', 'phoneNumber', 'phone-pad')}

            {/* Password — read-only + show/hide */}
            <View style={[s.fieldRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.fieldValueRow}>
                <TextInput
                  style={[s.fieldInput, { borderColor: border.DEFAULT, color: text.muted, flex: 1 }]}
                  value={form.password}
                  secureTextEntry={!showPassword}
                  editable={false}
                />
                <TouchableOpacity style={s.editBtn} onPress={() => setShowPassword(v => !v)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={brand.navyDark}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* App links */}
          <View style={s.card}>
            <Text style={s.cardTitle}>More</Text>
            <TouchableOpacity style={s.menuRow} onPress={() => navigation.navigate('About')} activeOpacity={0.7}>
              <View style={s.menuIcon}>
                <Ionicons name="information-circle-outline" size={18} color={brand.navyDark} />
              </View>
              <Text style={s.menuLabel}>About Us</Text>
              <Ionicons name="chevron-forward" size={16} color={text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.menuRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]} onPress={() => navigation.navigate('Feedback')} activeOpacity={0.7}>
              <View style={s.menuIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={brand.navyDark} />
              </View>
              <Text style={s.menuLabel}>Send Feedback</Text>
              <Ionicons name="chevron-forward" size={16} color={text.muted} />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Upload overlay */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={s.uploadOverlay}>
          <View style={s.uploadBox}>
            <ActivityIndicator size="large" color={brand.navyDark} />
            <Text style={s.uploadText}>Uploading photo…</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: background.pageFade2 },
  flex:   { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    backgroundColor: background.card,
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
    marginBottom: 28,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: background.chip,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: brand.navyDark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  headerName:   { fontSize: 22, fontWeight: '700', color: text.primary, marginBottom: 4 },
  headerHandle: { fontSize: 14, color: text.gray, marginBottom: 4 },
  headerEmail:  { fontSize: 13, color: text.muted, marginTop: 2 },

  // Preview
  previewCard: {
    backgroundColor: background.card,
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  previewTitle: { fontSize: 16, fontWeight: '600', color: text.primary, marginBottom: 14 },
  previewImage: {
    width: 160, height: 160, borderRadius: 80,
    marginBottom: 20, borderWidth: 3, borderColor: border.DEFAULT,
  },
  previewActions: { flexDirection: 'row', gap: 12 },
  previewBtn: {
    paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: 10, minWidth: 110, alignItems: 'center',
  },
  previewBtnSave:       { backgroundColor: brand.navyDark },
  previewBtnSaveText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  previewBtnCancel:     { backgroundColor: background.chip, borderWidth: 1, borderColor: border.DEFAULT },
  previewBtnCancelText: { color: text.medium, fontWeight: '600', fontSize: 14 },

  // Card
  card: {
    backgroundColor: background.card,
    marginHorizontal: 16, borderRadius: 16,
    padding: 20, marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  cardTitle: {
    fontSize: 17, fontWeight: '700', color: text.primary,
    marginBottom: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: border.DEFAULT,
  },

  // Field row
  fieldRow: {
    paddingBottom: 16, marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: border.DEFAULT,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: text.medium,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  fieldValueRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  fieldValue: { flex: 1, fontSize: 15, color: text.dark, fontWeight: '500' },
  fieldInput: {
    flex: 1, fontSize: 15, color: text.primary,
    borderWidth: 1, borderColor: border.focus,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff',
  },
  editBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: background.chip,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  fieldErrorText:   { fontSize: 12, color: errorColors.DEFAULT, marginTop: 6 },
  fieldSuccessText: { fontSize: 12, color: success.dark, fontWeight: '600', marginTop: 6 },

  // Menu rows (About, Feedback)
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border.DEFAULT,
    marginBottom: 4,
  },
  menuIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: background.chip,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: border.DEFAULT,
  },
  menuLabel: { flex: 1, fontSize: 15, color: text.dark, fontWeight: '500' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: brand.navyDark,
    marginHorizontal: 16, borderRadius: 14, paddingVertical: 15,
    shadowColor: 'rgba(30,58,95,0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 5,
  },
  logoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Upload modal
  uploadOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 14, minWidth: 180,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  uploadText: { fontSize: 15, color: text.muted, fontWeight: '500' },
});
