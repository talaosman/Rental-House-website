import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './AboutUs.css';

const AboutPage = () => {
  const navigate = useNavigate();
  
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
              <img src="team1.jpg" alt="Tala Osman" className="team-image" />
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
              <h4>Tala Osman</h4>
              <p className="team-role">CEO & Co-Founder</p>
              <p className="team-bio">
                Visionary leader with 10+ years in real estate technology
              </p>
            </div>
          </div>

          <div className="team-card-luxury">
            <div className="team-image-wrapper">
              <img src="team2.jpg" alt="Ali Ibrahim" className="team-image" />
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
              <h4>Ali Ibrahim</h4>
              <p className="team-role">Chief Technology Officer</p>
              <p className="team-bio">
                Tech innovator building scalable solutions for modern living
              </p>
            </div>
          </div>

          <div className="team-card-luxury">
            <div className="team-image-wrapper">
              <img src="team3.jpg" alt="Yasmina BouSaid" className="team-image" />
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
              <h4>Yasmina BouSaid</h4>
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
            <button onClick={() => navigate("/about")} className="cta-primary-btn">
              <span>Get Started</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <a 
              href="https://wa.me/96178841333?text=Hello%20RentalHub%2C%20I%20would%20like%20to%20inquire%20about%20your%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-secondary-btn cta-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>Contact Us</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;