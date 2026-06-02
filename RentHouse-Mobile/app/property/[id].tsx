import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CustomDatePicker from "../../components/CustomDatePicker";
import { FONTS } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../services/api";
import { favoriteService } from "../../services/favorite.service";
import { houseService } from "../../services/house.service";
import { ratingService } from "../../services/rating.service";
import { rentService } from "../../services/rent.service";

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "HOUSE_OWNER";

  const [house, setHouse] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  // Backend returns the Rent object when rented (no 'available' field),
  // or { available: true } when free. Use any to avoid a type lie.
  const [rentAvailability, setRentAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showRentModal, setShowRentModal] = useState(false);
  const [rentType, setRentType] = useState<"DAILY" | "MONTHLY">("MONTHLY");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [renting, setRenting] = useState(false);

  const [virtualTourExists, setVirtualTourExists] = useState(false);
  const [virtualTourUrl, setVirtualTourUrl] = useState<string | null>(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Applicable offer for this user + house (null = not yet fetched or no offer)
  const [offer, setOffer] = useState<{
    hasOffer: boolean;
    discountPercentage: number;
    offerType: string;
  } | null>(null);

  // Rented when the API returned a Rent object (endDate present) instead of { available: true }
  const isRented =
    rentAvailability !== null && rentAvailability?.available !== true;

  // Format the end-date from the Rent object into a human-readable string
  const availableAfter: string | null =
    isRented && rentAvailability?.endDate
      ? (() => {
          const d = new Date(rentAvailability.endDate);
          return isNaN(d.getTime())
            ? null
            : d.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
        })()
      : null;

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [houseRes, ratingsRes, rentedRes] = await Promise.all([
        houseService.getById(Number(id)),
        ratingService.getByHouse(Number(id)),
        rentService.isRented(Number(id)),
      ]);
      setHouse(houseRes.data);
      setRatings(ratingsRes.data);
      setRentAvailability(rentedRes.data);

      // Primary source: virtualTourUrl included in the main house response (accessible to all users)
      const houseUrl = houseRes.data?.virtualTourUrl;
      if (houseUrl) {
        setVirtualTourUrl(houseUrl);
        setVirtualTourExists(true);
      }

      if (user) {
        const [favRes, offerRes] = await Promise.allSettled([
          favoriteService.getUserFavorites(user.id),
          api.get(`/api/offers/user/${user.id}/applicable/${id}`),
        ]);
        if (favRes.status === "fulfilled") {
          const favIds = favRes.value.data.map((f: any) => f.property?.id);
          setIsFavorite(favIds.includes(Number(id)));
        }
        if (offerRes.status === "fulfilled" && offerRes.value.data?.hasOffer) {
          setOffer(offerRes.value.data);
        }
      }

      try {
        const tourRes = await api.get(`/api/houses/${id}/virtual-tour-url`);
        const url = tourRes.data?.virtualTourUrl || null;
        if (url) {
          setVirtualTourUrl(url);
          setVirtualTourExists(true);
        }
      } catch {
        // dedicated endpoint unavailable — house object URL already applied above
      }
    } catch {
      Alert.alert("Error", "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await favoriteService.remove(user.id, Number(id));
      } else {
        await favoriteService.add(user.id, Number(id));
      }
      setIsFavorite(!isFavorite);
    } catch {
      Alert.alert("Error", "Could not update favorites");
    }
  };

  // Use local calendar fields so the formatted date matches what the user picked,
  // regardless of the device timezone (toISOString() returns UTC and can shift the day).
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // iOS only supports one Modal at a time — dismiss the rent sheet first,
  // show the picker, then bring the sheet back on confirm/cancel.
  const openStartDatePicker = () => {
    setShowRentModal(false);
    setTimeout(() => setShowStartDatePicker(true), 300);
  };

  const openEndDatePicker = () => {
    setShowRentModal(false);
    setTimeout(() => setShowEndDatePicker(true), 300);
  };

  const handleRent = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to rent");
      return;
    }
    if (endDate <= startDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    const userId = user.id;
    console.log("USER ID:", userId);

    const rentPayload = {
      userId,
      houseId: house.id, // use the fetched house object's id, not the URL param
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
    console.log("RENT PAYLOAD:", JSON.stringify(rentPayload));

    if (paymentMethod === "CARD") {
      // Close the modal before presenting the Stripe sheet to avoid native Modal conflicts
      setShowRentModal(false);
      setRenting(true);
      try {
        const amount =
          rentType === "DAILY" ? house.pricePerDay : house.pricePerMonth;

        // 1. Create PaymentIntent
        const stripePayload = {
          customerEmail: user.email || "guest@example.com",
          customerName: user.username || "Guest",
          items: [{ price: Math.round(amount * 100) }],
        };
        console.log("STRIPE PAYLOAD:", JSON.stringify(stripePayload));

        const response = await fetch(
          `${BASE_URL}/api/stripe/checkout/integrated`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stripePayload),
          },
        );
        if (!response.ok) throw new Error(`Server error (${response.status})`);
        const clientSecret = await response.text();
        if (!clientSecret || clientSecret.length < 10)
          throw new Error("Invalid payment session.");

        // 2. Init the payment sheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: "RentHouse",
          returnURL: "renthouselb://stripe-redirect",
        });
        if (initError) throw new Error(initError.message);

        // 3. Present the payment sheet — Stripe native UI takes over here
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== "Canceled") {
            Alert.alert("Payment Failed", presentError.message);
          }
          return;
        }

        // 4. Payment confirmed — create the rental record
        console.log("RENT PAYLOAD (card):", JSON.stringify(rentPayload));
        const rentRes = await rentService.create(rentPayload);
        console.log("RENT RESPONSE:", JSON.stringify(rentRes.data));
        Alert.alert(
          "Success",
          offer?.hasOffer
            ? `Payment successful! Property rented. ${offer.discountPercentage}% discount was applied.`
            : "Payment successful! Property rented.",
        );
        setRentAvailability({
          endDate: formatDate(endDate),
          startDate: formatDate(startDate),
        });
      } catch (err: any) {
        console.log("RENT ERROR:", JSON.stringify(err.response?.data));
        if (err.response?.status === 409) {
          Alert.alert("Already Rented", "This property has already been rented. Please check back later.");
        } else if (err.response?.status === 400) {
          Alert.alert("Validation Error", err.response?.data?.message || "Invalid rental details.");
        } else {
          Alert.alert("Error", "Something went wrong. Please try again.");
        }
      } finally {
        setRenting(false);
      }
    } else {
      // CASH flow
      setRenting(true);
      try {
        console.log("RENT PAYLOAD (cash):", JSON.stringify(rentPayload));
        const rentRes = await rentService.create(rentPayload);
        console.log("RENT RESPONSE:", JSON.stringify(rentRes.data));
        Alert.alert(
          "Success",
          offer?.hasOffer
            ? `Property rented successfully! ${offer.discountPercentage}% discount was applied.`
            : "Property rented successfully!",
        );
        setShowRentModal(false);
        setRentAvailability({
          endDate: formatDate(endDate),
          startDate: formatDate(startDate),
        });
      } catch (err: any) {
        console.log("RENT ERROR:", JSON.stringify(err.response?.data));
        if (err.response?.status === 409) {
          setShowRentModal(false);
          Alert.alert("Already Rented", "This property has already been rented. Please check back later.");
        } else if (err.response?.status === 400) {
          Alert.alert("Validation Error", err.response?.data?.message || "Invalid rental details.");
        } else {
          Alert.alert("Error", "Something went wrong. Please try again.");
        }
      } finally {
        setRenting(false);
      }
    }
  };

  const handleSubmitRating = async () => {
    if (!user) return;
    setSubmittingRating(true);
    try {
      await ratingService.add(user.id, house.id, ratingValue, ratingComment);
      Alert.alert("Success", "Rating submitted!");
      setShowRatingModal(false);
      const res = await ratingService.getByHouse(house.id);
      setRatings(res.data);
    } catch {
      Alert.alert("Error", "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce(
            (sum, r) => sum + (r.stars ?? r.rating ?? r.score ?? 0),
            0,
          ) / ratings.length
        ).toFixed(1)
      : null;

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#2C3E50"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  }

  if (!house) return null;

  const rawImage = house.image;
  const imageUri = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${BASE_URL}${rawImage}`
    : "https://ui-avatars.com/api/?name=House&background=random";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Image */}
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Favorite Button */}
        <TouchableOpacity style={styles.heartBtn} onPress={toggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={26}
            color={isFavorite ? "#e74c3c" : "#fff"}
          />
        </TouchableOpacity>

        {/* Rented banner — below image, above title */}
        {isRented && (
          <View style={styles.rentedBanner}>
            <Text style={styles.rentedBannerIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rentedBannerTitle}>Currently Rented</Text>
              {availableAfter ? (
                <Text style={styles.rentedBannerSub}>
                  Available after {availableAfter}
                </Text>
              ) : (
                <Text style={styles.rentedBannerSub}>
                  Check back later for availability
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Title & Status */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{house.title}</Text>
            {isRented && (
              <View style={styles.rentedBadge}>
                <Text style={styles.rentedText}>Rented</Text>
              </View>
            )}
          </View>
          {isRented && availableAfter && (
            <View style={styles.availabilityRow}>
              <Ionicons name="time-outline" size={14} color="#e67e22" />
              <Text style={styles.availabilityText}>
                Available after {availableAfter}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Ionicons name="location-outline" size={15} color="#7f8c8d" />
            <Text style={styles.location}>{house.location}</Text>
          </View>

          {/* Rating */}
          {avgRating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#f1c40f" />
              <Text style={styles.ratingText}>
                {avgRating} ({ratings.length} reviews)
              </Text>
            </View>
          )}

          {/* Specs */}
          <View style={styles.specsRow}>
            <View style={styles.spec}>
              <Ionicons name="bed-outline" size={20} color="#2C3E50" />
              <Text style={styles.specValue}>{house.nbOfBedrooms}</Text>
              <Text style={styles.specLabel}>Beds</Text>
            </View>
            <View style={styles.spec}>
              <Ionicons name="home-outline" size={20} color="#2C3E50" />
              <Text style={styles.specValue}>{house.propertyType}</Text>
              <Text style={styles.specLabel}>Type</Text>
            </View>
            <View style={styles.spec}>
              <Ionicons name="cash-outline" size={20} color="#2C3E50" />
              <Text style={styles.specValue}>${house.pricePerMonth}</Text>
              <Text style={styles.specLabel}>/month</Text>
            </View>
          </View>

          {/* Offer / discount banner — shown below price when applicable */}
          {offer?.hasOffer && (
            <View style={styles.offerBanner}>
              <Text style={styles.offerBannerText}>
                🎁 {offer.discountPercentage}% OFF applied — Special offer
              </Text>
              <View style={styles.offerPriceRow}>
                <Text style={styles.offerOriginalPrice}>
                  ${house.pricePerMonth}/mo
                </Text>
                <Text style={styles.offerDiscountedPrice}>
                  ${Math.round(house.pricePerMonth * (1 - offer.discountPercentage / 100))}/mo
                </Text>
              </View>
            </View>
          )}

          {/* Virtual Tour */}
          {virtualTourExists && (
            <TouchableOpacity
              style={styles.tourBtn}
              onPress={() =>
                router.push({
                  pathname: "/virtual-tour/[id]",
                  params: {
                    id: house.id,
                    tourUrl: virtualTourUrl ?? "",
                    propertyName: house.title ?? "",
                    location: house.location ?? "",
                  },
                } as any)
              }
            >
              <Text style={styles.tourBtnText}>🏠 Virtual Tour</Text>
            </TouchableOpacity>
          )}

          {/* Map Buttons */}
          {(house.latitude || house.longitude || house.location) && (
            <View style={styles.mapBtnRow}>
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => {
                  const url =
                    house.latitude && house.longitude
                      ? `https://www.google.com/maps/search/?api=1&query=${parseFloat(house.latitude)},${parseFloat(house.longitude)}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(house.location)}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.mapBtnText}>View on Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapBtn, styles.mapBtnSecondary]}
                onPress={() => {
                  const dest =
                    house.latitude && house.longitude
                      ? `${parseFloat(house.latitude)},${parseFloat(house.longitude)}`
                      : encodeURIComponent(house.location);
                  Linking.openURL(`https://www.google.com/maps/dir//${dest}`);
                }}
              >
                <Ionicons name="navigate" size={16} color="#2C3E50" />
                <Text style={styles.mapBtnSecondaryText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          {house.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{house.description}</Text>
            </View>
          )}

          {/* Owner Info */}
          {house.owner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner</Text>
              <View style={styles.ownerCard}>
                <Ionicons
                  name="person-circle-outline"
                  size={40}
                  color="#2C3E50"
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.ownerName}>{house.owner.name}</Text>
                  <Text style={styles.ownerContact}>{house.owner.phone}</Text>
                  {house.owner.email ? (
                    <Text style={styles.ownerContact}>{house.owner.email}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {!isAdmin && !isOwner && (
                <TouchableOpacity onPress={() => setShowRatingModal(true)}>
                  <Text style={styles.addReview}>+ Add Review</Text>
                </TouchableOpacity>
              )}
            </View>
            {ratings.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet</Text>
            ) : (
              ratings.slice(0, 3).map((r: any) => {
                // field-name fallbacks — backend returns 'stars' and 'comment'
                const rStars = r.stars ?? r.rating ?? r.score ?? 0;
                const rComment =
                  r.comment ?? r.description ?? r.review ?? r.text;
                const rawDate = r.createdAt ?? r.date ?? r.reviewDate;
                const rDate = rawDate
                  ? (() => {
                      const d = new Date(rawDate);
                      return isNaN(d.getTime())
                        ? null
                        : d.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                    })()
                  : null;
                return (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewUser}>
                        {r.user?.username || "User"}
                      </Text>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name="star"
                            size={12}
                            color={s <= rStars ? "#f1c40f" : "#dfe6e9"}
                          />
                        ))}
                      </View>
                    </View>
                    {rComment ? (
                      <Text style={styles.reviewComment}>{rComment}</Text>
                    ) : null}
                    {rDate ? (
                      <Text style={styles.reviewDate}>{rDate}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isAdmin ? (
            <>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push(`/admin/edit-house/${id}`)}
              >
                <Ionicons name="pencil" size={20} color="#fff" />
                <Text style={styles.editBtnText}>Edit Property</Text>
              </TouchableOpacity>
            </>
          ) : !isOwner ? (
            <>
              <TouchableOpacity
                style={styles.scheduleBtn}
                onPress={() => router.push(`/schedule/${id}`)}
              >
                <Ionicons name="calendar-outline" size={20} color="#2C3E50" />
                <Text style={styles.scheduleBtnText}>Schedule Visit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rentBtn, isRented && styles.rentBtnDisabled]}
                onPress={() => !isRented && setShowRentModal(true)}
                disabled={isRented}
              >
                <Text style={styles.rentBtnText}>
                  {isRented ? "Not Available" : "Rent Now"}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Rent Modal */}
        <Modal visible={showRentModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rent Property</Text>
                <TouchableOpacity onPress={() => setShowRentModal(false)}>
                  <Ionicons name="close" size={24} color="#2C3E50" />
                </TouchableOpacity>
              </View>

              <Text style={styles.filterLabel}>Rent Type</Text>
              <View style={styles.rentTypeRow}>
                {(["MONTHLY", "DAILY"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.rentTypeBtn,
                      rentType === type && styles.rentTypeBtnActive,
                    ]}
                    onPress={() => setRentType(type)}
                  >
                    <Text
                      style={[
                        styles.rentTypeBtnText,
                        rentType === type && styles.rentTypeBtnTextActive,
                      ]}
                    >
                      {type === "MONTHLY"
                        ? offer?.hasOffer
                          ? `Monthly - $${Math.round(house.pricePerMonth * (1 - offer.discountPercentage / 100))}/mo`
                          : `Monthly - $${house.pricePerMonth}/mo`
                        : offer?.hasOffer && house.pricePerDay != null
                          ? `Daily - $${Math.round(house.pricePerDay * (1 - offer.discountPercentage / 100))}/day`
                          : `Daily - $${house.pricePerDay}/day`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={openStartDatePicker}
              >
                <Ionicons name="calendar-outline" size={16} color="#2C3E50" />
                <Text style={styles.datePickerText}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>

              <Text style={styles.filterLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={openEndDatePicker}
              >
                <Ionicons name="calendar-outline" size={16} color="#2C3E50" />
                <Text style={styles.datePickerText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Payment Method</Text>
              <View style={styles.rentTypeRow}>
                {(["CASH", "CARD"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.rentTypeBtn,
                      paymentMethod === method && styles.rentTypeBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={
                          method === "CASH" ? "cash-outline" : "card-outline"
                        }
                        size={16}
                        color={paymentMethod === method ? "#fff" : "#2C3E50"}
                      />
                      <Text
                        style={[
                          styles.rentTypeBtnText,
                          paymentMethod === method &&
                            styles.rentTypeBtnTextActive,
                        ]}
                      >
                        {method}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod === "CARD" && (
                <View style={styles.stripeInfoBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={15}
                    color="#27ae60"
                  />
                  <Text style={styles.stripeInfoText}>
                    You&apos;ll be taken to a secure Stripe payment page to
                    enter your card details.
                  </Text>
                </View>
              )}

              {/* Total amount — updates live as dates or rent type change */}
              {(() => {
                const msPerDay = 1000 * 60 * 60 * 24;
                const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay));
                const months = Math.max(1, Math.round(days / 30));
                const basePrice =
                  rentType === "MONTHLY"
                    ? (offer?.hasOffer
                        ? Math.round(house.pricePerMonth * (1 - offer.discountPercentage / 100))
                        : house.pricePerMonth)
                    : (offer?.hasOffer
                        ? Math.round(house.pricePerDay * (1 - offer.discountPercentage / 100))
                        : house.pricePerDay);
                const total = rentType === "MONTHLY" ? basePrice * months : basePrice * days;
                return (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${total}</Text>
                  </View>
                );
              })()}

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRent}
                disabled={renting}
              >
                {renting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {paymentMethod === "CARD"
                      ? "Pay with Card"
                      : "Confirm Rental"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Rating Modal — hidden for admin and owner */}
        {!isAdmin && !isOwner && (
          <Modal visible={showRatingModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Leave a Review</Text>
                  <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                    <Ionicons name="close" size={24} color="#2C3E50" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.filterLabel}>Rating</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setRatingValue(s)}>
                      <Ionicons
                        name="star"
                        size={36}
                        color={s <= ratingValue ? "#f1c40f" : "#dfe6e9"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.filterLabel}>Comment (optional)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80 }]}
                  placeholder="Share your experience..."
                  placeholderTextColor="#999999"
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                />

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>

      {/* Date pickers live outside the ScrollView (and outside the rent Modal)
          so only one React Native Modal is ever active at a time on iOS.
          The rent modal is dismissed before the picker opens and restored after. */}
      <CustomDatePicker
        isVisible={showStartDatePicker}
        minimumDate={new Date()}
        currentDate={startDate}
        onConfirm={(selectedDate) => {
          setStartDate(selectedDate);
          setShowStartDatePicker(false);
          setTimeout(() => setShowRentModal(true), 300);
        }}
        onCancel={() => {
          setShowStartDatePicker(false);
          setTimeout(() => setShowRentModal(true), 300);
        }}
      />

      <CustomDatePicker
        isVisible={showEndDatePicker}
        minimumDate={startDate}
        currentDate={endDate}
        onConfirm={(selectedDate) => {
          setEndDate(selectedDate);
          setShowEndDatePicker(false);
          setTimeout(() => setShowRentModal(true), 300);
        }}
        onCancel={() => {
          setShowEndDatePicker(false);
          setTimeout(() => setShowRentModal(true), 300);
        }}
      />

      {/* Loading overlay shown while fetching clientSecret and initialising the payment sheet */}
      {renting && !showRentModal && (
        <View style={styles.paymentLoadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.paymentLoadingText}>
            Preparing secure payment...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  image: { width: "100%", height: 260 },
  imagePlaceholder: {
    width: "100%",
    height: 260,
    backgroundColor: "#ecf0f1",
    justifyContent: "center",
    alignItems: "center",
  },
  heartBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 24,
    padding: 8,
  },
  content: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontFamily: FONTS.heading, color: "#2C3E50", flex: 1 },
  rentedBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  rentedText: { color: "#fff", fontSize: 12, fontFamily: FONTS.semiBold },
  rentedBanner: {
    backgroundColor: "#FFF3CD",
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rentedBannerIcon: { fontSize: 20 },
  rentedBannerTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#856404",
  },
  rentedBannerSub: {
    fontSize: 12,
    color: "#856404",
    marginTop: 2,
    fontFamily: FONTS.body,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  availabilityText: { fontSize: 13, color: "#e67e22", fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  location: { fontSize: 14, color: "#7f8c8d", fontFamily: FONTS.body },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  ratingText: { fontSize: 14, color: "#2C3E50", fontFamily: FONTS.body },
  specsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  spec: { alignItems: "center", gap: 4 },
  specValue: { fontSize: 15, fontFamily: FONTS.semiBold, color: "#2C3E50" },
  specLabel: { fontSize: 11, color: "#7f8c8d", fontFamily: FONTS.body },
  tourBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  tourBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 15 },
  mapBtnRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  mapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2C3E50",
    borderRadius: 10,
    paddingVertical: 12,
  },
  mapBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 13 },
  mapBtnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#2C3E50",
  },
  mapBtnSecondaryText: {
    color: "#2C3E50",
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: "#2C3E50",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#636e72",
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ownerName: { fontSize: 15, fontFamily: FONTS.semiBold, color: "#2C3E50" },
  ownerContact: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 2,
    fontFamily: FONTS.body,
  },
  addReview: { color: "#3498db", fontSize: 14 },
  noReviews: { color: "#7f8c8d", fontSize: 14 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  reviewUser: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#2C3E50" },
  stars: { flexDirection: "row", gap: 2 },
  reviewComment: {
    fontSize: 14,
    color: "#444444",
    marginTop: 4,
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  reviewDate: {
    fontSize: 11,
    color: "#95a5a6",
    marginTop: 3,
    fontFamily: FONTS.body,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2C3E50",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  scheduleBtnText: {
    color: "#2C3E50",
    fontFamily: FONTS.semiBold,
    fontSize: 15,
  },
  rentBtn: {
    flex: 1.5,
    backgroundColor: "#2C3E50",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rentBtnDisabled: { backgroundColor: "#bdc3c7" },
  rentBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 15 },
  editBtn: {
    flex: 1.5,
    flexDirection: "row",
    backgroundColor: "#3498db",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: FONTS.heading, color: "#2C3E50" },
  filterLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#2C3E50",
    marginBottom: 8,
  },
  rentTypeRow: { gap: 10, marginBottom: 16 },
  rentTypeBtn: {
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  rentTypeBtnActive: { backgroundColor: "#2C3E50", borderColor: "#2C3E50" },
  rentTypeBtnText: { color: "#2C3E50", fontSize: 14, textAlign: "center" },
  rentTypeBtnTextActive: { color: "#fff" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
    color: "#2C3E50",
  },
  stripeInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0faf4",
    borderWidth: 1,
    borderColor: "#b2dfdb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  stripeInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#2e7d55",
    lineHeight: 18,
  },
  confirmBtn: {
    backgroundColor: "#2C3E50",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 16 },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
  },
  datePickerText: { fontSize: 15, color: "#2C3E50" },
  paymentLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(44,62,80,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  paymentLoadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Offer / discount banner ────────────────────────────────────
  offerBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  offerBannerText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: "#16a34a",
    marginBottom: 6,
  },
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offerOriginalPrice: {
    fontSize: 14,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    fontFamily: FONTS.body,
  },
  offerDiscountedPrice: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: "#16a34a",
  },

  // ── Rent modal total row ────────────────────────────────────────
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  totalLabel: { fontSize: 15, fontFamily: FONTS.semiBold, color: "#2C3E50" },
  totalValue: { fontSize: 18, fontFamily: FONTS.heading, color: "#2C3E50" },
});
