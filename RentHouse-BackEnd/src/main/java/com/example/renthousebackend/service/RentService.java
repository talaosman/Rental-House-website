package com.example.renthousebackend.service;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.RentRepository;
import com.example.renthousebackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class RentService {

    @Autowired
    private RentRepository rentRepository;

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private UserRepository userRepository;

    // RentService.java
    public Rent getCurrentRent(House house) {
        LocalDate today = LocalDate.now();
        return rentRepository.findFirstByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, today, today)
                .orElse(null);
    }

    public Rent getLastRent(House house) {
        return rentRepository.findTopByHouseIdOrderByEndDateDesc(house.getId());
    }

    
    public Rent rentHouse(Long userId, Long houseId, LocalDate startDate, LocalDate endDate) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Optional: Prevent double-booking
        if (isHouseRentedDuring(house, startDate, endDate)) {
            throw new RuntimeException("House already rented during this period.");
        }

        Rent rent = new Rent();
        rent.setHouse(house);
        rent.setUser(user);
        rent.setStartDate(startDate);
        rent.setEndDate(endDate);

        // Optionally update house status
        house.setStatus("rented");
        houseRepository.save(house);

        return rentRepository.save(rent);
    }

    // Check if house is rented today
    public boolean isHouseCurrentlyRented(House house) {
        LocalDate today = LocalDate.now();
        return rentRepository.existsByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, today, today);
    }

    // Check if house is rented in a specific range
    public boolean isHouseRentedDuring(House house, LocalDate startDate, LocalDate endDate) {
        return rentRepository.existsByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, endDate,
                startDate);
    }

    // Get rents for house
    public List<Rent> getRentsByHouse(Long houseId) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));
        return rentRepository.findByHouse(house);
    }

    // Get rents by user
    public List<Rent> getRentsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return rentRepository.findByUser(user);
    }
}
