import React, { useEffect } from 'react';
import reportWebVitals from './reportWebVitals';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar.js';
import HomePage from './HomePage.js';
import AboutUs from './AboutUs.js';
import SearchListingsPage from './SearchListingsPage.js';
import SearchResult from './SearchResult';
import PropertyDetailsPage from './PropertyDetailsPage.js';
import PostListingPage from './PostListingPage.js';
import AboutContactPage from './AboutContactPage.js';
import SearchListings from './SearchListingsPage.js';
import Schedule from './Schedule.js';
import { AppStateProvider } from './listingContext.js';
import ProtectedRoute from './ProtectedRoute'
import UserProfile from './UserProfile.js';
import FavoritesPage from './FavoritePage.js'
import FeedbackForm from './FeedbackPage.js';
import EditHouseForm from './EditHouseForm';
import OtpVerificationPage from "./OtpVerificationPage";
import AdminFeedbackPage from './AdminFeedbackPage.js';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import OauthSuccess from './OauthSuccess.js';
import AdminRatingsDashboard from './AdminRatingsDashboard.js';
import OwnerDashboard from "./OwnerDashboard";
import { requestNotificationPermission } from "./firebase";
import AdminUserManagement from "./AdminUserManagement";


import { onForegroundMessage } from "./firebase";

const Eelement = document.getElementById('root');
const rootEelement = createRoot(Eelement);

const stripePromise = loadStripe("pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK");

const App = () => {


  useEffect(() => {
    const shouldSaveFcm = localStorage.getItem("pendingFcmSave");
    const userId = localStorage.getItem("userId");
    if (shouldSaveFcm && userId) {
      localStorage.removeItem("pendingFcmSave");
      requestNotificationPermission().then(token => {
        if (token) {
          fetch(`${process.env.REACT_APP_API_URL}/api/users/${userId}/fcm-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fcmToken: token })
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("📨 Foreground notification:", payload);

      const { title, body } = payload.notification || {};
      const houseId = payload.data?.houseId;

      if (Notification.permission === "granted" && title) {
        const notif = new Notification(title, {
          body,
          icon: "/logo192.png"
        });

        notif.onclick = () => {
          if (houseId) {
            window.location.href = `/property/${houseId}`;
          }
        };
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log("✅ Service Worker registered:", registration);
          })
          .catch((err) => {
            console.error("❌ Service Worker failed:", err);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchListings />} />
        <Route path="/searchResult" element={<SearchResult />} />

        <Route path="/property/:id" element={
          <Elements stripe={stripePromise}>
            <PropertyDetailsPage />
          </Elements>
        } />

        <Route
          path="/post"
          element={
            <ProtectedRoute>
              <PostListingPage />
            </ProtectedRoute>
          }
        />

        <Route path="/aboutUs" element={<AboutUs />} />
        <Route path="/about" element={<AboutContactPage />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/feedback" element={<FeedbackForm />} />
        <Route path="/edit-house/:id" element={<EditHouseForm />} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />
        <Route path="/adminFeedback" element={<AdminFeedbackPage />} />
        <Route path="/adminRating" element={<AdminRatingsDashboard />} />
        <Route path="/oauth-success" element={<OauthSuccess />} />
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/admin-users" element={<AdminUserManagement />} />

      </Routes>
    </Router>
  );
};

rootEelement.render(
  <AppStateProvider>
    <App />
  </AppStateProvider>
);

reportWebVitals();