import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import api, { BASE_URL } from '../../services/api';
import { FONTS } from '../../constants/fonts';

interface Offer {
  discountPercentage: number;
  active: boolean;
  used: boolean;
  expiryDate?: string;
  house?: { title: string };
  houseTitle?: string;
}

interface RentSummary {
  houseTitle: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.role === 'HOUSE_OWNER';
  const isUser  = !isAdmin && !isOwner;

  // ── Profile fields ─────────────────────────────────────────────
  const [username,    setUsername]    = useState(user?.username    || '');
  const [email,       setEmail]       = useState(user?.email       || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [editing,     setEditing]     = useState(false);
  const [loading,     setLoading]     = useState(false);

  // ── Avatar ────────────────────────────────────────────────────
  const getInitialProfileImage = (): string | null => {
    if (!user?.profileImage) return null;
    if (user.profileImage.startsWith('data:') || user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    return `${BASE_URL}${user.profileImage}`;
  };
  const [profileImage, setProfileImage] = useState<string | null>(getInitialProfileImage());
  const [imageLoading, setImageLoading] = useState(false);

  // ── Change password ───────────────────────────────────────────
  const [showChangePwd,   setShowChangePwd]   = useState(false);
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd,      setShowNewPwd]      = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── USER: loyalty rewards ─────────────────────────────────────
  const [points,         setPoints]         = useState(0);
  const [userOffers,     setUserOffers]     = useState<Offer[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  // ── OWNER: property overview ──────────────────────────────────
  const [recentRents,        setRecentRents]        = useState<RentSummary[]>([]);
  const [ownerOffers,        setOwnerOffers]        = useState<Offer[]>([]);
  const [expandedOwnerOffer, setExpandedOwnerOffer] = useState<number | null>(null);
  const [loadingOwner,       setLoadingOwner]       = useState(false);

  // ── ADMIN: platform stats ─────────────────────────────────────
  const [adminStats, setAdminStats] = useState({
    totalUsers:  '—' as string | number,
    totalHouses: '—' as string | number,
    activeRents: '—' as string | number,
    totalRents:  '—' as string | number,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // ── Avatar URI ────────────────────────────────────────────────
  const avatarUri = (profileImage && profileImage.length > 0)
    ? profileImage
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=0d2d52&color=fff`;

  // ── Fetch role-specific data ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    if (isUser) {
      setLoadingRewards(true);
      const now = new Date();
      Promise.allSettled([
        api.get(`/api/users/${user.id}`),
        api.get(`/api/offers/user/${user.id}`),
      ]).then(([uRes, oRes]) => {
        if (uRes.status === 'fulfilled') setPoints(uRes.value.data?.points || 0);
        if (oRes.status === 'fulfilled') {
          const all: Offer[] = Array.isArray(oRes.value.data) ? oRes.value.data : [];
          setUserOffers(all.filter((o) => {
            const exp = o.expiryDate ? new Date(o.expiryDate) : null;
            return !o.used && o.active && (!exp || exp >= now);
          }));
        }
      }).finally(() => setLoadingRewards(false));
    }

    if (isOwner) {
      setLoadingOwner(true);
      const ownerId = user.ownerId ?? user.id;
      Promise.allSettled([
        api.get(`/api/owner/${ownerId}/rents?limit=5`),
        api.get(`/api/owner/${ownerId}/offers`),
      ]).then(([rRes, oRes]) => {
        if (rRes.status === 'fulfilled') {
          setRecentRents((rRes.value.data || []).slice(0, 3));
        }
        if (oRes.status === 'fulfilled') {
          setOwnerOffers(
            (oRes.value.data || []).filter((o: Offer) => o.active && !o.used).slice(0, 3)
          );
        }
      }).finally(() => setLoadingOwner(false));
    }

    if (isAdmin) {
      setLoadingStats(true);
      Promise.allSettled([
        api.get('/api/users/count'),
        api.get('/api/houses/count'),
        api.get('/api/rents/active/count'),
        api.get('/api/rents/count'),
      ]).then(([u, h, ar, tr]) => {
        setAdminStats({
          totalUsers:  u.status  === 'fulfilled' ? (u.value.data?.count  ?? '—') : '—',
          totalHouses: h.status  === 'fulfilled' ? (h.value.data?.count  ?? '—') : '—',
          activeRents: ar.status === 'fulfilled' ? (ar.value.data?.count ?? '—') : '—',
          totalRents:  tr.status === 'fulfilled' ? (tr.value.data?.count ?? '—') : '—',
        });
      }).finally(() => setLoadingStats(false));
    }
  }, [user?.id]);

  // ── Loyalty rewards computed values ──────────────────────────
  const rentalsCompleted = Math.floor(points / 10);
  const rentalsToNext    = 3 - (rentalsCompleted % 3);
  const progressPct      = (rentalsCompleted % 3) / 3;

  // ── Handlers ──────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await userService.update({ id: user.id, username, phoneNumber, email });
      await updateUser({ username, phoneNumber, email });
      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
    } catch (err: any) {
      console.log('[Profile] update error status:', err.response?.status);
      console.log('[Profile] update error data:', JSON.stringify(err.response?.data));
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    Alert.alert('Change Profile Photo', 'Choose an option', [
      { text: 'Photo Library', onPress: () => launchPicker('library') },
      { text: 'Camera',        onPress: () => launchPicker('camera')  },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchPicker = async (source: 'library' | 'camera') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access.');
        return;
      }
    }
    setImageLoading(true);
    try {
      const result = source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
          })
        : await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64DataUrl = `data:image/jpeg;base64,${asset.base64}`;
        setProfileImage(asset.uri);
        if (!user) return;
        const res = await userService.uploadProfileImage(user.id, base64DataUrl);
        const serverUrl: string = res.data?.profileImage ?? asset.uri;
        await updateUser({ profileImage: serverUrl });
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile photo');
    } finally {
      setImageLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!user) return;
    setPasswordLoading(true);
    try {
      await userService.update({ id: user.id, password: newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePwd(false);
    } catch (err: any) {
      console.log('[Profile] password change error status:', err.response?.status);
      console.log('[Profile] password change error data:', JSON.stringify(err.response?.data));
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} disabled={imageLoading}>
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          <View style={styles.avatarEdit}>
            {imageLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={14} color="#fff" />
            }
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>{user?.username}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        {isAdmin && (
          <View style={[styles.roleBadge, { backgroundColor: '#e74c3c' }]}>
            <Text style={styles.roleBadgeText}>Admin</Text>
          </View>
        )}
        {isOwner && (
          <View style={[styles.roleBadge, { backgroundColor: '#27ae60' }]}>
            <Text style={styles.roleBadgeText}>Owner</Text>
          </View>
        )}
      </View>

      {/* ── Personal Information ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={20} color="#2C3E50" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputDisabled]}
          value={username}
          onChangeText={setUsername}
          editable={editing}
          placeholder="Enter username"
          placeholderTextColor="#999"
        />

        {/* FIX 4 — Email is now editable */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputDisabled]}
          value={email}
          onChangeText={setEmail}
          editable={editing}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter email"
          placeholderTextColor="#999"
        />

        {/* FIX 5 — Phone with +961 country code prefix */}
        <Text style={styles.label}>Phone</Text>
        <View style={styles.phoneRow}>
          <View style={[styles.countryCode, !editing && styles.countryCodeDisabled]}>
            <Text style={styles.countryCodeText}>+961</Text>
          </View>
          <TextInput
            style={[styles.input, styles.phoneInput, !editing && styles.inputDisabled]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={editing}
            keyboardType="phone-pad"
            placeholder="71 234 567"
            placeholderTextColor="#999"
          />
        </View>

        {editing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── FIX 1: Loyalty Rewards (regular users only) ── */}
      {isUser && (
        <View style={styles.section}>
          <View style={styles.rewardsHeader}>
            <View style={styles.rewardsIconWrap}>
              <Ionicons name="gift" size={20} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Loyalty Rewards</Text>
              <Text style={styles.rewardsSub}>Earn points, unlock discounts</Text>
            </View>
          </View>

          {loadingRewards ? (
            <ActivityIndicator color="#2C3E50" style={{ marginTop: 12 }} />
          ) : (
            <>
              <View style={styles.pointsRow}>
                <View style={styles.pointsCircle}>
                  <Text style={styles.pointsNumber}>{points}</Text>
                  <Text style={styles.pointsPtsLabel}>pts</Text>
                </View>
                <View style={styles.pointsMeta}>
                  <Text style={styles.rentalsCount}>
                    <Text style={{ fontFamily: FONTS.heading, color: '#2C3E50' }}>{rentalsCompleted}</Text>
                    {' '}rental{rentalsCompleted !== 1 ? 's' : ''} completed
                  </Text>
                  <Text style={styles.rentalsNext}>
                    {rentalsToNext === 3
                      ? '🎉 Offer unlocked! Keep renting.'
                      : `${rentalsToNext} more rental${rentalsToNext !== 1 ? 's' : ''} to unlock 20% OFF`}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { flex: progressPct }]} />
                    <View style={{ flex: 1 - progressPct }} />
                  </View>
                  <View style={styles.progressLabels}>
                    {['0', '1', '2', '3 🏷️'].map((l) => (
                      <Text key={l} style={styles.progressLabel}>{l}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.howItWorks}>
                <Text style={styles.howTitle}>How it works</Text>
                <Text style={styles.howItem}>• +10 points per rental</Text>
                <Text style={styles.howItem}>• Every 3 rentals → 20% OFF offer</Text>
                <Text style={styles.howItem}>• Offer valid 30 days · same owner</Text>
              </View>

              <View style={styles.activeOffersHeader}>
                <Text style={styles.subHeading}>Active Offers</Text>
                <View style={styles.offersCountBadge}>
                  <Text style={styles.offersCountText}>{userOffers.length}</Text>
                </View>
              </View>

              {userOffers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="pricetag-outline" size={32} color="#bdc3c7" />
                  <Text style={styles.emptyText}>No active offers yet</Text>
                  <Text style={styles.emptyHint}>Complete 3 rentals to earn your first discount!</Text>
                </View>
              ) : (
                userOffers.map((offer, i) => (
                  <View key={i} style={styles.offerPill}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerDiscount}>🔥 {offer.discountPercentage}% OFF</Text>
                      <Text style={styles.offerProperty}>
                        {offer.house ? `For: ${offer.house.title}` : 'Any property · same owner'}
                      </Text>
                    </View>
                    <Text style={styles.offerExpiry}>
                      Expires{' '}
                      {offer.expiryDate
                        ? new Date(offer.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      )}

      {/* ── FIX 2: Owner Property Overview ── */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Overview</Text>

          {loadingOwner ? (
            <ActivityIndicator color="#2C3E50" style={{ marginTop: 12 }} />
          ) : (
            <>
              <Text style={[styles.subHeading, { marginTop: 14 }]}>Recent Rentals</Text>
              {recentRents.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={32} color="#bdc3c7" />
                  <Text style={styles.emptyText}>No recent rentals yet</Text>
                </View>
              ) : (
                recentRents.map((rent, i) => (
                  <View key={i} style={styles.rentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rentTitle}>{rent.houseTitle}</Text>
                      <Text style={styles.rentTenant}>{rent.tenantName}</Text>
                      <Text style={styles.rentPeriod}>
                        {fmtDate(rent.startDate)} → {fmtDate(rent.endDate)}
                      </Text>
                    </View>
                    <Text style={styles.rentRevenue}>{fmtCurrency(rent.totalPrice)}</Text>
                  </View>
                ))
              )}

              <Text style={[styles.subHeading, { marginTop: 16 }]}>Active Offers</Text>
              {ownerOffers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="pricetag-outline" size={32} color="#bdc3c7" />
                  <Text style={styles.emptyText}>No active offers</Text>
                </View>
              ) : (
                ownerOffers.map((offer, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.ownerOfferRow}
                    onPress={() => setExpandedOwnerOffer(expandedOwnerOffer === i ? null : i)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.ownerOfferMain}>
                      <Text style={styles.offerDiscount}>🔥 {offer.discountPercentage}% OFF</Text>
                      <Text style={styles.offerProperty} numberOfLines={1}>
                        {offer.houseTitle || offer.house?.title || 'Any property'}
                      </Text>
                      <Ionicons
                        name={expandedOwnerOffer === i ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#7f8c8d"
                      />
                    </View>
                    {expandedOwnerOffer === i && (
                      <View style={styles.ownerOfferDetail}>
                        <Text style={styles.ownerOfferDetailText}>
                          Expires: {offer.expiryDate ? fmtDate(offer.expiryDate) : '—'}
                        </Text>
                        <Text style={styles.ownerOfferDetailText}>
                          Status: {offer.used ? 'Used' : 'Active'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>
      )}

      {/* ── FIX 3: Admin Platform Stats ── */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Platform Stats</Text>
            {loadingStats && <ActivityIndicator size="small" color="#2C3E50" />}
          </View>

          <View style={styles.statsGrid}>
            {([
              { label: 'Total Users',       value: adminStats.totalUsers,  icon: 'people-outline'     },
              { label: 'Listed Properties', value: adminStats.totalHouses, icon: 'home-outline'       },
              { label: 'Active Rentals',    value: adminStats.activeRents, icon: 'calendar-outline'   },
              { label: 'Total Rentals',     value: adminStats.totalRents,  icon: 'stats-chart-outline'},
            ] as const).map((card) => (
              <View key={card.label} style={styles.statCard}>
                <Ionicons name={card.icon} size={20} color="#2C3E50" />
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.manageUsersBtn}
            onPress={() => router.push('/admin/users' as any)}
          >
            <Ionicons name="people-outline" size={18} color="#2C3E50" />
            <Text style={styles.manageUsersBtnText}>Manage Users</Text>
            <Ionicons name="chevron-forward" size={16} color="#bdc3c7" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Change Password ── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowChangePwd(!showChangePwd)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Ionicons
            name={showChangePwd ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#2C3E50"
          />
        </TouchableOpacity>

        {showChangePwd && (
          <>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPwd}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNewPwd(!showNewPwd)} style={styles.eyeBtn}>
                <Ionicons name={showNewPwd ? 'eye-off' : 'eye'} size={20} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPwd}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)} style={styles.eyeBtn}>
                <Ionicons name={showConfirmPwd ? 'eye-off' : 'eye'} size={20} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Change Password</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Account Menu ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/about')}>
          <Ionicons name="information-circle-outline" size={22} color="#2C3E50" />
          <Text style={styles.menuItemText}>About Us</Text>
          <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
        </TouchableOpacity>

        {isUser && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/rentals')}>
              <Ionicons name="calendar-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>My Rentals</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/reviews')}>
              <Ionicons name="star-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>My Reviews</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          </>
        )}

        {isOwner && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/owner/dashboard' as any)}>
            <Ionicons name="home-outline" size={22} color="#2C3E50" />
            <Text style={styles.menuItemText}>Owner Dashboard</Text>
            <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
          </TouchableOpacity>
        )}

        {isAdmin && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/post-listing')}>
              <Ionicons name="add-circle-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>Post a Listing</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/feedbacks')}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>Manage Feedbacks</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/ratings')}>
              <Ionicons name="star-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>View Ratings</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/users' as any)}>
              <Ionicons name="people-outline" size={22} color="#2C3E50" />
              <Text style={styles.menuItemText}>Manage Users</Text>
              <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  avatarWrap:  { position: 'relative', marginBottom: 12 },
  avatarImg:   { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarEdit:  {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#3498db', borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#2C3E50',
  },
  userName:  { fontSize: 20, fontFamily: FONTS.heading, color: '#fff' },
  userEmail: { fontSize: 14, color: '#bdc3c7', marginTop: 4, fontFamily: FONTS.body },
  roleBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginTop: 8 },
  roleBadgeText: { color: '#fff', fontSize: 12, fontFamily: FONTS.semiBold },

  // ── Section card ─────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.heading, color: '#2C3E50' },
  subHeading:   { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 10 },

  // ── Inputs ───────────────────────────────────────────────────
  label: { fontSize: 13, color: '#7f8c8d', marginBottom: 6, fontFamily: FONTS.body },
  input: {
    borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 14,
    backgroundColor: '#f8f9fa', color: '#2C3E50', fontFamily: FONTS.body,
  },
  inputDisabled: { color: '#7f8c8d', backgroundColor: '#f0f0f0' },

  // ── Phone row (FIX 5) ─────────────────────────────────────────
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  countryCode: {
    borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
    padding: 12, backgroundColor: '#f8f9fa',
    justifyContent: 'center', height: 47, marginBottom: 14,
  },
  countryCodeDisabled: { backgroundColor: '#f0f0f0' },
  countryCodeText: { fontSize: 15, color: '#2C3E50', fontFamily: FONTS.semiBold },
  phoneInput: {
    flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
    borderLeftWidth: 0, marginBottom: 14,
  },

  // ── Password row ─────────────────────────────────────────────
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  passwordInput: {
    flex: 1, marginBottom: 0,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  eyeBtn: {
    borderWidth: 1, borderLeftWidth: 0, borderColor: '#dfe6e9',
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    backgroundColor: '#f8f9fa', paddingHorizontal: 12,
    height: 47, justifyContent: 'center',
  },

  // ── Buttons ──────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: '#2C3E50', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },

  // ── Loyalty rewards (FIX 1) ───────────────────────────────────
  rewardsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  rewardsIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2C3E50', justifyContent: 'center', alignItems: 'center',
  },
  rewardsSub: { fontSize: 12, color: '#7f8c8d', marginTop: 2, fontFamily: FONTS.body },

  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  pointsCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2C3E50', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFD700',
  },
  pointsNumber:   { fontSize: 22, fontFamily: FONTS.heading, color: '#FFD700' },
  pointsPtsLabel: { fontSize: 11, color: '#bdc3c7', fontFamily: FONTS.body },
  pointsMeta:     { flex: 1 },
  rentalsCount:   { fontSize: 14, color: '#7f8c8d', fontFamily: FONTS.body, marginBottom: 4 },
  rentalsNext:    { fontSize: 12, color: '#2C3E50', fontFamily: FONTS.body, marginBottom: 8 },

  progressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: '#ecf0f1', flexDirection: 'row', overflow: 'hidden', marginBottom: 4,
  },
  progressFill: { backgroundColor: '#27AE60', borderRadius: 4 },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  progressLabel: { fontSize: 10, color: '#7f8c8d', fontFamily: FONTS.body },

  howItWorks: {
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  howTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 6 },
  howItem:  { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body, marginBottom: 3 },

  activeOffersHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  offersCountBadge: {
    backgroundColor: '#2C3E50', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  offersCountText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold },

  offerPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#27ae60',
  },
  offerDiscount: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  offerProperty: { fontSize: 12, color: '#7f8c8d', marginTop: 2, fontFamily: FONTS.body },
  offerExpiry:   { fontSize: 11, color: '#7f8c8d', fontFamily: FONTS.body, textAlign: 'right' },

  // ── Owner overview (FIX 2) ─────────────────────────────────────
  rentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rentTitle:   { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  rentTenant:  { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body, marginTop: 2 },
  rentPeriod:  { fontSize: 11, color: '#95a5a6', fontFamily: FONTS.body, marginTop: 2 },
  rentRevenue: { fontSize: 14, fontFamily: FONTS.heading, color: '#27ae60' },

  ownerOfferRow: {
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  ownerOfferMain: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  ownerOfferDetail: {
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ecf0f1',
    flexDirection: 'row', gap: 16,
  },
  ownerOfferDetailText: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },

  // ── Admin stats (FIX 3) ────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },
  statCard: {
    width: '47%', backgroundColor: '#f8f9fa', borderRadius: 10,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#ecf0f1',
  },
  statValue: { fontSize: 22, fontFamily: FONTS.heading, color: '#2C3E50' },
  statLabel: { fontSize: 11, color: '#7f8c8d', fontFamily: FONTS.body, textAlign: 'center' },

  manageUsersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0f4f8', borderRadius: 10, padding: 14,
    marginTop: 4,
  },
  manageUsersBtnText: { flex: 1, fontSize: 15, color: '#2C3E50', fontFamily: FONTS.body },

  // ── Empty state ───────────────────────────────────────────────
  emptyBox: {
    alignItems: 'center', paddingVertical: 20,
  },
  emptyText: { color: '#7f8c8d', fontFamily: FONTS.semiBold, fontSize: 14, marginTop: 8 },
  emptyHint: { color: '#bdc3c7', fontFamily: FONTS.body, fontSize: 12, marginTop: 4, textAlign: 'center' },

  // ── Menu rows ─────────────────────────────────────────────────
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12,
  },
  menuItemText: { flex: 1, fontSize: 15, color: '#2C3E50', fontFamily: FONTS.body },

  // ── Logout ────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: 16, marginTop: 16, backgroundColor: '#fff',
    borderRadius: 14, padding: 16, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  logoutText: { color: '#e74c3c', fontSize: 16, fontFamily: FONTS.semiBold },
});
