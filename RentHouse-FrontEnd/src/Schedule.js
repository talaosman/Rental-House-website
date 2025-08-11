import React, { useState,useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Schedule.css"; // Ensure this matches the rest of your app's design

const Schedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: "",
    time: "",
  });
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });
   useEffect(() => {
      const storedUsername = localStorage.getItem('username');
      const storedEmail = localStorage.getItem('email');
      if (storedUsername && storedEmail) {
        setUserInfo({ username: storedUsername, email: storedEmail });
      }
    }, []);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    const houseId = localStorage.getItem("visitHouseId");

    if (!userId || !houseId) {
      alert("Missing user or house information.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/visits/request?" +
        new URLSearchParams({
          houseId,
          userId,
          visitorName: userInfo.name,
          visitorEmail: userInfo.email,
          date: formData.date,
          time: formData.time,
        }),
        {
          method: "POST",
        }
      );

      if (res.status === 409) {
        alert("❌ This date and time are already taken. Please choose another.");
        return;
      }

      if (res.ok) {
        alert("✅ Visit request submitted! The landlord will contact you.");
        navigate(`/property/${houseId}`);
      } else {
        const error = await res.text();
        alert("❌ Submission failed: " + error);
      }
    } catch (error) {
      console.error("Error submitting visit request:", error);
      alert("❌ Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="schedule-container">
      <h2>Schedule a Visit</h2>

      {submitting ? (
        <p className="loading-message">📤 Sending your request, please wait...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* <label htmlFor="name">Your Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Your Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          /> */}

          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />

          <label htmlFor="time">Preferred Time:</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />

          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );

};

export default Schedule;
