package com.example.renthousebackend.service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Owner;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.repository.FavoriteRepository;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.OwnerRepository;
import com.example.renthousebackend.repository.RentRepository;
import com.example.renthousebackend.repository.VisitRequestRepository;

@Service
public class HouseService {

    private final OwnerRepository ownerRepository;
    private final HouseRepository houseRepository;
    private final RentRepository rentRepository;
    private final FavoriteRepository favoriteRepository;
    private final VisitRequestRepository visitRequestRepository;

        public HouseService(
            HouseRepository houseRepository, 
            FavoriteRepository favoriteRepository,
            RentRepository rentRepository, 
            OwnerRepository ownerRepository,
            VisitRequestRepository visitRequestRepository) {
        this.houseRepository = houseRepository;
        this.favoriteRepository = favoriteRepository;
        this.rentRepository = rentRepository;
        this.ownerRepository = ownerRepository;
        this.visitRequestRepository = visitRequestRepository;
    }

    public int countRelatedFavoritesAndRentals(Long houseId) {
        int favoriteCount = favoriteRepository.countByPropertyId(houseId);
        int rentalCount = rentRepository.countByHouseId(houseId); // ✅ Count rentals
        int visitRequestCount = visitRequestRepository.countByHouseId(houseId);

        return favoriteCount + rentalCount + visitRequestCount;
    }

    public List<House> getAllHouses() {
        return houseRepository.findAll();
    }

    // HouseService.java
    public House getHouseById(Long houseId) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        // Check if it's rented and the rent has expired
        if ("rented".equalsIgnoreCase(house.getStatus())) {
            Rent latestRent = rentRepository.findTopByHouseIdOrderByEndDateDesc(houseId);

            if (latestRent != null && latestRent.getEndDate().isBefore(LocalDate.now())) {
                house.setStatus("available");
                houseRepository.save(house);
            }
        }

        return house;
    }

    public House createHouse(House house) {
        return houseRepository.save(house);
    }
         @Transactional
    public void deleteHouse(Long id, boolean force) {
        if (force) {
            // Delete all related records in the correct order
            // 1. Delete visit requests
            visitRequestRepository.deleteByHouseId(id);
            
            // 2. Delete rentals
            rentRepository.deleteByHouseId(id);
            
            // 3. Delete favorites
            favoriteRepository.deleteByPropertyId(id);
        }

        // Now delete the house
        houseRepository.deleteById(id);
    }

    public House updateHouse(House house) {
        return houseRepository.save(house);
    }

    public House createHouseWithOwner(House house) {
        Owner owner = house.getOwner();

        if (owner != null && owner.getId() == null) {
            ownerRepository.save(owner); // save new owner
        }

        house.setOwner(owner);
        return houseRepository.save(house);
    }

    public List<House> getTop3MostRentedHouses() {
        List<Long> topIds = houseRepository.findMostRentedHouseIds();

        // Remove any nulls (in case of data inconsistencies)
        List<Long> filteredIds = topIds.stream()
                .filter(Objects::nonNull)
                .limit(3) // Only take top 3
                .collect(Collectors.toList());

        if (filteredIds.isEmpty()) {
            return Collections.emptyList();
        }

        return houseRepository.findAllById(filteredIds);
    }

}
