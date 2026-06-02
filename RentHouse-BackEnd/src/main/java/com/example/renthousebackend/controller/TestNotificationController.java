package com.example.renthousebackend.controller;

import com.example.renthousebackend.repository.FavoriteRepository;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.service.NotificationService;
import com.example.renthousebackend.entity.House;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "http://localhost:3000")
public class TestNotificationController {

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Call this to instantly fire notifications to all users
     * who favorited houseId — no waiting for dates.
     */
    @PostMapping("/notify-available/{houseId}")
    public ResponseEntity<?> testNotify(@PathVariable Long houseId) {

        House house = houseRepository.findById(houseId)
            .orElseThrow(() -> new RuntimeException("House not found"));

        List<String> tokens = favoriteRepository.findFcmTokensByHouseId(houseId);

        if (tokens.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "status", "no_tokens",
                "message", "No FCM tokens found — make sure user is logged in on frontend first"
            ));
        }

        notificationService.sendBatchNotification(
            tokens,
            house.getTitle(),
            house.getLocation(),
            house.getId()
        );

        return ResponseEntity.ok(Map.of(
            "status", "sent",
            "notifiedCount", tokens.size(),
            "house", house.getTitle(),
            "tokens", tokens   // shows you the tokens for debugging
        ));
    }
}