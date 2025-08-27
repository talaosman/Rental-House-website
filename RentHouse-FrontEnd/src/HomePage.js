import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import TestimonialsCarousel from "./TestimonialsCarousel";
import ChatBot from "./ChatBot.js"; // Import the ChatBot component

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [properties, setProperties] = useState(0);
  const [users, setUsers] = useState(0);

  useEffect(() => {
  let pCounter = setInterval(() => {
    setProperties((prev) => {
      if (prev >= 5000) {
        clearInterval(pCounter);
        return 5000;
      }
      return prev + 50; // increment speed
    });
  }, 20); // slower so user sees it

  let uCounter = setInterval(() => {
    setUsers((prev) => {
      if (prev >= 3200) {
        clearInterval(uCounter);
        return 3200;
      }
      return prev + 40;
    });
  }, 20);

  return () => {
    clearInterval(pCounter);
    clearInterval(uCounter);
  };
}, []);


  const userId = localStorage.getItem("userId");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/searchResult?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  useEffect(() => {
    if (userId) {
      setIsLogin(true); // user is logged in
    }
  }, []);
  // Simple animation on load
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in");
    elements.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 300);
    });
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <div className="hero fade-in">
        <h1>Welcome to RentalHub</h1>
        <p>Your go-to platform for finding and listing rental properties!</p>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Features Section */}
      <div className="features fade-in">
        <div className="feature-card">
          <img src="find.png" alt="Find" className="feature-img" />
          <h3>Find Properties</h3>
          <p>Explore verified rentals by area, price, and amenities.</p>
        </div>
        <div className="feature-card">
          <img src="list.png" alt="List" className="feature-img" />
          <h3>Post a Listing</h3>
          <p>Reach potential tenants fast with our listing tools.</p>
        </div>
        <div className="feature-card">
          <img src="join.png" alt="Join" className="feature-img" />
          <h3>Join the Community</h3>
          <p>Sign up to get exclusive access to deals and alerts.</p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works fade-in">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <span>1</span>
            <h4>Create an Account</h4>
            <p>Sign up and personalize your rental preferences.</p>
          </div>
          <div className="step">
            <span>2</span>
            <h4>Search or List</h4>
            <p>Find a home or publish your property within minutes.</p>
          </div>
          <div className="step">
            <span>3</span>
            <h4>Connect</h4>
            <p>Message landlords or tenants and finalize deals fast.</p>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="why-choose-us fade-in">
        <h2>Why Choose Us</h2>
        <p className="why-choose-description">
          We connect renters and landlords quickly, easily, and reliably across the region.
        </p>
        <div className="stats">
          {/* Google Map Section */}
          <div className="map-section">
            <div className="map-container">
              <iframe
                src="https://www.google.com/maps/d/embed?mid=1Mv98OyCfsBetpF6IUarBm_Ks4FvFZp0&ehbc=2E312F"
                width="640"
                height="480"
                title="Our Location"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
           <div className="stats-container">
      <div className="stat">
        <h3>{properties.toLocaleString()}+</h3>
        <p>Properties Listed</p>
      </div>
      <div className="stat">
        <h3>{users.toLocaleString()}+</h3>
        <p>Satisfied Users</p>
      </div>
      <div className="stat">
        <h3>24/7</h3>
        <p>Support Available</p>
      </div>
    </div>
        </div>
      </div>


     <div className='testimonials'>
      {/* Testimonials */}
      <TestimonialsCarousel />
     </div>
      {/* CTA Section */}
      {!isLogin && (<div className="cta fade-in">
        <h2>Ready to rent or list a property?</h2>
        <button onClick={() => navigate("/about")}>Get Started Now</button>
      </div>)
      }
      <ChatBot />
    </div>
  );
};

export default HomePage;
