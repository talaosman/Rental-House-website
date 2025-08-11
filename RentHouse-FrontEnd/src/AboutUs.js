import React, { useState, useEffect } from "react";
import './AboutUs.css';

const AboutPage = () => {
  // Simple animation on load
    useEffect(() => {
      const elements = document.querySelectorAll(".fade-in");
      elements.forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 300);
      });
    }, []);
  return (
    <div className="about-page fade-in">
      <section className="about-hero fade-in">
        <h1>About RentalHub</h1>
        <p>Your trusted destination for finding and listing rental properties.</p>
      </section>

      <section className="about-mission fade-in">
        <div className="mission-text fade-in">
          <h2>Our Mission</h2>
          <p>
            At RentalHub, our mission is simple — to connect people with the spaces they need. Whether you're
            looking to find your next home or list a property for rent, we’re here to simplify the process
            through modern tools, verified listings, and real-time support.
          </p>
        </div>
        <img src="mission.avif" alt="Our Mission" />
      </section>

      <section className="about-values fade-in">
        <h2>Our Core Values</h2>
        <div className="value-cards fade-in">
          <div className="value-card fade-in">
            <h3>Transparency</h3>
            <p>We provide clear, accurate, and verified property details for full trust.</p>
          </div>
          <div className="value-card fade-in">
            <h3>Innovation</h3>
            <p>We build intuitive tools that make renting smarter, faster, and easier.</p>
          </div>
          <div className="value-card fade-in">
            <h3>Community</h3>
            <p>We empower users and landlords through a growing, engaged network.</p>
          </div>
        </div>
      </section>

      <section className="about-team fade-in">
        <h2>Meet Our Team</h2>
        <p>We're a group of real estate enthusiasts, tech experts, and community builders.</p>
        <div className="team-members fade-in">
          <div className="team-member fade-in">
            <img src="team1.jpg" alt="Team Member 1" />
            <h4>Sarah Elia</h4>
            <span>CEO & Co-Founder</span>
          </div>
          <div className="team-member fade-in">
            <img src="team2.jpg" alt="Team Member 2" />
            <h4>Omar Nasser</h4>
            <span>CTO</span>
          </div>
          <div className="team-member fade-in">
            <img src="team3.jpg" alt="Team Member 3" />
            <h4>Layal M.</h4>
            <span>Head of UX</span>
          </div>
        </div>
      </section>

      {/* <section className="about-cta">
        <h2>Have questions or want to work with us?</h2>
        <button>Contact Us</button>
      </section> */}
    </div>
  );
};

export default AboutPage;
