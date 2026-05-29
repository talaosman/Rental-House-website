import React, { useState } from "react";
import API from "./api";
import { useNavigate } from "react-router-dom";
import "./OtpVerificationPage.css";

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const email = localStorage.getItem("pendingEmail");
  const password = localStorage.getItem("pendingPassword");

  const saveFcmTokenToBackend = async (userId) => {
      try {
        console.log("🔥 Requesting FCM permission for user:", userId);
        // eslint-disable-next-line no-undef
        const token = await requestNotificationPermission();
        console.log("🔥 Got token:", token);
        if (token) {
          const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/users/${userId}/fcm-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fcmToken: token })
          });
          const data = await res.json();
          console.log("🔥 Backend response:", data);
        } else {
          console.warn("⚠️ Token is null — notification permission was denied or not granted");
        }
      } catch (error) {
        console.error("⚠️ FCM error:", error);
      }
    };

  const handleVerify = async () => {         // ← async
  try {
    await API.post("/api/auth/verify-otp", { email, otp });
    const userData = JSON.parse(localStorage.getItem("tempUserData"));
    localStorage.setItem("userId", userData.id);
    localStorage.setItem("authHeader", "Basic " + btoa(`${email}:${password}`));
    localStorage.setItem("userRole", userData.role);
    localStorage.setItem("username", userData.username);
    localStorage.setItem("email", email);
    localStorage.setItem("password", password);
    localStorage.setItem("phoneNumber", userData.phoneNumber);
    localStorage.setItem(
      "profileImage",
      userData.profileImage ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`
    );
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("pendingLogin");
    localStorage.removeItem("tempUserData");
    localStorage.removeItem("pendingEmail");
    localStorage.removeItem("pendingPassword");

    await saveFcmTokenToBackend(userData.id); 

    alert("OTP Verified! Login successful.");
    navigate("/about");
  } catch {
    alert("Invalid OTP. Try again.");
  }
};

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
  };

  // Mask email for display
  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1•••$2")
    : "your email";

  return (
    <div className="otp-page">

      {/* ── Left: Hero Panel ── */}
      <div className="otp-hero">
        <div className="otp-hero-logo">
          <div className="otp-hero-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="otp-hero-logo-text">RentalHub</span>
        </div>

        <div className="otp-hero-body">
          <span className="otp-hero-eyebrow">Account Security</span>
          <h1 className="otp-hero-title">
            One last <em>step</em><br />to get in
          </h1>
          <p className="otp-hero-desc">
            We protect every account with email verification.
            Enter the code we sent you to complete your sign-in.
          </p>
        </div>
      </div>

      {/* ── Right: OTP Form Panel ── */}
      <div className="otp-form-panel">
        <div className="otp-container">
          <div className="otp-accent-bar" />

          {/* Shield icon */}
          <div className="otp-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>

          <h2 className="otp-title">Verify your email</h2>
          <p className="otp-subtitle">
            We sent a 6-digit verification code to
          </p>

          <div className="otp-email-chip">
            <span className="otp-email-chip-dot" />
            {maskedEmail}
          </div>

          <label className="otp-input-label">Verification code</label>
          <input
            type="text"
            value={otp}
            onChange={handleOtpChange}
            placeholder="······"
            className="otp-input"
            maxLength={6}
            inputMode="numeric"
            pattern="\d*"
            autoFocus
          />

          {/* Progress dots */}
          <div className="otp-progress">
            {[0,1,2,3,4,5].map(i => (
              <span key={i} className={`otp-dot ${i < otp.length ? "filled" : ""}`} />
            ))}
          </div>

          <button
            onClick={handleVerify}
            className="otp-button"
            disabled={otp.length !== 6}
          >
            Verify & Continue
          </button>

          <button className="otp-back" onClick={() => navigate("/about")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to sign in
          </button>
        </div>
      </div>

    </div>
  );
};

export default OtpVerificationPage;