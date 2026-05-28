import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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

    window.location.href = "/";
  }, [location]);

  return <p>Logging you in...</p>;
}