import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import "./PropertyDetails.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCalendarDay, FaCalendarAlt, FaHeart, FaRegHeart, FaMapMarkerAlt, FaDirections, FaVrCardboard, FaImage } from "react-icons/fa";
import VirtualTourViewer from "./VirtualTourViewer";
import API from "./api";
import AvailabilityCalendar from "./AvailabilityCalendar";

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK";

const validateStripeKey = (key) => {
  if (!key) return false;
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) return false;
  if (key.length < 50) return false;
  return true;
};

const isKeyValid = validateStripeKey(STRIPE_KEY);
const stripePromise = isKeyValid ? loadStripe(STRIPE_KEY) : null;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '18px',
      color: '#0f172a',
      fontFamily: "'Sora', system-ui, sans-serif",
      fontSmoothing: 'antialiased',
      lineHeight: '28px',
      '::placeholder': { color: '#94a3b8' },
      iconColor: '#64748b',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
  hidePostalCode: true,
};

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

// Straight-line distance in km, used only as a fallback when routing fails
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDuration = (totalMinutes) => {
  const mins = Math.round(totalMinutes);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
};

const formatDistanceKm = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const isActiveLease = (startRaw, endRaw) => {
  const today = todayStr();
  const end = parseSpringDate(endRaw);
  if (!end) return false;
  return today <= end;
};

