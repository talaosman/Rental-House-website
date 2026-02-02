import React, { useState, useEffect } from "react";
import './AboutUs.css';

const AboutPage = () => {
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in-luxury");
    elements.forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 150);
    });
  }, []);

  return (
    <div className="about-luxury-container">
      {/* Hero Section */}
      <section className="about-hero-luxury fade-in-luxury">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">Welcome to RentalHub</h1>
          <p className="about-hero-subtitle">
            Connecting people with exceptional rental spaces since 2020
          </p>
          <div className="hero-stats">
            <div className="hero-stat-item">
              <h3>5,000+</h3>
              <p>Properties Listed</p>
            </div>
            <div className="hero-stat-item">
              <h3>3,200+</h3>
              <p>Happy Tenants</p>
            </div>
            <div className="hero-stat-item">
              <h3>24/7</h3>
              <p>Customer Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-luxury-section fade-in-luxury">
        <div className="mission-content-wrapper">
          <div className="mission-image-side">
            <div className="mission-image-container">
              <img src="mission.avif" alt="Our Mission" className="mission-image" />
              <div className="mission-image-overlay">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div className="mission-text-side">
            <div className="section-badge">Our Mission</div>
            <h2 className="section-title-luxury">Simplifying the Rental Experience</h2>
            <p className="mission-description">
              At RentalHub, our mission is to revolutionize the way people find and list rental properties. 
              We believe that everyone deserves a seamless, transparent, and trustworthy experience when 
              searching for their next home or listing their property.
            </p>
            <p className="mission-description">
              Through innovative technology, verified listings, and dedicated support, we connect landlords 
              with quality tenants and help renters discover their perfect space. Our platform is built on 
              trust, transparency, and a commitment to excellence.
            </p>
            <div className="mission-highlights">
              <div className="highlight-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Verified Property Listings</span>
              </div>
              <div className="highlight-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Real-Time Support</span>
              </div>
              <div className="highlight-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Secure Transactions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-luxury-section fade-in-luxury">
        <div className="values-header">
          <div className="section-badge">Our Principles</div>
          <h2 className="section-title-luxury">Core Values That Drive Us</h2>
          <p className="section-subtitle">
            Our values shape every decision we make and every feature we build
          </p>
        </div>
        <div className="values-grid">
          <div className="value-card-luxury">
            <div className="value-icon-wrapper transparency">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <h3>Transparency</h3>
            <p>
              We provide clear, accurate, and verified property details to build trust and confidence 
              in every transaction. No hidden fees, no surprises.
            </p>
          </div>

          <div className="value-card-luxury">
            <div className="value-icon-wrapper innovation">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <h3>Innovation</h3>
            <p>
              We continuously develop intuitive tools and features that make the rental process 
              smarter, faster, and more efficient for everyone.
            </p>
          </div>

          <div className="value-card-luxury">
            <div className="value-icon-wrapper community">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>Community</h3>
            <p>
              We empower both renters and landlords through an engaged, supportive network 
              that grows stronger every day.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-luxury-section fade-in-luxury">
        <div className="team-header">
          <div className="section-badge">Our Team</div>
          <h2 className="section-title-luxury">Meet the People Behind RentalHub</h2>
          <p className="section-subtitle">
            A passionate team of real estate enthusiasts, tech experts, and community builders 
            dedicated to transforming the rental experience
          </p>
        </div>
        <div className="team-grid">
          <div className="team-card-luxury">
            <div className="team-image-wrapper">
              <img src="team1.jpg" alt="Sarah Elia" className="team-image" />
              <div className="team-overlay">
                <div className="team-social">
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="team-info">
              <h4>Sarah Elia</h4>
              <p className="team-role">CEO & Co-Founder</p>
              <p className="team-bio">
                Visionary leader with 10+ years in real estate technology
              </p>
            </div>
          </div>

          <div className="team-card-luxury">
            <div className="team-image-wrapper">
              <img src="team2.jpg" alt="Omar Nasser" className="team-image" />
              <div className="team-overlay">
                <div className="team-social">
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="team-info">
              <h4>Omar Nasser</h4>
              <p className="team-role">Chief Technology Officer</p>
              <p className="team-bio">
                Tech innovator building scalable solutions for modern living
              </p>
            </div>
          </div>

          <div className="team-card-luxury">
            <div className="team-image-wrapper">
              <img src="team3.jpg" alt="Layal M." className="team-image" />
              <div className="team-overlay">
                <div className="team-social">
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="team-info">
              <h4>Layal M.</h4>
              <p className="team-role">Head of User Experience</p>
              <p className="team-bio">
                Design expert creating intuitive, beautiful interfaces
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-luxury-section fade-in-luxury">
        <div className="cta-content-luxury">
          <h2>Ready to Find Your Perfect Space?</h2>
          <p>Join thousands of satisfied renters and landlords on RentalHub today</p>
          <div className="cta-buttons">
            <button className="cta-primary-btn">
              <span>Get Started</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="cta-secondary-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>Contact Us</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;