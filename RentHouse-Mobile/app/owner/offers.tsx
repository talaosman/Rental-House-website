import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
  TextInput, Switch, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CustomDatePicker from '../../components/CustomDatePicker';
import { FONTS } from '../../constants/fonts';

interface House { id: number; title: string; location: string }
interface Offer {
  id: number;
  discountPercentage: number;
  houseTitle?: string;
  houseId?: number;
  expiryDate: string | null;
  status: string;
  used: boolean;
  active: boolean;
  sameOwnerOnly?: boolean;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  active:   '#22c55e',
  inactive: '#94a3b8',
  expired:  '#e74c3c',
  used:     '#f59e0b',
};
function statusColor(s: string): string { return STATUS_COLORS[s?.toLowerCase()] ?? '#94a3b8'; }

const EMPTY_FORM = { houseId: 0, discountPercentage: '', expiryDate: '', sameOwnerOnly: false };

export default function OwnerOffersScreen() {
  const { user } = useAuth();
  const ownerId: number = (user as any)?.ownerId ?? user?.id ?? 0;
  const [offers, setOffers]   = useState<Offer[]>([]);
  const [houses, setHouses]   = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [showModal,    setShowModal]    = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm]                = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving]            = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchAll = async () => {
    if (!user || !ownerId) return;
    try {
      const [offersRes, housesRes] = await Promise.all([
        api.get(`/api/owner/${ownerId}/offers`),
        api.get(`/api/owner/${ownerId}/houses`),
      ]);
      setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
      setHouses(Array.isArray(housesRes.data) ? housesRes.data : []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [user]));

  const openCreate = () => {
    setEditingOffer(null);
    setForm({ ...EMPTY_FORM, houseId: houses[0]?.id ?? 0 });
    setShowModal(true);
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      houseId:            offer.houseId ?? 0,
      discountPercentage: String(offer.discountPercentage),
      expiryDate:         offer.expiryDate ?? '',
      sameOwnerOnly:      offer.sameOwnerOnly ?? false,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const pct = parseFloat(form.discountPercentage);
    if (!pct || pct < 1 || pct > 100) {
      Alert.alert('Error', 'Discount must be between 1 and 100');
      return;
    }
    if (!form.expiryDate) {
      Alert.alert('Error', 'Please select an expiry date');
      return;
    }
    setSaving(true);
    try {
      if (editingOffer) {
        // PUT /api/owner/:ownerId/offers/:offerId
        await api.put(`/api/owner/${ownerId}/offers/${editingOffer.id}`, {
          discountPercentage: pct,
          expiryDate: form.expiryDate,
          sameOwnerOnly: form.sameOwnerOnly,
          active: true,
        });
      } else {
        // POST /api/owner/:ownerId/offers
        await api.post(`/api/owner/${ownerId}/offers`, {
          houseId: form.houseId,
          discountPercentage: pct,
          expiryDate: form.expiryDate,
          sameOwnerOnly: form.sameOwnerOnly,
        });
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (offer: Offer) => {
    try {
      // PUT /api/owner/:ownerId/offers/:offerId  { active: !offer.active }
      await api.put(`/api/owner/${ownerId}/offers/${offer.id}`, { active: !offer.active });
      fetchAll();
    } catch {
      Alert.alert('Error', 'Failed to update offer');
    }
  };

  const handleDelete = (offer: Offer) => {
    Alert.alert('Delete Offer', 'Delete this offer permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            // DELETE /api/owner/:ownerId/offers/:offerId
            await api.delete(`/api/owner/${ownerId}/offers/${offer.id}`);
            setOffers((prev) => prev.filter((o) => o.id !== offer.id));
          } catch {
            Alert.alert('Error', 'Failed to delete offer');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={offers.length === 0 ? styles.emptyContainer : styles.list}
        data={offers}
        keyExtractor={(o) => String(o.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.createBtnText}>New Offer</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No offers yet</Text>
            <Text style={styles.emptySub}>Create discounts to attract more renters</Text>
            <TouchableOpacity style={styles.createBtnSmall} onPress={openCreate}>
              <Text style={styles.createBtnSmallText}>Create your first offer</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: offer }) => {
          const color = statusColor(offer.status);
          return (
            <View style={styles.card}>
              {/* Discount badge */}
              <View style={[styles.discountBadge, !offer.active && styles.discountBadgeDim]}>
                <Text style={styles.discountPct}>{offer.discountPercentage}%</Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {offer.houseTitle || 'Any property · same owner'}
                </Text>
                <Text style={styles.cardExpiry}>Expires: {formatDate(offer.expiryDate)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.statusText, { color }]}>{offer.status}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                {!offer.used && (
                  <>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleToggle(offer)}
                    >
                      <Ionicons
                        name={offer.active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={22}
                        color={offer.active ? '#f59e0b' : '#22c55e'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEdit(offer)}
                    >
                      <Ionicons name="pencil-outline" size={20} color="#3498db" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(offer)}>
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Property picker (create only) */}
              {!editingOffer && (
                <>
                  <Text style={styles.formLabel}>Property *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                  >
                    {houses.map((h) => (
                      <TouchableOpacity
                        key={h.id}
                        style={[styles.houseChip, form.houseId === h.id && styles.houseChipActive]}
                        onPress={() => setForm((f) => ({ ...f, houseId: h.id }))}
                      >
                        <Text style={[styles.houseChipText, form.houseId === h.id && styles.houseChipTextActive]}>
                          {h.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Discount */}
              <Text style={styles.formLabel}>Discount Percentage (1–100) *</Text>
              <View style={styles.discountInputRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  value={form.discountPercentage}
                  onChangeText={(v) => setForm((f) => ({ ...f, discountPercentage: v }))}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 15"
                  placeholderTextColor="#999"
                />
                <View style={styles.percentSymbol}>
                  <Text style={styles.percentText}>%</Text>
                </View>
              </View>

              {/* Expiry date */}
              <Text style={styles.formLabel}>Expiry Date *</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#2C3E50" />
                <Text style={styles.datePickerText}>
                  {form.expiryDate
                    ? new Date(form.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Select expiry date'}
                </Text>
              </TouchableOpacity>

              {/* Same owner only */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Restrict to my properties only</Text>
                  <Text style={styles.switchSub}>Applies when combined with loyalty offers</Text>
                </View>
                <Switch
                  value={form.sameOwnerOnly}
                  onValueChange={(v) => setForm((f) => ({ ...f, sameOwnerOnly: v }))}
                  trackColor={{ true: '#2C3E50', false: '#dfe6e9' }}
                  thumbColor="#fff"
                />
              </View>

              {/* Submit */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{editingOffer ? 'Save Changes' : 'Create Offer'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date picker outside Modal to avoid iOS nesting */}
      <CustomDatePicker
        isVisible={showDatePicker}
        minimumDate={new Date(Date.now() + 86_400_000)}
        currentDate={form.expiryDate ? new Date(form.expiryDate) : new Date(Date.now() + 86_400_000)}
        onConfirm={(d) => {
          setForm((f) => ({ ...f, expiryDate: d.toISOString().split('T')[0] }));
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 24 },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  createBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  discountBadge: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgeDim: { backgroundColor: '#95a5a6' },
  discountPct: { fontSize: 18, fontFamily: FONTS.heading, color: '#fff', lineHeight: 20 },
  discountOff: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#bdc3c7', letterSpacing: 1 },

  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  cardExpiry: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },

  cardActions: { flexDirection: 'column', gap: 4 },
  iconBtn: { padding: 6, alignItems: 'center' },

  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 8 },
  emptySub:   { fontSize: 13, color: '#7f8c8d', textAlign: 'center', fontFamily: FONTS.body },
  createBtnSmall: {
    marginTop: 8,
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  createBtnSmallText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: FONTS.heading, color: '#2C3E50' },

  formLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2C3E50',
    marginBottom: 16,
    fontFamily: FONTS.body,
  },

  discountInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 0 },
  percentSymbol: {
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#dfe6e9',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  percentText: { fontSize: 15, color: '#2C3E50', fontFamily: FONTS.semiBold },

  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  datePickerText: { fontSize: 15, color: '#2C3E50', fontFamily: FONTS.body },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  switchLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  switchSub:   { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body, marginTop: 2 },

  houseChip: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
  },
  houseChipActive: { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  houseChipText: { fontSize: 13, color: '#2C3E50', fontFamily: FONTS.body },
  houseChipTextActive: { color: '#fff' },

  submitBtn: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 16 },
});
