import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AdminFeedbackPage.css";

/* Avatar initial from username */
const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

const AdminFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const res = await fetch("http://localhost:5000/api/feedback");
        if (!res.ok) throw new Error("Failed to fetch feedbacks");
        const data = await res.json();
        setFeedbacks(data);
      } catch (err) {
        setError(err.message || "Error fetching feedbacks");
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/feedback/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete feedback");
      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete feedback");
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="admin-feedback-container">
      <div className="admin-state-screen">
        <div className="state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="state-title">Loading Feedback</p>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="admin-feedback-container">
      <div className="admin-state-screen">
        <div className="state-icon error-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="state-title">Something Went Wrong</p>
        <p className="state-subtitle">{error}</p>
      </div>
    </div>
  );

  /* ── Empty ── */
  if (feedbacks.length === 0) return (
    <div className="admin-feedback-container">
      <div className="admin-state-screen">
        <div className="state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="state-title">No Feedback Yet</p>
        <p className="state-subtitle">There is currently no feedback submitted by users. Check back later.</p>
      </div>
    </div>
  );

  /* ── Main ── */
  return (
    <div className="admin-feedback-container">

      {/* Hero */}
      <section className="admin-feedback-hero">
        <div className="admin-hero-content">
          <div className="admin-hero-text">
            <span className="admin-hero-eyebrow">RentalHub · Admin</span>
            <h1 className="admin-hero-title">User Feedback</h1>
          </div>
          <div className="admin-hero-badge">
            <span className="admin-hero-badge-count">{feedbacks.length}</span>
            <span className="admin-hero-badge-label">Submissions</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="admin-feedback-content">

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-toolbar-left">
            <span className="admin-toolbar-title">All Submissions</span>
            <span className="admin-count-pill">{feedbacks.length}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="admin-feedback-grid">
          <AnimatePresence>
            {feedbacks.map(({ id, username, email, message, submittedAt }) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28 }}
                className="admin-feedback-card"
              >
                <div className="card-accent-bar" />

                <div className="card-body">
                  {/* Header */}
                  <div className="card-header">
                    <div className="card-avatar">{getInitial(username)}</div>
                    <div className="card-meta">
                      <div className="card-username">{username || "Anonymous"}</div>
                      <div className="card-date">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {new Date(submittedAt).toLocaleString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="card-message">{message}</p>

                  {/* Footer */}
                  <div className="card-footer">
                    <button className="delete-btn" onClick={() => handleDelete(id)}>
                      <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminFeedbackPage;