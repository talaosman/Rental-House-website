import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../services/api';
import { visitService } from '../../services/visit.service';
import CustomDatePicker from '../../components/CustomDatePicker';
import { FONTS } from '../../constants/fonts';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Stats {
  totalHouses: number;
  activeRents: number;
  totalRevenue: number;
  activeOffers: number;
}

interface House {
  id: number;
  title: string;
  location: string;
  image?: string;
  nbOfBedrooms: number;
  propertyType: string;
  pricePerMonth: number;
  status?: string;
  activeRents?: number;
  activeOffers?: number;
}

interface Rent {
  rentId: number;
  houseId?: number;
  houseTitle: string;
  houseImage?: string;
  houseLocation: string;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
}

interface VisitRequest {
  id: number;
  visitorName: string;
  visitorEmail: string;
  accepted: boolean | null;
  visitDate: string;
  visitTime: string;
  house?: { id: number; title: string; location: string; image?: string };
}

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

type Tab = 'properties' | 'rentals' | 'offers' | 'visits';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imageUri(raw: string | undefined): string {
  if (!raw) return 'https://ui-avatars.com/api/?name=House&background=random';
  if (raw.startsWith('http')) return raw;
  return `${BASE_URL}/uploads/${raw}`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n || 0);
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', completed: '#3498db', expired: '#e74c3c',
  used: '#f59e0b', inactive: '#94a3b8',
};
function statusColor(s: string): string {
  return STATUS_COLORS[s?.toLowerCase()] ?? '#94a3b8';
}

