import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SearchResult.css';
import API from "./api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const parseSpringDate = (raw) => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [y, m, d] = raw;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(raw).slice(0, 10);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'available': return '#16a34a';
    case 'rented': return '#dc2626';
    case 'pending': return '#d97706';
    default: return '#6b7280';
  }
};

const capitalise = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : 'Unknown';

// ─── Fetch real-time availability for a single listing ────────────────────────
const fetchListingStatus = async (id) => {
  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/is-rented/${id}`
    );
    if (!res.ok) return { status: 'available', availableAfter: null };

    const data = await res.json();

    // API says available
    if (data.available === true) return { status: 'available', availableAfter: null };

    // Has active lease — check if it's still valid
    const endRaw = data.endDate;
    const startRaw = data.startDate;
    const endDate = parseSpringDate(endRaw);
    const today = todayStr();

    if (endDate && today <= endDate) {
      return {
        status: 'rented',
        availableAfter: new Date(endDate + "T12:00:00").toLocaleDateString(),
      };
    }

    // Lease expired — treat as available
    return { status: 'available', availableAfter: null };
  } catch {
    return { status: 'available', availableAfter: null };
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const SearchResult = () => {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [listingStatuses, setListingStatuses] = useState({});   // { [id]: { status, availableAfter } }
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // ── 1. Fetch all listings ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    API.get("/api/houses")
      .then((res) => {
        setAllListings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch houses:", err);
        setLoading(false);
      });
  }, []);

  // ── 2. Filter by query ────────────────────────────────────────────────────
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get('query') || '';

  useEffect(() => {
    if (loading) return;

    if (!query.trim()) {
      setFilteredListings([]);
      setShowNoResultsModal(false);
      return;
    }

    const q = query.toLowerCase();
    const filtered = allListings.filter((listing) =>
      listing.location?.toLowerCase().includes(q) ||
      listing.title?.toLowerCase().includes(q) ||
      listing.propertyType?.toLowerCase().includes(q)
    );

    setFilteredListings(filtered);
    setShowNoResultsModal(filtered.length === 0);
  }, [allListings, query, loading]);

  // ── 3. Fetch real-time status for every filtered listing ──────────────────
  useEffect(() => {
    if (filteredListings.length === 0) return;

    setStatusLoading(true);

    Promise.all(
      filteredListings.map((listing) =>
        fetchListingStatus(listing.id).then((result) => ({ id: listing.id, ...result }))
      )
    ).then((results) => {
      const map = {};
      results.forEach(({ id, status, availableAfter }) => {
        map[id] = { status, availableAfter };
      });
      setListingStatuses(map);
      setStatusLoading(false);
    });
  }, [filteredListings]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleViewDetails = (id) => navigate(`/property/${id}`);

  const closeModal = () => {
    setShowNoResultsModal(false);
    navigate('/');
  };

  const getListingStatus = (id) =>
    listingStatuses[id]?.status || 'available';

  const getAvailableAfter = (id) =>
    listingStatuses[id]?.availableAfter || null;

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
            const status = getListingStatus(listing.id);
            const availAfter = getAvailableAfter(listing.id);
            // ✅ Use same field names as SearchListings.js and PropertyDetails.js
            const price = listing.pricePerMonth ?? listing.price ?? null;

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
                        : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${listing.id}/image`
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
                      <path d="M12 22s-8-6.686-8-12a8 8 0 0 1 16 0c0 5.314-8 12-8 12z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {listing.location}
                  </p>

                  <hr className="card-divider" />

                  <div className="card-meta">
                    <div className="card-meta-item">
                      <p className="card-meta-label">Bedrooms</p>
                      <p className="card-meta-value">
                        {listing.nbOfBedrooms ?? listing.bedrooms ?? '—'} bd
                      </p>
                    </div>
                    <div className="card-meta-item">
                      <p className="card-meta-label">Status</p>
                      {/* ✅ FIX: real-time status from /api/rents/is-rented/:id */}
                      <p className="card-meta-value" style={{ color: getStatusColor(status) }}>
                        {statusLoading ? '…' : capitalise(status)}
                      </p>
                    </div>
                  </div>

                  {/* Show available-after date when rented */}
                  {status === 'rented' && availAfter && (
                    <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      Available after {availAfter}
                    </p>
                  )}

                  <div className="card-price-row">
                    {/* ✅ FIX: pricePerMonth matches SearchListings + PropertyDetails */}
                    <div className="card-price">
                      {price != null
                        ? `$${Number(price).toLocaleString()}`
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
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