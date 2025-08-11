import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./FavoritesPage.css"; // Import the CSS

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      setError("You must be logged in to view favorites.");
      setLoading(false);
      return;
    }

    async function fetchFavorites() {
      try {
        const res = await fetch(`http://localhost:5000/api/favorites/user/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch favorites");
        const data = await res.json();
        setFavorites(data);
      } catch (err) {
        setError(err.message || "Error fetching favorites");
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [userId]);

  const handleRemove = async (propertyId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/favorites/remove?userId=${userId}&propertyId=${propertyId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove favorite");

      setFavorites((prev) => prev.filter(fav => fav.property.id !== propertyId));
    } catch (err) {
      alert(err.message || "Failed to remove favorite");
    }
  };

  if (loading) return <p className="center-text">Loading favorites...</p>;
  if (error) return <p className="center-text error-text">{error}</p>;
  if (favorites.length === 0) {
    return (
      <div className="no-favorites-container">
        <img src="/no-favorites.png" alt="No favorites" className="no-favorites-image" />
        <h2>No Favorites Added</h2>
        <p>You haven’t added any properties to your favorites yet.</p>
      </div>
    );
  }


  return (
    <div className="favorites-container">
      <h1 className="favorites-title">My Favorite Properties</h1>
      <div className="favorites-grid">
        {favorites.map(({ property, id }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="favorite-card"
          >
            <img
              src={
                property.image.startsWith("http")
                  ? property.image // online image
                  : `http://localhost:5000/uploads/${property.image}` // local upload
              }
              alt={property.title}
              className="favorite-image"
            />
            <div className="favorite-content">
              <h3>{property.location}</h3>
              <div className="price">
                ${property.pricePerDay} / day | ${property.pricePerMonth} / month
              </div>
              <p><strong>Type:</strong> {property.propertyType}</p>
              <p><strong>Bedrooms:</strong> {property.nbOfBedrooms}</p>
              <button className="remove-btn" onClick={() => handleRemove(property.id)}>
                Remove from Favorites
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;
