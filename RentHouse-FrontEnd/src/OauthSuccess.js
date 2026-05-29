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

    if (!userId) {
      alert("OAuth login failed: no user ID returned");
      return;
    }

    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username || "");
    localStorage.setItem("email", email || "");
    localStorage.setItem("userRole", "USER");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem(
      "profileImage",
      `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "User")}&background=random`
    );

    const saveFcmAndRedirect = async () => {
      try {
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
          console.log("🔥 FCM token saved for OAuth user:", userId);
        } else {
          console.warn("⚠️ FCM token null — permission denied");
        }
      } catch (err) {
        console.error("⚠️ FCM save failed:", err);
      } finally {
        window.location.href = "/";   // ← always redirect after, success or not
      }
    };

    saveFcmAndRedirect();
  }, [location]);
  
  return <p>Logging you in...</p>;
}