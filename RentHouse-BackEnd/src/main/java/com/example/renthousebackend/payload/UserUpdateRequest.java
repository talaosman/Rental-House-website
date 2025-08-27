package com.example.renthousebackend.payload;

public class UserUpdateRequest {
    private long userId; // Added for user identification
    private String oldEmail;
    private String username;
    private String email;
    private String password; // Added for password update
    private String phoneNumber;
    private String profileImage;

    // Getters and Setters
    public String getOldEmail() {
        return oldEmail;
    }

    public void setOldEmail(String oldEmail) {
        this.oldEmail = oldEmail;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

     public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
     public String getProfileImage() {
        return profileImage;
    }
    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }
     public long getUserId() {
        return userId;
     }
     public void setUserId(long userId) {
        this.userId = userId;
     }
}
