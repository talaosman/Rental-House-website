import React, { useState, useEffect } from "react";
import "./AboutContactPage.css";
import API from "./api";

const AboutContactPage = () => {
  const [isSigningIn, setIsSigningIn] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);




  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (isLoggedIn) {
      window.location.href = "/"; // redirect if already logged in
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    if (!isSigningIn) {
       setShowModal(true); // Show modal for OTP
      // Sign up request
      API.post("/api/auth/signup", {
        username: name,
        email: email,
        password: password,
        role: "USER",
        phoneNumber: phoneNumber,
      })
        .then((res) => {
          const userData = res.data;
          const { id, role, username, phoneNumber, profileImage } = res.data;

          localStorage.setItem("userId", id);
          localStorage.setItem("authHeader", "Basic " + btoa(`${email}:${password}`));
          localStorage.setItem("userRole", role);
          localStorage.setItem("username", username);
          localStorage.setItem("email", email);
          localStorage.setItem("password", password);
          localStorage.setItem("phoneNumber", phoneNumber);
          localStorage.setItem(
            "profileImage",
            profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
          );
          localStorage.setItem("pendingLogin", "true");
          localStorage.setItem("tempUserData", JSON.stringify(userData));
          localStorage.setItem("pendingEmail", email);
          localStorage.setItem("pendingPassword", password);

          // Send OTP
          API.post("/api/auth/send-otp", { email })
            .then(() => {
              setShowModal(false);
              alert("Signup successful! OTP sent to email.");
              window.location.href = "/verify-otp";
            })
            .catch(() => {
              alert("Failed to send OTP");
              setIsLoading(false);
              setShowModal(false);
            });
        })
        .catch((err) => {
          if (err.response?.status === 409) {
            alert("Email already exists.");
          } else {
            alert("Signup failed. Try again.");
          }
          setIsLoading(false); // Stop loading
        });

    } else {
      // Sign in request
      API.post("/api/auth/login", {
        email,
        password,
      })
        .then((res) => {
          const { id, role, username, phoneNumber, profileImage } = res.data;

          localStorage.setItem("userId", id);
          localStorage.setItem("authHeader", "Basic " + btoa(`${email}:${password}`));
          localStorage.setItem("userRole", role);
          localStorage.setItem("username", username);
          localStorage.setItem("email", email);
          localStorage.setItem("password", password);
          localStorage.setItem("phoneNumber", phoneNumber);
          localStorage.setItem(
            "profileImage",
            profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
          );
          localStorage.setItem("isLoggedIn", "true");

          alert("Login successful!");
          window.location.href = role.toLowerCase() === "admin" ? "/search" : "/";
        })
        .catch(() => {
          alert("Invalid login credentials");
          setIsLoading(false); // Stop loading
        });
    }
  };

  const toggleForm = () => {
    setIsSigningIn((prevState) => !prevState);
  };

  const [formContainerClass, setFormContainerClass] =
    useState("form-container");
  const [formHeadingClass, setFormHeadingClass] = useState("form-heading");
  const [formButtonClass, setFormButtonClass] = useState("button");
  const [formMessage, setFormMessage] = useState(
    isSigningIn
      ? "To keep connected with us, please login with your personal info"
      : "Enter your personal details and start your journey with us"
  );

  const handleFormToggle = () => {
    setFormContainerClass("form-container toggling");
    setFormHeadingClass("form-heading toggling");
    setFormButtonClass("button toggling");
    setFormMessage(
      isSigningIn
        ? "Enter your personal details and start your journey with us"
        : "To keep connected with us, please login with your personal info"
    );

    setTimeout(() => {
      setIsSigningIn((prevState) => !prevState);
      setFormContainerClass("form-container");
      setFormHeadingClass("form-heading");
      setFormButtonClass("button");
    }, 500);
  };

  return (
    <div className="container">
      {/* <section className="about-section">
        <div className="about-content">
          <h2 className="heading">About Us</h2>
          <p className="about-text">
            Our mission is to make finding rental properties easy and accessible for everyone.
          </p>
        </div>
      </section> */}

      <section className="contact-section">
        <div className={formContainerClass}>
          <h3 className={formHeadingClass}>
            {isSigningIn ? "Sign In" : "Sign Up"}
          </h3>
          <p className="form-message">{formMessage}</p>
          <form onSubmit={handleSubmit} className="form">
            {!isSigningIn && (
              <input
                type="text"
                placeholder="Your Name"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            )}
            <input
              type="email"
              placeholder="Your Email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className={formButtonClass} disabled={isLoading}>
              {isLoading ? (isSigningIn ? "Signing In..." : "Signing Up...") : (isSigningIn ? "Sign In" : "Sign Up")}
            </button>

            <p className="toggle-form" onClick={handleFormToggle}>
              {isSigningIn
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </p>
          </form>
          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="spinner"></div>
                <p>Sending OTP to your email... Please wait.</p>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
};

export default AboutContactPage;
