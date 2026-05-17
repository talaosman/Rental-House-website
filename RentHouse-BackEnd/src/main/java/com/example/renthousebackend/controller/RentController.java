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
import java.util.Collections;

@RestController
@RequestMapping("/api/rents")
@CrossOrigin(origins = "http://localhost:3000")
public class RentController {

    @Autowired
    private RentService rentService;

    @Autowired
    private HouseRepository houseRepository;

    @PostMapping("/rent")
    public ResponseEntity<?> rentHouse(
            @RequestParam Long userId,
            @RequestParam Long houseId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Rent rent = rentService.rentHouse(userId, houseId, startDate, endDate);
            return ResponseEntity.ok(rent);
        } catch (RuntimeException e) {

            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        }
    }

    @GetMapping("/is-rented/{houseId}")
    public ResponseEntity<Object> getCurrentRent(@PathVariable Long houseId) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        Rent currentRent = rentService.getCurrentRent(house);

        if (currentRent != null) {

            if (!"rented".equals(house.getStatus())) {
                house.setStatus("rented");
                houseRepository.save(house);
            }
            return ResponseEntity.ok(currentRent);
        }

        if (!"available".equals(house.getStatus())) {
            house.setStatus("available");
            houseRepository.save(house);
        }

        Rent lastRent = rentService.getLastRent(house);
        Map<String, Object> response = new HashMap<>();
        response.put("available", true);
        if (lastRent != null && lastRent.getEndDate() != null) {
            response.put("lastRent", lastRent);
        } else {
            response.put("message", "This property is available for rent");
        }
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

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getTotalRentCount() {
        long count = rentService.countAllRents(); 
        return ResponseEntity.ok(Collections.singletonMap("count", count));
    }

    @GetMapping("/active/count")
    public ResponseEntity<Map<String, Long>> getActiveRentCount() {
        long count = rentService.countActiveRents(); 
        return ResponseEntity.ok(Collections.singletonMap("count", count));
    }

}