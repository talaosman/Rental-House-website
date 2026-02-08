import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import "./PropertyDetails.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCalendarDay, FaCalendarAlt, FaHeart, FaRegHeart } from "react-icons/fa";

const stripePromise = loadStripe("pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK");

// Stripe CardElement styling options
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

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  useEffect(() => {
    const checkIfRented = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rents/is-rented/${id}`);
        const data = await res.json();
        setIsRented(data);
      } catch (err) {
        console.error("Error checking rent status", err);
      }
    };
    checkIfRented();
  }, [id]);

  const handleRentHouse = async () => {
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
      }
    } else if (paymentMethod === "credit") {
      try {
        setIsProcessingPayment(true);
        setCardError("");

        if (totalAmount < 50) {
          alert("Credit card payments must be at least $0.50. Please pay in cash or increase the rental duration.");
          setIsProcessingPayment(false);
          return;
        }

        if (!stripe || !elements) {
          console.error("Stripe.js has not yet loaded.");
          setCardError("Payment system is still loading. Please try again.");
          setIsProcessingPayment(false);
          return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          setCardError("Card information is missing. Please refresh and try again.");
          setIsProcessingPayment(false);
          return;
        }

        localStorage.setItem("stripeStartDate", startDate);
        localStorage.setItem("stripeEndDate", calculatedEndDate);

        const res = await fetch("http://localhost:5000/api/stripe/checkout/integrated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: localStorage.getItem("email"),
            customerName: localStorage.getItem("username"),
            items: [{ price: totalAmount }],
          }),
        });

        const clientSecret = await res.text();

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: localStorage.getItem("username"),
              email: localStorage.getItem("email"),
            },
          },
        });

        if (result.error) {
          console.error("Stripe payment failed:", result.error.message);
          setCardError(result.error.message);
        } else if (result.paymentIntent.status === "succeeded") {
          await fetch(
            `http://localhost:5000/api/rents/rent?userId=${userId}&houseId=${id}&startDate=${startDate}&endDate=${calculatedEndDate}`,
            {
              method: "POST",
            }
          );
          setRentSuccess(true);
          setIsRented(true);
          setProperty((prev) => ({ ...prev, status: "rented" }));
          setSkipCheckRented(true);
          setCardError("");
        }
      } catch (err) {
        console.error("Stripe integrated payment failed:", err);
        setCardError("Payment failed. Please try again.");
      } finally {
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
    if (skipCheckRented) return;

    const checkIfRented = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rents/is-rented/${id}`);
        const data = await res.json();
        setIsRented(data);
      } catch (err) {
        console.error("Error checking rent status", err);
      }
    };
    checkIfRented();
  }, [id, skipCheckRented]);

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
        {/* Image Section */}
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

        {/* Content */}
        <div className="property-content">
          {/* Header */}
          <div className="property-header">
            <div>
              <h1 className="property-location">{property.location}</h1>
              <div className="property-info">
                <span>{property.propertyType}</span>
                <span>•</span>
                <span>{property.nbOfBedrooms} Bedrooms</span>
                <span>•</span>
                <span className={`status ${property.status}`}>{property.status}</span>
              </div>
            </div>
            <div className="property-pricing">
              <div className="price-day">${property.pricePerDay}/day</div>
              <div className="price-month">${property.pricePerMonth}/month</div>
            </div>
          </div>

          {/* Description */}
          <div className="section">
            <h2>About</h2>
            <p>{property.description || "A beautiful, spacious property in a prime location with all modern amenities."}</p>
          </div>

          {/* Owner Info */}
          <div className="section owner-section">
            <h2>Owner Contact</h2>
            <div className="owner-details">
              <p><strong>{property.owner?.name}</strong></p>
              <p>{property.owner?.phone}</p>
              <p>{property.owner?.email}</p>
            </div>
          </div>

          {/* Reviews */}
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

          {/* Booking Section */}
          {userId && userRole !== "ADMIN" && (
            <div className="section booking-section">
              <h2>Book Your Stay</h2>

              {/* Rent Type */}
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

              {/* Dates */}
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

              {/* Total */}
              {((rentType === "perDay" && startDate && endDate) || (rentType === "perMonth" && startDate)) && (
                <div className="total-price">
                  <span>Total</span>
                  <span className="amount">${rentType === "perMonth" ? property.pricePerMonth : calculateTotalRent()}</span>
                </div>
              )}

              {/* Payment */}
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
                >
                  💳 Card
                </button>
              </div>

              {/* Card Element - Only show when credit is selected */}
              {paymentMethod === "credit" && (
                <div className="card-details">
                  <label>Card Information</label>
                  <div className="card-element-wrapper">
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
                  {cardError && (
                    <div style={{ color: '#e74c3c', fontSize: '14px', marginTop: '8px' }}>
                      {cardError}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="booking-actions">
                <button
                  className="book-btn"
                  onClick={handleRentHouse}
                  disabled={
                    (rentType === "perDay" && (!startDate || !endDate)) ||
                    (rentType === "perMonth" && !startDate) ||
                    isRented ||
                    isProcessingPayment
                  }
                >
                  {isProcessingPayment ? "Processing..." : isRented ? "Unavailable" : "Confirm Booking"}
                </button>
              </div>
              {/* Messages */}
              {rentSuccess && <div className="success-msg">✓ Booking confirmed!</div>}
              {showFavoriteMessage && <div className="success-msg">♥ Added to favorites!</div>}

              {/* Rating */}
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



          {/* Admin Edit */}
          {userRole === "ADMIN" && (
            <button className="edit-btn" onClick={() => navigate(`/edit-house/${property.id}`)}>
              ✏️ Edit Property
            </button>
          )}

          {/* Visit Button for Non-Admin */}
          {userRole !== "ADMIN" && !userId && (
            <button className="visit-btn-main" onClick={handleVisitRequest}>
              Schedule a Visit
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
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
  return (
    <Elements stripe={stripePromise}>
      <PropertyDetailsContent />
    </Elements>
  );
};

export default PropertyDetailsPage;