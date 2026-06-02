package com.example.renthousebackend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class StripeCheckoutRequest {
  private String userId;
    private String houseId;
    private String startDate;
    private String endDate;
    private String rentType;

    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getHouseId() { return houseId; }
    public void setHouseId(String houseId) { this.houseId = houseId; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getRentType() { return rentType; }
    public void setRentType(String rentType) { this.rentType = rentType; }
}
