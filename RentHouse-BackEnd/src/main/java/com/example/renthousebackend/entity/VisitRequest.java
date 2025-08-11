package com.example.renthousebackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String visitorName;
    private String visitorEmail;
    private Boolean accepted; // null = pending, true/false afterwards

    private LocalDate visitDate;
    private LocalTime visitTime;

    @ManyToOne
    @JoinColumn(name = "house_id")
    private House house;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // the user who requested the visit

    @Column(name = "status")
    private String status; // "PENDING", "ACCEPTED", or "REJECTED"

    @Column(name = "responded")
    private boolean responded = false;

    public User getVisitor() {
        return user;
    }

    public void setVisitor(User visitor) {
        this.user = user;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isResponded() {
        return responded;
    }

    public void setResponded(boolean responded) {
        this.responded = responded;
    }

}
