import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      const menu = document.querySelector(".sidebar-menu");
      const toggle = document.querySelector(".navbar-toggle");
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

  return (
    <>
      {/* Top Navbar: hide only when sidebar is open */}
      <nav className={`navbar ${isMobileMenuOpen ? "hide" : ""}`}>
        <div className="navbar-container">
          <div className="navbar-toggle" onClick={handleMenuToggle}>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>

          <div className="navbar-logo">
            <Link to="/">
              <img
                src="/home.png"
                alt="Logo"
                className="logo-img"
                style={{ marginTop: "-1px" }}
              />
            </Link>
          </div>

          <ul className="navbar-links">
            {userRole !== "ADMIN" && (
              <li>
                <Link
                  to="/"
                  className={`navbar-item ${location.pathname === "/" ? "active-tab" : ""}`}
                >
                  Home
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/search"
                className={`navbar-item ${location.pathname === "/search" ? "active-tab" : ""}`}
              >
                Search Listings
              </Link>
            </li>
            {isLoggedIn && userRole !== "ADMIN" && (
              <li>
                <Link
                  to="/favorites"
                  className={`navbar-item ${location.pathname === "/favorites" ? "active-tab" : ""}`}
                >
                  Favorites
                </Link>
              </li>
            )}
            {isLoggedIn && userRole !== "ADMIN" && (
              <li>
                <Link
                  to="/feedback"
                  className={`navbar-item ${location.pathname === "/feedback" ? "active-tab" : ""}`}
                >
                  Feedback
                </Link>
              </li>
            )}
            {userRole === "ADMIN" && (
              <li>
                <Link
                  to="/post"
                  className={`navbar-item ${location.pathname === "/post" ? "active-tab" : ""}`}
                >
                  Post a Listing
                </Link>
              </li>
            )}
             {userRole === "ADMIN" && (
              <li>
                <Link
                  to="/adminFeedback"
                  className={`navbar-item ${location.pathname === "/adminFeedback" ? "active-tab" : ""}`}
                >
                  Feedback
                </Link>
              </li>
            )}
            {userRole !== "ADMIN" && (
              <li>
                <Link
                  to="/aboutUs"
                  className={`navbar-item ${location.pathname === "/aboutUs" ? "active-tab" : ""}`}
                >
                  About Us
                </Link>
              </li>
            )}
            {!isLoggedIn && (
              <li>
                <Link
                  to="/about"
                  className={`navbar-item ${location.pathname === "/about" ? "active-tab" : ""}`}
                >
                  Sign Up / Sign In
                </Link>
              </li>
            )}
          </ul>

          {isLoggedIn && (
            <div className="profile-icon">
              <Link
                to="/profile"
                className="navbar-item"
                style={{ marginTop: "-0.5px" }}
              >
                <img src="account.png" alt="Profile" className="profile-img" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Menu */}
      <aside className={`sidebar-menu ${isMobileMenuOpen ? "open" : ""}`}>
        {/* Toggle at top */}
        <div className="sidebar-toggle" onClick={handleMenuToggle}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        {/* Nav links */}
        <ul className="sidebar-links">
          {userRole !== "ADMIN" && (
            <li>
              <Link to="/" className={`${location.pathname === "/" ? "active-tab" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-home"></i> Home
              </Link>
            </li>
          )}
          <li>
            <Link to="/search" className={location.pathname === "/search" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
              <i className="fas fa-search"></i> Search Listings
            </Link>
          </li>
          {isLoggedIn && userRole !== "ADMIN" && (
            <li>
              <Link to="/favorites" className={location.pathname === "/favorites" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-heart"></i> Favorites
              </Link>
            </li>
          )}
          {isLoggedIn && userRole !== "ADMIN" && (
            <li>
              <Link
                to="/feedback"
                className={`navbar-item ${location.pathname === "/feedback" ? "active-tab" : ""}`}
              >
                <i className="fas fa-comment-dots"></i> Feedback
              </Link>
            </li>
          )}
          {userRole === "ADMIN" && (
            <li>
              <Link to="/post" className={location.pathname === "/post" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-plus-circle"></i> Post a Listing
              </Link>
            </li>
          )}
            {userRole === "ADMIN" && (
            <li>
              <Link to="/adminFeedback" className={location.pathname === "/adminFeedback" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-plus-circle"></i>Feedback
              </Link>
            </li>
          )}
          {userRole !== "ADMIN" && (
            <li>
              <Link to="/aboutUs" className={location.pathname === "/aboutUs" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-info-circle"></i> About Us
              </Link>
            </li>
          )}
          {!isLoggedIn && (
            <li>
              <Link to="/about" className={location.pathname === "/about" ? "active-tab" : ""} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-user-plus"></i> Sign Up / Sign In
              </Link>
            </li>
          )}
        </ul>

        {/* Bottom section */}
        <div className="sidebar-bottom">
          <div className="sidebar-logo-bottom">
            <Link to="/">
              <img src="/home.png" alt="Logo" className="logo-img" />
            </Link>
          </div>
          {isLoggedIn && (
            <div className="sidebar-profile-icon">
              <Link to="/profile">
                <img src="account.png" alt="Profile" className="profile-img" />
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;
