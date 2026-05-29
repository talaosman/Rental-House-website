import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SearchResult.css';
import API from "./api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatus = (listing) => {
  const raw =
    listing.status ||
    listing.rentalStatus ||
    listing.availability ||
    "";
  return raw.toLowerCase().trim();
};

const getPrice = (listing) => {
  return (
    listing.price ??
    listing.pricePerMonth ??
    listing.monthly_price ??
    listing.monthlyPrice ??
    listing.rent ??
    null
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'available': return '#16a34a';
    case 'rented':    return '#dc2626';
    case 'pending':   return '#d97706';
    default:          return '#6b7280';
  }
};

const capitalise = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : 'Unknown';

// ─── Component ────────────────────────────────────────────────────────────────

const SearchResult = () => {
  const [allListings, setAllListings]           = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [loading, setLoading]                   = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  // ── Fetch all listings once ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    API.get("/api/houses")
      .then((res) => {
        // 🔍 DEBUG — remove after confirming field names
        if (res.data.length > 0) {
          console.log("[SearchResult] First listing:", res.data[0]);
          console.log("[SearchResult] Keys:", Object.keys(res.data[0]));
        }
        setAllListings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch houses:", err);
        setLoading(false);
      });
  }, []);

  // ── Filter whenever query or data changes ─────────────────────────────────
  const queryParams = new URLSearchParams(location.search);
  const query       = queryParams.get('query') || '';

  useEffect(() => {
    if (loading) return;

    if (!query.trim()) {
      setFilteredListings([]);
      setShowNoResultsModal(false);
      return;
    }

    const q        = query.toLowerCase();
    const filtered = allListings.filter((listing) =>
      listing.location?.toLowerCase().includes(q)    ||
      listing.title?.toLowerCase().includes(q)        ||
      listing.propertyType?.toLowerCase().includes(q)
    );

    setFilteredListings(filtered);
    setShowNoResultsModal(filtered.length === 0);
  }, [allListings, query, loading]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleViewDetails = (id) => navigate(`/property/${id}`);

  const closeModal = () => {
    setShowNoResultsModal(false);
    navigate('/');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="search-container">

      {/* Hero heading */}
      <div className="search-hero">
        <p className="search-eyebrow">Property Search</p>
        <h2 className="search-heading">
          Results for <em>"{query}"</em>
        </h2>
        {!loading && (
          <p className="search-count">
            {filteredListings.length} propert{filteredListings.length !== 1 ? 'ies' : 'y'} found
          </p>
        )}
      </div>

      {/* ── Loading spinner ── */}
      {loading ? (
        <div className="spinner-container">
          <div className="spinner-ring" />
          <p className="spinner-text">Searching properties…</p>
        </div>

      /* ── Results grid ── */
      ) : filteredListings.length > 0 ? (
        <div className="search-grid">
          {filteredListings.map((listing) => {
            const status = getStatus(listing);
            const price  = getPrice(listing);

            return (
              <div
                key={listing.id}
                className="search-card"
                onClick={() => handleViewDetails(listing.id)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleViewDetails(listing.id)}
                role="button"
                aria-label={`View details for ${listing.title}`}
              >
                {/* Image + badge */}
                <div className="card-image-wrap">
                  <img
                    src={
                      listing.image?.startsWith("http")
                        ? listing.image
                        : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/uploads/${listing.image}`
                    }
                    alt={listing.title}
                    className="listing-image"
                  />
                  <span className="card-badge">{listing.propertyType}</span>
                </div>

                {/* Body */}
                <div className="card-content">
                  <h3 className="card-title">{listing.title}</h3>
                  <p className="card-location">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 22s-8-6.686-8-12a8 8 0 0 1 16 0c0 5.314-8 12-8 12z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {listing.location}
                  </p>

                  <hr className="card-divider" />

                  <div className="card-meta">
                    <div className="card-meta-item">
                      <p className="card-meta-label">Bedrooms</p>
                      <p className="card-meta-value">
                        {listing.nbOfBedrooms ?? listing.bedrooms ?? listing.beds ?? '—'} bd
                      </p>
                    </div>
                    <div className="card-meta-item">
                      <p className="card-meta-label">Status</p>
                      {/* ✅ FIX: uses getStatus() — no more wrong 'Available' fallback */}
                      <p
                        className="card-meta-value"
                        style={{ color: getStatusColor(status) }}
                      >
                        {capitalise(status)}
                      </p>
                    </div>
                  </div>

                  <div className="card-price-row">
                    {/* ✅ FIX: uses getPrice() — tries all possible field names */}
                    <div className="card-price">
                      {price != null
                        ? `$${price.toLocaleString()}`
                        : 'Contact'}
                      <span>/mo</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewDetails(listing.id); }}
                      className="details-button"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      /* ── No results modal ── */
      ) : (
        showNoResultsModal && (
          <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="#2563eb" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3>No Properties Found</h3>
              <p>
                We couldn't find any properties matching <strong>"{query}"</strong>.
                Try a different location or type.
              </p>
              <button onClick={closeModal} className="close-button">Back to Home</button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default SearchResult;