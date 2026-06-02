import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../services/api';
import { FONTS } from '../constants/fonts';

interface House {
  id: number;
  title: string;
  location: string;
  pricePerMonth: number;
  pricePerDay?: number;
  nbOfBedrooms: number;
  propertyType: string;
  image?: string;
  averageRating?: number;
  status?: string;
}

interface Props {
  house: House;
  isFavorite?: boolean;
  onToggleFavorite?: (houseId: number) => void;
  isRecommended?: boolean;
  onDelete?: (houseId: number) => void;
  offerDiscount?: number | null;
  isNew?: boolean;
  // "Available after 15 June 2026" — passed when the caller has the rent endDate
  availableAfter?: string | null;
}

export default function PropertyCard({
  house,
  isFavorite,
  onToggleFavorite,
  isRecommended,
  onDelete,
  offerDiscount,
  isNew,
  availableAfter,
}: Props) {
  const router = useRouter();
  if (!house) return null;

  const rawImage = house.image;
  const imageUri = rawImage
    ? rawImage.startsWith('http') ? rawImage : `${BASE_URL}${rawImage}`
    : 'https://ui-avatars.com/api/?name=House&background=random';

  // FIX 2 — discounted price helpers
  const discountedMonth = offerDiscount
    ? Math.round((house.pricePerMonth ?? 0) * (1 - offerDiscount / 100))
    : null;
  const discountedDay = offerDiscount && house.pricePerDay != null
    ? Math.round(house.pricePerDay * (1 - offerDiscount / 100))
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/property/${house.id}`)}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

      {/* FIX 4 — "New" badge: top-left */}
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>New</Text>
        </View>
      )}

      {/* Recommended badge — shifted down when "New" is also shown */}
      {isRecommended && (
        <View style={[styles.recommendedBadge, isNew && { top: 38 }]}>
          <Ionicons name="star" size={11} color="#fff" />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}

      {/* FIX 2 — Offer badge: top-right (replaces rented badge position) */}
      {offerDiscount ? (
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>🔥 {offerDiscount}% OFF</Text>
        </View>
      ) : (
        /* Rented badge — only shown when no offer badge */
        house.status?.toLowerCase() === 'rented' && (
          <View style={styles.rentedBadge}>
            <Text style={styles.rentedText}>Rented</Text>
          </View>
        )
      )}

      {onToggleFavorite && (
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => onToggleFavorite(house.id)}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#e74c3c' : '#fff'}
          />
        </TouchableOpacity>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{house.title}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#7f8c8d" />
          <Text style={styles.location} numberOfLines={1}>{house.location}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="bed-outline" size={13} color="#7f8c8d" />
          <Text style={styles.detail}>{house.nbOfBedrooms} Beds</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.detail}>{house.propertyType}</Text>
        </View>

        {/* ── Prices (FIX 1 + FIX 2) ─────────────────── */}
        <View style={styles.priceRow}>
          <View>
            {offerDiscount ? (
              // FIX 2: strikethrough original + discounted in green
              <>
                <View style={styles.discountLine}>
                  <Text style={styles.priceStrike}>
                    ${house.pricePerMonth?.toLocaleString()}/mo
                  </Text>
                  <Text style={styles.priceDiscounted}>
                    ${discountedMonth?.toLocaleString()}/mo
                  </Text>
                </View>
                {house.pricePerDay != null && (
                  <View style={styles.discountLine}>
                    <Text style={styles.priceStrike}>
                      ${house.pricePerDay.toLocaleString()}/day
                    </Text>
                    <Text style={styles.priceDiscounted}>
                      ${discountedDay?.toLocaleString()}/day
                    </Text>
                  </View>
                )}
              </>
            ) : (
              // FIX 1: both prices on one line
              <Text style={styles.priceBoth}>
                {house.pricePerDay != null
                  ? `$${house.pricePerDay.toLocaleString()}/day  ·  $${house.pricePerMonth?.toLocaleString()}/mo`
                  : `$${house.pricePerMonth?.toLocaleString()}/mo`}
              </Text>
            )}
          </View>

          {house.averageRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#f1c40f" />
              <Text style={styles.rating}>{house.averageRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        {/* Rented status — shown below price when house.status is rented */}
        {house.status?.toLowerCase() === 'rented' && (
          <View style={styles.rentedStatusRow}>
            <Ionicons name="time-outline" size={13} color="#e67e22" />
            <Text style={styles.rentedStatusText}>
              {availableAfter
                ? `Available after ${availableAfter}`
                : 'Currently Rented'}
            </Text>
          </View>
        )}

        {/* Admin delete button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onDelete(house.id);
            }}
          >
            <Ionicons name="trash-outline" size={15} color="#e74c3c" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 180 },

  // ── Badges ────────────────────────────────────────
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f39c12',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendedText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold },

  // FIX 4 — New badge
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold },

  rentedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rentedText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold },

  // FIX 2 — Offer badge
  offerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offerBadgeText: { color: '#fff', fontSize: 11, fontFamily: FONTS.semiBold },

  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },

  // ── Card body ─────────────────────────────────────
  info: { padding: 14 },
  title: { fontSize: 16, fontFamily: FONTS.heading, color: '#2C3E50', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  location: { fontSize: 13, color: '#7f8c8d', flex: 1, fontFamily: FONTS.body },
  detail: { fontSize: 13, color: '#7f8c8d', fontFamily: FONTS.body },
  dot: { color: '#bdc3c7', marginHorizontal: 4 },

  // ── Prices ────────────────────────────────────────
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  // FIX 1: dual price, no offer
  priceBoth: {
    fontSize: 13,
    color: '#2C3E50',
    fontFamily: FONTS.semiBold,
  },
  // FIX 2: discounted price display
  discountLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  priceStrike: {
    fontSize: 12,
    color: '#b2bec3',
    textDecorationLine: 'line-through',
    fontFamily: FONTS.body,
  },
  priceDiscounted: {
    fontSize: 14,
    color: '#27AE60',
    fontFamily: FONTS.heading,
  },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 13, color: '#2C3E50', fontFamily: FONTS.semiBold },

  rentedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rentedStatusText: {
    fontSize: 12,
    color: '#e67e22',
    fontFamily: FONTS.semiBold,
  },

  // ── Admin delete ──────────────────────────────────
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 13, fontFamily: FONTS.semiBold },
});
