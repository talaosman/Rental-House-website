import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import TestimonialsCarousel from "./TestimonialsCarousel";
import ChatBot from "./ChatBot.js";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [properties, setProperties] = useState(0);
  const [users, setUsers] = useState(0);
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pCounter = setInterval(() => {
      setProperties((prev) => {
        if (prev >= 5000) { clearInterval(pCounter); return 5000; }
        return prev + 50;
      });
    }, 20);
    let uCounter = setInterval(() => {
      setUsers((prev) => {
        if (prev >= 3200) { clearInterval(uCounter); return 3200; }
        return prev + 40;
      });
    }, 20);
    return () => { clearInterval(pCounter); clearInterval(uCounter); };
  }, []);

  const userId = localStorage.getItem("userId");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/searchResult?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    if (userId) setIsLogin(true);
  }, [userId]);

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in-up");
    elements.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 150);
    });
  }, []);

  useEffect(() => {
    const fetchMostRentedProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/houses/most-rented");
        if (response.ok) {
          const data = await response.json();
          setFeaturedProperties(data);
        } else {
          setFeaturedProperties([]);
        }
      } catch (error) {
        console.error("Error fetching most rented properties:", error);
        setFeaturedProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMostRentedProperties();
  }, []);

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="home-luxury">

      {/* Hero */}
      <section className="hero-luxury fade-in-up">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Finding Your New Home Is Simple</h1>
          <p className="hero-subtitle">
            We provide high-quality rental listings to help you find the perfect home
          </p>
          <div className="search-bar-luxury">
            <input
              type="text"
              placeholder="Search for properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input-luxury"
            />
            <button onClick={handleSearch} className="search-button-luxury">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Most Rented */}
      <section className="properties-section fade-in-up">
        <h2 className="section-title">Most Rented</h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading properties...</p>
          </div>
        ) : featuredProperties.length > 0 ? (
          <div className="properties-grid">
            {featuredProperties.map((property, index) => (
              <div
                key={property.id}
                className="property-card"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handlePropertyClick(property.id)}
              >
                {/* Image */}
                <div className="property-image-container">
                  <img
                    src={
                      property.image.startsWith("http")
                        ? property.image
                        : `http://localhost:5000/uploads/${property.image}`
                    }
                    alt={property.title}
                    className="property-image"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="property-overlay">
                    <button className="view-details-btn">View Details</button>
                  </div>
                </div>

              
                <div className="property-infoHome">

              
                  <h3 className="property-name">
                    {property.title}
                  </h3>

                  {/* Address on its own line */}
                  <p className="property-address">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {property.location}
                  </p>

                  {/* Features on their own line */}
                  <div className="property-features">
                    <span className="feature-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                      {property.nbOfBedrooms} {property.nbOfBedrooms === 1 ? 'Bed' : 'Beds'}
                    </span>
                    <span className="feature-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      </svg>
                      {property.propertyType}
                    </span>
                  </div>

                  {/* Price on its own line */}
                  <p className="property-price">
                    ${property.pricePerMonth?.toLocaleString() || property.pricePerDay?.toLocaleString()}
                    <span>/month</span>
                  </p>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-properties">
            <p>No properties available at the moment.</p>
          </div>
        )}
      </section>

    
      <section className="features-luxury fade-in-up">
        <div className="features-grid-luxury">
          <div className="feature-card-luxury">
            <div className="feature-icon-luxury">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <h3>Find Properties</h3>
            <p>Explore verified rentals by area, price, and amenities with our advanced search.</p>
          </div>
          <div className="feature-card-luxury">
            <div className="feature-icon-luxury">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <h3>Post a Listing</h3>
            <p>Reach potential tenants fast with our powerful listing tools and wide reach.</p>
          </div>
          <div className="feature-card-luxury">
            <div className="feature-icon-luxury">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>Join the Community</h3>
            <p>Sign up to get exclusive access to deals, alerts, and our trusted network.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section-luxury fade-in-up">
        <div className="stats-content">
          <div className="map-wrapper">
            <iframe
              src="https://www.google.com/maps/d/embed?mid=1Mv98OyCfsBetpF6IUarBm_Ks4FvFZp0&ehbc=2E312F"
              width="100%" height="100%"
              title="Our Location"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          <div className="stats-wrapper">
            <div className="stat-card">
              <h3 className="stat-number">{properties.toLocaleString()}+</h3>
              <p className="stat-label">Properties Listed</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-number">{users.toLocaleString()}+</h3>
              <p className="stat-label">Satisfied Users</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-number">24/7</h3>
              <p className="stat-label">Support Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-luxury fade-in-up">
        <TestimonialsCarousel />
      </section>

      {/* CTA */}
      {!isLogin && (
        <section className="cta-luxury fade-in-up">
          <div className="cta-content">
            <h2>Ready to Find Your Dream Home?</h2>
            <p>Join thousands of satisfied renters and landlords on RentalHub</p>
            <button onClick={() => navigate("/about")} className="cta-button-luxury">
              Get Started Now
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </section>
      )}

      <ChatBot />
    </div>
  );
};

export default HomePage;