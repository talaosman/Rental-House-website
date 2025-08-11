import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import { motion } from "framer-motion";
import "./PropertyDetails.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCalendarDay, FaCalendarAlt } from "react-icons/fa";
import { AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";


const PropertyDetailsPage = () => {
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
  const [rentType, setRentType] = useState("perDay"); // "perDay" or "perMonth"
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [skipCheckRented, setSkipCheckRented] = useState(false);
  const stripePromise = loadStripe("pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const rentOptions = [
    { label: "Per Day", value: "perDay", icon: <FaCalendarDay /> },
    { label: "Per Month", value: "perMonth", icon: <FaCalendarAlt /> },
  ];
  const [showDropdown, setShowDropdown] = useState(false);

  const navigate = useNavigate();

  // Replace this with your actual logged-in user ID from context or auth system
  const userId = localStorage.getItem("userId");
  useEffect(() => {
    const role = localStorage.getItem("userRole"); // assuming 'role' is stored as 'Admin', 'User', etc.
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
      } catch (err) {
        console.error("Rent failed:", err);
      }
    } else if (paymentMethod === "credit") {
      try {
        setIsProcessingPayment(true);
        if (totalAmount < 50 && paymentMethod === "credit") {
          alert("Credit card payments must be at least $0.50. Please pay in cash or increase the rental duration.");
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

        if (!stripe || !elements) {
          console.error("Stripe.js has not yet loaded.");
          setIsProcessingPayment(false);
          return;
        }

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: localStorage.getItem("username"),
              email: localStorage.getItem("email"),
            },
          },
        });

        if (result.error) {
          console.error("Stripe payment failed:", result.error.message);
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
        }
      } catch (err) {
        console.error("Stripe integrated payment failed:", err);
      }
      finally {
        setIsProcessingPayment(false); // 👈 always stop loading
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
            console.log("Rent saved after Stripe payment.");
            setRentSuccess(true);
            setIsRented(true);
            setProperty((prev) => ({ ...prev, status: "rented" }));
            localStorage.removeItem("stripeStartDate");
            localStorage.removeItem("stripeEndDate");

            // remove ?payment=success from the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          } catch (err) {
            console.error("Error saving rent after Stripe payment:", err);
          }
        })();
      }
    }
  }, [id, userId]);

  useEffect(() => {
    if (skipCheckRented) return; // skip if payment just succeeded

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
  }, [id]);


  // Check if this property is in favorites on load or property/user change
  useEffect(() => {
    async function checkFavorite() {
      if (!property) return;
      if (!userId) {
        console.warn("No userId found. User might not be logged in.");
        setIsFavorite(false);
        return;
      }
      try {
        const res = await fetch(
          `http://localhost:5000/api/favorites/user/${userId}`
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const favorites = await res.json();
        if (!Array.isArray(favorites)) {
          console.error("Favorites response is not an array:", favorites);
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
    localStorage.setItem("visitHouseId", id); // store house ID for use in /schedule page
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
          {
            method: "DELETE",
          }
        );
        setIsFavorite(false);
      } else {
        await fetch(
          `http://localhost:5000/api/favorites/add?userId=${userId}&propertyId=${property.id}`,
          {
            method: "POST",
          }
        );
        setIsFavorite(true);
        setShowFavoriteMessage(true); // Show message
        setTimeout(() => {
          setShowFavoriteMessage(false); // Hide after 10s
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    }
  };

  if (!property) return <p>Loading...</p>;
  const calculateTotalRent = () => {
    if (!startDate || !endDate || !property?.pricePerDay) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end - start);
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return days * property.pricePerDay;
  };

  const handleStartDateChange = (e) => {
    const selectedStart = e.target.value;
    setStartDate(selectedStart);

    if (rentType === "perMonth") {
      const start = new Date(selectedStart);
      const autoEnd = new Date(start);
      autoEnd.setDate(autoEnd.getDate() + 29); // 30 days total
      setEndDate(autoEnd.toISOString().split("T")[0]); // format as yyyy-mm-dd
    } else {
      setEndDate(""); // reset for perDay
    }
  };


  return (

    <motion.div
      className="property-details"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2>{property.location}</h2>

      <motion.img
        src={
          property.image.startsWith("http")
            ? property.image // online image
            : `http://localhost:5000/uploads/${property.image}` // local upload
        }
        alt={property.location}
        whileHover={{ scale: 1.03 }}
      />
      {/* Favorite Button Under Image */}
      {userRole !== "ADMIN" && (
        <div className="favorite-container">
          <motion.button
            className={`favorite-button ${isFavorite ? "favorited" : ""}`}
            whileTap={{ scale: 0.97 }}
            onClick={toggleFavorite}
          >
            {isFavorite ? "💖 Remove from Favorites" : "🤍 Add to Favorites"}
          </motion.button>

          {showFavoriteMessage && (
            <motion.p
              className="favorite-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Property added to your favorites!
            </motion.p>
          )}
        </div>
      )}

      <div className="details-grid">
        <div className="price">
          ${property.pricePerDay} / day | ${property.pricePerMonth} / month
        </div>
        <div>
          <strong>Type:</strong> {property.propertyType}
        </div>
        <div>
          <strong>Bedrooms:</strong> {property.nbOfBedrooms}
        </div>
        <div>
          <strong>Status:</strong> {property.status}
        </div>
      </div>

      <div className="description">
        <h3>About this Property</h3>
        <p>
          {property.description ||
            "A beautiful, spacious property in a prime location with all modern amenities."}
        </p>
      </div>

      <p>
        <strong>Owner Name:</strong> {property.owner?.name}
      </p>
      <p>
        <strong>Phone:</strong> {property.owner?.phone}
      </p>
      <p>
        <strong>Email:</strong> {property.owner?.email}
      </p>



      {userRole === "ADMIN" && (
        <motion.button
          className="edit-button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/edit-house/${property.id}`)}
        >
          ✏️ Edit Property
        </motion.button>
      )}

      {/* <motion.button
        className={`cta-button favorite-button ${isFavorite ? "favorited" : ""
          }`}
        whileTap={{ scale: 0.97 }}
        onClick={toggleFavorite}
        style={{ marginLeft: "10px" }}
      >
        {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </motion.button> */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Login Required</h3>
            <p>{modalMessage}</p>
            <button className="cta-button1" onClick={() => navigate("/about")}>Go to Login</button>
            <button className="close-button" onClick={() => setShowLoginModal(false)}>Close</button>
          </div>
        </div>
      )}

      {userId && userRole !== "ADMIN" && (
        <div className="rent-box">
          <h3 className="rent-title">Interested in Renting?</h3>
          <div className="rent-type-select modern-dropdown">
            <label className="dropdown-label">Rent Type:</label>
            <div className="dropdown-wrapper">
              <motion.button className="dropdown-toggle" onClick={() => setShowDropdown(prev => !prev)}>
                {rentOptions.find((r) => r.value === rentType)?.icon}{" "}
                {rentOptions.find((r) => r.value === rentType)?.label}{" "}
                <FaChevronDown style={{ marginLeft: "50px" }} />
              </motion.button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.ul
                    className="dropdown-menu"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {rentOptions.map((option) => (
                      <li
                        key={option.value}
                        onClick={() => {
                          setRentType(option.value);
                          setShowDropdown(false);
                        }}
                        className={`dropdown-item ${rentType === option.value ? "active" : ""
                          }`}
                      >
                        {option.icon} {option.label}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          {rentType === "perDay" && (
            <div className="date-inputs">
              <label>
                From:
                <input type="date" value={startDate} onChange={handleStartDateChange} />
              </label>
              <label>
                To:
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
          )}

          {rentType === "perMonth" && (
            <div className="date-inputs">
              <label>
                Start Date:
                <input type="date" value={startDate} onChange={handleStartDateChange} />
              </label>
            </div>
          )}
          <div className="payment-method-options">
            <label className="payment-label">Select Payment Method:</label>
            <div className="payment-buttons">
              <motion.button
                className={`payment-option ${paymentMethod === "cash" ? "active" : ""}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("cash")}
              >
                💵 Cash
              </motion.button>
              <motion.button
                className={`payment-option ${paymentMethod === "credit" ? "active" : ""}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("credit")}
              >
                💳 Credit Card
              </motion.button>
            </div>
          </div>

          {paymentMethod === "credit" && (
            <div style={{ margin: "10px 0", padding: "10px", border: "1px solid #ccc" }}>
              <label>Card Details:</label>
              <CardElement options={{ hidePostalCode: true }} />
            </div>
          )}

          {rentType === "perDay" && startDate && endDate && (
            <p className="rent-total">
              Total Rent: ${calculateTotalRent()} for{" "}
              {Math.ceil(
                (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1
              )}{" "}
              days
            </p>
          )}

          {rentType === "perMonth" && startDate && endDate && (
            <p className="rent-total">
              Monthly Rent: ${property.pricePerMonth} (From {startDate} to {endDate})
            </p>
          )}


          <motion.button
            className="rent-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRentHouse}
            disabled={
              (rentType === "perDay" && (!startDate || !endDate)) ||
              (rentType === "perMonth" && !startDate) ||
              isRented ||
              rentSuccess
            }


          >
            {isRented ? "Unavailable" : "Confirm Rent"}
          </motion.button>
          {isProcessingPayment && (
            <p className="payment-message">
              Processing payment, please wait...
            </p>
          )}

          {rentSuccess && <p className="success-message">✅ House rented successfully!</p>}
        </div>
      )}




      {userRole !== "ADMIN" && (
        <motion.button
          className="cta-button"
          whileTap={{ scale: 0.97 }}
          onClick={handleVisitRequest}
        >
          Inquire / Schedule a Visit
        </motion.button>
      )}
    </motion.div>

  );
};

export default PropertyDetailsPage;
