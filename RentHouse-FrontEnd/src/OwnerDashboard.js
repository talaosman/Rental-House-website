import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api";
import "./OwnerDashboard.css";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalHouses: 0, activeRents: 0, totalRevenue: 0, activeOffers: 0 });
  const [houses, setHouses] = useState([]);
  const [rents, setRents] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Offer form state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({
    houseId: "",
    discountPercentage: "",
    expiryDate: "",
    sameOwnerOnly: false,
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (!userId || userRole !== "HOUSE_OWNER") {
      navigate("/");
      return;
    }
    fetchAll();
  }, [userId, userRole]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, housesRes, rentsRes, offersRes] = await Promise.all([
        API.get(`/api/owner/${userId}/stats`),
        API.get(`/api/owner/${userId}/houses`),
        API.get(`/api/owner/${userId}/rents`),
        API.get(`/api/owner/${userId}/offers`),
      ]);
      setStats(statsRes.data);
      setHouses(housesRes.data);
      setRents(rentsRes.data);
      setOffers(offersRes.data);
    } catch (err) {
      console.error("Failed to load owner data", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Offer CRUD ──────────────────────────────────
  const openCreateModal = () => {
    setEditingOffer(null);
    setOfferForm({ houseId: houses[0]?.id || "", discountPercentage: "", expiryDate: "", sameOwnerOnly: false });
    setFormError("");
    setFormSuccess("");
    setShowOfferModal(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setOfferForm({
      houseId: offer.houseId,
      discountPercentage: offer.discountPercentage,
      expiryDate: offer.expiryDate,
      sameOwnerOnly: offer.sameOwnerOnly,
    });
    setFormError("");
    setFormSuccess("");
    setShowOfferModal(true);
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      if (editingOffer) {
        await API.put(`/api/owner/${userId}/offers/${editingOffer.id}`, {
          discountPercentage: parseFloat(offerForm.discountPercentage),
          expiryDate: offerForm.expiryDate,
          sameOwnerOnly: offerForm.sameOwnerOnly,
          active: true,
        });
        setFormSuccess("Offer updated successfully!");
      } else {
        await API.post(`/api/owner/${userId}/offers`, {
          houseId: parseInt(offerForm.houseId),
          discountPercentage: parseFloat(offerForm.discountPercentage),
          expiryDate: offerForm.expiryDate,
          sameOwnerOnly: offerForm.sameOwnerOnly,
        });
        setFormSuccess("Offer created successfully!");
      }
      fetchAll();
      setTimeout(() => setShowOfferModal(false), 1200);
    } catch (err) {
      setFormError(err.response?.data || "Failed to save offer");
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm("Delete this offer?")) return;
    try {
      await API.delete(`/api/owner/${userId}/offers/${offerId}`);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err) {
      alert(err.response?.data || "Failed to delete offer");
    }
  };

  const handleToggleOfferActive = async (offer) => {
    try {
      await API.put(`/api/owner/${userId}/offers/${offer.id}`, { active: !offer.active });
      fetchAll();
    } catch (err) {
      alert("Failed to update offer");
    }
  };

  // ── Helpers ──────────────────────────────────
  const formatCurrency = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

  const getStatusColor = (status) =>
    ({ active: "#22c55e", completed: "#94a3b8", expired: "#ef4444", used: "#f59e0b", inactive: "#94a3b8" }[status] || "#94a3b8");

  if (loading) {
    return (
      <div className="owner-loading">
        <div className="owner-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <div className="owner-header">
        <div className="owner-header-content">
          <div className="owner-title-block">
            <span className="owner-badge">HOUSE OWNER</span>
            <h1 className="owner-title">Owner Dashboard</h1>
            <p className="owner-subtitle">Manage your properties, track rentals & offers</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="owner-stats-grid">
        {[
          { label: "My Properties", value: stats.totalHouses, icon: "🏠", color: "#6366f1" },
          { label: "Active Rentals", value: stats.activeRents, icon: "📋", color: "#22c55e" },
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: "💰", color: "#f59e0b" },
          { label: "Active Offers", value: stats.activeOffers, icon: "🎁", color: "#ec4899" },
        ].map((s) => (
          <div key={s.label} className="owner-stat-card" style={{ "--accent": s.color }}>
            <div className="owner-stat-icon">{s.icon}</div>
            <div className="owner-stat-info">
              <div className="owner-stat-value">{s.value}</div>
              <div className="owner-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="owner-tabs">
        {["overview", "rentals", "offers"].map((tab) => (
          <button
            key={tab}
            className={`owner-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" && "🏠 My Properties"}
            {tab === "rentals" && "📋 Rental History"}
            {tab === "offers" && "🎁 My Offers"}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW (houses) ── */}
      {activeTab === "overview" && (
        <div className="owner-section">
          {houses.length === 0 ? (
            <div className="owner-empty">
              <span>🏠</span>
              <p>No properties linked to your account yet.</p>
              <small>Make sure your Owner email matches your account email.</small>
            </div>
          ) : (
            <div className="owner-house-grid">
              {houses.map((house) => (
                <div key={house.id} className="owner-house-card">
                  <div className="owner-house-img-wrap">
                    <img
                      src={
                        house.image?.startsWith("http")
                          ? house.image
                          : `http://localhost:5000/uploads/${house.image}`
                      }
                      alt={house.title}
                      className="owner-house-img"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/300x180?text=No+Image"; }}
                    />
                    <span className={`owner-house-status ${house.status}`}>
                      {house.status || "available"}
                    </span>
                  </div>
                  <div className="owner-house-info">
                    <h3>{house.title}</h3>
                    <p className="owner-house-loc">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {house.location}
                    </p>
                    <div className="owner-house-meta">
                      <span>{house.nbOfBedrooms} bed · {house.propertyType}</span>
                      <span className="owner-house-price">{formatCurrency(house.pricePerMonth)}/mo</span>
                    </div>
                    <div className="owner-house-footer">
                      <span className="owner-rent-badge">{house.activeRents} active rental{house.activeRents !== 1 ? "s" : ""}</span>
                      <span className="owner-offer-count">{house.activeOffers} offer{house.activeOffers !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RENTALS ── */}
      {activeTab === "rentals" && (
        <div className="owner-section">
          {rents.length === 0 ? (
            <div className="owner-empty">
              <span>📋</span>
              <p>No rental history yet.</p>
            </div>
          ) : (
            <div className="owner-rent-list">
              {rents.map((rent) => (
                <div key={rent.rentId} className="owner-rent-card">
                  <div className="owner-rent-img-wrap">
                    <img
                      src={
                        rent.houseImage?.startsWith("http")
                          ? rent.houseImage
                          : `http://localhost:5000/uploads/${rent.houseImage}`
                      }
                      alt={rent.houseTitle}
                      className="owner-rent-img"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/80x80?text=🏠"; }}
                    />
                  </div>
                  <div className="owner-rent-details">
                    <div className="owner-rent-top">
                      <h4>{rent.houseTitle}</h4>
                      <span
                        className="owner-rent-status"
                        style={{ background: getStatusColor(rent.status) + "22", color: getStatusColor(rent.status) }}
                      >
                        {rent.status}
                      </span>
                    </div>
                    <p className="owner-rent-loc">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {rent.houseLocation}
                    </p>
                    <div className="owner-rent-meta-grid">
                      <div className="owner-rent-meta-item">
                        <span className="meta-label">Tenant</span>
                        <span className="meta-val">{rent.tenantName || "—"}</span>
                      </div>
                      <div className="owner-rent-meta-item">
                        <span className="meta-label">Email</span>
                        <span className="meta-val">{rent.tenantEmail || "—"}</span>
                      </div>
                      <div className="owner-rent-meta-item">
                        <span className="meta-label">Period</span>
                        <span className="meta-val">{formatDate(rent.startDate)} → {formatDate(rent.endDate)}</span>
                      </div>
                      <div className="owner-rent-meta-item">
                        <span className="meta-label">Revenue</span>
                        <span className="meta-val revenue">{formatCurrency(rent.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: OFFERS ── */}
      {activeTab === "offers" && (
        <div className="owner-section">
          <div className="owner-offers-header">
            <div>
              <h2 className="owner-section-title">My Offers</h2>
              <p className="owner-section-sub">Create discounts for your properties to attract renters</p>
            </div>
            <button className="owner-create-offer-btn" onClick={openCreateModal}>
              + New Offer
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="owner-empty">
              <span>🎁</span>
              <p>No offers created yet.</p>
              <button className="owner-create-offer-btn small" onClick={openCreateModal}>Create your first offer</button>
            </div>
          ) : (
            <div className="owner-offers-grid">
              {offers.map((offer) => (
                <div key={offer.id} className={`owner-offer-card ${offer.status}`}>
                  <div className="owner-offer-discount">
                    <span className="discount-num">{offer.discountPercentage}%</span>
                    <span className="discount-label">OFF</span>
                  </div>
                  <div className="owner-offer-info">
                    <h4 className="owner-offer-house">{offer.houseTitle}</h4>
                    <p className="owner-offer-expiry">Expires: {formatDate(offer.expiryDate)}</p>
                    <span
                      className="owner-offer-status-badge"
                      style={{ background: getStatusColor(offer.status) + "22", color: getStatusColor(offer.status) }}
                    >
                      {offer.status}
                    </span>
                  </div>
                  <div className="owner-offer-actions">
                    {!offer.used && (
                      <>
                        <button
                          className="offer-action-btn toggle"
                          onClick={() => handleToggleOfferActive(offer)}
                          title={offer.active ? "Deactivate" : "Activate"}
                        >
                          {offer.active ? "⏸" : "▶"}
                        </button>
                        <button
                          className="offer-action-btn edit"
                          onClick={() => openEditModal(offer)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                    <button
                      className="offer-action-btn delete"
                      onClick={() => handleDeleteOffer(offer.id)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OFFER MODAL ── */}
      {showOfferModal && (
        <div className="owner-modal-overlay" onClick={() => setShowOfferModal(false)}>
          <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3>{editingOffer ? "Edit Offer" : "Create New Offer"}</h3>
              <button className="owner-modal-close" onClick={() => setShowOfferModal(false)}>✕</button>
            </div>

            <form className="owner-modal-form" onSubmit={handleOfferSubmit}>
              {!editingOffer && (
                <div className="owner-form-group">
                  <label>Property *</label>
                  <select
                    value={offerForm.houseId}
                    onChange={(e) => setOfferForm({ ...offerForm, houseId: e.target.value })}
                    required
                    className="owner-form-select"
                  >
                    <option value="">Select a property</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>{h.title} — {h.location}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="owner-form-group">
                <label>Discount Percentage (1–100) *</label>
                <div className="owner-discount-input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={offerForm.discountPercentage}
                    onChange={(e) => setOfferForm({ ...offerForm, discountPercentage: e.target.value })}
                    required
                    placeholder="e.g. 15"
                    className="owner-form-input"
                  />
                  <span className="owner-discount-symbol">%</span>
                </div>
              </div>

              <div className="owner-form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  value={offerForm.expiryDate}
                  onChange={(e) => setOfferForm({ ...offerForm, expiryDate: e.target.value })}
                  required
                  className="owner-form-input"
                />
              </div>

              <div className="owner-form-check">
                <input
                  type="checkbox"
                  id="sameOwnerOnly"
                  checked={offerForm.sameOwnerOnly}
                  onChange={(e) => setOfferForm({ ...offerForm, sameOwnerOnly: e.target.checked })}
                />
                <label htmlFor="sameOwnerOnly">
                  Restrict to my properties only
                  <small> (applies when combined with loyalty offers)</small>
                </label>
              </div>

              {formError && <div className="owner-form-error">❌ {formError}</div>}
              {formSuccess && <div className="owner-form-success">✅ {formSuccess}</div>}

              <div className="owner-modal-footer">
                <button type="button" className="owner-modal-cancel" onClick={() => setShowOfferModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="owner-modal-submit">
                  {editingOffer ? "Save Changes" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;