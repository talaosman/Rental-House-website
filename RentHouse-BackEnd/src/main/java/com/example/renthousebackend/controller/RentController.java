package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.service.RentService;
import com.example.renthousebackend.repository.HouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rents")
@CrossOrigin(origins = "http://localhost:3000") // adjust for frontend origin
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

    // GET: Check if house is rented today
    // RentController.java
    @GetMapping("/is-rented/{houseId}")
    public Rent getCurrentRent(@PathVariable Long houseId) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        Rent currentRent = rentService.getCurrentRent(house);
        if (currentRent != null)
            return currentRent;

        // fallback: return last rent using the service
        return rentService.getLastRent(house);
    }

    @GetMapping("/house/{houseId}")
    public List<Rent> getRentsByHouse(@PathVariable Long houseId) {
        return rentService.getRentsByHouse(houseId);
    }

    // GET: Rents for a specific user
    @GetMapping("/user/{userId}")
    public List<Rent> getRentsByUser(@PathVariable Long userId) {
        return rentService.getRentsByUser(userId);
    }
}
