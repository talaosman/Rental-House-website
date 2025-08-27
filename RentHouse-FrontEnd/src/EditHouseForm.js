import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditHouseForm.css";

const EditHouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageData: reader.result, // base64 string
          imageFilename: file.name
        }));
      };
      reader.readAsDataURL(file);
      setSelectedImage(URL.createObjectURL(file)); // preview if needed
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
        <label title="Enter the property title">
          Title
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Title"
            required
          />
        </label>

        <label title="Enter the property location">
          Location
          <input
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Location"
            required
          />
        </label>

        <label title="Price per day for renting">
          Price Per Day
          <input
            name="pricePerDay"
            type="number"
            value={formData.pricePerDay}
            onChange={handleChange}
            placeholder="Price Per Day"
            required
          />
        </label>

        <label title="Price per month for renting">
          Price Per Month
          <input
            name="pricePerMonth"
            type="number"
            value={formData.pricePerMonth}
            onChange={handleChange}
            placeholder="Price Per Month"
            required
          />
        </label>

        <label title="Type of property (Apartment, Villa, etc.)">
          Property Type
          <input
            name="propertyType"
            value={formData.propertyType}
            onChange={handleChange}
            placeholder="Property Type"
            required
          />
        </label>

        <label title="Number of bedrooms">
          Bedrooms
          <input
            name="nbOfBedrooms"
            type="number"
            value={formData.nbOfBedrooms}
            onChange={handleChange}
            placeholder="Bedrooms"
            required
          />
        </label>

        <label title="Current status (Available, Rented, etc.)">
          Status
          <input
            name="status"
            value={formData.status}
            onChange={handleChange}
            placeholder="Status"
            required
          />
        </label>

        <label title="Upload a property image">
          Property Image
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        <label title="Detailed description of the property">
          Description
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            required
          />
        </label>

        <hr />
        <h3>Owner Information</h3>

        <label title="Name of the property owner">
          Owner Name
          <input
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            placeholder="Owner Name"
            required
          />
        </label>

        <label title="Owner's email address">
          Owner Email
          <input
            name="ownerEmail"
            type="email"
            value={formData.ownerEmail}
            onChange={handleChange}
            placeholder="Owner Email"
            required
          />
        </label>

        <label title="Owner's phone number">
          Owner Phone
          <input
            name="ownerPhone"
            value={formData.ownerPhone}
            onChange={handleChange}
            placeholder="Owner Phone"
            required
          />
        </label>

        <button className="submit-btn" type="submit">
          Update Property
        </button>
      </form>

    </div>
  );
};

export default EditHouseForm;
