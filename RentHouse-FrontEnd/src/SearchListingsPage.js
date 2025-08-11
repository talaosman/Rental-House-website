import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [mostRentedHouseIds, setMostRentedHouseIds] = useState([]);


  useEffect(() => {
    API.get("/api/houses/most-rented")
      .then((res) => {
        const ids = res.data.map((house) => house.id);
        setMostRentedHouseIds(ids);
      })
      .catch((err) => console.error("Failed to fetch most rented houses", err));
  }, []);


  // Capture the search query from the URL (if any)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get("query") || "";
    setSearchQuery(query);
  }, [location.search]);

  // Fetch listings from backend
  // useEffect(() => {
  //   fetch("http://localhost:5000/api/houses")
  //     .then((res) => {
  //       if (!res.ok) throw new Error("Failed to fetch listings");
  //       return res.json();
  //     })
  //     .then((data) => {
  //       setInitialListings(data);
  //       setAllListings(data);
  //     })
  //     .catch((err) => console.error("Error fetching houses:", err));
  // }, []);
  const handleDelete = async (id) => {
    try {
      // Fetch related favorites/rentals count for the house
      const res = await API.get(`/api/houses/${id}/related-count`);
      const relatedCount = res.data.count || 0;

      // Compose confirmation message
      let confirmMessage = "Are you sure you want to delete this property?";
      if (relatedCount > 0) {
        confirmMessage = `⚠️ This property is currently saved as a favorite or rented by ${relatedCount} user${relatedCount > 1 ? 's' : ''}.\n` +
          `Deleting it will remove all related records.\n\nAre you sure you want to delete this property?`;
      }

      // Show confirmation popup
      if (!window.confirm(confirmMessage)) return;

      // Proceed with delete request
      await API.delete(`/api/houses/${id}`);

      // Update local state removing the deleted house
      setAllListings((prev) => prev.filter((house) => house.id !== id));
      setInitialListings((prev) => prev.filter((house) => house.id !== id));

    } catch (err) {
      console.error("Failed to delete house:", err);

      // Optional: You can remove the 409 check since cascade deletes are enabled
      alert("❌ Failed to delete house due to server error.");
    }
  };

  useEffect(() => {
    API.get("/api/houses")
      .then((res) => {
        console.log("API response:", res.data); // 🔍 Check this
        setInitialListings(res.data);
        setAllListings(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch houses:", err);
      });
  }, []);


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = () => {
    const isEmpty =
      !filters.location &&
      !filters.propertyType &&
      (!filters.bedrooms || filters.bedrooms === 0) &&
      (!filters.minPrice || filters.minPrice === 0) &&
      (!filters.maxPrice || filters.maxPrice === 5000);

    if (isEmpty) {
      setAllListings(initialListings);
      return;
    }

    const filtered = initialListings.filter((listing) => {
      const matchesLocation = filters.location
        ? listing.location
          .toLowerCase()
          .includes(filters.location.toLowerCase())
        : true;

      const matchesPrice = (() => {
        const priceField = filters.priceMode === "perDay" ? listing.pricePerDay : listing.pricePerMonth;
        return (
          priceField >= (filters.minPrice || 0) &&
          priceField <= (filters.maxPrice || Infinity)
        );
      })();


      const matchesPropertyType = filters.propertyType
        ? listing.propertyType === filters.propertyType
        : true;

      const matchesBedrooms = filters.bedrooms
        ? listing.nbOfBedrooms === parseInt(filters.bedrooms)
        : true;

      return (
        matchesLocation &&
        matchesPrice &&
        matchesPropertyType &&
        matchesBedrooms
      );
    });

    setAllListings(filtered);
  };

  const handleViewDetails = (id) => {
    navigate(`/property/${id}`);
  };
  const propertyTypes = [];
  for (let i = 0; i < allListings.length; i++) {
    const type = allListings[i].propertyType;
    // Add type if not already in propertyTypes
    if (type && !propertyTypes.includes(type)) {
      propertyTypes.push(type);
    }
  }
  useEffect(() => {
    const role = localStorage.getItem("userRole"); // assuming 'role' is stored as 'Admin', 'User', etc.
    setUserRole(role);
  }, []);


  return (
    <div className="search-listings">
      <h2>Search Listings</h2>

      {/* Filters */}
      <div className="filters">
       
          <div className="filter-container">
            <div className="filter-group">
              <label>Location:</label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="e.g. Downtown"
              />
            </div>

            <div className="filter-group">
              <label className='PriceFilter'>Price Mode:</label>
              <select
                name="priceMode"
                value={filters.priceMode}
                onChange={handleFilterChange}
                className='PriceFilter'
              >
                <option value="perMonth">Per Month</option>
                <option value="perDay">Per Day</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Price Range ({filters.priceMode === "perDay" ? "/day" : "/month"}):</label>
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="Min Price"
              />
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max Price"
              />
            </div>


            <div className="filter-group">
              <label>Bedrooms:</label>
              <input
                type="number"
                name="bedrooms"
                value={filters.bedrooms}
                onChange={handleFilterChange}
                placeholder="e.g. 2"
              />
            </div>

            <div className="filter-group">
              <label>Property Type:</label>
              <select
                name="propertyType"
                value={filters.propertyType}
                onChange={handleFilterChange}
                className="property-type"
              >
                <option value="">Any</option>
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleSearch} className="Sbtn">Search</button>
          </div>

       
       
      </div>

      {/* Listings Display */}
      <div className="property-cards">
        {allListings.length === 0 ? (
          <p>No listings found for your search.</p>
        ) : (

          allListings.map((listing) => (
            <div key={listing.id} className="property-card">
              {/* Recommended Badge */}
              {mostRentedHouseIds.includes(listing.id) && (
                <div className="badge recommended">⭐ Recommended</div>
              )}
              {listing.isNew && <div className="badge">New</div>}

              <img
                src={
                  listing.image.startsWith("http")
                    ? listing.image
                    : `http://localhost:5000/uploads/${listing.image}`
                }
                alt={listing.title}
              />

              <div className="property-info">
                <h3>{listing.title}</h3>
                <p>{listing.location}</p>
                <p>
                  {listing.pricePerMonth && <>${listing.pricePerMonth} / month<br /></>}
                  {listing.pricePerDay && <>${listing.pricePerDay} / day</>}
                </p>
                <p>{listing.nbOfBedrooms} Bedrooms</p>
                <div className="card-buttons">
                  <button onClick={() => handleViewDetails(listing.id)}>
                    View Details
                  </button>
                  {userRole === "ADMIN" && (
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(listing.id)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchListings;
