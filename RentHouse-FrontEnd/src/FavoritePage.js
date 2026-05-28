import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FavoritesPage.css";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      setError("You must be logged in to view favorites.");
      setLoading(false);
      return;
    }

    async function fetchFavorites() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/favorites/user/${userId}`);
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
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/favorites/remove?userId=${userId}&propertyId=${propertyId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove favorite");

      setFavorites((prev) => prev.filter(fav => fav.property.id !== propertyId));
    } catch (err) {
      alert(err.message || "Failed to remove favorite");
    }
  };

  const handleViewProperty = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  if (loading) {
    return (
      <div className="favorites-luxury-container">
        <div className="loading-container-favorites">
          <div className="loading-spinner-favorites"></div>
          <p>Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favorites-luxury-container">
        <div className="error-container-favorites">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-luxury-container">
        {/* Hero Section */}
        <section className="favorites-hero">
          <div className="favorites-hero-overlay"></div>
          <div className="favorites-hero-content">
            <h1 className="favorites-hero-title">My Favorites</h1>
            <p className="favorites-hero-subtitle">
              Properties you love, all in one place
            </p>
          </div>
        </section>

        {/* Empty State */}
        <section className="empty-state-section">
          <div className="empty-state-content">
            <div className="empty-state-icon">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h2>No Favorites Yet</h2>
            <p>Start exploring and save properties you love to see them here</p>
            <button onClick={() => navigate("/search")} className="explore-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <span>Explore Properties</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="favorites-luxury-container">
      {/* Hero Section */}
      <section className="favorites-hero">
        <div className="favorites-hero-overlay"></div>
        <div className="favorites-hero-content">
          <h1 className="favorites-hero-title">My Favorites</h1>
          <p className="favorites-hero-subtitle">
            {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
          </p>
        </div>
      </section>

      {/* Favorites Grid */}
      <section className="favorites-content-section">
        <div className="favorites-grid-luxury">
          {favorites.map(({ property, id }, index) => (
            <div
              key={id}
              className="favorite-card-luxury"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="favorite-image-container">
                <img
                  src={
                    property.image.startsWith("http")
                      ? property.image
                      : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/uploads/${property.image}`
                  }
                  alt={property.title}
                  className="favorite-image-luxury"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop";
                  }}
                />
                <button
                  className="remove-favorite-btn"
                  onClick={() => handleRemove(property.id)}
                  title="Remove from favorites"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <div className="favorite-overlay">
                  <button 
                    className="view-property-btn"
                    onClick={() => handleViewProperty(property.id)}
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div className="favorite-info-luxury">
                <h3 className="favorite-title">{property.title}</h3>
                <p className="favorite-location">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {property.location}
                </p>

                <div className="favorite-features-luxury">
                  <span className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    {property.nbOfBedrooms} Beds
                  </span>
                  <span className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    {property.propertyType}
                  </span>
                </div>

                <div className="favorite-pricing">
                  <div className="price-item">
                    <span className="price-label">Per Day</span>
                    <span className="price-value">${property.pricePerDay}</span>
                  </div>
                  <div className="price-divider"></div>
                  <div className="price-item">
                    <span className="price-label">Per Month</span>
                    <span className="price-value">${property.pricePerMonth}</span>
                  </div>
                </div>

                <button
                  className="contact-landlord-btn"
                  onClick={() => handleViewProperty(property.id)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>View Property</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="favorites-cta-section">
        <div className="favorites-cta-content">
          <h2>Looking for More?</h2>
          <p>Explore thousands of properties and find your perfect match</p>
          <button onClick={() => navigate("/search")} className="explore-more-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span>Browse All Properties</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default FavoritesPage;