import React, { useState, useEffect, useRef } from "react";
import "./PostListing.css";
import { useNavigate } from "react-router-dom";
import { useAppState } from "./listingContext.js";
import CountryCodePicker from "./CountryCodePicker";

const PostListing = () => {
  const { allListings, setAllListings } = useAppState();
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const geocodeTimer = useRef(null);
  const [tourFile, setTourFile] = useState(null);
  const [tourUploading, setTourUploading] = useState(false);
  const [tourStatus, setTourStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    ownerPhone: "",        // just the local number, no code
    ownerCountryCode: "+961", // separate field for the dial code
    description: "",
    latitude: "",
    longitude: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ─── Auto-geocode ────────────────────────────────────────────
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

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, location: value }));
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeLocation(value), 800);
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
      !form.title || !form.nbOfBedrooms || !form.location ||
      !form.pricePerDay || !form.pricePerMonth || !form.description || !imageFile
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!form.latitude || !form.longitude) {
      alert(
        "Could not find GPS coordinates for this location.\n\n" +
        "Please enter a more specific address or fill in the coordinates manually."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const base64Image = await toBase64(imageFile);

      const fullPhone = form.ownerPhone
        ? `${form.ownerCountryCode} ${form.ownerPhone}`.trim()
        : "";

      const payload = {
        title: form.title,
        pricePerDay: form.pricePerDay,
        pricePerMonth: form.pricePerMonth,
        location: form.location,
        description: form.description,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: fullPhone,
        nbOfBedrooms: form.nbOfBedrooms,
        propertyType: form.propertyType,
        imageFilename: imageFile.name,
        imageData: base64Image,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      };

      const listingRes = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/uploadBase64`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!listingRes.ok) throw new Error("Listing upload failed");

      const data = await listingRes.json();
      setAllListings((prev) => [...prev, data]);

      // ── Upload virtual tour if one was selected ──────────────
      let tourUploadedOk = false;
      const hadTourFile = !!tourFile;

      if (tourFile && data.id) {
        setTourUploading(true);
        try {
          const tourPayload = new FormData();
          tourPayload.append("file", tourFile);

          const authHeader = localStorage.getItem("authHeader");
          const tourRes = await fetch(
            `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${data.id}/virtual-tour`,
            {
              method: "PUT",
              headers: { ...(authHeader && { Authorization: authHeader }) },
              credentials: "include",
              body: tourPayload,
            }
          );

          if (!tourRes.ok) {
            const err = await tourRes.json().catch(() => ({}));
            throw new Error(err.error || `Tour upload failed (${tourRes.status})`);
          }

          tourUploadedOk = true;
        } catch (tourErr) {
          console.error("Virtual tour upload error:", tourErr);
          tourUploadedOk = false;
        } finally {
          setTourUploading(false);
        }
      }

      // ── Reset form ───────────────────────────────────────────
      setForm({
        title: "", pricePerDay: "", pricePerMonth: "",
        location: "", nbOfBedrooms: "", propertyType: "",
        ownerName: "", ownerEmail: "", ownerPhone: "",
        ownerCountryCode: "+961",
        description: "", latitude: "", longitude: "",
      });
      setImageFile(null);
      setTourFile(null);
      setGeocodeStatus("");

      if (form.ownerEmail) {
        alert(
          `Listing posted ✅\n\nAn owner account email with login credentials has been sent to ${form.ownerEmail} (if this is a new owner).`
        );
      }

      if (hadTourFile && !tourUploadedOk) {
        alert("Virtual tour failed to upload — you can retry from the Edit Property page.");
      }
      navigate(`/property/${data.id}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to upload listing");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="post-listing-page">
      <form onSubmit={handleSubmit}>

        {/* ── Header ── */}
        <h2>Post a Property Listing</h2>

        {/* ── Section 1 · Property Details ── */}
        <div className="form-section">
          <p className="section-title">Property Details</p>

          <div className="form-group">
            <label htmlFor="title">Property Title</label>
            <input
              id="title" type="text" name="title"
              value={form.title} onChange={handleChange}
              placeholder="e.g. Bright Corner Apartment with City Views"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="propertyType">Property Type</label>
              <input
                id="propertyType" type="text" name="propertyType"
                value={form.propertyType} onChange={handleChange}
                placeholder="Apartment, House, Studio…"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nbOfBedrooms">Bedrooms</label>
              <input
                id="nbOfBedrooms" type="number" name="nbOfBedrooms"
                value={form.nbOfBedrooms} onChange={handleChange}
                placeholder="e.g. 2" min="0" required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" name="description"
              value={form.description} onChange={handleChange}
              placeholder="Describe the property — amenities, neighbourhood, standout features…"
              required
            />
          </div>
        </div>

        {/* ── Section 2 · Location ── */}
        <div className="form-section">
          <p className="section-title">Location</p>

          <div className="form-group">
            <label htmlFor="location">
              Street Address
              <span className="label-hint">Enter a full address for the best map accuracy</span>
            </label>
            <input
              id="location" type="text" name="location"
              value={form.location} onChange={handleLocationChange}
              placeholder="e.g. 450 Pine St, Seattle, WA 98101"
              required
            />
            {geocodeStatus === "found" && form.latitude && (
              <div className="geocode-status found">
                ✅ Location found — {form.latitude}, {form.longitude}
              </div>
            )}
            {geocodeStatus === "not_found" && (
              <div className="geocode-status not-found">
                ⚠️ Address not recognised — enter coordinates manually below.
              </div>
            )}
          </div>

          <div className="coords-row">
            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input
                id="latitude" type="number" step="0.000001" name="latitude"
                value={form.latitude} onChange={handleChange}
                placeholder="e.g. 47.608013"
              />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                id="longitude" type="number" step="0.000001" name="longitude"
                value={form.longitude} onChange={handleChange}
                placeholder="e.g. -122.335167"
              />
            </div>
          </div>

          <p className="coords-hint">
            💡 Right-click any spot on{" "}
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
              Google Maps
            </a>{" "}
            and click the coordinates at the top to copy them here.
          </p>
        </div>

        {/* ── Section 3 · Pricing ── */}
        <div className="form-section">
          <p className="section-title">Pricing</p>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pricePerDay">Price per Day ($)</label>
              <input
                id="pricePerDay" type="number" name="pricePerDay"
                value={form.pricePerDay} onChange={handleChange}
                placeholder="e.g. 120" required
              />
            </div>
            <div className="form-group">
              <label htmlFor="pricePerMonth">Price per Month ($)</label>
              <input
                id="pricePerMonth" type="number" name="pricePerMonth"
                value={form.pricePerMonth} onChange={handleChange}
                placeholder="e.g. 2800" required
              />
            </div>
          </div>
        </div>

        {/* ── Section 4 · Photos ── */}
        <div className="form-section">
          <p className="section-title">Photos</p>

          <div className="form-group">
            <label>Property Image</label>
            <div className="file-upload-wrapper">
              <label className="file-upload-label">
                <span className="upload-icon">🖼</span>
                <span>
                  {imageFile ? imageFile.name : "Click to upload — JPG, PNG or WEBP"}
                </span>
                <input
                  type="file" name="image" accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  required
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── Section 5 · Virtual Tour ── */}
        <div className="form-section">
          <p className="section-title">360° Virtual Tour</p>
          <p className="tour-hint">
            Optional — upload an equirectangular panorama image to let renters explore
            the space in 360°. The tour will be attached to this listing automatically after posting.
          </p>

          <div className="form-group" style={{ marginTop: "12px" }}>
            <label>
              360° Panorama Image
              <span className="label-hint">Equirectangular JPEG or PNG · max 30 MB</span>
            </label>
            <div className="file-upload-wrapper">
              <label className="file-upload-label">
                <span className="upload-icon">🌐</span>
                <span>
                  {tourFile ? tourFile.name : "Click to select your 360° panorama file"}
                </span>
                <input
                  type="file" accept="image/jpeg,image/png"
                  onChange={(e) => { setTourFile(e.target.files[0] || null); setTourStatus(""); }}
                />
              </label>
            </div>
          </div>

          {tourFile && (
            <div className="tour-selected-info">
              <span className="tour-file-name">📐 {tourFile.name}</span>
              <span className="tour-file-size">
                {(tourFile.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          )}

          {tourUploading && (
            <div className="tour-uploading-bar">
              <div className="tour-uploading-spinner" />
              Uploading 360° panorama…
            </div>
          )}
        </div>

        {/* ── Section 6 · Owner Info ── */}
        <div className="form-section">
          <p className="section-title">Owner Information</p>

          <div className="form-group">
            <label htmlFor="ownerName">Full Name</label>
            <input
              id="ownerName" type="text" name="ownerName"
              value={form.ownerName} onChange={handleChange}
              placeholder="Your full name" required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ownerEmail">Email Address</label>
              <input
                id="ownerEmail" type="email" name="ownerEmail"
                value={form.ownerEmail} onChange={handleChange}
                placeholder="you@example.com" required
              />
            </div>

            {/* ── Phone with country picker ── */}
            <div className="form-group">
              <label>Phone Number</label>
              <div className="phone-input-row">
                <CountryCodePicker
                  value={form.ownerCountryCode}
                  onChange={(code) =>
                    setForm((prev) => ({ ...prev, ownerCountryCode: code }))
                  }
                />
                <input
                  type="tel"
                  name="ownerPhone"
                  className="phone-local-input"
                  value={form.ownerPhone}
                  onChange={handleChange}
                  placeholder="e.g. 71 234 567"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="submit-section">
          <p className="submit-note">
            Your listing will be visible to renters immediately after posting.
          </p>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || tourUploading}
          >
            {isSubmitting || tourUploading ? "Posting…" : "Post Listing"}
            {!(isSubmitting || tourUploading) && <span className="btn-arrow">→</span>}
          </button>
        </div>

      </form>
    </div>
  );
};

export default PostListing;