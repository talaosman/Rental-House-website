import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function OauthSuccess() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get("userId");

    if (!userId) {
      alert("OAuth login failed: no user ID returned");
      return;
    }

    // Fetch the latest user info from backend
    fetch("/api/auth/oauth2/user", {
      method: "GET",
      credentials: "include", // important if using cookies/session
    })
      .then(res => res.json())
      .then(user => {
        localStorage.setItem("userId", user.id);
        localStorage.setItem("username", user.username || "");
        localStorage.setItem("email", user.email || "");
        localStorage.setItem("userRole", user.role || "USER");
        localStorage.setItem(
          "profileImage",
          user.profileImage && user.profileImage !== "null"
            ? user.profileImage
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`
        );

        localStorage.setItem("isLoggedIn", "true");
        if (user.password) {
          // Save the generated password (only shown once!)
          localStorage.setItem("password", user.password);
        }

        // Redirect to homepage
        window.location.href = "/";
      })
      .catch(err => {
        console.error("Failed to fetch OAuth user:", err);
        alert("Login failed");
      });
  }, [location]);

  return <p>Logging you in...</p>;
}
