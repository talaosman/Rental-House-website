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
   
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        
        Rent currentRent = rentService.getCurrentRent(house);
        
        if (currentRent != null) {
          
            return ResponseEntity.ok(currentRent);
        }
        
    
        Rent lastRent = rentService.getLastRent(house);
        
        if (lastRent != null && lastRent.getEndDate() != null) {
      
            Map<String, Object> response = new HashMap<>();
            response.put("available", true);
            response.put("lastRent", lastRent);
            return ResponseEntity.ok(response);
        }
        
    
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