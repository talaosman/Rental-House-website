import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "./Navbar.css";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState({
    userId: localStorage.getItem("userId") || "",
    fullName: localStorage.getItem("username") || "",
    email: localStorage.getItem("email") || "",
    phoneNumber: localStorage.getItem("phoneNumber") || "",
    password: localStorage.getItem("password") || "",
    profileImage: localStorage.getItem("profileImage") || "",
  });

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 968) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      const menu = document.querySelector(".sidebar-menu-luxury");
      const toggle = document.querySelector(".navbar-toggle-luxury");
      if (
        isMobileMenuOpen &&
        menu &&
        !menu.contains(event.target) &&
        toggle &&
        !toggle.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("click", handleClickOutside);

    const role = localStorage.getItem("userRole");
    const loginStatus = localStorage.getItem("isLoggedIn") === "true";
    setUserRole(role);
    setIsLoggedIn(loginStatus);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const avatarUrl =
    userData.profileImage && userData.profileImage !== "null"
      ? userData.profileImage.startsWith("data:") || userData.profileImage.startsWith("http")
        ? userData.profileImage
        : `data:image/jpeg;base64,${userData.profileImage}`
      : userData.fullName
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`
        : `https://ui-avatars.com/api/?name=User&background=random`;

  return (
    <>
      
      <nav className={`navbar-luxury ${scrolled ? "scrolled" : ""}`}>
        <div className="navbar-container-luxury">
          
          <div className="navbar-toggle-luxury" onClick={handleMenuToggle}>
            <span className="bar-luxury"></span>
            <span className="bar-luxury"></span>
            <span className="bar-luxury"></span>
          </div>

          {/* Logo */}
          <div className="navbar-logo-luxury">
            <Link to="/">
              <img src="/home.svg" alt="RentalHub" className="logo-img-luxury" />
              <span className="logo-text-luxury">RentalHub</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <ul className="navbar-links-luxury">
            {userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
              <li>
                <Link
                  to="/"
                  className={`navbar-link ${location.pathname === "/" ? "active" : ""}`}
                >
                  <span>Home</span>
                </Link>
              </li>
            )}
            {userRole !== "HOUSE_OWNER" && (
              <li>
                <Link
                  to="/search"
                  className={`navbar-link ${location.pathname === "/search" ? "active" : ""}`}
                >
                  <span>Search Listings</span>
                </Link>
              </li>
            )}
            {isLoggedIn && userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
              <li>
                <Link
                  to="/favorites"
                  className={`navbar-link ${location.pathname === "/favorites" ? "active" : ""}`}
                >
                  <span>Favorites</span>
                </Link>
              </li>
            )}
            {userRole === "HOUSE_OWNER" && (
              <Link to="/owner-dashboard" className={`navbar-link ${location.pathname === "/owner-dashboard" ? "active" : ""}`} >
                My Properties
              </Link>
            )}
            {isLoggedIn && userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
              <li>
                <Link
                  to="/feedback"
                  className={`navbar-link ${location.pathname === "/feedback" ? "active" : ""}`}
                >
                  <span>Feedback</span>
                </Link>
              </li>
            )}
            {userRole === "ADMIN" && (
              <li>
                <Link
                  to="/post"
                  className={`navbar-link ${location.pathname === "/post" ? "active" : ""}`}
                >
                  <span>Post a Listing</span>
                </Link>
              </li>
            )}
            {userRole === "ADMIN" && (
              <li>
                <Link
                  to="/adminFeedback"
                  className={`navbar-link ${location.pathname === "/adminFeedback" ? "active" : ""}`}
                >
                  <span>Feedback</span>
                </Link>
              </li>
            )}
            {userRole === "ADMIN" && (
              <li>
                <Link
                  to="/adminRating"
                  className={`navbar-link ${location.pathname === "/adminRating" ? "active" : ""}`}
                >
                  <span>Ratings</span>
                </Link>
              </li>
            )}
            {userRole === "ADMIN" && (
              <li><Link to="/admin-users" className={`navbar-link ${location.pathname === "/admin-users" ? "active" : ""}`}>
                <span>Users</span>
              </Link></li>
            )}
            {userRole !== "ADMIN" && (
              <li>
                <Link
                  to="/aboutUs"
                  className={`navbar-link ${location.pathname === "/aboutUs" ? "active" : ""}`}
                >
                  <span>About Us</span>
                </Link>
              </li>
            )}
          </ul>

          {/* Right Section - Login/Profile */}
          <div className="navbar-right-luxury">
            {isLoggedIn && userRole !== "ADMIN" &&  userRole !== "HOUSE_OWNER" && <NotificationBell />}
            {!isLoggedIn ? (
              <Link to="/about" className="btn-try-now">
                <span>Get Started</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            ) : (
              <Link to="/profile" className="profile-link-luxury">
                <div className="profile-avatar-luxury">
                  <img src={avatarUrl} alt="Profile" className="profile-img-luxury" />
                  <span className="profile-status-luxury"></span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar Menu for Mobile - SLIDES FROM LEFT */}
      <aside className={`sidebar-menu-luxury ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header-luxury">
          <div className="sidebar-logo-luxury">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
              <img src="/home.svg" alt="RentalHub" className="logo-img-sidebar" />
              <span className="logo-text-sidebar">RentalHub</span>
            </Link>
          </div>
          <div className="sidebar-close-luxury" onClick={handleMenuToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>

        <ul className="sidebar-links-luxury">
          {userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
            <li>
              <Link
                to="/"
                className={location.pathname === "/" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
                <span>Home</span>
              </Link>
            </li>
          )}
          {userRole !== "HOUSE_OWNER" && (
            <li>
              <Link
                to="/search"
                className={location.pathname === "/search" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <span>Search Listings</span>
              </Link>
            </li>
          )}
          {isLoggedIn && userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
            <li>
              <Link
                to="/favorites"
                className={location.pathname === "/favorites" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>Favorites</span>
              </Link>
            </li>
          )}
          {isLoggedIn && userRole !== "ADMIN" && userRole !== "HOUSE_OWNER" && (
            <li>
              <Link
                to="/feedback"
                className={location.pathname === "/feedback" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Feedback</span>
              </Link>
            </li>
          )}
          {userRole === "ADMIN" && (
            <li>
              <Link
                to="/post"
                className={location.pathname === "/post" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>Post a Listing</span>
              </Link>
            </li>
          )}
          {userRole === "ADMIN" && (
            <li>
              <Link
                to="/adminFeedback"
                className={location.pathname === "/adminFeedback" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Feedback</span>
              </Link>
            </li>
          )}
          {userRole === "ADMIN" && (
            <li>
              <Link
                to="/adminRating"
                className={location.pathname === "/adminRating" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>Ratings</span>
              </Link>
            </li>
          )}
          {userRole === "ADMIN" && (
            <li>
              <Link
                to="/admin-users"
                className={location.pathname === "/admin-users" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Users</span>
              </Link>
            </li>
          )}
          {userRole === "HOUSE_OWNER" && (
            <li>
              <Link
                to="/owner-dashboard"
                className={location.pathname === "/owner-dashboard" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>My Properties</span>
              </Link>
            </li>
          )}
          {userRole !== "ADMIN" && (
            <li>
              <Link
                to="/aboutUs"
                className={location.pathname === "/aboutUs" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>About Us</span>
              </Link>
            </li>
          )}
        </ul>

        {/* Sidebar Footer */}
        <div className="sidebar-footer-luxury">
          {!isLoggedIn ? (
            <Link to="/about" className="btn-sidebar-auth" onClick={() => setIsMobileMenuOpen(false)}>
              <span>Get Started</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          ) : (
            <Link to="/profile" className="sidebar-profile" onClick={() => setIsMobileMenuOpen(false)}>
              <img src={avatarUrl} alt="Profile" className="profile-img-sidebar" />
              <div className="sidebar-profile-info">
                <span className="profile-name">My Profile</span>
                <span className="profile-email">View Account</span>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && <div className="sidebar-overlay-luxury" onClick={handleMenuToggle}></div>}
    </>
  );
};

export default Navbar;