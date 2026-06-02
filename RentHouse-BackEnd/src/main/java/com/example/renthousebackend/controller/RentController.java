package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.service.RentService;
import com.example.renthousebackend.service.NotificationService;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.FavoriteRepository;
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

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private NotificationService notificationService;

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

        // Check current active rent
        Rent currentRent = rentService.getCurrentRent(house);
        if (currentRent != null) {
            if (!"rented".equals(house.getStatus())) {
                house.setStatus("rented");
                houseRepository.save(house);
            }
            return ResponseEntity.ok(currentRent);
        }

        // Check for future rents
        Rent futureRent = rentService.getNextFutureRent(house);
        if (futureRent != null) {
            if (!"rented".equals(house.getStatus())) {
                house.setStatus("rented");
                houseRepository.save(house);
            }
            return ResponseEntity.ok(futureRent);
        }

        // ✅ House is truly available
        // Only notify if status was previously "rented" (just became available)
        if (!"available".equals(house.getStatus())) {
            house.setStatus("available");
            houseRepository.save(house);

            // 🔔 Notify all users who favorited this house
            try {
                List<String> tokens = favoriteRepository
                    .findFcmTokensByHouseId(houseId);

                if (!tokens.isEmpty()) {
                    notificationService.sendBatchNotification(
                        tokens,
                        house.getTitle(),
                        house.getLocation(),
                        house.getId()
                    );
                    System.out.println("🔔 Notified " + tokens.size()
                        + " users — house " + houseId + " is now available");
                }
            } catch (Exception e) {
                // Never let notification failure break the rent check
                System.err.println("⚠️ Notification failed: " + e.getMessage());
            }
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