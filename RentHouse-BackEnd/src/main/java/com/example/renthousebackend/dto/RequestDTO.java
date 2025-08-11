// src/main/java/com/example/renthousebackend/dto/RequestDTO.java
package com.example.renthousebackend.dto;

import java.util.List;

public class RequestDTO {
    private String customerName;
    private String customerEmail;
    private List<Item> items;

    // Getters and Setters
    public String getCustomerName() {
        return customerName;
    }
    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }
    public String getCustomerEmail() {
        return customerEmail;
    }
    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }
    public List<Item> getItems() {
        return items;
    }
    public void setItems(List<Item> items) {
        this.items = items;
    }

    public static class Item {
        private String name;
        private long price; // in cents

        public String getName() {
            return name;
        }
        public void setName(String name) {
            this.name = name;
        }
        public long getPrice() {
            return price;
        }
        public void setPrice(long price) {
            this.price = price;
        }
    }
}
