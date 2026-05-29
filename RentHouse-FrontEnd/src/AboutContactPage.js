import React, { useState, useEffect } from "react";
import "./AboutContactPage.css";
import API from "./api";
import { requestNotificationPermission } from "./firebase";



const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearErr = () => setError("");


  const handleSendCode = async (e) => {
    e.preventDefault();
    clearErr();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res = await API.post("/api/auth/forgot-password/send-code", { email: email.trim() });
      if (res.status === 200) setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };


  const handleVerifyCode = async (e) => {
    e.preventDefault();
    clearErr();
    if (code.length !== 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true);
    try {
      const res = await API.post("/api/auth/forgot-password/verify-code", {
        email: email.trim(), code: code.trim(),
      });
      if (res.data?.verified) setStep("reset");
      else setError("Invalid code. Please try again.");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired code.");
    } finally { setLoading(false); }
  };


  const handleReset = async (e) => {
    e.preventDefault();
    clearErr();
    if (pass.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (pass !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await API.post("/api/auth/forgot-password/reset", {
        email: email.trim(),
        code: code.trim(),
        newPassword: pass,
        confirmPassword: confirm,
      });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fp-backdrop" onClick={onClose}>
      <div className="fp-modal" onClick={(e) => e.stopPropagation()}>


        <button className="fp-close" onClick={onClose}>✕</button>


        {step === "email" && (
          <>
            <div className="fp-icon">🔑</div>
            <h3 className="fp-title">Forgot password?</h3>
            <p className="fp-sub">
              Enter the email linked to your account and we'll send you a reset code.
            </p>
            {error && <div className="fp-error">{error}</div>}
            <form onSubmit={handleSendCode} className="fp-form">
              <div className="fp-field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button type="submit" className="fp-btn" disabled={loading}>
                {loading ? <><span className="fp-spin" /> Sending…</> : "Send Reset Code"}
              </button>
            </form>
          </>
        )}


        {step === "code" && (
          <>
            <div className="fp-icon">📧</div>
            <h3 className="fp-title">Check your inbox</h3>
            <p className="fp-sub">
              We sent a 6-digit code to <strong>{email}</strong>.<br />
              Enter it below — it expires in 15 minutes.
            </p>
            {error && <div className="fp-error">{error}</div>}
            <form onSubmit={handleVerifyCode} className="fp-form">
              <div className="fp-field">
                <label>Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="_ _ _ _ _ _"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="fp-code-input"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button type="submit" className="fp-btn" disabled={loading || code.length !== 6}>
                {loading ? <><span className="fp-spin" /> Verifying…</> : "Verify Code"}
              </button>
              <button
                type="button"
                className="fp-link"
                onClick={() => { setStep("email"); setCode(""); clearErr(); }}
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}


        {step === "reset" && (
          <>
            <div className="fp-icon">🔒</div>
            <h3 className="fp-title">Set new password</h3>
            <p className="fp-sub">Choose a strong password of at least 6 characters.</p>
            {error && <div className="fp-error">{error}</div>}
            <form onSubmit={handleReset} className="fp-form">
              <div className="fp-field">
                <label>New password</label>
                <div className="fp-pass-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="New password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="fp-eye"
                    onClick={() => setShowPass((p) => !p)}
                    tabIndex={-1}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>

                {pass.length > 0 && (
                  <div className="fp-strength">
                    <div
                      className={`fp-strength-bar ${pass.length < 6 ? "weak" :
                        pass.length < 10 ? "medium" : "strong"
                        }`}
                      style={{ width: `${Math.min(100, (pass.length / 14) * 100)}%` }}
                    />
                    <span className="fp-strength-lbl">
                      {pass.length < 6 ? "Too short" :
                        pass.length < 10 ? "Medium" : "Strong"}
                    </span>
                  </div>
                )}
              </div>

              <div className="fp-field">
                <label>Confirm password</label>
                <div className="fp-pass-wrap">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="fp-eye"
                    onClick={() => setShowConfirm((p) => !p)}
                    tabIndex={-1}
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirm.length > 0 && pass !== confirm && (
                  <p className="fp-nomatch">Passwords don't match</p>
                )}
                {confirm.length > 0 && pass === confirm && pass.length >= 6 && (
                  <p className="fp-match">✓ Passwords match</p>
                )}
              </div>

              <button
                type="submit"
                className="fp-btn"
                disabled={loading || pass.length < 6 || pass !== confirm}
              >
                {loading ? <><span className="fp-spin" /> Saving…</> : "Reset Password"}
              </button>
            </form>
          </>
        )}


        {step === "done" && (
          <div className="fp-done">
            <div className="fp-done-check">✓</div>
            <h3 className="fp-title">Password reset!</h3>
            <p className="fp-sub">
              Your password has been updated successfully.<br />
              You can now sign in with your new password.
            </p>
            <button
              className="fp-btn"
              onClick={onClose}
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AboutContactPage = () => {
  const [isSigningIn, setIsSigningIn] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showForgot, setShowForgot] = useState(false);  // ← new

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (isLoggedIn) window.location.href = "/";
  }, []);

  const saveFcmTokenToBackend = async (userId) => {
    try {
      console.log("🔥 Requesting FCM permission for user:", userId);
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
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isSigningIn) {
      setShowModal(true);
      API.post("/api/auth/signup", {
        username: name, email, password, role: "USER", phoneNumber,
      })
        .then((res) => {
          const userData = res.data;
          const { id, role, username, phoneNumber: ph, profileImage } = res.data;
          localStorage.setItem("userId", id);
          localStorage.setItem("authHeader", "Basic " + btoa(`${email}:${password}`));
          localStorage.setItem("userRole", role);
          localStorage.setItem("username", username);
          localStorage.setItem("email", email);
          localStorage.setItem("password", password);
          localStorage.setItem("phoneNumber", ph);
          localStorage.setItem("profileImage", profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`);
          localStorage.setItem("pendingLogin", "true");
          localStorage.setItem("tempUserData", JSON.stringify(userData));
          localStorage.setItem("pendingEmail", email);
          localStorage.setItem("pendingPassword", password);
          API.post("/api/auth/send-otp", { email })
            .then(() => {
              setShowModal(false);
              alert("Signup successful! OTP sent to email.");
              window.location.href = "/verify-otp";
            })
            .catch(() => {
              alert("Failed to send OTP");
              setIsLoading(false); setShowModal(false);
            });
        })
        .catch((err) => {
          if (err.response?.status === 409) alert("Email already exists.");
          else alert("Signup failed. Try again.");
          setIsLoading(false);
        });

    } else {
      API.post("/api/auth/login", { email, password })
        .then(async (res) => {
          const { id, role, username, phoneNumber: ph, profileImage } = res.data;
          localStorage.setItem("userId", id);
          localStorage.setItem("authHeader", "Basic " + btoa(`${email}:${password}`));
          localStorage.setItem("userRole", role);
          localStorage.setItem("username", username);
          localStorage.setItem("email", email);
          localStorage.setItem("password", password);
          localStorage.setItem("phoneNumber", ph);
          localStorage.setItem("profileImage", profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`);
          localStorage.setItem("isLoggedIn", "true");
          await saveFcmTokenToBackend(id)

          const roleLower = (role || "").toLowerCase().trim();

          if (roleLower === "admin") {
            window.location.href = "/search";
          } else if (roleLower === "house_owner") {
            try {
              const ownerRes = await fetch(
                `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/owner/resolve?userId=${id}`
              );
              if (ownerRes.ok) {
                const ownerData = await ownerRes.json();
                localStorage.setItem("ownerId", ownerData.ownerId);
                localStorage.setItem("ownerName", ownerData.ownerName);
              }
            } catch { /* continue anyway */ }
            window.location.href = "/owner-dashboard";
          } else {
            window.location.href = "/";
          }
        })
        .catch((err) => {   
          if (err.response?.status === 403) {
            alert("Please verify your email first. Check your inbox for the OTP code.");
            localStorage.setItem("pendingEmail", email);
            window.location.href = "/verify-otp";
          } else {
            alert("Invalid login credentials");
          }
          setIsLoading(false);
        });
    }
  };

  const [formContainerClass, setFormContainerClass] = useState("form-container");
  const [formMessage, setFormMessage] = useState(
    "To keep connected with us, please login with your personal info"
  );

  const handleFormToggle = () => {
    setFormContainerClass("form-container toggling");
    setFormMessage(
      isSigningIn
        ? "Enter your personal details and start your journey with us"
        : "To keep connected with us, please login with your personal info"
    );
    setTimeout(() => {
      setIsSigningIn((prev) => !prev);
      setFormContainerClass("form-container");
    }, 300);
  };

  return (
    <div className="container">


      <div className="hero-panel">
        <div className="hero-logo">
          <div className="hero-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="hero-logo-text">RentalHub</span>
        </div>
        <div className="hero-body">
          <span className="hero-eyebrow">Premium Rentals</span>
          <h1 className="hero-title">
            Find your <em>perfect</em><br />place to stay
          </h1>
          <p className="hero-desc">
            Discover handpicked properties, earn loyalty rewards,
            and enjoy a seamless rental experience built around you.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">2,400+</span>
              <span className="hero-stat-label">Properties</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">98%</span>
              <span className="hero-stat-label">Satisfaction</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">12k</span>
              <span className="hero-stat-label">Happy guests</span>
            </div>
          </div>
        </div>
      </div>


      <section className="contact-section">
        <div className={formContainerClass}>
          <div className="form-accent-bar" />

          <h3 className="form-heading">
            {isSigningIn ? "Welcome back" : "Create account"}
          </h3>
          <p className="form-message">{formMessage}</p>

          <form onSubmit={handleSubmit} className="form">

            {!isSigningIn && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text" placeholder="Your full name" required
                  className="input" value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email" placeholder="you@example.com" required
                className="input" value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password" placeholder="••••••••" required
                className="input" value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              <div className="input-label-row">
                {isSigningIn && (
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => setShowForgot(true)}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </div>

            <button type="submit" className="button" disabled={isLoading}>
              {isLoading
                ? (isSigningIn ? "Signing in…" : "Creating account…")
                : (isSigningIn ? "Sign In" : "Create Account")}
            </button>

            <p className="toggle-form" onClick={handleFormToggle}>
              {isSigningIn
                ? <> Don't have an account? <span>Sign Up</span></>
                : <> Already have an account? <span>Sign In</span></>}
            </p>
          </form>

          <div className="oauth-section">
            <div className="oauth-divider"><span>or continue with</span></div>
            <button
              type="button" className="oauth-btn google"
              onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/oauth2/authorization/google`}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="oauth-icon" />
              Continue with Google
            </button>
            <button
              type="button" className="oauth-btn github"
              onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/oauth2/authorization/github`}
            >
              <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub" className="oauth-icon" />
              Continue with GitHub
            </button>
          </div>

          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="spinner" />
                <p>Sending OTP to your email…<br />Please wait a moment.</p>
              </div>
            </div>
          )}
        </div>
      </section>


      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}

    </div>
  );
};

export default AboutContactPage;