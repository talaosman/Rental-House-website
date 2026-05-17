import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AdminRatingsDashboard.css";

/* Compute average stars */
const avgStars = (ratings) => {
  if (!ratings.length) return 0;
  return (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1);
};

const AdminRatingsDashboard = () => {
  const [ratings, setRatings]   = useState([]);
  const [sorted, setSorted]     = useState(false);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res  = await fetch("http://localhost:5000/api/ratings");
      const data = await res.json();
      setRatings(Array.isArray(data) ? data : data.ratings || []);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setRatings([]);
    }
  };

  const handleSort = () => {
    setRatings((prev) => [...prev].sort((a, b) => b.stars - a.stars));
    setSorted(true);
  };

  return (
    <motion.div
      className="admin-ratings-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Hero ── */}
      <section className="ratings-hero">
        <div className="ratings-hero-content">
          <div>
            <span className="ratings-hero-eyebrow">RentalHub · Admin</span>
            <h1 className="ratings-hero-title">Ratings Dashboard</h1>
            <p className="ratings-hero-subtitle">All user ratings across properties</p>
          </div>

          {ratings.length > 0 && (
            <div className="ratings-hero-stats">
              <div className="hero-stat-badge">
                <span className="hero-stat-value">{ratings.length}</span>
                <span className="hero-stat-label">Reviews</span>
              </div>
              <div className="hero-stat-badge">
                <span className="hero-stat-value">{avgStars(ratings)}</span>
                <span className="hero-stat-label">Avg Stars</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <div className="ratings-content">

        {ratings.length === 0 ? (
          <div className="ratings-empty">
            <div className="ratings-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p className="ratings-empty-title">No Ratings Yet</p>
            <p className="ratings-empty-sub">User ratings across properties will appear here once submitted.</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="ratings-toolbar">
              <div className="ratings-toolbar-left">
                <span className="ratings-toolbar-title">All Reviews</span>
                <span className="ratings-count-pill">{ratings.length}</span>
              </div>
              <motion.button
                className="sort-btn"
                whileTap={{ scale: 0.97 }}
                onClick={handleSort}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                {sorted ? "Sorted by Stars" : "Sort by Stars"}
              </motion.button>
            </div>

            {/* Grid */}
            <div className="ratings-grid">
              <AnimatePresence>
                {ratings.map((r, i) => (
                  <motion.div
                    key={r.id}
                    className="rating-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: i * 0.04 }}
                    layout
                  >
                    <div className="rating-card-accent" />

                    <div className="rating-card-body">
                      {/* Header */}
                      <div className="rating-card-header">
                        <div className="rating-property-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <div className="rating-card-meta">
                          <div className="rating-property-name">
                            {r.house?.location || "Unknown Property"}
                          </div>
                          <div className="rating-by-user">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {r.user?.username || "Anonymous"}
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="rating-stars-row">
                        <div className="rating-stars">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={`star ${s <= r.stars ? "on" : "off"}`}>★</span>
                          ))}
                        </div>
                        <span className="rating-score-label">{r.stars} / 5</span>
                      </div>

                      {/* Comment */}
                      {r.comment && (
                        <p className="rating-comment">{r.comment}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AdminRatingsDashboard;