package com.example.renthousebackend.service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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
    @Autowired
    private NotificationService notificationService;

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
        House existingHouse = houseRepository.findById(house.getId())
                .orElseThrow(() -> new RuntimeException("House not found"));

        String oldStatus = existingHouse.getStatus();
        String newStatus = house.getStatus();

        // Save the updated house
        House saved = houseRepository.save(house);

        // 🔔 Trigger notification if status changed TO "available"
        boolean justBecameAvailable
                = !"available".equalsIgnoreCase(oldStatus)
                && "available".equalsIgnoreCase(newStatus);

        if (justBecameAvailable) {
            List<String> fcmTokens
                    = favoriteRepository.findFcmTokensByHouseId(house.getId());

            if (!fcmTokens.isEmpty()) {
                notificationService.sendBatchNotification(
                        fcmTokens,
                        house.getTitle(),
                        house.getLocation(),
                        house.getId()
                );
                System.out.println("🔔 Notified " + fcmTokens.size()
                        + " users about house availability: " + house.getTitle());
            }
        }

        return saved;
    }

    public House createHouseWithOwner(House house) {
        Owner owner = house.getOwner();

        if (owner != null && owner.getId() == null) {

            // Look up by email only (reliable in DB)
            // then verify name + phone in Java to avoid JPQL REPLACE issues
            Owner existingOwner = ownerRepository
                    .findFirstByEmailIgnoreCase(owner.getEmail().trim())
                    .orElse(null);

            if (existingOwner != null
                    && normalizePhone(existingOwner.getPhone())
                            .equals(normalizePhone(owner.getPhone()))
                    && existingOwner.getName().trim()
                            .equalsIgnoreCase(owner.getName().trim())) {

                // Exact match — reuse
                house.setOwner(existingOwner);
                System.out.println("♻️ Reusing existing owner: "
                        + existingOwner.getName() + " (id=" + existingOwner.getId() + ")");

            } else if (existingOwner != null) {
                // Same email but different name or phone → update existing
                existingOwner.setName(owner.getName().trim());
                existingOwner.setPhone(owner.getPhone().trim());
                ownerRepository.save(existingOwner);
                house.setOwner(existingOwner);
                System.out.println("✏️ Updated existing owner: " + existingOwner.getName());

            } else {
                // Truly new owner
                owner.setName(owner.getName().trim());
                owner.setEmail(owner.getEmail().trim());
                owner.setPhone(owner.getPhone().trim());
                ownerRepository.save(owner);
                house.setOwner(owner);
                System.out.println("✅ Created new owner: " + owner.getName());
            }
        }

        return houseRepository.save(house);
    }

// Strip all non-digit characters for phone comparison
    private String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        return phone.replaceAll("[^0-9]", "");
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

    public long countAllHouses() {
        return houseRepository.count();
    }

}
