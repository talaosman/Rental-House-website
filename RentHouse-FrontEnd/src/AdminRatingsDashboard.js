import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./AdminRatingsDashboard.css"; // we'll style it separately

const AdminRatingsDashboard = () => {
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/ratings");
      const data = await res.json();
      setRatings(Array.isArray(data) ? data : data.ratings || []);

    } catch (err) {
      console.error("Error fetching ratings:", err);
      setRatings([]); // Fallback to empty array on error
    }
  };

  const sortByStars = () => {
    const sorted = [...ratings].sort((a, b) => b.stars - a.stars);
    setRatings(sorted);
  };

  return (
    <motion.div
      className="admin-ratings-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <h2>🏆 Admin Ratings Dashboard</h2>
      <p className="subtitle">View all user ratings across properties</p>

      <div className="actions">
        <motion.button whileTap={{ scale: 0.95 }} onClick={sortByStars}>
          Sort by Stars ⭐
        </motion.button>
      </div>

      {ratings.length === 0 ? (
        <p className="no-ratings">No ratings available.</p>
      ) : (
        <div className="ratings-grid">
          {ratings.map((r) => (
            <motion.div
              key={r.id}
              className="rating-card"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rating-header">
                <span className="house-name">{r.house?.location || "Unknown Property"}</span>
                <span className="user-name">by {r.user?.username || "Anonymous"}</span>
              </div>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} style={{ color: s <= r.stars ? "gold" : "#ccc" }}>★</span>
                ))}
              </div>
              {r.comment && <p className="rating-comment">"{r.comment}"</p>}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AdminRatingsDashboard;
