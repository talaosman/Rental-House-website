import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaSave, FaEye, FaEyeSlash, FaHome, FaChartLine, FaTags, FaCalendarAlt } from "react-icons/fa";
import "./UserProfile.css";
import CountryCodePicker from "./CountryCodePicker";


const AdminOffersTable = () => {
  const [usersWithOffers, setUsersWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const auth = localStorage.getItem("authHeader") || "";

    fetch("http://localhost:5000/api/users", {
      headers: { Authorization: auth },
    })
      .then((r) => r.json())
      .then(async (users) => {
        if (!Array.isArray(users)) { setLoading(false); return; }

        const now = new Date();

        const results = await Promise.allSettled(
          users.map((u) =>
            fetch(`http://localhost:5000/api/offers/user/${u.id}`, {
              headers: { Authorization: auth },
            })
              .then((r) => r.json())
              .then((offers) => ({
                user: u,
                offers: Array.isArray(offers)
                  ? offers.filter((o) => {
                    const expiry = o.expiryDate ? new Date(o.expiryDate) : null;
                    return o.active && (!expiry || expiry >= now);
                  })
                  : [],
              }))
              .catch(() => ({ user: u, offers: [] }))
          )
        );

        const data = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((d) => d.offers.length > 0);

        setUsersWithOffers(data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const totalOffers = usersWithOffers.reduce((sum, d) => sum + d.offers.length, 0);

  return (
    <div className="admin-offers-section">
      <div className="admin-offers-header">
        <div className="admin-offers-header-left">
          <div className="admin-offers-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div>
            <p className="admin-offers-title">Active Offers by User</p>
            <p className="admin-offers-subtitle">All non-expired, active loyalty offers across users</p>
          </div>
        </div>
        <div className="admin-offers-badge">
          {loading ? "…" : `${totalOffers} offer${totalOffers !== 1 ? "s" : ""} · ${usersWithOffers.length} user${usersWithOffers.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      <div className="admin-offers-body">
        {loading ? (
          <div className="admin-offers-loading">
            <div className="offers-spinner" />
            <span>Fetching offers…</span>
          </div>
        ) : usersWithOffers.length === 0 ? (
          <div className="admin-offers-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <p>No active offers found across any users.</p>
          </div>
        ) : (
          <div className="admin-offers-list">
            {usersWithOffers.map(({ user, offers }, idx) => {
              const isOpen = expanded === idx;
              const avatarUrl = user.profileImage
                ? user.profileImage.startsWith("data:") || user.profileImage.startsWith("http")
                  ? user.profileImage
                  : `data:image/jpeg;base64,${user.profileImage}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.fullName || "U")}&background=0d2d52&color=fff&size=64`;

              return (
                <div className="admin-offer-row" key={user.id ?? idx}>
                  <button
                    className={`admin-offer-user-row ${isOpen ? "open" : ""}`}
                    onClick={() => setExpanded(isOpen ? null : idx)}
                  >
                    <img src={avatarUrl} alt={user.username} className="admin-offer-avatar" />
                    <div className="admin-offer-user-info">
                      <span className="admin-offer-username">{user.username || user.fullName || `User #${user.id}`}</span>
                      <span className="admin-offer-email">{user.email}</span>
                    </div>
                    <div className="admin-offer-count-badge">
                      {offers.length} offer{offers.length !== 1 ? "s" : ""}
                    </div>
                    <svg
                      className={`admin-offer-chevron ${isOpen ? "rotated" : ""}`}
                      width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="admin-offer-detail-list">
                      {offers.map((offer, oi) => (
                        <div className="admin-offer-detail-pill" key={oi}>
                          <div className="admin-offer-detail-left">
                            <span className="admin-offer-discount">🔥 {offer.discountPercentage}% OFF</span>
                            <span className="admin-offer-property">
                              {offer.house ? `For: ${offer.house.title}` : "Any property · same owner"}
                            </span>
                          </div>
                          <div className="admin-offer-detail-right">
                            <span className={`admin-offer-status-dot ${offer.used ? "used" : "active"}`} />
                            <span className="admin-offer-status-label">{offer.used ? "Used" : "Active"}</span>
                            <span className="admin-offer-expiry">
                              Expires&nbsp;
                              {offer.expiryDate
                                ? new Date(offer.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


const AdminDashboard = ({ navigate }) => {
  const [stats, setStats] = useState({
    totalUsers: null,
    totalHouses: null,
    activeRents: null,
    totalRents: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("authHeader") || "";

    Promise.allSettled([
      fetch("http://localhost:5000/api/users/count", { headers: { Authorization: auth } }).then(r => r.json()),
      fetch("http://localhost:5000/api/houses/count", { headers: { Authorization: auth } }).then(r => r.json()),
      fetch("http://localhost:5000/api/rents/active/count", { headers: { Authorization: auth } }).then(r => r.json()),
      fetch("http://localhost:5000/api/rents/count", { headers: { Authorization: auth } }).then(r => r.json()),
    ]).then(([users, houses, activeRents, totalRents]) => {
      setStats({
        totalUsers: users.status === "fulfilled" ? (users.value.count ?? users.value) : "—",
        totalHouses: houses.status === "fulfilled" ? (houses.value.count ?? houses.value) : "—",
        activeRents: activeRents.status === "fulfilled" ? (activeRents.value.count ?? activeRents.value) : "—",
        totalRents: totalRents.status === "fulfilled" ? (totalRents.value.count ?? totalRents.value) : "—",
      });
    }).finally(() => setLoading(false));
  }, []);

  const statCells = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      cls: "stat-icon-blue",
      value: stats.totalUsers,
      label: "Registered Users",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      cls: "stat-icon-gold",
      value: stats.totalHouses,
      label: "Listed Properties",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      cls: "stat-icon-green",
      value: stats.activeRents,
      label: "Active Rentals",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      cls: "stat-icon-purple",
      value: stats.totalRents,
      label: "Total Rentals",
    },
  ];

  return (
    <div className="admin-dashboard-card">
      <div className="admin-dash-header">
        <div className="admin-dash-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <div className="admin-dash-header-text">
          <h2>Admin Dashboard</h2>
          <p>Platform-wide overview and management tools</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        {statCells.map((cell, i) => (
          <div className="admin-stat-cell" key={i}>
            <div className={`admin-stat-icon ${cell.cls}`}>{cell.icon}</div>
            {loading ? (
              <div className="admin-stat-loading">
                <span /><span /><span />
              </div>
            ) : (
              <div className="admin-stat-value">{cell.value}</div>
            )}
            <div className="admin-stat-label">{cell.label}</div>
          </div>
        ))}
      </div>

      <AdminOffersTable />
    </div>
  );
};


const OwnerDashboard = () => {
  const [ownerStats, setOwnerStats] = useState({
    totalHouses: 0,
    activeRents: 0,
    totalRevenue: 0,
    activeOffers: 0,
  });
  const [recentRents, setRecentRents] = useState([]);
  const [ownerOffers, setOwnerOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOffer, setExpandedOffer] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;

    const auth = localStorage.getItem("authHeader") || "";

    Promise.allSettled([
      fetch(`http://localhost:5000/api/owner/${userId}/stats`, { headers: { Authorization: auth } }).then(r => r.json()),
      fetch(`http://localhost:5000/api/owner/${userId}/rents?limit=5`, { headers: { Authorization: auth } }).then(r => r.json()),
      fetch(`http://localhost:5000/api/owner/${userId}/offers`, { headers: { Authorization: auth } }).then(r => r.json()),
    ]).then(([stats, rents, offers]) => {
      if (stats.status === "fulfilled") setOwnerStats(stats.value);
      if (rents.status === "fulfilled") setRecentRents(rents.value.slice(0, 3));
      if (offers.status === "fulfilled") setOwnerOffers(offers.value.filter(o => o.active && !o.used).slice(0, 3));
    }).finally(() => setLoading(false));
  }, [userId]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

  return (
    <div className="owner-dashboard-card">
      <div className="owner-dash-header">
        <div className="owner-dash-icon">
          <FaHome size={22} />
        </div>
        <div className="owner-dash-header-text">
          <h2>Property Owner Dashboard</h2>
          <p>Manage your properties and track performance</p>
        </div>
      </div>

      {loading ? (
        <div className="owner-dash-loading">
          <div className="offers-spinner" />
          <span>Loading owner data…</span>
        </div>
      ) : (
        <>
          <div className="owner-recent-section">
            <div className="owner-recent-header">
              <FaCalendarAlt />
              <h3>Recent Rentals</h3>
            </div>
            {recentRents.length === 0 ? (
              <div className="owner-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p>No recent rentals yet</p>
                <span>When tenants book your properties, they'll appear here</span>
              </div>
            ) : (
              <div className="owner-recent-list">
                {recentRents.map((rent, idx) => (
                  <div key={idx} className="owner-recent-item">
                    <div className="owner-recent-house">
                      <strong>{rent.houseTitle}</strong>
                      <span className="owner-recent-tenant">{rent.tenantName}</span>
                    </div>
                    <div className="owner-recent-meta">
                      <span>{formatDate(rent.startDate)} → {formatDate(rent.endDate)}</span>
                      <span className="owner-recent-revenue">{formatCurrency(rent.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="owner-offers-preview">
            <div className="owner-offers-preview-header">
              <FaTags />
              <h3>Active Offers</h3>
            </div>
            {ownerOffers.length === 0 ? (
              <div className="owner-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <p>No active offers</p>
                <span>Create offers to attract more renters</span>
              </div>
            ) : (
              <div className="owner-offers-mini-list">
                {ownerOffers.map((offer, idx) => (
                  <div
                    key={idx}
                    className={`owner-offer-mini ${expandedOffer === idx ? "expanded" : ""}`}
                    onClick={() => setExpandedOffer(expandedOffer === idx ? null : idx)}
                  >
                    <div className="owner-offer-mini-main">
                      <span className="owner-offer-mini-discount">🔥 {offer.discountPercentage}% OFF</span>
                      <span className="owner-offer-mini-house">{offer.houseTitle}</span>
                      <svg className={`owner-offer-mini-chevron ${expandedOffer === idx ? "rotated" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {expandedOffer === idx && (
                      <div className="owner-offer-mini-detail">
                        <span>Expires: {formatDate(offer.expiryDate)}</span>
                        <span className="owner-offer-mini-status">Status: {offer.used ? "Used" : "Active"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


const UserProfile = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [editingField, setEditingField] = useState({
    fullName: false,
    email: false,
    phoneNumber: false,
  });
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [userData, setUserData] = useState({
    userId: localStorage.getItem("userId") || "",
    fullName: localStorage.getItem("username") || "",
    email: localStorage.getItem("email") || "",
    phoneNumber: localStorage.getItem("phoneNumber") || "",
    countryCode: localStorage.getItem("countryCode") || "+961",
    password: localStorage.getItem("password") || "",
    profileImage: localStorage.getItem("profileImage") || "",
  });

  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "ADMIN";
  const isOwner = userRole === "HOUSE_OWNER";

  const [points, setPoints] = useState(0);
  const [offers, setOffers] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(true);

  useEffect(() => {
    const userId = userData.userId;
    if (!userId) { setLoadingRewards(false); return; }

    fetch(`http://localhost:5000/api/users/${userId}`, {
      headers: { Authorization: localStorage.getItem("authHeader") || "" },
    })
      .then(r => r.json())
      .then(u => setPoints(u.points || 0))
      .catch(() => { });

    fetch(`http://localhost:5000/api/offers/user/${userId}`, {
      headers: { Authorization: localStorage.getItem("authHeader") || "" },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const now = new Date();
          setOffers(data.filter(o => {
            const expiry = o.expiryDate ? new Date(o.expiryDate) : null;
            return !o.used && o.active && (!expiry || expiry >= now);
          }));
        } else {
          setOffers([]);
        }
      })
      .catch(() => { })
      .finally(() => setLoadingRewards(false));
  }, [userData.userId]);

  const rentalsCompleted = Math.floor(points / 10);
  const rentalsToNext = 3 - (rentalsCompleted % 3);
  const progressPct = ((rentalsCompleted % 3) / 3) * 100;

  const handleInputChange = (field, value) =>
    setUserData(prev => ({ ...prev, [field]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserData(prev => ({ ...prev, profileImage: reader.result }));
      setIsEditingImage(true);
    };
    reader.readAsDataURL(file);
  };

  const saveProfileImage = async () => {
    const authHeader = localStorage.getItem("authHeader");
    try {
      const res = await fetch("http://localhost:5000/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader || "" },
        credentials: "include",
        body: JSON.stringify({ ...userData, username: userData.fullName }),
      });
      if (!res.ok) { alert("Update failed: " + await res.text()); return; }
      localStorage.setItem("profileImage", userData.profileImage);
      alert("Profile image updated successfully");
      setIsEditingImage(false);
    } catch (err) { alert("Network error: " + err.message); }
  };

  const toggleEditing = async (field) => {
    if (editingField[field]) {
      const authHeader = localStorage.getItem("authHeader");
      try {
        const res = await fetch("http://localhost:5000/api/users/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader || "" },
          credentials: "include",
          body: JSON.stringify({ userId: userData.userId, username: userData.fullName, email: userData.email, password: userData.password, phoneNumber: userData.phoneNumber, profileImage: userData.profileImage }),
        });
        if (!res.ok) { alert("Update failed: " + await res.text()); return; }
        if (field === "fullName") localStorage.setItem("username", userData.fullName);
        else if (field === "phoneNumber") {
          localStorage.setItem("phoneNumber", userData.phoneNumber);
          localStorage.setItem("countryCode", userData.countryCode);  // ✅ save code too
        } else {
          localStorage.setItem(field, userData[field]);
        }
        alert("Profile updated successfully");
      } catch (err) { alert("Network error: " + err.message); return; }
    }
    setEditingField(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const avatarUrl =
    userData.profileImage && userData.profileImage !== "null"
      ? userData.profileImage.startsWith("data:") || userData.profileImage.startsWith("http")
        ? userData.profileImage
        : `data:image/jpeg;base64,${userData.profileImage}`
      : userData.fullName
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=0d2d52&color=fff`
        : `https://ui-avatars.com/api/?name=User&background=0d2d52&color=fff`;

  const renderField = (label, field, isEditable = true) => (
    <div className="info-row" key={field}>
      <span className="label">{label}</span>
      <div className="value">
        {editingField[field] && isEditable ? (
          <input
            value={userData[field]}
            onChange={e => handleInputChange(field, e.target.value)}
            className="valueEdit"
          />
        ) : (
          <input value={userData[field]} readOnly />
        )}
        {isEditable && (
          <button className="editbtn" onClick={() => toggleEditing(field)} title={editingField[field] ? "Save" : "Edit"}>
            {editingField[field] ? <div className="savebtn"><FaSave /></div> : <FaEdit />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="profile-page">


      <div className="profile-hero">
        <div className="profile-hero-content">
          <span className="profile-hero-eyebrow">RentalHub · {isAdmin ? "Admin" : isOwner ? "Owner" : "Account"}</span>
          <h1 className="profile-hero-title">
            {isAdmin ? "Admin Profile" : isOwner ? `Owner Profile, ${userData.fullName.split(" ")[0] || "User"}` : `Welcome back, ${userData.fullName.split(" ")[0] || "User"}`}
          </h1>
        </div>
      </div>

      <div className="profile-wrapper">

        <div className="profile-top-row">


          <div className="profile-container">
            <header className="profile-header">
              <img
                src={avatarUrl}
                alt="User Avatar"
                className="profile-image"
                onClick={() => setIsEditingImage(true)}
                title="Click to change profile image"
              />

              {isEditingImage && (
                <div className="image-edit-popup">
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                  <div className="image-edit-actions">
                    <button onClick={saveProfileImage} className="save-image-btn">Save</button>
                    <button onClick={() => setIsEditingImage(false)} className="cancel-image-btn">Cancel</button>
                  </div>
                </div>
              )}

              <h2>{userData.fullName}</h2>
              <p className="username">@{userData.fullName.toLowerCase().replace(/\s+/g, "")}</p>
            </header>

            <section className="profile-info">
              {renderField("Username", "fullName")}
              {renderField("Email", "email")}
              {/* ── Phone Number with Country Code ── */}
              <div className="info-row">
                <span className="label">Phone Number</span>
                <div className="value phone-field-wrapper">
                  {editingField.phoneNumber ? (
                    <>
                      <CountryCodePicker
                        value={userData.countryCode || "+961"}
                        onChange={(code) => handleInputChange("countryCode", code)}
                      />
                      <input
                        value={userData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        className="phone-number-input"
                        placeholder="e.g. 71 234 567"
                        type="tel"
                      />
                    </>
                  ) : (
                    <input
                      value={
                        userData.countryCode && userData.phoneNumber
                          ? `${userData.countryCode} ${userData.phoneNumber}`
                          : userData.phoneNumber || ""
                      }
                      readOnly
                    />
                  )}
                  <button
                    className="editbtn"
                    onClick={() => toggleEditing("phoneNumber")}
                    title={editingField.phoneNumber ? "Save" : "Edit"}
                  >
                    {editingField.phoneNumber ? <div className="savebtn"><FaSave /></div> : <FaEdit />}
                  </button>
                </div>
              </div>
              <div className="info-row">
                <span className="label">Password</span>
                <div className="value password-field">
                  <input type={showPassword ? "text" : "password"} value={userData.password} readOnly />
                  <button
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    type="button"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </section>
          </div>


          {isAdmin ? (
            <AdminDashboard navigate={navigate} />
          ) : isOwner ? (
            <OwnerDashboard />
          ) : (
            <div className="rewards-card">
              <div className="rewards-header">
                <div className="rewards-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="rewards-title">Loyalty Rewards</h3>
                  <p className="rewards-subtitle">Earn points, unlock discounts</p>
                </div>
              </div>

              <div className="points-display">
                <div className="points-circle">
                  <span className="points-number">{points}</span>
                  <span className="points-label">pts</span>
                </div>
                <div className="points-meta">
                  <p className="points-rentals">
                    <strong>{rentalsCompleted}</strong> rental{rentalsCompleted !== 1 ? "s" : ""} completed
                  </p>
                  <p className="points-next">
                    {rentalsToNext === 3
                      ? "🎉 Offer unlocked! Keep renting to earn more."
                      : `${rentalsToNext} more rental${rentalsToNext !== 1 ? "s" : ""} to unlock 20% OFF`}
                  </p>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="progress-labels">
                    <span>0</span><span>1</span><span>2</span><span>3 🏷️</span>
                  </div>
                </div>
              </div>

              <div className="rewards-how">
                <p className="rewards-how-title">How it works</p>
                <ul className="rewards-how-list">
                  <li><span className="rhli-dot" />+10 points per rental</li>
                  <li><span className="rhli-dot" />Every 3 rentals → 20% OFF offer</li>
                  <li><span className="rhli-dot" />Offer valid 30 days · same owner</li>
                </ul>
              </div>

              <div className="active-offers">
                <p className="active-offers-title">
                  Active Offers
                  <span className="offers-count">{loadingRewards ? "…" : offers.length}</span>
                </p>

                {loadingRewards ? (
                  <div className="offers-loading"><div className="offers-spinner" /></div>
                ) : offers.length === 0 ? (
                  <div className="no-offers">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <p>No active offers yet.</p>
                    <span>Complete 3 rentals to earn your first discount!</span>
                  </div>
                ) : (
                  <div className="offers-list">
                    {offers.map((offer, i) => (
                      <div key={i} className="offer-pill">
                        <div className="offer-pill-left">
                          <span className="offer-badge">🔥 {offer.discountPercentage}% OFF</span>
                          <span className="offer-detail">
                            {offer.house ? `For: ${offer.house.title}` : "Any property · same owner"}
                          </span>
                        </div>
                        <div className="offer-expiry">
                          Expires&nbsp;
                          {offer.expiryDate
                            ? new Date(offer.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default UserProfile;