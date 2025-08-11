import React, { useState, useEffect } from "react";
import { useAppState } from "./listingContext.js";
import "./PostListing.css";

const PostListing = () => {
  const { allListings, setAllListings } = useAppState();
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    pricePerDay: "",
    pricePerMonth: "",
    location: "",
    image: "",
    contact: "",
    nbOfBedrooms: "",
    propertyType: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: ""
  });
  const addListing = (newListing) => {
    const maxId = allListings.reduce(
      (max, listing) => Math.max(max, listing.id),
      0
    );
    const newId = maxId + 1;

    setAllListings((prevListings) => [
      ...prevListings,
      { ...newListing, id: newId },
    ]);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.title ||
      !form.nbOfBedrooms ||
      !form.location ||
      !form.pricePerDay ||
      !form.pricePerMonth ||
      !imageFile
    ) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("pricePerDay", form.pricePerDay.toString());
      formData.append("pricePerMonth", form.pricePerMonth.toString());
      formData.append("location", form.location);
      formData.append("ownerName", form.ownerName);
      formData.append("ownerEmail", form.ownerEmail);
      formData.append("ownerPhone", form.ownerPhone);
      formData.append("nbOfBedrooms", form.nbOfBedrooms.toString());
      formData.append("propertyType", form.propertyType);
      formData.append("image", imageFile);

      const listingRes = await fetch("http://localhost:5000/api/houses", {
        method: "POST",
        body: formData, // no need to set Content-Type, browser sets multipart/form-data automatically
      });

      if (!listingRes.ok) throw new Error("Listing upload failed");

      const data = await listingRes.json();

      setAllListings((prev) => [...prev, data]);

      // reset form
      setForm({
        title: "",
        pricePerDay: "",
        pricePerMonth: "",
        location: "",
        nbOfBedrooms: "",
        propertyType: "",
        image: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: ""
      });
      setImageFile(null);

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

        {/* Number of Bedrooms */}
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

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Enter property location"
            required
          />
        </div>

        {/* Price */}
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

        {/* Image URL */}
        {/* <div className="form-group">
          <label htmlFor="image">Image URL</label>
          <input
            id="image"
            type="text"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="Enter image URL"
            required
          />
        </div> */}
        <label htmlFor="image">Upload Image</label>
        <input
          id="image"
          type="file"
          name="image"
          onChange={(e) => setImageFile(e.target.files[0])}
          required
        />

        {/* Contact */}
        {/* Owner Name */}
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

        {/* Owner Email */}
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

        {/* Owner Phone */}
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


        {/* Submit Button */}
        <button type="submit" className="submit-button">
          Post Listing
        </button>
      </form>
    </div>
  );
};

export default PostListing;
