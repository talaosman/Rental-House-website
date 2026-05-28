import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SearchListings.css";
import API from "./api";

const SearchListings = () => {
  const [allListings, setAllListings] = useState([]);
  const [initialListings, setInitialListings] = useState([]);
  const [filters, setFilters] = useState({
    location: "",
    minPrice: 0,
    maxPrice: 5000,
    bedrooms: 0,
    propertyType: "",
    priceMode: "perMonth",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [mostRentedHouseIds, setMostRentedHouseIds] = useState([]);
  const [userOffers, setUserOffers] = useState({});

  const location = useLocation();
  const navigate = useNavigate();


  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId || !allListings.length) return;

    Promise.all(
      allListings.map((listing) =>
        API.get(`/api/offers/user/${userId}/applicable/${listing.id}`)
          .then((res) => ({ id: listing.id, ...res.data }))
          .catch(() => ({ id: listing.id, hasOffer: false }))
      )
    ).then((results) => {
      const offerMap = {};
      results.forEach(({ id, hasOffer, discountPercentage }) => {
        if (hasOffer) offerMap[id] = discountPercentage;
      });
      setUserOffers(offerMap);
    });
  }, [allListings]);

  /* ── Most rented ──────────────────────────────── */
  useEffect(() => {
    API.get("/api/houses/most-rented")
      .then((res) => setMostRentedHouseIds(res.data.map((h) => h.id)))
      .catch((err) => console.error("Failed to fetch most rented houses", err));
  }, []);

  /* ── Search query from URL ────────────────────── */
  useEffect(() => {
    const query = new URLSearchParams(location.search).get("query") || "";
    setSearchQuery(query);
  }, [location.search]);

  /* ── All listings ─────────────────────────────── */
  useEffect(() => {
    API.get("/api/houses")
      .then((res) => { setInitialListings(res.data); setAllListings(res.data); })
      .catch((err) => console.error("Failed to fetch houses:", err));
  }, []);

  /* ── User role ────────────────────────────────── */
  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
  }, []);

  /* ── Handlers ─────────────────────────────────── */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    const isEmpty =
      !filters.location &&
      !filters.propertyType &&
      (!filters.bedrooms || filters.bedrooms === 0) &&
      (!filters.minPrice || filters.minPrice === 0) &&
      (!filters.maxPrice || filters.maxPrice === 5000);

    if (isEmpty) { setAllListings(initialListings); return; }

    const filtered = initialListings.filter((listing) => {
      const matchesLocation = filters.location
        ? listing.location.toLowerCase().includes(filters.location.toLowerCase())
        : true;

      const priceField = filters.priceMode === "perDay"
        ? listing.pricePerDay
        : listing.pricePerMonth;
      const matchesPrice =
        priceField >= (filters.minPrice || 0) &&
        priceField <= (filters.maxPrice || Infinity);

      const matchesPropertyType = filters.propertyType
        ? listing.propertyType === filters.propertyType
        : true;

      const matchesBedrooms = filters.bedrooms
        ? listing.nbOfBedrooms === parseInt(filters.bedrooms)
        : true;

      return matchesLocation && matchesPrice && matchesPropertyType && matchesBedrooms;
    });

    setAllListings(filtered);
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.get(`/api/houses/${id}/related-count`);
      const relatedCount = res.data.count || 0;

      let confirmMessage = "Are you sure you want to delete this property?";
      if (relatedCount > 0) {
        confirmMessage =
          `⚠️ WARNING: This property has ${relatedCount} related record${relatedCount > 1 ? "s" : ""}.\n\n` +
          `Deleting will permanently remove all favorites, rental history, and visit requests.\n\n` +
          `This action CANNOT be undone!\n\nProceed?`;
      }
      if (!window.confirm(confirmMessage)) return;

      const deleteUrl = relatedCount > 0 ? `/api/houses/${id}?force=true` : `/api/houses/${id}`;
      await API.delete(deleteUrl);
      alert("✅ Property deleted successfully!");
      setAllListings((prev) => prev.filter((h) => h.id !== id));
      setInitialListings((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete house:", err);
      if (err.response?.status === 409) alert(`❌ ${err.response.data}`);
      else if (err.response?.data) alert(`❌ ${err.response.data}`);
      else alert("❌ Failed to delete house due to server error.");
    }
  };

  const handleViewDetails = (id) => navigate(`/property/${id}`);

  const propertyTypes = Array.from(
    new Set(initialListings.map((l) => l.propertyType).filter(Boolean))
  );

  /* ── Render ───────────────────────────────────── */
  return (
    <div className="search-listings-luxury">
      <div className="listings-container">
        <h2 className="page-title">Search Listings</h2>

        {/* ── Filters ── */}
        <div className="filters-panel">
          <div className="filters-grid">

            {/* Location */}
            <div className="filter-item">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="e.g. Downtown"
                className="filter-input"
              />
            </div>

            {/* Price Mode */}
            <div className="filter-item">
              <label>Price Mode</label>
              <select
                name="priceMode"
                value={filters.priceMode}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="perMonth">Per Month</option>
                <option value="perDay">Per Day</option>
              </select>
            </div>

            {/* Price Range — gets 'price-range-item' for responsive spanning */}
            <div className="filter-item price-range-item">
              <label>
                Price Range ({filters.priceMode === "perDay" ? "/day" : "/month"})
              </label>
              <div className="price-inputs">
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  placeholder="Min"
                  className="filter-input"
                />
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="Max"
                  className="filter-input"
                />
              </div>
            </div>

            {/* Bedrooms */}
            <div className="filter-item">
              <label>Bedrooms</label>
              <input
                type="number"
                name="bedrooms"
                value={filters.bedrooms}
                onChange={handleFilterChange}
                placeholder="e.g. 2"
                className="filter-input"
              />
            </div>

            {/* Property Type */}
            <div className="filter-item">
              <label>Property Type</label>
              <select
                name="propertyType"
                value={filters.propertyType}
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">Any</option>
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <div className="filter-item filter-button-wrapper">
              <button className="search-btn" onClick={handleSearch}>
                Search
              </button>
            </div>

          </div>
        </div>

        {/* ── Property Grid ── */}
        <div className="property-grid">
          {allListings.length === 0 ? (
            <div className="no-results">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#ddd" strokeWidth="2" />
                <path d="M32 20v24M20 32h24" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h3>No Properties Found</h3>
              <p>Try adjusting your filters to see more results</p>
            </div>
          ) : (
            allListings.map((listing) => {
              const offer = userOffers[listing.id];
              return (
                <div key={listing.id} className="luxury-card">

                  {/* Badges */}
                  <div className="card-badges">
                    {offer && (
                      <span className="badge badge-offer">
                        🔥 {offer}% OFF
                      </span>
                    )}
                    {mostRentedHouseIds.includes(listing.id) && (
                      <span className="badge badge-recommended">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Recommended
                      </span>
                    )}
                    {listing.isNew && (
                      <span className="badge badge-new">New</span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="card-image-wrapper">
                    <img
                      src={
                        listing.image?.startsWith("http")
                          ? listing.image
                          : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/uploads/${listing.image}`
                      }
                      alt={listing.title}
                      className="card-image"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/400x200?text=No+Image"; }}
                    />
                  </div>

                  {/* Content */}
                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">{listing.title}</h3>
                      <p className="card-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {listing.location}
                      </p>
                    </div>

                    <div className="card-details">
                      <div className="detail-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M9 3v18M3 9h18M3 15h6" />
                        </svg>
                        <span>{listing.nbOfBedrooms} Beds</span>
                      </div>
                      {listing.propertyType && (
                        <div className="detail-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <span>{listing.propertyType}</span>
                        </div>
                      )}
                    </div>

                    {/* Prices */}
                    <div className="Search-card-footer">
                      <div className="price-section">
                        {listing.pricePerMonth && (
                          <div className="price-item">
                            {offer ? (
                              <>
                                <span className="price-amount original-price">
                                  ${listing.pricePerMonth.toLocaleString()}
                                </span>
                                <span className="price-amount discounted-price">
                                  ${(listing.pricePerMonth * (1 - offer / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </>
                            ) : (
                              <span className="price-amount">
                                ${listing.pricePerMonth.toLocaleString()}
                              </span>
                            )}
                            <span className="price-period">/month</span>
                          </div>
                        )}
                        {listing.pricePerDay && (
                          <div className="price-item secondary">
                            {offer ? (
                              <>
                                <span className="price-amount original-price">
                                  ${listing.pricePerDay.toLocaleString()}
                                </span>
                                <span className="price-amount discounted-price">
                                  ${(listing.pricePerDay * (1 - offer / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </>
                            ) : (
                              <span className="price-amount">
                                ${listing.pricePerDay.toLocaleString()}
                              </span>
                            )}
                            <span className="price-period">/day</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="card-actions">
                      <button
                        className="view-details-btn"
                        onClick={() => handleViewDetails(listing.id)}
                      >
                        View Details
                      </button>
                      {userRole === "ADMIN" && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(listing.id)}
                          title="Delete property"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchListings;