import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import "./PropertyDetails.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCalendarDay, FaCalendarAlt, FaHeart, FaRegHeart } from "react-icons/fa";


const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK";


const validateStripeKey = (key) => {
  if (!key) {
    console.error('❌ Stripe key is missing!');
    return false;
  }
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
    console.error('❌ Invalid Stripe key format! Must start with pk_test_ or pk_live_');
    console.error('Current key:', key.substring(0, 15) + '...');
    return false;
  }
  if (key.length < 50) {
    console.error('❌ Stripe key appears too short (likely invalid)');
    return false;
  }
  console.log('✅ Stripe key validated:', key.substring(0, 15) + '...');
  return true;
};

const isKeyValid = validateStripeKey(STRIPE_KEY);
const stripePromise = isKeyValid ? loadStripe(STRIPE_KEY) : null;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#495057',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#adb5bd',
      },
      iconColor: '#666',
    },
    invalid: {
      color: '#e74c3c',
      iconColor: '#e74c3c',
    },
  },
  hidePostalCode: true,
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
  const [skipCheckRented, setSkipCheckRented] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardError, setCardError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoadError, setStripeLoadError] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  const rentOptions = [
    { label: "Daily", value: "perDay", icon: <FaCalendarDay /> },
    { label: "Monthly", value: "perMonth", icon: <FaCalendarAlt /> },
  ];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState([]);
  const [showThankYou, setShowThankYou] = useState(false);
  const [currentRent, setCurrentRent] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [rents, setRents] = useState([]);

  // Monitor Stripe.js loading with timeout
  useEffect(() => {
    let timeout;

    if (!isKeyValid) {
      setStripeLoadError(true);
      setCardError("Invalid Stripe configuration. Please contact support.");
      return;
    }

    if (stripe && elements) {
      console.log("✅ Stripe.js loaded successfully");
      setStripeReady(true);
      setStripeLoadError(false);
    } else {
      console.log("⏳ Waiting for Stripe.js to load...");

      // Set a timeout to detect if Stripe fails to load
      timeout = setTimeout(() => {
        if (!stripe || !elements) {
          console.error("❌ Stripe.js failed to load within 10 seconds");
          setStripeLoadError(true);
          setCardError("Payment system failed to load. Please check your internet connection or try again later.");
        }
      }, 10000); // 10 second timeout
    }

    return () => clearTimeout(timeout);
  }, [stripe, elements]);

  // Fetch all rents for this property
  useEffect(() => {
    const fetchRents = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rents/house/${id}`);
        const data = await res.json();
        setRents(data);
      } catch (err) {
        console.error("Error fetching rents:", err);
      }
    };
    fetchRents();
  }, [id]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  useEffect(() => {
    const checkIfRented = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rents/is-rented/${id}`);

        if (!res.ok) {
          console.error("Failed to fetch rent status");
          setCurrentRent(null);
          setIsAvailable(true);
          return;
        }

        const data = await res.json();

        if (data.available === true) {
          setIsAvailable(true);
          setCurrentRent(null);
          console.log("✅ Property is available for rent");
        } else if (data.startDate && data.endDate) {
          const now = new Date();
          const start = new Date(data.startDate);
          const end = new Date(data.endDate);

          if (now >= start && now <= end) {
            setCurrentRent(data);
            setIsAvailable(false);
            console.log("🔒 Property is currently rented until:", data.endDate);
          } else {
            setCurrentRent(null);
            setIsAvailable(true);
            console.log("✅ Property rent has ended, now available");
          }
        } else {
          setIsAvailable(true);
          setCurrentRent(null);
        }
      } catch (err) {
        console.error("Error checking rent status:", err);
        setCurrentRent(null);
        setIsAvailable(true);
      }
    };

    checkIfRented();
  }, [id]);

  const isUnavailable = !isAvailable && currentRent != null;

  const unavailableMessage = isUnavailable && currentRent?.endDate
    ? `Unavailable until ${new Date(currentRent.endDate).toLocaleDateString()}`
    : property?.status === "rented"
      ? "Currently rented"
      : "";

  const handleRentHouse = async () => {
    console.log("🔵 handleRentHouse called, paymentMethod:", paymentMethod);

    const calculatedEndDate =
      rentType === "perMonth"
        ? new Date(new Date(startDate).getTime() + 29 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
        : endDate;

    const totalAmount =
      rentType === "perMonth"
        ? property.pricePerMonth
        : calculateTotalRent();

    console.log("💰 Total amount:", totalAmount, "Start:", startDate, "End:", calculatedEndDate);

    if (paymentMethod === "cash") {
      try {
        const res = await fetch(
          `http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
          {
            method: "POST",
          }
        );
        if (!res.ok) throw new Error("Renting failed");
        setRentSuccess(true);
        setIsRented(true);
        setProperty((prev) => ({ ...prev, status: "rented" }));
        setSkipCheckRented(true);
      } catch (err) {
        console.error("Rent failed:", err);
        alert("Failed to complete rental. Please try again.");
      }
    } else if (paymentMethod === "credit") {
      console.log("💳 Starting credit card payment flow");

      // Clear any previous errors
      setCardError("");

      try {
        setIsProcessingPayment(true);
        console.log("🔄 Processing payment state set to true");

        // Step 1: Check if Stripe failed to load
        if (stripeLoadError) {
          const msg = "Payment system is not available. Please try cash payment or refresh the page.";
          setCardError(msg);
          alert(msg);
          setIsProcessingPayment(false);
          return;
        }

        // Step 2: Amount validation
        if (totalAmount < 0.50) {
          const msg = "Credit card payments must be at least $0.50. Please pay in cash or increase the rental duration.";
          setCardError(msg);
          alert(msg);
          setIsProcessingPayment(false);
          return;
        }

        console.log("💰 Total amount validated:", totalAmount);

        // Step 3: Validate Stripe is loaded 
        if (!stripe || !elements) {
          const msg = "Payment system is still loading. Please wait a moment and try again.";
          console.error("❌ Stripe not ready:", {
            stripe: !!stripe,
            elements: !!elements,
            stripeReady,
            stripeLoadError
          });
          setCardError(msg);
          alert(msg);
          setIsProcessingPayment(false);
          return;
        }

        console.log("✅ Stripe initialized - both stripe and elements are available");

        // Step 4: Get card element
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          const msg = "Card information is missing. Please refresh the page.";
          console.error("❌ CardElement not found");
          setCardError(msg);
          alert(msg);
          setIsProcessingPayment(false);
          return;
        }

        console.log("✅ CardElement found");


        console.log("🔍 Checking if card details are entered...");

        // Store dates for success callback
        localStorage.setItem("stripeStartDate", startDate);
        localStorage.setItem("stripeEndDate", calculatedEndDate);

        // Step 6: Create payment intent from backend
        console.log("📡 Creating payment intent from backend...");

        const res = await fetch("http://localhost:5000/api/stripe/checkout/integrated", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerEmail: localStorage.getItem("email") || "guest@example.com",
            customerName: localStorage.getItem("username") || "Guest",
            items: [{ price: Math.round(totalAmount * 100) }], // Convert to cents
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Backend error:", res.status, errorText);
          throw new Error(`Server error (${res.status}): ${errorText}`);
        }

        const clientSecret = await res.text();

        if (!clientSecret || clientSecret.length < 10) {
          console.error("❌ Invalid client secret received:", clientSecret);
          throw new Error("Invalid payment session. Please try again.");
        }

        console.log("✅ Client secret received:", clientSecret.substring(0, 20) + "...");

        // Step 7: Confirm payment with Stripe
        console.log("💳 About to call stripe.confirmCardPayment...");
        console.log("📋 Payment details:", {
          clientSecret: clientSecret.substring(0, 20) + "...",
          hasCardElement: !!cardElement,
          customerName: localStorage.getItem("username") || "Guest",
          customerEmail: localStorage.getItem("email") || "guest@example.com",
        });

        let result;
        try {
          result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: localStorage.getItem("username") || "Guest",
                email: localStorage.getItem("email") || "guest@example.com",
              },
            },
          });

          console.log("✅ stripe.confirmCardPayment completed");
          console.log("📊 Result:", result);

        } catch (stripeError) {
          console.error("❌ Stripe SDK error during confirmCardPayment:", stripeError);
          console.error("Error details:", {
            message: stripeError.message,
            type: stripeError.type,
            code: stripeError.code,
            stack: stripeError.stack
          });

          // Handle the specific CORS/network error
          if (stripeError.message && (
            stripeError.message.includes('Failed to fetch') ||
            stripeError.message.includes('NetworkError') ||
            stripeError.message.includes('Load failed')
          )) {
            throw new Error("Network error communicating with payment provider. Please check:\n" +
              "1. Your internet connection\n" +
              "2. Disable browser extensions (ad blockers, privacy tools)\n" +
              "3. Try a different browser\n" +
              "4. Check if your firewall/antivirus is blocking the request\n" +
              "5. Contact support if issue persists");
          }

          throw stripeError;
        }

        if (result.error) {
          console.error("❌ Stripe payment failed:", result.error);

          let userMessage = result.error.message;

          // Map common error codes to user-friendly messages
          const errorMessages = {
            'card_declined': "Your card was declined. Please try a different payment method.",
            'incorrect_cvc': "The security code (CVC) is incorrect. Please check and try again.",
            'expired_card': "Your card has expired. Please use a different card.",
            'processing_error': "An error occurred while processing your card. Please try again.",
            'insufficient_funds': "Insufficient funds. Please use a different card.",
            'invalid_expiry_year': "Invalid expiration year. Please check your card details.",
            'invalid_expiry_month': "Invalid expiration month. Please check your card details.",
            'incomplete_number': "The card number is incomplete. Please enter the full card number.",
            'incomplete_cvc': "The security code is incomplete. Please enter the CVC.",
            'incomplete_expiry': "The expiration date is incomplete. Please enter the full date.",
          };

          if (errorMessages[result.error.code]) {
            userMessage = errorMessages[result.error.code];
          }

          setCardError(userMessage);
          alert("Payment failed: " + userMessage);

        } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
          console.log("✅ Payment succeeded! PaymentIntent ID:", result.paymentIntent.id);

          // Step 8: Save the rent in database
          console.log("💾 Saving rental to database...");

          const rentRes = await fetch(
            `http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
            { method: "POST" }
          );

          if (!rentRes.ok) {
            console.error("❌ Failed to save rent after payment");
            alert("Payment succeeded but failed to save rental. Please contact support with payment ID: " + result.paymentIntent.id);
          } else {
            console.log("✅ Rental saved successfully");

            // Update UI
            setRentSuccess(true);
            setIsRented(true);
            setIsAvailable(false);
            setProperty((prev) => ({ ...prev, status: "rented" }));
            setCardError("");

            // Clear the card input
            cardElement.clear();


          }

          // Clean up localStorage
          localStorage.removeItem("stripeStartDate");
          localStorage.removeItem("stripeEndDate");
        }

      } catch (err) {
        console.error("❌ Payment error:", err);
        console.error("Error stack:", err.stack);

        let errorMsg = err.message || "Payment failed. Please try again.";

        // Special handling for network errors
        if (errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('Network error') ||
          errorMsg.includes('Load failed')) {
          errorMsg = "Cannot reach payment provider. This may be caused by:\n" +
            "• Ad blocker or browser extension\n" +
            "• Network firewall\n" +
            "• Poor internet connection\n\n" +
            "Try: Disable extensions, use a different browser, or contact support.";
        }

        setCardError(errorMsg);
        alert("Payment error:\n\n" + errorMsg);

      } finally {
        console.log("🔄 Setting isProcessingPayment to false");
        setIsProcessingPayment(false);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const savedStart = localStorage.getItem("stripeStartDate");
      const savedEnd = localStorage.getItem("stripeEndDate");

      if (savedStart && savedEnd) {
        setStartDate(savedStart);
        setEndDate(savedEnd);

        (async () => {
          try {
            await fetch(`http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${savedStart}&endDate=${savedEnd}`, {
              method: "POST"
            });
            setRentSuccess(true);
            setIsRented(true);
            setProperty((prev) => ({ ...prev, status: "rented" }));
            localStorage.removeItem("stripeStartDate");
            localStorage.removeItem("stripeEndDate");

            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          } catch (err) {
            console.error("Error saving rent after Stripe payment:", err);
          }
        })();
      }
    }
  }, [id, userId]);

  const fetchRatings = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/ratings/house/${id}`);
      const data = await res.json();
      setRatings(data);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    }
  };

  const submitRating = async () => {
    if (!userId) {
      setModalMessage("You must be logged in to rate.");
      setShowLoginModal(true);
      return;
    }
    try {
      await fetch(
        `http://localhost:5000/api/ratings/add?userId=${userId}&houseId=${id}&stars=${rating}&comment=${comment}`,
        { method: "POST" }
      );
      setRating(0);
      setComment("");
      fetchRatings();
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (err) {
      console.error("Error submitting rating:", err);
    }
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/houses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        const data = await res.json();
        setProperty(data);
      } catch (error) {
        console.error("Error fetching property:", error);
      }
    };

    fetchProperty();
    fetchRatings();
  }, [id]);

  useEffect(() => {
    async function checkFavorite() {
      if (!property) return;
      if (!userId) {
        setIsFavorite(false);
        return;
      }
      try {
        const res = await fetch(
          `http://localhost:5000/api/favorites/user/${userId}`
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const favorites = await res.json();
        if (!Array.isArray(favorites)) {
          setIsFavorite(false);
          return;
        }
        const favorited = favorites.some(
          (fav) => fav.property.id === property.id
        );
        setIsFavorite(favorited);
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
      }
    }
    checkFavorite();
  }, [property, userId]);

  const handleVisitRequest = () => {
    if (!userId) {
      setModalMessage("You must be logged in to schedule a visit.");
      setShowLoginModal(true);
      return;
    }
    localStorage.setItem("visitHouseId", id);
    setVisitRequestSent(true);
    setTimeout(() => {
      navigate("/schedule");
    }, 1500);
  };

  const toggleFavorite = async () => {
    if (!userId) {
      setModalMessage("You must be logged in to add or remove favorites.");
      setShowLoginModal(true);
      return;
    }

    if (!property) return;

    try {
      if (isFavorite) {
        await fetch(
          `http://localhost:5000/api/favorites/remove?userId=${userId}&propertyId=${property.id}`,
          { method: "DELETE" }
        );
        setIsFavorite(false);
      } else {
        await fetch(
          `http://localhost:5000/api/favorites/add?userId=${userId}&propertyId=${property.id}`,
          { method: "POST" }
        );
        setIsFavorite(true);
        setShowFavoriteMessage(true);
        setTimeout(() => setShowFavoriteMessage(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    }
  };

  if (!property) return <div className="loading">Loading...</div>;

  const calculateTotalRent = () => {
    if (!startDate || !endDate || !property?.pricePerDay) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end - start);
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    return days * property.pricePerDay;
  };

  const handleStartDateChange = (e) => {
    const selectedStart = e.target.value;
    setStartDate(selectedStart);

    if (rentType === "perMonth") {
      const start = new Date(selectedStart);
      const autoEnd = new Date(start);
      autoEnd.setDate(autoEnd.getDate() + 29);
      setEndDate(autoEnd.toISOString().split("T")[0]);
    } else {
      setEndDate("");
    }
  };

  return (
    <div className="property-page">
      <div className="property-container">
        <div className="image-section">
          <img
            src={
              property.image.startsWith("http")
                ? property.image
                : `http://localhost:5000/uploads/${property.image}`
            }
            alt={property.location}
            className="property-image"
          />
          {userRole !== "ADMIN" && (
            <button className="favorite-btn" onClick={toggleFavorite}>
              {isFavorite ? <FaHeart /> : <FaRegHeart />}
            </button>
          )}
        </div>

        <div className="property-content">
          <div className="property-header">
            <div>
              <h1 className="property-location">{property.location}</h1>
              <div className="property-info">
                <span>{property.propertyType}</span>
                <span>•</span>
                <span>{property.nbOfBedrooms} Bedrooms</span>
                <span>•</span>
                <span className={`status ${isAvailable ? 'available' : 'rented'}`}>
                  {isAvailable ? 'Available' : 'Rented'}
                </span>
              </div>
              {isUnavailable && currentRent?.endDate && (
                <div className="availability-msg">
                  Available after {new Date(currentRent.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="property-pricing">
              <div className="price-day">${property.pricePerDay}/day</div>
              <div className="price-month">${property.pricePerMonth}/month</div>
            </div>
          </div>

          <div className="section">
            <h2>About</h2>
            <p>{property.description || "A beautiful, spacious property in a prime location with all modern amenities."}</p>
          </div>

          <div className="section owner-section">
            <h2>Owner Contact</h2>
            <div className="owner-details">
              <p><strong>{property.owner?.name}</strong></p>
              <p>{property.owner?.phone}</p>
              <p>{property.owner?.email}</p>
            </div>
          </div>

          {ratings.length > 0 && (
            <div className="section">
              <h2>Reviews</h2>
              <div className="reviews">
                {ratings.map((r, idx) => (
                  <div key={idx} className="review">
                    <div className="review-stars">
                      {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                    </div>
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
                    className={`type-btn ${rentType === option.value ? 'active' : ''}`}
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
                  <span className="amount">${rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()}</span>
                </div>
              )}

              <div className="payment-methods">
                <button
                  className={`payment-btn ${paymentMethod === "cash" ? 'active' : ''}`}
                  onClick={() => setPaymentMethod("cash")}
                >
                  💵 Cash
                </button>
                <button
                  className={`payment-btn ${paymentMethod === "credit" ? 'active' : ''}`}
                  onClick={() => setPaymentMethod("credit")}
                  disabled={!stripeReady && !stripeLoadError}
                  title={!stripeReady && !stripeLoadError ? "Loading payment system..." : stripeLoadError ? "Payment system unavailable" : ""}
                >
                  💳 Card {!stripeReady && !stripeLoadError && "(Loading...)"}
                </button>
              </div>

              {paymentMethod === "credit" && (
                <div className="card-details">
                  <label>Card Information</label>

                
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    border: '1px solid #ffc107'
                  }}>
                    ⚠️ <strong>Payment Issues?</strong> Disable ad blockers or privacy extensions (like uBlock Origin, Privacy Badger, AdBlock) for this site.
                  </div>

                  {!stripeReady && !stripeLoadError && (
                    <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '10px' }}>
                      ⏳ Loading Stripe... Please wait a moment.
                    </div>
                  )}
                  {stripeLoadError && (
                    <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '10px' }}>
                      ❌ Payment system failed to load. Please use cash payment or refresh the page.
                    </div>
                  )}
                  <div className="card-element-wrapper">
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
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
                      isUnavailable ||
                      isProcessingPayment ||
                      (paymentMethod === "credit" && (!stripeReady || stripeLoadError))
                    }
                  >
                    {isUnavailable
                      ? "Unavailable"
                      : isProcessingPayment
                        ? "Processing..."
                        : (paymentMethod === "credit" && !stripeReady)
                          ? "Loading..."
                          : "Confirm Booking"}
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
                      <span
                        key={s}
                        className={`star ${rating >= s ? 'active' : ''}`}
                        onClick={() => setRating(s)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <textarea
                    placeholder="Your thoughts..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button onClick={submitRating}>Submit</button>
                  {showThankYou && <div className="thank-you">Thanks for your review!</div>}
                </div>
              )}
            </div>
          )}

          <div className="visit-action">
            <button className="visit-btn" onClick={handleVisitRequest}>
              Schedule Visit
            </button>
          </div>

          {userRole === "ADMIN" && (
            <button className="edit-btn" onClick={() => navigate(`/edit-house/${property.id}`)}>
              ✏️ Edit Property
            </button>
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
  // Show error if Stripe key validation failed
  if (!isKeyValid || !stripePromise) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c' }}>⚠️ Payment System Configuration Error</h2>
        <p>The Stripe payment key is invalid or missing.</p>
        <p>Cash payments are still available. Contact the administrator to fix payment setup.</p>
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