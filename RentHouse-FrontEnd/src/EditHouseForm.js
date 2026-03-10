import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditHouseForm.css";

const EditHouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const geocodeTimer = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageData: reader.result,
          imageFilename: file.name
        }));
      };
      reader.readAsDataURL(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

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
    fetch(`http://localhost:5000/api/houses/${id}`)
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
      })
      .catch(err => console.error("Failed to load house", err));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    try {
      const res = await fetch(`http://localhost:5000/api/houses/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      alert("House updated successfully");
      navigate(`/property/${id}`);
    } catch (error) {
      console.error("Error updating house:", error);
      alert("Failed to update house. Please try again.");
    }
  };

  return (
    <div className="edit-form-container">
      <h2 className="form-title">Edit Property</h2>
      <form className="edit-form" onSubmit={handleSubmit}>

        <label title="Enter the property title">
          Title
          <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" required />
        </label>

        <label title="Enter a full street address for accurate Google Maps directions">
          Location / Address
          <input
            name="location"
            value={formData.location}
            onChange={handleLocationChange}
            placeholder="e.g. 450 Pine St, Seattle, WA 98101"
            required
          />
        </label>

       
        <div className="coords-row">
          <label title="GPS latitude — auto-filled from address lookup, or enter manually">
            Latitude
            <input
              name="latitude"
              type="number"
              step="0.000001"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="e.g. 47.608013"
            />
          </label>
          <label title="GPS longitude — auto-filled from address lookup, or enter manually">
            Longitude
            <input
              name="longitude"
              type="number"
              step="0.000001"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="e.g. -122.335167"
            />
          </label>
        </div>
        <p className="coords-hint">
          💡 To get exact coordinates: right-click the spot on{" "}
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>
          {" "}→ copy the lat/lng shown at the top.
        </p>

        <label title="Price per day for renting">
          Price Per Day
          <input name="pricePerDay" type="number" value={formData.pricePerDay} onChange={handleChange} placeholder="Price Per Day" required />
        </label>

        <label title="Price per month for renting">
          Price Per Month
          <input name="pricePerMonth" type="number" value={formData.pricePerMonth} onChange={handleChange} placeholder="Price Per Month" required />
        </label>

        <label title="Type of property (Apartment, Villa, etc.)">
          Property Type
          <input name="propertyType" value={formData.propertyType} onChange={handleChange} placeholder="Property Type" required />
        </label>

        <label title="Number of bedrooms">
          Bedrooms
          <input name="nbOfBedrooms" type="number" value={formData.nbOfBedrooms} onChange={handleChange} placeholder="Bedrooms" required />
        </label>

        <label title="Current status (Available, Rented, etc.)">
          Status
          <input name="status" value={formData.status} onChange={handleChange} placeholder="Status" required />
        </label>

        <label title="Upload a new property image (optional)">
          Property Image
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {selectedImage && (
            <img src={selectedImage} alt="Preview" className="image-preview" />
          )}
        </label>

        <label title="Detailed description of the property">
          Description
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required />
        </label>

        <hr />
        <h3>Owner Information</h3>

        <label title="Name of the property owner">
          Owner Name
          <input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Owner Name" required />
        </label>

        <label title="Owner's email address">
          Owner Email
          <input name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} placeholder="Owner Email" required />
        </label>

        <label title="Owner's phone number">
          Owner Phone
          <input name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} placeholder="Owner Phone" required />
        </label>

        <button className="submit-btn" type="submit">
          Update Property
        </button>
      </form>
    </div>
  );
};

export default EditHouseForm;