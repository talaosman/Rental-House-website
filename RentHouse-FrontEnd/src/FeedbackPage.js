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
      const payload = {
        ...formData,
        username: userInfo.username,
        email: userInfo.email,
      };

      const response = await axios.post('http://localhost:5000/api/feedback', payload);
      if (response.status === 201) {
        setStatus('✔️ Thank you for your feedback!');
        setFormData({ message: '' });
      } else {
        setStatus('⚠️ Unexpected response from server.');
      }
    } catch (error) {
      if (error.response) {
        setStatus(`❌ ${error.response.data.message || 'Server error occurred.'}`);
      } else if (error.request) {
        setStatus('❌ No response from server.');
      } else {
        setStatus(`❌ ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="feedback-section">
      <header className="feedback-header">
        <h1>Tell Us About Your Rental Experience</h1>
        <p>Your insights help us build better homes and happier communities.</p>
      </header>

      <div className="feedback-wrapper">
        <div className="feedback-card">
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <textarea
                name="message"
                placeholder="Please describe your experience with the rental property..."
                value={formData.message}
                onChange={handleChange}
                required
              />
              <label>Your Feedback</label>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <span className="loader"></span> : 'Send Feedback'}
            </button>

            {status && (
              <p className={`status-message ${status.includes('✔️') ? 'success' : 'error'}`}>
                {status}
              </p>
            )}
          </form>

          <div className="emergency-box">
            <h3>Need urgent help?</h3>
            <p>Our team is here for you 24/7.</p>
            <p className="emergency-number">Call: +961-12345678</p>
          </div>
        </div>

        <div className="feedback-image">
          <img src="feedback.jpg" alt="Modern apartment" />
        </div>
      </div>
    </section>
  );
}

export default FeedbackForm;
