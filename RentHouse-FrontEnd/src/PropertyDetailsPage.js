import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import "./PropertyDetails.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCalendarDay, FaCalendarAlt, FaHeart, FaRegHeart, FaMapMarkerAlt, FaDirections, FaVrCardboard, FaImage } from "react-icons/fa";
import VirtualTourViewer from "./VirtualTourViewer";
import API from "./api";
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
      '::placeholder': {
        color: '#94a3b8',
      },
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
  // NEW: toggle state for hero view
  const [heroView, setHeroView] = useState("photo"); // "photo" | "tour"
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId || !id) return;

    // eslint-disable-next-line no-undef
    API.get(`/api/offers/user/${userId}/applicable/${id}`)
      .then((res) => {
        if (res.data?.hasOffer) {
          setOffer(res.data.discountPercentage);
        } else {
          setOffer(null);
        }
      })
      .catch(() => setOffer(null));
  }, [id]);
  const applyDiscount = (price) => {
    if (!offer) return price;
    return price * (1 - offer / 100);
  };

  useEffect(() => {
    if (!id) return;
    const fetchTourUrl = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/houses/${id}/virtual-tour-url`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.virtualTourUrl) {
          setVirtualTourUrl(`http://localhost:5000/api/houses/${id}/virtual-tour-image`);
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
      const res = await fetch(`http://localhost:5000/api/rents/is-rented/${id}`);
      if (!res.ok) { setCurrentRent(null); setIsAvailable(true); return; }
      const data = await res.json();
      if (data.available === true) { setIsAvailable(true); setCurrentRent(null); return; }
      const startRaw = data.startDate;
      const endRaw = data.endDate;
      if (startRaw && endRaw) {
        if (isActiveLease(startRaw, endRaw)) {
          setCurrentRent({ ...data, startDate: parseSpringDate(startRaw), endDate: parseSpringDate(endRaw) });
          setIsAvailable(false);
        } else { setCurrentRent(null); setIsAvailable(true); }
      } else { setCurrentRent(null); setIsAvailable(true); }
    } catch (err) {
      console.error("refetchRentStatus error:", err);
      setCurrentRent(null); setIsAvailable(true);
    }
  }, [id]);

  useEffect(() => { refetchRentStatus(); }, [refetchRentStatus]);

  useEffect(() => {
    const fetchRents = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rents/house/${id}`);
        setRents(await res.json());
      } catch (err) { console.error("Error fetching rents:", err); }
    };
    fetchRents();
  }, [id]);

  const isUnavailable = !isAvailable && currentRent != null;
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
          `http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
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
        const res = await fetch("http://localhost:5000/api/stripe/checkout/integrated", {
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
            `http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
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
            await fetch(`http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${savedStart}&endDate=${savedEnd}`, { method: "POST" });
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
      const res = await fetch(`http://localhost:5000/api/ratings/house/${id}`);
      setRatings(await res.json());
    } catch { console.error("Error fetching ratings"); }
  };

  const submitRating = async () => {
    if (!userId) { setModalMessage("You must be logged in to rate."); setShowLoginModal(true); return; }
    try {
      await fetch(`http://localhost:5000/api/ratings/add?userId=${userId}&houseId=${id}&stars=${rating}&comment=${comment}`, { method: "POST" });
      setRating(0); setComment(""); fetchRatings();
      setShowThankYou(true); setTimeout(() => setShowThankYou(false), 3000);
    } catch { console.error("Error submitting rating"); }
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/houses/${id}`);
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
        const res = await fetch(`http://localhost:5000/api/favorites/user/${userId}`);
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

  const toggleFavorite = async () => {
    if (!userId) { setModalMessage("You must be logged in to manage favorites."); setShowLoginModal(true); return; }
    if (!property) return;
    try {
      if (isFavorite) {
        await fetch(`http://localhost:5000/api/favorites/remove?userId=${userId}&propertyId=${property.id}`, { method: "DELETE" });
        setIsFavorite(false);
      } else {
        await fetch(`http://localhost:5000/api/favorites/add?userId=${userId}&propertyId=${property.id}`, { method: "POST" });
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

        {/* ── HERO SECTION with inline toggle ── */}
        <div className="image-section">

          {/* Photo view */}
          <div className={`hero-photo ${heroView === "photo" ? "hero-active" : "hero-hidden"}`}>
            <img
              src={property.image.startsWith("http") ? property.image : `http://localhost:5000/uploads/${property.image}`}
              alt={property.location}
              className="property-image"
            />
          </div>

          {/* 360 tour view */}
          {virtualTourUrl && (
            <div className={`hero-tour ${heroView === "tour" ? "hero-active" : "hero-hidden"}`}>
              <VirtualTourViewer
                tourUrl={virtualTourUrl}
                location={property.location}
              />
            </div>
          )}

          {/* Overlay controls: favorite + view toggle */}
          <div className="hero-controls">
            {/* View toggle pill — only shown when tour exists */}
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

            {/* Favorite button */}
            {userRole !== "ADMIN" && (
              <button className="favorite-btn" onClick={toggleFavorite}>
                {isFavorite ? <FaHeart /> : <FaRegHeart />}
              </button>
            )}
          </div>

          {/* Status badge overlaid on image */}
          <div className="hero-status-badge">
            <span className={`status ${isAvailable ? "available" : "rented"}`}>
              {isAvailable ? "Available" : "Rented"}
            </span>
          </div>
        </div>

        <div className="property-content">
          <div className="property-header">
            <div>
              <h1 className="property-location">{property.location}</h1>
              <div className="property-info">
                <span>{property.propertyType}</span>
                <span>•</span>
                <span>{property.nbOfBedrooms} Bedrooms</span>
              </div>
              {isUnavailable && currentRent?.endDate && (
                <div className="availability-msg">
                  {currentRent.startDate > todayStr()
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
              <div className="property-pricing">
                <div className="price-day">
                  {offer ? (
                    <>
                      <span className="original-price">
                        ${property.pricePerDay}
                      </span>
                      <span className="discounted-price">
                        ${applyDiscount(property.pricePerDay).toFixed(0)}
                      </span>
                    </>
                  ) : (
                    <>${property.pricePerDay}</>
                  )}
                  <span className="price-unit">/day</span>
                </div>

                <div className="price-month">
                  {offer ? (
                    <>
                      <span className="original-price">
                        ${property.pricePerMonth}
                      </span>
                      <span className="discounted-price">
                        ${applyDiscount(property.pricePerMonth).toFixed(0)}
                      </span>
                    </>
                  ) : (
                    <>${property.pricePerMonth}</>
                  )}
                  <span className="price-unit">/month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="section location-section">
            <h2><FaMapMarkerAlt className="section-icon" /> Location</h2>
            <p className="location-address">{property.location}</p>
            <GoogleMapsButton latitude={property.latitude} longitude={property.longitude} location={property.location} />
          </div>

          <div className="section">
            <h2>About</h2>
            <p>{property.description || "A beautiful, spacious property in a prime location."}</p>
          </div>

          <div className="section owner-section">
            <h2>Owner Contact</h2>
            <div className="owner-details">
              <div className="owner-avatar">{property.owner?.name?.charAt(0) || "O"}</div>
              <div className="owner-info">
                <p><strong>{property.owner?.name}</strong></p>
                <p>{property.owner?.phone}</p>
                <p>{property.owner?.email}</p>
              </div>
            </div>
          </div>

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

          {userId && userRole !== "ADMIN" && (
            <div className="section booking-section">
              <h2>Book Your Stay</h2>

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
                          ${rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()}
                        </span>
                        <span className="amount" style={{ color: "#1a6e3c" }}>
                          ${applyDiscount(rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()).toFixed(0)}
                        </span>
                      </>
                    ) : (
                      <span className="amount">
                        ${rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()}
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
                  {/* <div className="payment-details">
                    ⚠️ <strong>Payment Issues?</strong> Disable ad blockers for this site.
                  </div> */}
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
            </div>
          )}

          <div className="visit-action">
            <button className="visit-btn" onClick={handleVisitRequest}>Schedule Visit</button>
          </div>

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