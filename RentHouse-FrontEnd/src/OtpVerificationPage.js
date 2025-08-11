import React, { useState } from "react";
import API from "./api";
import { useNavigate } from "react-router-dom";
import "./OtpVerificationPage.css";

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const email = localStorage.getItem("pendingEmail");
  const password = localStorage.getItem("pendingPassword");

  const handleVerify = () => {
    API.post("/api/auth/verify-otp", { email, otp })
      .then(() => {
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
            userData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`
          );
        localStorage.setItem("isLoggedIn", "true");
        localStorage.removeItem("pendingLogin");
        localStorage.removeItem("tempUserData");
        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("pendingPassword");

        alert("OTP Verified! Login successful.");
        navigate("/about");
      })
      .catch(() => alert("Invalid OTP. Try again."));
  };

  return (
    <div className="otp-page">
      <div className="otp-container">
        <h2 className="otp-title">Enter Verification Code</h2>
        <p className="otp-subtitle">We sent a 6-digit code to your email</p>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          className="otp-input"
          maxLength={6}
          inputMode="numeric"
          pattern="\d*"
        />
        <button onClick={handleVerify} className="otp-button" disabled={otp.length !== 6}>
          Verify
        </button>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
