
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Schedule.css";

const Schedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: "",
    time: "",
  });
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    if (storedUsername && storedEmail) {
      setUserInfo({ username: storedUsername, email: storedEmail });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    const houseId = localStorage.getItem("visitHouseId");

    if (!userId || !houseId) {
      setError("Missing user or house information. Please try again.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/visits/request?` +
        new URLSearchParams({
          houseId,
          userId,
          visitorName: userInfo.username,
          visitorEmail: userInfo.email,
          date: formData.date,
          time: formData.time,
        }),
        {
          method: "POST",
        }
      );

      if (res.status === 409) {
        setError("This date and time are already taken. Please choose another slot.");
        setSubmitting(false);
        return;
      }

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          navigate(`/property/${houseId}`);
        }, 15000);
      } else {
        const errorText = await res.text();
        setError(errorText || "Submission failed. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting visit request:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="schedule-luxury-container">
      {/* Hero Section */}
      <section className="schedule-hero">
        <div className="schedule-hero-overlay"></div>
        <div className="schedule-hero-content">
          <div className="schedule-icon-wrapper">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h1 className="schedule-hero-title">Schedule Your Visit</h1>
          <p className="schedule-hero-subtitle">
            Book a convenient time to view this property
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="schedule-content-section">
        <div className="schedule-content-wrapper">
          {/* Form Card */}
          <div className="schedule-form-card">
            {showSuccess ? (
              <div className="success-animation">
                <div className="success-checkmark">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3>Visit Request Submitted!</h3>
                <p>The landlord will contact you shortly to confirm your appointment.</p>
              </div>
            ) : (
              <>
                <div className="schedule-card-header">
                  <h2>Select Your Preferred Time</h2>
                  <p>Choose a date and time that works best for you</p>
                </div>

                {/* User Info Display */}
                <div className="user-info-display-schedule">
                  <div className="user-info-item-schedule">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{userInfo.username || 'Guest User'}</span>
                  </div>
                  <div className="user-info-item-schedule">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <span>{userInfo.email || 'No email provided'}</span>
                  </div>
                </div>

                {submitting ? (
                  <div className="loading-state">
                    <div className="loading-spinner-schedule"></div>
                    <p>Submitting your request...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="schedule-form-luxury">
                    {/* Date Input */}
                    <div className="form-group-schedule">
                      <label htmlFor="date" className="form-label-schedule">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Select Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="form-input-schedule"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    {/* Time Input */}
                    <div className="form-group-schedule">
                      <label htmlFor="time" className="form-label-schedule">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Preferred Time
                      </label>
                      <input
                        type="time"
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="form-input-schedule"
                        required
                      />
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="error-message-schedule">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" className="schedule-submit-btn" disabled={submitting}>
                      <span>Schedule Visit</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Info Card */}
          <div className="schedule-info-card">
            <div className="info-card-header">
              <div className="info-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h3>What to Expect</h3>
            </div>

            <ul className="info-list">
              <li className="info-list-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div>
                  <h4>Confirmation</h4>
                  <p>You'll receive a confirmation email shortly</p>
                </div>
              </li>
              <li className="info-list-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div>
                  <h4>Landlord Contact</h4>
                  <p>The property owner will reach out to finalize details</p>
                </div>
              </li>
              <li className="info-list-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div>
                  <h4>Tour Duration</h4>
                  <p>Property tours typically last 30-45 minutes</p>
                </div>
              </li>
              <li className="info-list-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div>
                  <h4>Bring ID</h4>
                  <p>Please bring a valid form of identification</p>
                </div>
              </li>
            </ul>

            <div className="info-card-footer">
              <div className="contact-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <div>
                  <p className="contact-label">Need Help?</p>
                  <a
                    href="https://wa.me/96178841333?text=Hello%20RentalHub%2C%20I%20would%20like%20to%20inquire%20about%20your%20services"
                    target="_blank"
                    rel="noopener noreferrer" className="contact-link">+961 78 841 333</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Schedule;