const EMPTY_FORM = { houseId: 0, discountPercentage: '', expiryDate: '', sameOwnerOnly: false };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const ownerId: number = (user as any)?.ownerId ?? user?.id ?? 0;

  // Stats
  const [stats, setStats] = useState<Stats>({ totalHouses: 0, activeRents: 0, totalRevenue: 0, activeOffers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Tab
  const [tab, setTab] = useState<Tab>('properties');

  // Properties
  const [houses, setHouses] = useState<House[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);

  // Rentals
  const [rents, setRents] = useState<Rent[]>([]);
  const [rentsLoading, setRentsLoading] = useState(true);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [houseList, setHouseList] = useState<House[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Visit requests
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchStats = async () => {
    if (!ownerId) return;
    try {
      const res = await api.get(`/api/owner/${ownerId}/stats`);
      setStats(res.data || {});
    } catch { /* non-critical */ } finally { setStatsLoading(false); }
  };

  const fetchHouses = async () => {
    if (!ownerId) return;
    try {
      const res = await api.get(`/api/owner/${ownerId}/houses`);
      setHouses(Array.isArray(res.data) ? res.data : []);
    } catch { setHouses([]); } finally { setHousesLoading(false); }
  };

  const fetchRents = async () => {
    if (!ownerId) return;
    try {
      const res = await api.get(`/api/owner/${ownerId}/rents`);
      setRents(Array.isArray(res.data) ? res.data : []);
    } catch { setRents([]); } finally { setRentsLoading(false); }
  };

  const fetchVisits = async () => {
    if (!ownerId) return;
    try {
      const res = await visitService.getOwnerVisits(ownerId);
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch { setVisits([]); } finally { setVisitsLoading(false); }
  };

  const fetchOffers = async () => {
    if (!ownerId) return;
    try {
      const [offersRes, housesRes] = await Promise.all([
        api.get(`/api/owner/${ownerId}/offers`),
        api.get(`/api/owner/${ownerId}/houses`),
      ]);
      setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
      setHouseList(Array.isArray(housesRes.data) ? housesRes.data : []);
    } catch { setOffers([]); } finally { setOffersLoading(false); }
  };

  const fetchAll = () => {
    setStatsLoading(true);
    setHousesLoading(true);
    setRentsLoading(true);
    setOffersLoading(true);
    setVisitsLoading(true);
    Promise.all([fetchStats(), fetchHouses(), fetchRents(), fetchOffers(), fetchVisits()])
      .finally(() => setRefreshing(false));
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, [ownerId]));

  // ─── Offer actions ────────────────────────────────────────────────────────

  const openCreateOffer = () => {
    setEditingOffer(null);
    setForm({ ...EMPTY_FORM, houseId: houseList[0]?.id ?? 0 });
    setShowModal(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      houseId: offer.houseId ?? 0,
      discountPercentage: String(offer.discountPercentage),
      expiryDate: offer.expiryDate ?? '',
      sameOwnerOnly: offer.sameOwnerOnly ?? false,
    });
    setShowModal(true);
  };

  const handleSubmitOffer = async () => {
    const pct = parseFloat(form.discountPercentage);
    if (!pct || pct < 1 || pct > 100) { Alert.alert('Error', 'Discount must be between 1 and 100'); return; }
    if (!form.expiryDate) { Alert.alert('Error', 'Please select an expiry date'); return; }
    setSaving(true);
    try {
      if (editingOffer) {
        await api.put(`/api/owner/${ownerId}/offers/${editingOffer.id}`, {
          discountPercentage: pct, expiryDate: form.expiryDate,
          sameOwnerOnly: form.sameOwnerOnly, active: true,
        });
      } else {
        await api.post(`/api/owner/${ownerId}/offers`, {
          houseId: form.houseId, discountPercentage: pct,
          expiryDate: form.expiryDate, sameOwnerOnly: form.sameOwnerOnly,
        });
      }
      setShowModal(false);
      fetchOffers();
      fetchStats();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOffer = async (offer: Offer) => {
    try {
      await api.put(`/api/owner/${ownerId}/offers/${offer.id}`, { active: !offer.active });
      fetchOffers();
    } catch { Alert.alert('Error', 'Failed to update offer'); }
  };

  const handleDeleteOffer = (offer: Offer) => {
    Alert.alert('Delete Offer', 'Delete this offer permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/owner/${ownerId}/offers/${offer.id}`);
            setOffers((p) => p.filter((o) => o.id !== offer.id));
            fetchStats();
          } catch { Alert.alert('Error', 'Failed to delete offer'); }
        },
      },
    ]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const STAT_TILES = [
    { label: 'Properties', value: stats.totalHouses, icon: 'home', color: '#6366f1' },
    { label: 'Active Rentals', value: stats.activeRents, icon: 'calendar', color: '#22c55e' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: 'cash', color: '#f59e0b' },
    { label: 'Offers', value: stats.activeOffers, icon: 'pricetag', color: '#ec4899' },
  ] as const;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>HOUSE OWNER</Text>
          </View>
          <Text style={styles.headerTitle}>Owner Dashboard</Text>
          <Text style={styles.headerSub}>Manage properties, rentals & offers</Text>
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.statsGrid}>
          {STAT_TILES.map((tile) => (
            <View key={tile.label} style={[styles.statCard, { borderLeftColor: tile.color }]}>
              <View style={[styles.statIcon, { backgroundColor: tile.color + '20' }]}>
                <Ionicons name={tile.icon as any} size={18} color={tile.color} />
              </View>
              {statsLoading
                ? <ActivityIndicator size="small" color={tile.color} />
                : <Text style={styles.statValue}>{tile.value}</Text>
              }
              <Text style={styles.statLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Tab switcher ── */}
        <View style={styles.tabBar}>
          {([
            { key: 'properties', label: 'Properties', icon: 'home-outline' },
            { key: 'rentals',    label: 'Rentals',       icon: 'receipt-outline' },
            { key: 'offers',     label: 'Offers',        icon: 'pricetag-outline' },
            { key: 'visits',     label: 'Visits',        icon: 'calendar-outline' },
          ] as const).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={t.icon} size={16} color={tab === t.key ? '#2C3E50' : '#94a3b8'} />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ── */}
        {tab === 'properties' && (
          <PropertiesTab
            houses={houses}
            loading={housesLoading}
            router={router}
          />
        )}
        {tab === 'rentals' && (
          <RentalsTab rents={rents} loading={rentsLoading} router={router} />
        )}
        {tab === 'offers' && (
          <OffersTab
            offers={offers}
            loading={offersLoading}
            onToggle={handleToggleOffer}
            onEdit={openEditOffer}
            onDelete={handleDeleteOffer}
            onAdd={openCreateOffer}
          />
        )}
        {tab === 'visits' && (
          <VisitsTab visits={visits} loading={visitsLoading} />
        )}
      </ScrollView>

      {/* ── Offer modal ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingOffer ? 'Edit Offer' : 'New Offer'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Property picker — create only */}
              {!editingOffer && houseList.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Property *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {houseList.map((h) => (
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
              <Text style={styles.formLabel}>Discount % (1–100) *</Text>
              <View style={styles.discountRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  value={form.discountPercentage}
                  onChangeText={(v) => setForm((f) => ({ ...f, discountPercentage: v }))}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 15"
                  placeholderTextColor="#999"
                />
                <View style={styles.pctSymbol}><Text style={styles.pctText}>%</Text></View>
              </View>

              {/* Expiry — dismiss the offer modal first so CustomDatePicker
                  (itself a Modal) isn't blocked by an already-visible modal on iOS */}
              <Text style={styles.formLabel}>Expiry Date *</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { setShowModal(false); setShowDatePicker(true); }}
              >
                <Ionicons name="calendar-outline" size={16} color="#2C3E50" />
                <Text style={styles.dateBtnText}>
                  {form.expiryDate
                    ? new Date(form.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Select expiry date'}
                </Text>
              </TouchableOpacity>

              {/* Same owner only */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Restrict to my properties only</Text>
                  <Text style={styles.switchSub}>For loyalty offer pairing</Text>
                </View>
                <Switch
                  value={form.sameOwnerOnly}
                  onValueChange={(v) => setForm((f) => ({ ...f, sameOwnerOnly: v }))}
                  trackColor={{ true: '#2C3E50', false: '#dfe6e9' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitOffer} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{editingOffer ? 'Save Changes' : 'Create Offer'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CustomDatePicker lives outside the offer Modal — on iOS two Modals
          cannot reliably stack, so we hide the offer modal before showing the
          picker, then restore it once the user confirms or cancels. */}
      <CustomDatePicker
        isVisible={showDatePicker}
        minimumDate={new Date(Date.now() + 86_400_000)}
        currentDate={form.expiryDate ? new Date(form.expiryDate) : new Date(Date.now() + 86_400_000)}
        onConfirm={(d) => {
          setForm((f) => ({ ...f, expiryDate: d.toISOString().split('T')[0] }));
          setShowDatePicker(false);
          setShowModal(true);
        }}
        onCancel={() => { setShowDatePicker(false); setShowModal(true); }}
      />
    </>
  );
}

// ─── Properties Tab ───────────────────────────────────────────────────────────

function PropertiesTab({ houses, loading, router }: {
  houses: House[];
  loading: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  if (loading) return <LoadingBlock />;

  return (
    <View style={styles.tabContent}>
      {houses.length === 0 ? (
        <EmptyState icon="home-outline" title="No properties yet" sub="Contact an admin to list your property." />
      ) : (
        houses.map((house) => (
          <View key={house.id} style={styles.propCard}>
            <Image source={{ uri: imageUri(house.image) }} style={styles.propImage} resizeMode="cover" />

            <View style={[styles.statusBadge,
              house.status?.toLowerCase() === 'available' ? styles.badgeAvail : styles.badgeRented]}>
              <Text style={styles.statusText}>{house.status || 'available'}</Text>
            </View>

            <View style={styles.propBody}>
              <Text style={styles.propTitle} numberOfLines={1}>{house.title}</Text>

              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color="#7f8c8d" />
                <Text style={styles.propSub} numberOfLines={1}>{house.location}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>{house.nbOfBedrooms} bed</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaItem}>{house.propertyType}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaPrice}>{formatCurrency(house.pricePerMonth)}/mo</Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>{house.activeRents ?? 0} rental{(house.activeRents ?? 0) !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[styles.infoBadge, { backgroundColor: '#ec489920' }]}>
                  <Text style={[styles.infoBadgeText, { color: '#ec4899' }]}>{house.activeOffers ?? 0} offer{(house.activeOffers ?? 0) !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>

            <View style={styles.propActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/property/${house.id}` as any)}>
                <Ionicons name="eye-outline" size={18} color="#3498db" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Rentals Tab ──────────────────────────────────────────────────────────────

function RentalsTab({ rents, loading, router }: {
  rents: Rent[];
  loading: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  if (loading) return <LoadingBlock />;

  return (
    <View style={styles.tabContent}>
      {rents.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No rental history yet" sub="Bookings for your properties will appear here." />
      ) : (
        rents.map((rent) => {
          const color = statusColor(rent.status);
          return (
            <TouchableOpacity
              key={rent.rentId}
              style={styles.rentCard}
              onPress={() => rent.houseId && router.push(`/property/${rent.houseId}` as any)}
              activeOpacity={rent.houseId ? 0.75 : 1}
            >
              <Image source={{ uri: imageUri(rent.houseImage) }} style={styles.rentImage} resizeMode="cover" />
              <View style={styles.rentBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.rentTitle} numberOfLines={1}>{rent.houseTitle}</Text>
                  <View style={[styles.rentStatusBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.rentStatusText, { color }]}>{rent.status}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={13} color="#7f8c8d" />
                  <Text style={styles.propSub} numberOfLines={1}>{rent.houseLocation}</Text>
                </View>
                <View style={styles.metaGrid}>
                  <MetaRow icon="person-outline"   label="Tenant"  value={rent.tenantName || '—'} />
                  <MetaRow icon="mail-outline"     label="Email"   value={rent.tenantEmail || '—'} />
                  <MetaRow icon="calendar-outline" label="Period"  value={`${formatDate(rent.startDate)} → ${formatDate(rent.endDate)}`} />
                  <MetaRow icon="cash-outline"     label="Revenue" value={formatCurrency(rent.totalPrice)} highlight />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

// ─── Offers Tab ───────────────────────────────────────────────────────────────

function OffersTab({ offers, loading, onToggle, onEdit, onDelete, onAdd }: {
  offers: Offer[];
  loading: boolean;
  onToggle: (o: Offer) => void;
  onEdit: (o: Offer) => void;
  onDelete: (o: Offer) => void;
  onAdd: () => void;
}) {
  if (loading) return <LoadingBlock />;

  return (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>New Offer</Text>
      </TouchableOpacity>

      {offers.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="No offers yet" sub="Create discounts to attract more renters." />
      ) : (
        offers.map((offer) => {
          const color = statusColor(offer.status);
          return (
            <View key={offer.id} style={styles.offerCard}>
              <View style={[styles.discountBadge, !offer.active && styles.discountBadgeDim]}>
                <Text style={styles.discountPct}>{offer.discountPercentage}%</Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>

              <View style={styles.offerInfo}>
                <Text style={styles.offerTitle} numberOfLines={1}>
                  {offer.houseTitle || 'Any property · same owner'}
                </Text>
                <Text style={styles.offerExpiry}>Expires: {formatDate(offer.expiryDate)}</Text>
                <View style={[styles.offerStatusBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.offerStatusText, { color }]}>{offer.status}</Text>
                </View>
              </View>

              <View style={styles.offerActions}>
                {!offer.used && (
                  <>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => onToggle(offer)}>
                      <Ionicons
                        name={offer.active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={22}
                        color={offer.active ? '#f59e0b' : '#22c55e'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(offer)}>
                      <Ionicons name="pencil-outline" size={20} color="#3498db" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(offer)}>
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Visits Tab ───────────────────────────────────────────────────────────────

function visitStatus(accepted: boolean | null): { label: string; color: string } {
  if (accepted === true)  return { label: 'Accepted', color: '#22c55e' };
  if (accepted === false) return { label: 'Rejected', color: '#e74c3c' };
  return { label: 'Pending', color: '#f59e0b' };
}

function VisitsTab({ visits, loading }: { visits: VisitRequest[]; loading: boolean }) {
  if (loading) return <LoadingBlock />;

  return (
    <View style={styles.tabContent}>
      {visits.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No visit requests" sub="Visit requests from tenants will appear here." />
      ) : (
        visits.map((v) => {
          const { label, color } = visitStatus(v.accepted);
          const time = v.visitTime?.length >= 5 ? v.visitTime.substring(0, 5) : v.visitTime;
          return (
            <View key={v.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitHouseTitle} numberOfLines={1}>
                    {v.house?.title ?? '—'}
                  </Text>
                  <Text style={styles.visitHouseLoc} numberOfLines={1}>
                    {v.house?.location ?? ''}
                  </Text>
                </View>
                <View style={[styles.visitStatusBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.visitStatusText, { color }]}>{label}</Text>
                </View>
              </View>

              <View style={styles.visitMeta}>
                <View style={styles.visitMetaRow}>
                  <Ionicons name="person-outline" size={13} color="#7f8c8d" />
                  <Text style={styles.visitMetaText}>{v.visitorName}</Text>
                </View>
                <View style={styles.visitMetaRow}>
                  <Ionicons name="mail-outline" size={13} color="#7f8c8d" />
                  <Text style={styles.visitMetaText}>{v.visitorEmail}</Text>
                </View>
                <View style={styles.visitMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#7f8c8d" />
                  <Text style={styles.visitMetaText}>{formatDate(v.visitDate)}</Text>
                  <Ionicons name="time-outline" size={13} color="#7f8c8d" style={{ marginLeft: 10 }} />
                  <Text style={styles.visitMetaText}>{time}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function LoadingBlock() {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator size="large" color="#2C3E50" />
    </View>
  );
}

function EmptyState({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={56} color="#bdc3c7" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

function MetaRow({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaItemLeft}>
        <Ionicons name={icon} size={13} color="#7f8c8d" />
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text style={[styles.metaValue, highlight && styles.metaValueHL]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },

  // Header
  header: { backgroundColor: '#2C3E50', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  ownerBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  ownerBadgeText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold, letterSpacing: 1 },
  headerTitle: { fontSize: 26, fontFamily: FONTS.heading, color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.body },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10 },
  statCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2, gap: 3,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: FONTS.heading, color: '#2C3E50' },
  statLabel: { fontSize: 11, color: '#7f8c8d', fontFamily: FONTS.body },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 14, borderRadius: 12, padding: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, paddingVertical: 8, borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: '#f0f4f8' },
  tabLabel: { fontSize: 12, fontFamily: FONTS.body, color: '#94a3b8' },
  tabLabelActive: { fontFamily: FONTS.semiBold, color: '#2C3E50' },

  // Tab content wrapper
  tabContent: { paddingHorizontal: 14, gap: 14 },
  loadingBlock: { paddingVertical: 40, alignItems: 'center' },

  // Shared add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#2C3E50', borderRadius: 12, padding: 14,
  },
  addBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },

  // Empty state
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 32, paddingBottom: 16 },
  emptyTitle: { fontSize: 17, fontFamily: FONTS.heading, color: '#2C3E50', marginTop: 6 },
  emptySub: { fontSize: 13, color: '#7f8c8d', textAlign: 'center', fontFamily: FONTS.body },

  // Properties tab
  propCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, elevation: 3,
  },
  propImage: { width: '100%', height: 150 },
  statusBadge: { position: 'absolute', top: 12, left: 12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeAvail: { backgroundColor: '#22c55e' },
  badgeRented: { backgroundColor: '#e74c3c' },
  statusText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },
  propBody: { padding: 14 },
  propTitle: { fontSize: 16, fontFamily: FONTS.heading, color: '#2C3E50', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  propSub: { fontSize: 13, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  metaItem: { fontSize: 13, color: '#636e72', fontFamily: FONTS.body },
  metaDot: { fontSize: 13, color: '#bdc3c7' },
  metaPrice: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  infoBadge: { backgroundColor: '#22c55e20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  infoBadgeText: { fontSize: 11, fontFamily: FONTS.semiBold, color: '#22c55e' },
  propActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: '#f8f9fa' },
  // Rentals tab
  rentCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, elevation: 3,
  },
  rentImage: { width: '100%', height: 120 },
  rentBody: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  rentTitle: { fontSize: 15, fontFamily: FONTS.heading, color: '#2C3E50', flex: 1 },
  rentStatusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rentStatusText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },
  metaGrid: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 10, gap: 8 },
  metaItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaLabel: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },
  metaValue: { fontSize: 12, color: '#2C3E50', fontFamily: FONTS.semiBold, flex: 1, textAlign: 'right' },
  metaValueHL: { color: '#22c55e' },

  // Offers tab
  offerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, elevation: 3,
  },
  discountBadge: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: '#2C3E50',
    alignItems: 'center', justifyContent: 'center',
  },
  discountBadgeDim: { backgroundColor: '#95a5a6' },
  discountPct: { fontSize: 18, fontFamily: FONTS.heading, color: '#fff', lineHeight: 20 },
  discountOff: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#bdc3c7', letterSpacing: 1 },
  offerInfo: { flex: 1, gap: 4 },
  offerTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  offerExpiry: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body },
  offerStatusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  offerStatusText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },
  offerActions: { flexDirection: 'column', gap: 2 },
  iconBtn: { padding: 6, alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: FONTS.heading, color: '#2C3E50' },
  formLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50', marginBottom: 8 },
  formInput: {
    borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: '#f8f9fa', color: '#2C3E50', marginBottom: 16,
    fontFamily: FONTS.body,
  },
  discountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  pctSymbol: {
    borderWidth: 1, borderLeftWidth: 0, borderColor: '#dfe6e9',
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    backgroundColor: '#f8f9fa', paddingHorizontal: 14, height: 48, justifyContent: 'center',
  },
  pctText: { fontSize: 15, color: '#2C3E50', fontFamily: FONTS.semiBold },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10,
    padding: 12, backgroundColor: '#f8f9fa', marginBottom: 16,
  },
  dateBtnText: { fontSize: 15, color: '#2C3E50', fontFamily: FONTS.body },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  switchLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  switchSub: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body, marginTop: 2 },
  houseChip: {
    borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#f8f9fa',
  },
  houseChipActive: { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  houseChipText: { fontSize: 13, color: '#2C3E50', fontFamily: FONTS.body },
  houseChipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#2C3E50', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 16 },

  // Visit requests tab
  visitCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, elevation: 3,
  },
  visitHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  visitHouseTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#2C3E50' },
  visitHouseLoc: { fontSize: 12, color: '#7f8c8d', fontFamily: FONTS.body, marginTop: 2 },
  visitStatusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  visitStatusText: { fontSize: 11, fontFamily: FONTS.semiBold, textTransform: 'capitalize' },
  visitMeta: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 10, gap: 7 },
  visitMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  visitMetaText: { fontSize: 12, color: '#2C3E50', fontFamily: FONTS.body, flex: 1 },
});
