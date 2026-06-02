package com.example.renthousebackend.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String message;
    private String username;
    private String email;
    private LocalDateTime submittedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler",
                            "password", "fcmToken", "profileImage",
                            "phoneNumber", "points", "role"})
    private User user;

    public Feedback() {}

    public Long getId() { return id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getUsername() {
        // Return from User if linked, fallback to stored string
        return user != null ? user.getUsername() : username;
    }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() {
        return user != null ? user.getEmail() : email;
    }
    public void setEmail(String email) { this.email = email; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}