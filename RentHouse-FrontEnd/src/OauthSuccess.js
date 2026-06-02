import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { requestNotificationPermission } from "./firebase";

export default function OauthSuccess() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get("userId");
    const username = params.get("username");
    const email = params.get("email");
    const role = params.get("role") || "USER";

    if (!userId) {
      alert("OAuth login failed: no user ID returned");
      window.location.href = "/about";
      return;
    }

    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username || "");
    localStorage.setItem("email", email || "");
    localStorage.setItem("userRole", role);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem(
      "profileImage",
      `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "User")}&background=random`
    );

    // ─── KEY FIX for OAuth ────────────────────────────────────────────────
    // The original code had TWO redirects:
    //   1. window.location.href = "/" inside saveFcmAndRedirect (after await)
    //   2. window.location.href = "/" immediately after calling saveFcmAndRedirect
    //
    // The second one fired instantly, navigating away BEFORE the async FCM
    // permission dialog could appear — so the browser killed it and returned null.
    //
    // Fix: remove the immediate redirect. Only redirect inside the async
    // function, after FCM is done. This page stays alive long enough for
    // the permission prompt to show.
    // ─────────────────────────────────────────────────────────────────────

    const saveFcmAndRedirect = async () => {
      try {
        // For OAuth, the page loaded from a redirect so there's no
        // click gesture — but the permission prompt CAN appear on page load
        // if triggered quickly. We still try; if the user already granted
        // permission before, getToken() works without a prompt.
        const token = await requestNotificationPermission();
        if (token) {
          await fetch(
            `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/users/${userId}/fcm-token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fcmToken: token }),
            }
          );
          console.log("✅ FCM token saved for OAuth user:", userId);
        } else {
          // Permission was denied or not yet granted.
          // Save a flag so App.jsx retries on next user interaction.
          localStorage.setItem("pendingFcmSave", "true");
          console.warn("⚠️ FCM null for OAuth — will retry on next load");
        }
      } catch (err) {
        console.error("⚠️ FCM save failed:", err);
        localStorage.setItem("pendingFcmSave", "true");
      } finally {
        // ← only ONE redirect, here, after FCM attempt completes
        const roleLower = (role || "").toLowerCase().trim();
        if (roleLower === "house_owner") {
          window.location.href = "/owner-dashboard";
        } else if (roleLower === "admin") {
          window.location.href = "/search";
        } else {
          window.location.href = "/";
        }
      }
    };

    // Call it — do NOT add another window.location.href after this line
    saveFcmAndRedirect();

    // ← REMOVED: localStorage.setItem("pendingFcmSave", "true");
    // ← REMOVED: window.location.href = "/";   ← this was the bug
  }, [location]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: "16px",
      fontFamily: "sans-serif",
      color: "#0d2d52"
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid #dde5ef",
        borderTop: "3px solid #0d2d52",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite"
      }} />
      <p>Logging you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}