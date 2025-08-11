import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditHouseForm.css";

const EditHouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
    ownerPhone: ""
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
          ownerPhone: data.owner?.phone || ""
        });
      })
      .catch(err => console.error("Failed to load house", err));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`http://localhost:5000/api/houses/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Update failed");
      alert("House updated successfully");
      navigate(`/property/${id}`);
    } catch (error) {
      console.error("Error updating house:", error);
    }
  };

  return (
    <div className="edit-form-container">
      <h2 className="form-title">Edit Property</h2>
      <form className="edit-form" onSubmit={handleSubmit}>
        <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" required />
        <input name="location" value={formData.location} onChange={handleChange} placeholder="Location" required />
        <input name="pricePerDay" type="number" value={formData.pricePerDay} onChange={handleChange} placeholder="Price Per Day" required />
        <input name="pricePerMonth" type="number" value={formData.pricePerMonth} onChange={handleChange} placeholder="Price Per Month" required />
        <input name="propertyType" value={formData.propertyType} onChange={handleChange} placeholder="Property Type" required />
        <input name="nbOfBedrooms" type="number" value={formData.nbOfBedrooms} onChange={handleChange} placeholder="Bedrooms" required />
        <input name="status" value={formData.status} onChange={handleChange} placeholder="Status" required />
        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required />

        <hr />
        <h3>Owner Information</h3>
        <input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Owner Name" required />
        <input name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} placeholder="Owner Email" required />
        <input name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} placeholder="Owner Phone" required />

        {/* Removed image upload */}
        <button className="submit-btn" type="submit">Update Property</button>
      </form>
    </div>
  );
};

export default EditHouseForm;
