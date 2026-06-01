import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditHouseForm.css";

const EditHouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const geocodeTimer = useRef(null);
  const [tourFile, setTourFile] = useState(null);
  const [tourUploading, setTourUploading] = useState(false);
  const [tourStatus, setTourStatus] = useState(""); // "success" | "error" | ""
  const [existingTourKey, setExistingTourKey] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    pricePerDay: "",
    pricePerMonth: "",
    propertyType: "",
    nbOfBedrooms: "",
    status: "",
    description: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          title: data.title || "",
          location: data.location || "",
          pricePerDay: data.pricePerDay || "",
          pricePerMonth: data.pricePerMonth || "",
          propertyType: data.propertyType || "",
          nbOfBedrooms: data.nbOfBedrooms || "",
          status: data.status || "",
          description: data.description || "",
          ownerName: data.owner?.name || "",
          ownerEmail: data.owner?.email || "",
          ownerPhone: data.owner?.phone || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
        });
        if (data.latitude && data.longitude) setGeocodeStatus("found");
        if (data.virtualTourUrl) setExistingTourKey(data.virtualTourUrl);
      })
      .catch(err => console.error("Failed to load house", err));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageData: reader.result,
          imageFilename: file.name,
        }));
      };
      reader.readAsDataURL(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const geocodeLocation = async (locationText) => {
    if (!locationText || locationText.trim().length < 5) {
      setGeocodeStatus("");
      setFormData(prev => ({ ...prev, latitude: "", longitude: "" }));
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
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(data[0].lat).toFixed(6),
          longitude: parseFloat(data[0].lon).toFixed(6),
        }));
        setGeocodeStatus("found");
      } else {
        setGeocodeStatus("not_found");
        setFormData(prev => ({ ...prev, latitude: "", longitude: "" }));
      }
    } catch {
      setGeocodeStatus("not_found");
    }
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, location: value }));
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeLocation(value), 800);
  };

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      const proceed = window.confirm(
        "No GPS coordinates found for this location.\n\n" +
        "The Google Maps button will fall back to address text search.\n\n" +
        "Continue anyway?"
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/update/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          }),
        }
      );

      if (!res.ok) throw new Error("Update failed");
      alert("House updated successfully");
      navigate(`/property/${id}`);
    } catch (error) {
      console.error("Error updating house:", error);
      alert("Failed to update house. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleTourUpload = async () => {
    if (!tourFile) return;
    setTourUploading(true);
    setTourStatus("");

    const formPayload = new FormData();
    formPayload.append("file", tourFile);

    try {
      // Use the same authHeader your login already stores
      const authHeader = localStorage.getItem("authHeader");

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}/virtual-tour`,
        {
          method: "PUT",
          headers: {
            ...(authHeader && { Authorization: authHeader }),
          },
          credentials: "include",   // also send session cookie as fallback
          body: formPayload,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setExistingTourKey(data.key);
      setTourStatus("success");
      setTourFile(null);
    } catch (err) {
      console.error(err);
      setTourStatus("error");
    } finally {
      setTourUploading(false);
    }
  };

  const handleTourDelete = async () => {
    if (!window.confirm("Remove the 360° virtual tour from this property?")) return;

    try {
      const authHeader = localStorage.getItem("authHeader");

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/houses/${id}/virtual-tour`,
        {
          method: "DELETE",
          headers: {
            ...(authHeader && { Authorization: authHeader }),
          },
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Delete failed");
      setExistingTourKey(null);
      setTourStatus("");
    } catch (err) {
      console.error(err);
      alert("Failed to remove virtual tour.");
    }
  };

  return (
    <div className="edit-form-container">
      <form className="edit-form" onSubmit={handleSubmit}>

        {/* ── Header ── */}
        <h2 className="form-title">Edit Property</h2>

        {/* ── Section 1 · Property Details ── */}
        <div className="form-section">
          <p className="section-title">Property Details</p>

          <div className="form-group">
            <label htmlFor="title">Property Title</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Bright Corner Apartment with City Views"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="propertyType">Property Type</label>
              <input
                id="propertyType"
                name="propertyType"
                type="text"
                value={formData.propertyType}
                onChange={handleChange}
                placeholder="Apartment, House, Studio…"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nbOfBedrooms">Bedrooms</label>
              <input
                id="nbOfBedrooms"
                name="nbOfBedrooms"
                type="number"
                value={formData.nbOfBedrooms}
                onChange={handleChange}
                placeholder="e.g. 2"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <input
                id="status"
                name="status"
                type="text"
                value={formData.status}
                onChange={handleChange}
                placeholder="Available, Rented…"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the property — amenities, neighbourhood, standout features…"
              required
            />
          </div>
        </div>

        {/* ── Section 2 · Location ── */}
        <div className="form-section">
          <p className="section-title">Location</p>

          <div className="form-group">
            <label htmlFor="location">Street Address</label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleLocationChange}
              placeholder="e.g. 450 Pine St, Seattle, WA 98101"
              required
            />
            {geocodeStatus === "found" && formData.latitude && (
              <div className="geocode-status found">
                ✅ Location found — {formData.latitude}, {formData.longitude}
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
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g. 47.608013"
              />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={handleChange}
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
                id="pricePerDay"
                name="pricePerDay"
                type="number"
                value={formData.pricePerDay}
                onChange={handleChange}
                placeholder="e.g. 120"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricePerMonth">Price per Month ($)</label>
              <input
                id="pricePerMonth"
                name="pricePerMonth"
                type="number"
                value={formData.pricePerMonth}
                onChange={handleChange}
                placeholder="e.g. 2800"
                required
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
                  {selectedImage
                    ? formData.imageFilename
                    : "Click to replace image — JPG, PNG or WEBP"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            {selectedImage && (
              <img src={selectedImage} alt="Preview" className="image-preview" />
            )}
          </div>
        </div>
        {/* ── Section · Virtual Tour ── */}
        <div className="form-section">
          <p className="section-title">360° Virtual Tour</p>

          {existingTourKey ? (
            <div className="tour-existing">
              <span className="tour-active-badge">⦿ Virtual tour active</span>
              <p className="tour-hint">
                Upload a new file below to replace it, or remove it entirely.
              </p>
              <button
                type="button"
                className="tour-delete-btn"
                onClick={handleTourDelete}
              >
                🗑 Remove Virtual Tour
              </button>
            </div>
          ) : (
            <p className="tour-hint">No virtual tour uploaded yet for this property.</p>
          )}

          <div className="form-group" style={{ marginTop: "12px" }}>
            <label>
              {existingTourKey ? "Replace 360° Image" : "Upload 360° Image"}
              <span className="label-hint">
                Equirectangular JPEG or PNG · max 30 MB
              </span>
            </label>
            <div className="file-upload-wrapper">
              <label className="file-upload-label">
                <span className="upload-icon">🌐</span>
                <span>
                  {tourFile ? tourFile.name : "Click to select your 360° panorama file"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    setTourFile(e.target.files[0]);
                    setTourStatus("");
                  }}
                />
              </label>
            </div>
          </div>

          {tourFile && (
            <button
              type="button"
              className="tour-upload-btn"
              onClick={handleTourUpload}
              disabled={tourUploading}
            >
              {tourUploading ? "Uploading…" : "Upload Virtual Tour"}
            </button>
          )}

          {tourStatus === "success" && (
            <div className="geocode-status found">
              ✅ Virtual tour uploaded successfully!
            </div>
          )}
          {tourStatus === "error" && (
            <div className="geocode-status not-found">
              ⚠️ Upload failed — check the file format and try again.
            </div>
          )}
        </div>

        {/* ── Section 5 · Owner Info ── */}
        <div className="form-section">
          <p className="section-title">Owner Information</p>

          <div className="form-group">
            <label htmlFor="ownerName">Full Name</label>
            <input
              id="ownerName"
              name="ownerName"
              type="text"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="Owner's full name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ownerEmail">Email Address</label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={handleChange}
                placeholder="owner@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ownerPhone">Phone Number</label>
              <input
                id="ownerPhone"
                name="ownerPhone"
                type="text"
                value={formData.ownerPhone}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="submit-section">
          <p className="submit-note">
            Changes will be reflected on the listing page immediately after saving.
          </p>
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
            {!isSubmitting && <span className="btn-arrow">→</span>}
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditHouseForm;