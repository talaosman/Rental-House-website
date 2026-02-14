package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.service.RentService;
import com.example.renthousebackend.repository.HouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rents")
@CrossOrigin(origins = "http://localhost:3000")
public class RentController {

    @Autowired
    private RentService rentService;

    @Autowired
    private HouseRepository houseRepository;

    // POST: Rent a house
    @PostMapping("/rent")
    public Rent rentHouse(
            @RequestParam Long userId,
            @RequestParam Long houseId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return rentService.rentHouse(userId, houseId, startDate, endDate);
    }

    /**
     * GET: Check if house is currently rented
     * Returns a JSON object with rent details or { "available": true } if not rented
     * This ensures proper JSON response instead of empty body
     */
    @GetMapping("/is-rented/{houseId}")
    public ResponseEntity<Object> getCurrentRent(@PathVariable Long houseId) {
        // Verify house exists
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        // Get current active rent
        Rent currentRent = rentService.getCurrentRent(house);
        
        if (currentRent != null) {
            // House is currently rented - return the rent object
            return ResponseEntity.ok(currentRent);
        }
        
        // House is NOT currently rented
        // Check if there was a past rent (for "available after" message)
        Rent lastRent = rentService.getLastRent(house);
        
        if (lastRent != null && lastRent.getEndDate() != null) {
            // There was a past rent, but it's expired
            // Still return it so frontend can show "available after" message
            Map<String, Object> response = new HashMap<>();
            response.put("available", true);
            response.put("lastRent", lastRent);
            return ResponseEntity.ok(response);
        }
        
        // House has never been rented or no rent data
        Map<String, Object> response = new HashMap<>();
        response.put("available", true);
        response.put("message", "This property is available for rent");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/house/{houseId}")
    public List<Rent> getRentsByHouse(@PathVariable Long houseId) {
        return rentService.getRentsByHouse(houseId);
    }

    @GetMapping("/user/{userId}")
    public List<Rent> getRentsByUser(@PathVariable Long userId) {
        return rentService.getRentsByUser(userId);
    }
}