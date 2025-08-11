import React from 'react';
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
import Schedule from './Schedule.js'; // Import the new Schedule page
import { AppStateProvider } from './listingContext.js'; // Import the context provider
import ProtectedRoute from './ProtectedRoute'
import UserProfile from './UserProfile.js'; // Import the UserProfile component
import FavoritesPage from './FavoritePage.js'
import FeedbackForm from './FeedbackPage.js';
import EditHouseForm from './EditHouseForm';
import OtpVerificationPage from "./OtpVerificationPage";
import AdminFeedbackPage from './AdminFeedbackPage.js';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const Eelement = document.getElementById('root');
const rootEelement = createRoot(Eelement);
const stripePromise = loadStripe("pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK");
const App = () => {
  return (
    <Router>

      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchListings />} />
        <Route path="/searchResult" element={<SearchResult />} />
        <Route path="/property/:id" element={<Elements stripe={stripePromise}>
          <PropertyDetailsPage />
        </Elements>} />

        {/* Protect the /post route */}
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
      </Routes>
    </Router>
  );
};

rootEelement.render(
  <AppStateProvider>
    <App />
  </AppStateProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