const GoogleMapsButton = ({ latitude, longitude, location }) => {
  const handleViewOnMap = () => {
    let url;
    if (latitude && longitude) {
      url = `https://www.google.com/maps/search/?api=1&query=${parseFloat(latitude)},${parseFloat(longitude)}`;
    } else if (location) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    } else return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleGetDirections = () => {
    let destination;
    if (latitude && longitude) {
      destination = `${parseFloat(latitude)},${parseFloat(longitude)}`;
    } else if (location) {
      destination = encodeURIComponent(location);
    } else return;
    window.open(`https://www.google.com/maps/dir//${destination}`, "_blank", "noopener,noreferrer");
  };

  if (!latitude && !longitude && !location) return null;

  return (
    <div className="maps-btn-wrapper">
      <div className="maps-buttons-row">
        <button className="google-maps-btn view-btn" onClick={handleViewOnMap}>
          <FaMapMarkerAlt className="maps-icon" /> View on Map
        </button>
        <button className="google-maps-btn directions-btn" onClick={handleGetDirections}>
          <FaDirections className="maps-icon" /> Get Directions
        </button>
      </div>
      {latitude && longitude ? (
        <span className="coords-badge">📍 {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}</span>
      ) : (
        <span className="coords-badge no-coords">⚠️ Approximate — no GPS coordinates saved for this listing</span>
      )}
    </div>
  );
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="15" height="15" fill="#fff">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const PropertyDetailsContent = () => {
  const { allListings } = useAppState();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [visitRequestSent, setVisitRequestSent] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showFavoriteMessage, setShowFavoriteMessage] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isRented, setIsRented] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentSuccess, setRentSuccess] = useState(false);
  const [rentType, setRentType] = useState("perDay");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardError, setCardError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoadError, setStripeLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState([]);
  const [showThankYou, setShowThankYou] = useState(false);
  const [currentRent, setCurrentRent] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [rents, setRents] = useState([]);
  const [virtualTourUrl, setVirtualTourUrl] = useState(null);
  const [heroView, setHeroView] = useState("photo");
  const [offer, setOffer] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [etaInfo, setEtaInfo] = useState(null);   // { durationText, distanceText, mode: 'route' | 'approx' }
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState("");

  const currencyRates = { USD: 1, EUR: 0.92, GBP: 0.78 };

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId || !id) return;
    API.get(`/api/offers/user/${userId}/applicable/${id}`)
      .then((res) => {
        if (res.data?.hasOffer) setOffer(res.data.discountPercentage);
        else setOffer(null);
      })
      .catch(() => setOffer(null));
  }, [id]);

  const applyDiscount = (price) => {
    if (!offer) return price;
    return price * (1 - offer / 100);
  };

  const formatPrice = (price) => {
    const converted = price * currencyRates[currency];
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  useEffect(() => {
    if (!id) return;
    const fetchTourUrl = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}/virtual-tour-url`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.virtualTourUrl) {
          setVirtualTourUrl(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}/virtual-tour-image`);
        }
      } catch (err) {
        console.error("Failed to fetch virtual tour URL:", err);
      }
    };
    fetchTourUrl();
  }, [id]);

  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  const rentOptions = [
    { label: "Daily", value: "perDay", icon: <FaCalendarDay /> },
    { label: "Monthly", value: "perMonth", icon: <FaCalendarAlt /> },
  ];

  useEffect(() => {
    let timeout;
    if (!isKeyValid) { setStripeLoadError(true); setCardError("Invalid Stripe configuration."); return; }
    if (stripe && elements) { setStripeReady(true); setStripeLoadError(false); }
    else {
      timeout = setTimeout(() => {
        if (!stripe || !elements) { setStripeLoadError(true); setCardError("Payment system failed to load."); }
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [stripe, elements]);

  useEffect(() => { setUserRole(localStorage.getItem("userRole")); }, []);

  const refetchRentStatus = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/is-rented/${id}`);
      if (!res.ok) { setCurrentRent(null); setIsAvailable(true); return; }
      const data = await res.json();

      // Available now — but there may be an upcoming booking to show
      if (data.available === true) {
        setIsAvailable(true);
        if (data.nextBooking) {
          const s = parseSpringDate(data.nextBooking.startDate);
          const e = parseSpringDate(data.nextBooking.endDate);
          setCurrentRent({ startDate: s, endDate: e, future: true });
        } else {
          setCurrentRent(null);
        }
        return;
      }

      // Actively rented today
      const startRaw = data.startDate;
      const endRaw = data.endDate;
      if (startRaw && endRaw && isActiveLease(startRaw, endRaw)) {
        setCurrentRent({ ...data, startDate: parseSpringDate(startRaw), endDate: parseSpringDate(endRaw), future: false });
        setIsAvailable(false);
      } else {
        setCurrentRent(null);
        setIsAvailable(true);
      }
    } catch (err) {
      console.error("refetchRentStatus error:", err);
      setCurrentRent(null); setIsAvailable(true);
    }
  }, [id]);

  useEffect(() => { refetchRentStatus(); }, [refetchRentStatus]);

  useEffect(() => {
    const fetchRents = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/house/${id}`);
        setRents(await res.json());
      } catch (err) { console.error("Error fetching rents:", err); }
    };
    fetchRents();
  }, [id]);

  const isUnavailable = !isAvailable && currentRent != null && !currentRent.future;
  const unavailableMessage = isUnavailable && currentRent?.endDate
    ? currentRent.startDate > todayStr()
      ? `Booked from ${new Date(currentRent.startDate + "T12:00:00").toLocaleDateString()} — available after ${new Date(currentRent.endDate + "T12:00:00").toLocaleDateString()}`
      : `Unavailable until ${new Date(currentRent.endDate + "T12:00:00").toLocaleDateString()}`
    : "Currently rented";

  const handleRentHouse = async () => {
    const calculatedEndDate = rentType === "perMonth"
      ? new Date(new Date(startDate).getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : endDate;
    const rawTotal = rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent();
    const totalAmount = offer ? applyDiscount(rawTotal) : rawTotal;

    if (paymentMethod === "cash") {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
          { method: "POST" }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Renting failed");
        }
        setRentSuccess(true); setIsRented(true);
        setIsAvailable(false);
        setCurrentRent({ startDate, endDate: calculatedEndDate });
        setProperty((prev) => ({ ...prev, status: "rented" }));
        await refetchRentStatus();
      } catch (err) {
        alert(err.message || "Failed to complete rental. Please try again.");
      }
    } else if (paymentMethod === "credit") {
      setCardError("");
      try {
        setIsProcessingPayment(true);
        if (stripeLoadError) { const m = "Payment system unavailable."; setCardError(m); alert(m); return; }
        if (totalAmount < 0.50) { const m = "Min charge is $0.50."; setCardError(m); alert(m); return; }
        if (!stripe || !elements) { const m = "Payment loading, wait a moment."; setCardError(m); alert(m); return; }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) { const m = "Card info missing, refresh page."; setCardError(m); alert(m); return; }
        localStorage.setItem("stripeStartDate", startDate);
        localStorage.setItem("stripeEndDate", calculatedEndDate);
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/stripe/checkout/integrated`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: localStorage.getItem("email") || "guest@example.com",
            customerName: localStorage.getItem("username") || "Guest",
            items: [{ price: Math.round(totalAmount * 100) }],
          }),
        });
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const clientSecret = await res.text();
        if (!clientSecret || clientSecret.length < 10) throw new Error("Invalid payment session.");
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: localStorage.getItem("username") || "Guest",
              email: localStorage.getItem("email") || "guest@example.com",
            },
          },
        });
        if (result.error) {
          const errorMessages = {
            'card_declined': "Your card was declined.",
            'incorrect_cvc': "Incorrect CVC.",
            'expired_card': "Card expired.",
            'insufficient_funds': "Insufficient funds.",
            'incomplete_number': "Incomplete card number.",
            'incomplete_cvc': "Incomplete CVC.",
            'incomplete_expiry': "Incomplete expiry date.",
          };
          const msg = errorMessages[result.error.code] || result.error.message;
          setCardError(msg); alert("Payment failed: " + msg);
        } else if (result.paymentIntent?.status === "succeeded") {
          const rentRes = await fetch(
            `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
            { method: "POST" }
          );
          if (!rentRes.ok) {
            alert("Payment succeeded but save failed. Contact support. ID: " + result.paymentIntent.id);
          } else {
            setRentSuccess(true); setIsRented(true);
            setIsAvailable(false);
            setCurrentRent({ startDate, endDate: calculatedEndDate });
            setProperty((prev) => ({ ...prev, status: "rented" }));
            setCardError(""); cardElement.clear();
            await refetchRentStatus();
          }
          localStorage.removeItem("stripeStartDate");
          localStorage.removeItem("stripeEndDate");
        }
      } catch (err) {
        setCardError(err.message || "Payment failed.");
        alert("Payment error: " + (err.message || "Please try again."));
      } finally { setIsProcessingPayment(false); }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const savedStart = localStorage.getItem("stripeStartDate");
      const savedEnd = localStorage.getItem("stripeEndDate");
      if (savedStart && savedEnd) {
        setStartDate(savedStart); setEndDate(savedEnd);
        (async () => {
          try {
            await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${savedStart}&endDate=${savedEnd}`, { method: "POST" });
            setRentSuccess(true); setIsRented(true);
            setIsAvailable(false);
            setCurrentRent({ startDate: savedStart, endDate: savedEnd });
            setProperty((prev) => ({ ...prev, status: "rented" }));
            localStorage.removeItem("stripeStartDate");
            localStorage.removeItem("stripeEndDate");
            window.history.replaceState({}, document.title, window.location.pathname);
            await refetchRentStatus();
          } catch { console.error("Error saving rent after Stripe payment"); }
        })();
      }
    }
  }, [id, userId, refetchRentStatus]);

  const fetchRatings = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/ratings/house/${id}`);
      setRatings(await res.json());
    } catch { console.error("Error fetching ratings"); }
  };

  const submitRating = async () => {
    if (!userId) { setModalMessage("You must be logged in to rate."); setShowLoginModal(true); return; }
    try {
      await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/ratings/add?userId=${userId}&houseId=${id}&stars=${rating}&comment=${comment}`, { method: "POST" });
      setRating(0); setComment(""); fetchRatings();
      setShowThankYou(true); setTimeout(() => setShowThankYou(false), 3000);
    } catch { console.error("Error submitting rating"); }
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        setProperty(await res.json());
      } catch (error) { console.error("Error fetching property:", error); }
    };
    fetchProperty(); fetchRatings();
  }, [id]);

  useEffect(() => {
    async function checkFavorite() {
      if (!property || !userId) { setIsFavorite(false); return; }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/favorites/user/${userId}`);
        if (!res.ok) throw new Error();
        const favorites = await res.json();
        setIsFavorite(Array.isArray(favorites) && favorites.some((fav) => fav.property.id === property.id));
      } catch { setIsFavorite(false); }
    }
    checkFavorite();
  }, [property, userId]);

  const handleVisitRequest = () => {
    if (!userId) { setModalMessage("You must be logged in to schedule a visit."); setShowLoginModal(true); return; }
    localStorage.setItem("visitHouseId", id);
    setVisitRequestSent(true);
    setTimeout(() => navigate("/schedule"), 1500);
  };

  const handleGetLiveETA = () => {
    setEtaError("");
    setEtaInfo(null);

    if (!property?.latitude || !property?.longitude) {
      setEtaError("This listing has no saved GPS coordinates, so ETA can't be calculated.");
      return;
    }
    if (!navigator.geolocation) {
      setEtaError("Geolocation isn't supported by your browser.");
      return;
    }

    setEtaLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: userLat, longitude: userLng } = position.coords;
        const houseLat = parseFloat(property.latitude);
        const houseLng = parseFloat(property.longitude);

        try {
          // Real road-based route, free, no API key needed
          const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${houseLng},${houseLat}?overview=false`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Routing service unavailable");
          const data = await res.json();

          if (data.code === "Ok" && data.routes?.length) {
            const route = data.routes[0];
            setEtaInfo({
              durationText: formatDuration(route.duration / 60),
              distanceText: formatDistanceKm(route.distance / 1000),
              mode: "route",
            });
          } else {
            throw new Error("No route found");
          }
        } catch (err) {
          // Fallback: straight-line distance, assume ~40 km/h average urban driving speed
          const distanceKm = haversineDistanceKm(userLat, userLng, houseLat, houseLng);
          setEtaInfo({
            durationText: formatDuration((distanceKm / 40) * 60),
            distanceText: formatDistanceKm(distanceKm),
            mode: "approx",
          });
        } finally {
          setEtaLoading(false);
        }
      },
      (error) => {
        setEtaLoading(false);
        const messages = {
          1: "Location permission denied. Please allow location access and try again.",
          2: "Your location couldn't be determined right now.",
          3: "Getting your location timed out. Please try again.",
        };
        setEtaError(messages[error.code] || "Failed to get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleFavorite = async () => {
    if (!userId) { setModalMessage("You must be logged in to manage favorites."); setShowLoginModal(true); return; }
    if (!property) return;
    try {
      if (isFavorite) {
        await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/favorites/remove?userId=${userId}&propertyId=${property.id}`, { method: "DELETE" });
        setIsFavorite(false);
      } else {
        await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/favorites/add?userId=${userId}&propertyId=${property.id}`, { method: "POST" });
        setIsFavorite(true); setShowFavoriteMessage(true);
        alert("❤️ Added to favorites! You'll be notified when this property becomes available.");
        setTimeout(() => setShowFavoriteMessage(false), 3000);
      }
    } catch { console.error("Failed to update favorite"); }
  };

  if (!property) return <div className="loading">Loading...</div>;

  const calculateTotalRent = () => {
    if (!startDate || !endDate || !property?.pricePerDay) return 0;
    const days = Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    return days * property.pricePerDay;
  };

  const handleStartDateChange = (e) => {
    const selectedStart = e.target.value;
    setStartDate(selectedStart);
    if (rentType === "perMonth") {
      const autoEnd = new Date(new Date(selectedStart).getTime() + 29 * 24 * 60 * 60 * 1000);
      setEndDate(autoEnd.toISOString().split("T")[0]);
    } else { setEndDate(""); }
  };

  return (
    <div className="property-page">
      <div className="property-container">

        {/* HERO SECTION */}
        <div className="image-section">
          <div className={`hero-photo ${heroView === "photo" ? "hero-active" : "hero-hidden"}`}>
            <img
              src={
                property.image && property.image.startsWith("http")
                  ? property.image
                  : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${property.id}/image`
              }
              alt={property.location}
              className="property-image"
            />
          </div>

          {virtualTourUrl && (
            <div className={`hero-tour ${heroView === "tour" ? "hero-active" : "hero-hidden"}`}>
              <VirtualTourViewer tourUrl={virtualTourUrl} location={property.location} />
            </div>
          )}

          <div className="hero-controls">
            {virtualTourUrl && (
              <div className="view-toggle-pill">
                <button
                  className={`toggle-option ${heroView === "photo" ? "toggle-active" : ""}`}
                  onClick={() => setHeroView("photo")}
                  aria-label="Show photo"
                >
                  <FaImage className="toggle-icon" />
                  <span>Photo</span>
                </button>
                <button
                  className={`toggle-option ${heroView === "tour" ? "toggle-active" : ""}`}
                  onClick={() => setHeroView("tour")}
                  aria-label="View 360° tour"
                >
                  <FaVrCardboard className="toggle-icon" />
                  <span>360° Tour</span>
                </button>
              </div>
            )}
            {userRole !== "ADMIN" && (
              <button className="favorite-btn" onClick={toggleFavorite}>
                {isFavorite ? <FaHeart /> : <FaRegHeart />}
              </button>
            )}
          </div>

          <div className="hero-status-badge">
            <span className={`status ${isAvailable ? "available" : "rented"}`}>
              {isAvailable ? "Available" : "Rented"}
            </span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="property-content">

          {/* Header */}
          <div className="property-header">
            <div>
              <h1 className="property-location">{property.location}</h1>
              <div className="property-info">
                <span>{property.propertyType}</span>
                <span>•</span>
                <span>{property.nbOfBedrooms} Bedrooms</span>
              </div>
              {currentRent?.endDate && (
                <div className={`availability-msg ${currentRent.future ? "availability-msg--future" : ""}`}>
                  {currentRent.future
                    ? `⚠️ Not available from ${new Date(currentRent.startDate + "T12:00:00").toLocaleDateString()} to ${new Date(currentRent.endDate + "T12:00:00").toLocaleDateString()} — free to book on other dates.`
                    : currentRent.startDate > todayStr()
                      ? `Booked ${new Date(currentRent.startDate + "T12:00:00").toLocaleDateString()} → Available after ${new Date(currentRent.endDate + "T12:00:00").toLocaleDateString()}`
                      : `Available after ${new Date(currentRent.endDate + "T12:00:00").toLocaleDateString()}`
                  }
                </div>
              )}
            </div>
            <div className="property-header-right">
              {userRole === "ADMIN" && (
                <button className="edit-btn" onClick={() => navigate(`/edit-house/${property.id}`)}>
                  <span className="edit-btn-icon">✏️</span>
                  <span>Edit Listing</span>
                </button>
              )}
              <div className="currency-toggle">
                {["USD", "EUR", "GBP"].map((curr) => (
                  <button
                    key={curr}
                    className={`currency-btn ${currency === curr ? "active" : ""}`}
                    onClick={() => setCurrency(curr)}
                  >
                    {curr}
                  </button>
                ))}
              </div>
              <div className="property-pricing">
                <div className="price-day">
                  {offer ? (
                    <>
                      <span className="original-price">{formatPrice(property.pricePerDay)}</span>
                      <span className="discounted-price">{formatPrice(applyDiscount(property.pricePerDay))}</span>
                    </>
                  ) : (
                    <>{formatPrice(property.pricePerDay)}</>
                  )}
                  <span className="price-unit">/day</span>
                </div>
                <div className="price-month">
                  {offer ? (
                    <>
                      <span className="original-price">{formatPrice(property.pricePerMonth)}</span>
                      <span className="discounted-price">{formatPrice(applyDiscount(property.pricePerMonth))}</span>
                    </>
                  ) : (
                    <>{formatPrice(property.pricePerMonth)}</>
                  )}
                  <span className="price-unit">/month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="section location-section">
            <h2><FaMapMarkerAlt className="section-icon" /> Location</h2>
            <p className="location-address">{property.location}</p>
            <GoogleMapsButton latitude={property.latitude} longitude={property.longitude} location={property.location} />
            <div className="eta-wrapper">
              <button className="eta-btn" onClick={handleGetLiveETA} disabled={etaLoading}>
                {etaLoading ? "📍 Locating..." : "📍 Get ETA from My Location"}
              </button>

              {etaError && <p className="eta-error">{etaError}</p>}

              {etaInfo && (
                <div className="eta-result">
                  <span className="eta-time">🕒 {etaInfo.durationText}</span>
                  <span className="eta-distance">({etaInfo.distanceText})</span>
                  {etaInfo.mode === "approx" && (
                    <span
                      className="eta-approx-tag"
                      title="No road data available — this is a straight-line estimate"
                    >
                      ~ estimate
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="section">
            <h2>About</h2>
            <p>{property.description || "A beautiful, spacious property in a prime location."}</p>
          </div>

          {/* Owner Contact */}
          <div className="section owner-section">
            <h2>Owner Contact</h2>
            <div className="owner-details">
              <div className="owner-avatar">{property.owner?.name?.charAt(0) || "O"}</div>
              <div className="owner-info">
                <p><strong>{property.owner?.name}</strong></p>
                <div className="owner-contact-row">
                  <span className="owner-phone-text">{property.owner?.phone}</span>
                  {property.owner?.phone && (
                    <a
                      href={`https://wa.me/${property.owner.phone.replace(/\D/g, "")}?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20your%20property%20at%20${encodeURIComponent(property.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-btn"
                    >
                      <WhatsAppIcon />
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
                <p>{property.owner?.email}</p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          {ratings.length > 0 && (
            <div className="section">
              <h2>Reviews</h2>
              <div className="reviews">
                {ratings.map((r, idx) => (
                  <div key={idx} className="review">
                    <div className="review-stars">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
                    {r.comment && <p>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking */}
          {userId && userRole !== "ADMIN" && (
            <div className="section booking-section">
              <h2>Book Your Stay</h2>

              <AvailabilityCalendar houseId={id} />

              <div className="rent-type">
                {rentOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`type-btn ${rentType === option.value ? "active" : ""}`}
                    onClick={() => setRentType(option.value)}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>

              <div className="dates">
                <div className="date-field">
                  <label>Start Date</label>
                  <input type="date" value={startDate} onChange={handleStartDateChange} />
                </div>
                {rentType === "perDay" && (
                  <div className="date-field">
                    <label>End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                )}
              </div>

              {((rentType === "perDay" && startDate && endDate) || (rentType === "perMonth" && startDate)) && (
                <div className="total-price">
                  <span>Total</span>
                  <div className="total-amount-block">
                    {offer ? (
                      <>
                        <span className="original-price" style={{ color: "#aaa", textDecoration: "line-through", marginRight: "6px" }}>
                          {formatPrice(rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent())}
                        </span>
                        <span className="amount" style={{ color: "#1a6e3c" }}>
                          {formatPrice(applyDiscount(rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()))}
                        </span>
                      </>
                    ) : (
                      <span className="amount">
                        {formatPrice(rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent())}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="payment-methods">
                <button className={`payment-btn ${paymentMethod === "cash" ? "active" : ""}`} onClick={() => setPaymentMethod("cash")}>
                  💵 Cash
                </button>
                <button
                  className={`payment-btn ${paymentMethod === "credit" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("credit")}
                  disabled={!stripeReady && !stripeLoadError}
                >
                  💳 Card {!stripeReady && !stripeLoadError && "(Loading...)"}
                </button>
              </div>

              {paymentMethod === "credit" && (
                <div className="card-details">
                  <label>Card Information</label>
                  {!stripeReady && !stripeLoadError && (
                    <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '10px' }}>⏳ Loading Stripe...</div>
                  )}
                  {stripeLoadError && (
                    <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '10px' }}>❌ Payment failed to load. Use cash or refresh.</div>
                  )}
                  <div className="card-element-wrapper"><CardElement options={CARD_ELEMENT_OPTIONS} /></div>
                  {cardError && (
                    <div style={{ color: '#e74c3c', fontSize: '14px', marginTop: '8px', padding: '8px', backgroundColor: '#ffebee', borderRadius: '4px', whiteSpace: 'pre-line' }}>
                      ⚠️ {cardError}
                    </div>
                  )}
                </div>
              )}

              <div className="booking-actions">
                <div title={isUnavailable ? unavailableMessage : ""}>
                  <button
                    className="book-btn"
                    onClick={handleRentHouse}
                    disabled={
                      (rentType === "perDay" && (!startDate || !endDate)) ||
                      (rentType === "perMonth" && !startDate) ||
                      isUnavailable || isProcessingPayment ||
                      (paymentMethod === "credit" && (!stripeReady || stripeLoadError))
                    }
                  >
                    {isUnavailable ? "Unavailable" : isProcessingPayment ? "Processing..." : (paymentMethod === "credit" && !stripeReady) ? "Loading..." : "Confirm Booking"}
                  </button>
                </div>
              </div>

              {rentSuccess && <div className="success-msg">✓ Booking confirmed!</div>}
              {showFavoriteMessage && <div className="success-msg">♥ Added to favorites!</div>}

              {rentSuccess && (
                <div className="rating-form">
                  <h3>Rate this property</h3>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`star ${rating >= s ? "active" : ""}`} onClick={() => setRating(s)}>★</span>
                    ))}
                  </div>
                  <textarea placeholder="Your thoughts..." value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button onClick={submitRating}>Submit</button>
                  {showThankYou && <div className="thank-you">Thanks for your review!</div>}
                </div>
              )}

              <div className="visit-action">
                <button className="visit-btn" onClick={handleVisitRequest}>Schedule Visit</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showLoginModal && (
        <div className="modal" onClick={() => setShowLoginModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Login Required</h3>
            <p>{modalMessage}</p>
            <div className="modal-buttons">
              <button onClick={() => navigate("/about")}>Sign In</button>
              <button onClick={() => setShowLoginModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PropertyDetailsPage = () => {
  if (!isKeyValid || !stripePromise) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c' }}>⚠️ Payment System Configuration Error</h2>
        <p>The Stripe payment key is invalid or missing. Cash payments still available.</p>
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise}>
      <PropertyDetailsContent />
    </Elements>
  );
};

export default PropertyDetailsPage;