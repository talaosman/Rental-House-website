import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaSave, FaUpload } from "react-icons/fa";
import "./UserProfile.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";


const UserProfile = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [editingField, setEditingField] = useState({
    fullName: false,
    email: false,
    phoneNumber: false,
  });

  const [isEditingImage, setIsEditingImage] = useState(false); // NEW: controls if user is changing profile image
  const [userData, setUserData] = useState({
    userId: localStorage.getItem("userId") || "", // add this
    fullName: localStorage.getItem("username") || "",
    email: localStorage.getItem("email") || "",
    phoneNumber: localStorage.getItem("phoneNumber") || "",
    password: localStorage.getItem("password") || "",
    profileImage: localStorage.getItem("profileImage") || "",
  });


  // Handle input change for text fields
  const handleInputChange = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle image file selection and preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserData((prev) => ({ ...prev, profileImage: reader.result }));
        setIsEditingImage(true); // enable save button
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfileImage = async () => {
    const authHeader = localStorage.getItem("authHeader");

    try {
      const response = await fetch("http://localhost:5000/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: authHeader || "",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: userData.userId, // <-- add this
          username: userData.fullName,
          email: userData.email,
          password: userData.password,
          phoneNumber: userData.phoneNumber,
          profileImage: userData.profileImage,
        }),
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        alert("Update failed: " + errorMsg);
        return;
      }

      localStorage.setItem("profileImage", userData.profileImage);
      alert("Profile image updated successfully");
      setIsEditingImage(false);
    } catch (error) {
      alert("Network error: " + error.message);
    }
  };

  const toggleEditing = async (field) => {
    if (editingField[field]) {
      const authHeader = localStorage.getItem("authHeader");

      try {
        const response = await fetch("http://localhost:5000/api/users/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authHeader || "",
          },
          credentials: "include",
          body: JSON.stringify({
            username: userData.fullName,
            email: userData.email,
            password: userData.password,
            phoneNumber: userData.phoneNumber,
            profileImage: userData.profileImage,
          }),
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          alert("Update failed: " + errorMsg);
          return;
        }

        if (field === "fullName") {
          localStorage.setItem("username", userData.fullName);
        } else {
          localStorage.setItem(field, userData[field]);
        }

        alert("Profile updated successfully");
      } catch (error) {
        alert("Network error: " + error.message);
        return;
      }
    }

    setEditingField((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const renderField = (label, field, isEditable = true) => (
    <div className="info-row">
      <span className="label">{label}</span>
      <div className="value">
        {editingField[field] && isEditable ? (
          <input
            value={userData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
          />
        ) : (
          <span>{userData[field]}</span>
        )}
        {isEditable && (
          <button
            className="edit-btn"
            onClick={() => toggleEditing(field)}
            title={editingField[field] ? "Save" : "Edit"}
          >
            {editingField[field] ? <FaSave /> : <FaEdit />}
          </button>
        )}
      </div>
    </div>
  );
  const avatarUrl =
    userData.profileImage && userData.profileImage !== "null"
      ? userData.profileImage.startsWith("data:") || userData.profileImage.startsWith("http")
        ? userData.profileImage
        : `data:image/jpeg;base64,${userData.profileImage}`
      : userData.fullName
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`
        : `https://ui-avatars.com/api/?name=User&background=random`;

  return (
    <section className="profile-page">
      <div className="profile-container">
        <header className="profile-header" style={{ position: "relative" }}>
          <img
            src={avatarUrl}
            alt="User Avatar"
            className="profile-image"
            style={{ cursor: "pointer" }}
            onClick={() => setIsEditingImage(true)}
            title="Click to change profile image"
          />


          {isEditingImage && (
            <div
              style={{
                position: "absolute",
                top: "110px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#fff",
                padding: "10px",
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                zIndex: 10,
                textAlign: "center",
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ marginBottom: "10px" }}
              />
              <div>
                <button
                  onClick={saveProfileImage}
                  className="save-image-btn"
                  style={{ marginRight: "8px" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingImage(false)}
                  className="cancel-image-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <h2>{userData.fullName}</h2>
          <p className="username">
            @{userData.fullName.toLowerCase().replace(/\s+/g, "")}
          </p>
        </header>

        <section className="profile-info">
          {renderField("Username", "fullName")}
          {renderField("Email", "email")}
          {renderField("Phone Number", "phoneNumber")}
          <div className="info-row">
            <span className="label">Password</span>
            <div className="value password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={userData.password}
                readOnly
              />
              <button
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                type="button"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>


          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </section>
      </div>
    </section>
  );
};

export default UserProfile;
