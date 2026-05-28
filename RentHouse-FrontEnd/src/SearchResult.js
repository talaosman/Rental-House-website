import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from "./listingContext.js";
import './SearchResult.css';
import API from "./api";

const SearchResult = () => {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [loading, setLoading] = useState(true); // ✅ Loading flag

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    API.get("/api/houses")
      .then((res) => {
        setAllListings(res.data);
        setLoading(false); // ✅ Only stop loading after data arrives
      })
      .catch((err) => {
        console.error("Failed to fetch houses:", err);
        setLoading(false);
      });
  }, []);

  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get('query') || '';

  useEffect(() => {
    if (loading) return; // ✅ Don’t run search while loading

    if (!query.trim()) {
      setFilteredListings([]);
      setShowNoResultsModal(false);
      return;
    }

    const filtered = allListings.filter((listing) => {
      return (
        listing.location.toLowerCase().includes(query.toLowerCase()) ||
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        listing.propertyType.toLowerCase().includes(query.toLowerCase())
      );
    });

    setFilteredListings(filtered);
    setShowNoResultsModal(filtered.length === 0);
  }, [allListings, query, loading]); // ✅ Watch loading too

  const handleViewDetails = (id) => {
    navigate(`/property/${id}`);
  };

  const closeModal = () => {
    setShowNoResultsModal(false);
    navigate('/');
  };

  return (
    <div className="search-container">
      <h2 className="search-heading">Search Results for "{query}"</h2>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : filteredListings.length > 0 ? (

        <div className="search-grid">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="search-card"
              onClick={() => handleViewDetails(listing.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleViewDetails(listing.id)}
              role="button"
              aria-label={`View details for ${listing.title}`}
            >
              <img
                src={
                  listing.image.startsWith("http")
                    ? listing.image
                    : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/uploads/${listing.image}`
                }
                alt={listing.title}
                className="listing-image"
              />
              <div className="card-content">
                <h3 className="card-title">{listing.title}</h3>
                <p className="card-text"><strong>Location:</strong> {listing.location}</p>
                <p className="card-text"><strong>Price:</strong> ${listing.price}</p>
                <p className="card-text"><strong>Type:</strong> {listing.propertyType}</p>
                <p className="card-text"><strong>Bedrooms:</strong> {listing.nbOfBedrooms}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(listing.id);
                  }}
                  className="details-button"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        showNoResultsModal && (
          <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>No Properties Found</h3>
              <p>Sorry, we couldn’t find any properties matching your search.</p>
              <button onClick={closeModal} className="close-button">Close</button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default SearchResult;
