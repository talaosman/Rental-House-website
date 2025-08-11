import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./AdminFeedbackPage.css"; // You can create this CSS for styling

const AdminFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all feedback on mount (admin view)
  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const res = await fetch("http://localhost:5000/api/feedback"); // Adjust API endpoint
        if (!res.ok) throw new Error("Failed to fetch feedbacks");
        const data = await res.json();
        console.log("Fetched feedbacks:", data);
        setFeedbacks(data);
      } catch (err) {
        setError(err.message || "Error fetching feedbacks");
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  // Delete feedback by id
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/feedback/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete feedback");

      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));

    } catch (err) {
      alert(err.message || "Failed to delete feedback");
    }
  };

  if (loading) return <p className="center-text">Loading feedback...</p>;
  if (error) return <p className="center-text error-text">{error}</p>;
  if (feedbacks.length === 0)
    return (
      <div className="no-feedback-container">
        <h2>No Feedback Found</h2>
        <p>There is currently no feedback submitted by users.</p>
      </div>
    );

  return (
    <div className="feedback-container">
      <h1>User Feedbacks</h1>
      <div className="feedback-grid">
        {feedbacks.map(({ id, username, message, submittedAt }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="feedback-card1"
          >
            <div className="feedback-header1">
              <strong>{username}</strong>
              <small>{new Date(submittedAt).toLocaleString()}</small>
            </div>
            <p className="feedback-message">{message}</p>
            <button className="delete-btn" onClick={() => handleDelete(id)}>
              Delete Feedback
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminFeedbackPage;
