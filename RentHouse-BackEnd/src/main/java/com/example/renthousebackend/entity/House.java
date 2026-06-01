package com.example.renthousebackend.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Lob;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class House {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String location;
    private String image;

    private int nbOfBedrooms;
    private String propertyType;
    private String status;
    private String description;

    private Double pricePerDay;
    private Double pricePerMonth;

    private Double latitude;
    private Double longitude;

    @Column(name = "virtual_tour_url", length = 1024)
    private String virtualTourUrl;

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "property", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<Favorite> favorites;

    @OneToMany(mappedBy = "house", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Rent> rents;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    private Owner owner;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    @JsonIgnore   // don't dump raw bytes into the JSON of /api/houses/{id}
    private byte[] imageData;

    public House() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public int getNbOfBedrooms() {
        return nbOfBedrooms;
    }

    public void setNbOfBedrooms(int nbOfBedrooms) {
        this.nbOfBedrooms = nbOfBedrooms;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPricePerDay() {
        return pricePerDay;
    }

    public void setPricePerDay(Double pricePerDay) {
        this.pricePerDay = pricePerDay;
    }

    public Double getPricePerMonth() {
        return pricePerMonth;
    }

    public void setPricePerMonth(Double pricePerMonth) {
        this.pricePerMonth = pricePerMonth;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Owner getOwner() {
        return owner;
    }

    public void setOwner(Owner owner) {
        this.owner = owner;
    }

    public String getVirtualTourUrl() {
        return virtualTourUrl;
    }

    public void setVirtualTourUrl(String virtualTourUrl) {
        this.virtualTourUrl = virtualTourUrl;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }

}
