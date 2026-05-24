import { useState, useEffect } from 'react';
import axios from 'axios';
import './FeedbackForm.css';

function FeedbackForm() {
  const [formData, setFormData] = useState({ message: '' });
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedEmail = localStorage.getItem('email');
    if (storedUsername && storedEmail) {
      setUserInfo({ username: storedUsername, email: storedEmail });
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ message: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      const userId = localStorage.getItem('userId');
      const payload = { message: formData.message };

      // Send userId as query param so backend links to User entity
      const url = userId
        ? `http://localhost:5000/api/feedback?userId=${userId}`
        : 'http://localhost:5000/api/feedback';

      const response = await axios.post(url, payload);
      if (response.status === 201) {
        setStatus('success');
        setFormData({ message: '' });
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      console.error('Feedback submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-luxury-container">
      {/* Hero Section */}
      <section className="feedback-hero">
        <div className="feedback-hero-overlay"></div>
        <div className="feedback-hero-content">
          <h1 className="feedback-hero-title">Share Your Experience</h1>
          <p className="feedback-hero-subtitle">
            Your feedback helps us create better rental experiences for everyone
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="feedback-content-section">
        <div className="feedback-content-wrapper">
          {/* Feedback Form Card */}
          <div className="feedback-form-card">
            <div className="feedback-card-header">
              <div className="feedback-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h2>Tell Us Your Story</h2>
              <p>We value your opinion and strive to improve our services</p>
            </div>

            <form className="feedback-form-luxury" onSubmit={handleSubmit}>
              {/* User Info Display */}
              <div className="user-info-display">
                <div className="user-info-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{userInfo.username || 'Guest User'}</span>
                </div>
                <div className="user-info-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>{userInfo.email || 'No email provided'}</span>
                </div>
              </div>

              {/* Message Input */}
              <div className="feedback-input-group">
                <label htmlFor="feedback-message" className="feedback-label">
                  Your Feedback
                </label>
                <textarea
                  id="feedback-message"
                  name="message"
                  className="feedback-textarea"
                  placeholder="Share your experience with us... What did you like? What could we improve?"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  required
                />
                <div className="character-count">
                  {formData.message.length} characters
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="feedback-submit-btn"
                disabled={loading || !formData.message.trim()}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Feedback</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </>
                )}
              </button>

              {/* Status Messages */}
              {status && (
                <div className={`feedback-status ${status}`}>
                  {status === 'success' ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <span>Thank you for your feedback! We appreciate your input.</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>Unable to send feedback. Please try again later.</span>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Info Cards */}
          <div className="feedback-info-section">
            {/* Contact Card */}
            <div className="feedback-info-card">
              <div className="info-card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <h3>Need Help?</h3>
              <p className="info-card-description">
                Our support team is available 24/7 to assist you with any questions or concerns.
              </p>
              <div className="contact-details">
                <div className="contact-item">
                  <span className="contact-label">Phone:</span>
                  <a href="tel:+96112345678" className="contact-value">+961-12345678</a>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Email:</span>
                  <a href="mailto:support@rentalhub.com" className="contact-value">support@rentalhub.com</a>
                </div>
              </div>
            </div>

            {/* Emergency Card */}
            <div className="feedback-info-card emergency-card">
              <div className="info-card-icon emergency">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h3>Emergency Support</h3>
              <p className="info-card-description">
                For urgent matters requiring immediate attention, please contact our emergency line.
              </p>
              <a href="tel:+96112345678" className="emergency-number">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Call Now: +961-12345678
              </a>
            </div>

            {/* Why Feedback Card */}
            <div className="feedback-info-card accent-card">
              <div className="info-card-icon accent">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
              </div>
              <h3>Why Your Feedback Matters</h3>
              <ul className="benefits-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Helps us improve our services
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Shapes future features
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Enhances user experience
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FeedbackForm;