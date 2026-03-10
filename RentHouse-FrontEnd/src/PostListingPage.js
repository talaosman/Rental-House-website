import React, { useState, useEffect, useRef } from "react";
import { useAppState } from "./listingContext.js";
import "./PostListing.css";

const PostListing = () => {
  const { allListings, setAllListings } = useAppState();
  const [imageFile, setImageFile] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState(""); // "loading" | "found" | "not_found" | ""
  const geocodeTimer = useRef(null);

  const [form, setForm] = useState({
    title: "",
    pricePerDay: "",
    pricePerMonth: "",
    location: "",
    contact: "",
    nbOfBedrooms: "",
    propertyType: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    description: "",
    latitude: "",
    longitude: "",
  });

  const addListing = (newListing) => {
    const maxId = allListings.reduce((max, listing) => Math.max(max, listing.id), 0);
    setAllListings((prev) => [...prev, { ...newListing, id: maxId + 1 }]);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ─── Auto-geocode location as user types ──────────────────────────────────
  const geocodeLocation = async (locationText) => {
    if (!locationText || locationText.trim().length < 5) {
      setGeocodeStatus("");
      setForm((prev) => ({ ...prev, latitude: "", longitude: "" }));
      return;
    }

    setGeocodeStatus("loading");

    try {
      const encoded = encodeURIComponent(locationText.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm((prev) => ({
          ...prev,
          latitude: parseFloat(lat).toFixed(6),
          longitude: parseFloat(lon).toFixed(6),
        }));
        setGeocodeStatus("found");
      } else {
        setGeocodeStatus("not_found");
        setForm((prev) => ({ ...prev, latitude: "", longitude: "" }));
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setGeocodeStatus("not_found");
    }
  };

  // Debounce geocoding to avoid spamming the API
  const handleLocationChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, location: value }));

    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      geocodeLocation(value);
    }, 800);
  };

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.title ||
      !form.nbOfBedrooms ||
      !form.location ||
      !form.pricePerDay ||
      !form.pricePerMonth ||
      !form.description ||
      !imageFile
    ) {
      alert("Please fill in all fields.");
      return;
    }

    if (!form.latitude || !form.longitude) {
      alert(
        "Could not find GPS coordinates for this location.\n\n" +
        "Please enter a more specific address (e.g. '123 Main St, Seattle, WA') " +
        "or manually enter latitude and longitude."
      );
      return;
    }

    try {
      const base64Image = await toBase64(imageFile);

      const payload = {
        title: form.title,
        pricePerDay: form.pricePerDay,
        pricePerMonth: form.pricePerMonth,
        location: form.location,
        description: form.description,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone,
        nbOfBedrooms: form.nbOfBedrooms,
        propertyType: form.propertyType,
        imageFilename: imageFile.name,
        imageData: base64Image,
        latitude: parseFloat(form.latitude),   // ✅ new
        longitude: parseFloat(form.longitude), // ✅ new
      };

      const listingRes = await fetch("http://localhost:5000/api/houses/uploadBase64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!listingRes.ok) throw new Error("Listing upload failed");

      const data = await listingRes.json();
      setAllListings((prev) => [...prev, data]);

      setForm({
        title: "",
        pricePerDay: "",
        pricePerMonth: "",
        location: "",
        nbOfBedrooms: "",
        propertyType: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        description: "",
        latitude: "",
        longitude: "",
      });
      setImageFile(null);
      setGeocodeStatus("");

      alert("Listing added successfully!");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to upload listing");
    }
  };

  useEffect(() => {
    console.log(allListings);
  }, [allListings]);

  return (
    <div className="post-listing-page">
      <form onSubmit={handleSubmit}>
        <h2>Post a Property Listing</h2>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Property Title</label>
          <input
            id="title"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter property title"
            required
          />
        </div>

        {/* Property Type */}
        <div className="form-group">
          <label htmlFor="propertyType">Property Type</label>
          <input
            id="propertyType"
            type="text"
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
            placeholder="Enter property type (e.g., Apartment, House)"
            required
          />
        </div>

        {/* Bedrooms */}
        <div className="form-group">
          <label htmlFor="nbOfBedrooms">Number of Bedrooms</label>
          <input
            id="nbOfBedrooms"
            type="number"
            name="nbOfBedrooms"
            value={form.nbOfBedrooms}
            onChange={handleChange}
            placeholder="Enter number of bedrooms"
            required
          />
        </div>

        {/* Location with auto-geocode */}
        <div className="form-group">
          <label htmlFor="location">
            Address / Location
            <span className="label-hint"> — enter a full street address for best accuracy</span>
          </label>
          <input
            id="location"
            type="text"
            name="location"
            value={form.location}
            onChange={handleLocationChange}
            placeholder="e.g. 450 Pine St, Seattle, WA 98101"
            required
          />

          {/* Geocode feedback */}
          {geocodeStatus === "loading" && (
            <div className="geocode-status loading">
              📍 Looking up coordinates...
            </div>
          )}
          {geocodeStatus === "found" && form.latitude && (
            <div className="geocode-status found">
              ✅ Location found — {form.latitude}, {form.longitude}
            </div>
          )}
          {geocodeStatus === "not_found" && (
            <div className="geocode-status not-found">
              ⚠️ Address not recognized. Enter coordinates manually below.
            </div>
          )}
        </div>

        {/* Manual lat/lng override */}
        <div className="form-group coords-row">
          <div>
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              type="number"
              step="0.000001"
              name="latitude"
              value={form.latitude}
              onChange={handleChange}
              placeholder="e.g. 47.608013"
            />
          </div>
          <div>
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              type="number"
              step="0.000001"
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              placeholder="e.g. -122.335167"
            />
          </div>
        </div>
        <p className="coords-hint">
          💡 Tip: To get exact coordinates, right-click any spot on{" "}
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
            Google Maps
          </a>{" "}
          → click the coordinates shown at the top to copy them.
        </p>

        {/* Prices */}
        <div className="form-group">
          <label htmlFor="pricePerDay">Price per Day</label>
          <input
            id="pricePerDay"
            type="number"
            name="pricePerDay"
            value={form.pricePerDay}
            onChange={handleChange}
            placeholder="Enter daily price"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="pricePerMonth">Price per Month</label>
          <input
            id="pricePerMonth"
            type="number"
            name="pricePerMonth"
            value={form.pricePerMonth}
            onChange={handleChange}
            placeholder="Enter monthly price"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Enter a detailed description"
            required
          />
        </div>

        {/* Image */}
        <label htmlFor="image">Upload Image</label>
        <input
          id="image"
          type="file"
          name="image"
          onChange={(e) => setImageFile(e.target.files[0])}
          required
        />

        {/* Owner info */}
        <div className="form-group">
          <label htmlFor="ownerName">Owner Name</label>
          <input
            id="ownerName"
            type="text"
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            placeholder="Enter owner's name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="ownerEmail">Owner Email</label>
          <input
            id="ownerEmail"
            type="email"
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={handleChange}
            placeholder="Enter owner's email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="ownerPhone">Owner Phone</label>
          <input
            id="ownerPhone"
            type="text"
            name="ownerPhone"
            value={form.ownerPhone}
            onChange={handleChange}
            placeholder="Enter owner's phone number"
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Post Listing
        </button>
      </form>
    </div>
  );
};

export default PostListing;