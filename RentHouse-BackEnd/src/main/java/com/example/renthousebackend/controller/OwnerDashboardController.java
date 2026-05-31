package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Offer;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.OfferRepository;
import com.example.renthousebackend.repository.RentRepository;
import com.example.renthousebackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/owner")
@CrossOrigin(origins = {"http://localhost:3000", "https://your-frontend.vercel.app"})
public class OwnerDashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private RentRepository rentRepository;

    @Autowired
    private OfferRepository offerRepository;

    private List<House> getOwnerHouses(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Match houses whose linked Owner entity has the same email as this user
        return houseRepository.findAll().stream()
                .filter(h -> h.getOwner() != null
                && h.getOwner().getEmail() != null
                && h.getOwner().getEmail().equalsIgnoreCase(user.getEmail()))
                .collect(Collectors.toList());
    }


    @GetMapping("/{userId}/houses")
    public ResponseEntity<List<Map<String, Object>>> getOwnerHouseList(@PathVariable Long userId) {
        List<House> houses = getOwnerHouses(userId);

        List<Map<String, Object>> result = houses.stream().map(house -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", house.getId());
            map.put("title", house.getTitle());
            map.put("location", house.getLocation());
            map.put("image", house.getImage());
            map.put("status", house.getStatus());
            map.put("pricePerMonth", house.getPricePerMonth());
            map.put("pricePerDay", house.getPricePerDay());
            map.put("propertyType", house.getPropertyType());
            map.put("nbOfBedrooms", house.getNbOfBedrooms());

            // Count active rents
            long activeRents = rentRepository.findByHouse(house).stream()
                    .filter(r -> !r.getEndDate().isBefore(LocalDate.now()))
                    .count();
            map.put("activeRents", activeRents);

            // Attach owner's active offers for this house
            List<Offer> offers = offerRepository.findAll().stream()
                    .filter(o -> o.getHouse() != null
                    && o.getHouse().getId().equals(house.getId())
                    && o.isActive()
                    && !o.isUsed()
                    && o.getExpiryDate().isAfter(LocalDate.now()))
                    .collect(Collectors.toList());
            map.put("activeOffers", offers.size());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }


    @GetMapping("/{userId}/rents")
    public ResponseEntity<List<Map<String, Object>>> getOwnerRents(@PathVariable Long userId) {
        List<House> houses = getOwnerHouses(userId);

        List<Map<String, Object>> rents = new ArrayList<>();
        for (House house : houses) {
            for (Rent rent : rentRepository.findByHouse(house)) {
                Map<String, Object> map = new HashMap<>();
                map.put("rentId", rent.getId());
                map.put("houseId", house.getId());
                map.put("houseTitle", house.getTitle());
                map.put("houseLocation", house.getLocation());
                map.put("houseImage", house.getImage());
                map.put("startDate", rent.getStartDate());
                map.put("endDate", rent.getEndDate());
                map.put("totalPrice", rent.getTotalPrice());
                map.put("status", rent.getEndDate().isBefore(LocalDate.now()) ? "completed" : "active");

                // Tenant info
                if (rent.getUser() != null) {
                    map.put("tenantName", rent.getUser().getUsername());
                    map.put("tenantEmail", rent.getUser().getEmail());
                    map.put("tenantPhone", rent.getUser().getPhoneNumber());
                }
                rents.add(map);
            }
        }

        // Sort: active first, then by startDate desc
        rents.sort((a, b) -> {
            boolean aActive = "active".equals(a.get("status"));
            boolean bActive = "active".equals(b.get("status"));
            if (aActive && !bActive) {
                return -1;
            }
            if (!aActive && bActive) {
                return 1;
            }
            return b.get("startDate").toString().compareTo(a.get("startDate").toString());
        });

        return ResponseEntity.ok(rents);
    }

   
    @GetMapping("/{userId}/offers")
    public ResponseEntity<List<Map<String, Object>>> getOwnerOffers(@PathVariable Long userId) {
        List<House> houses = getOwnerHouses(userId);
        Set<Long> houseIds = houses.stream().map(House::getId).collect(Collectors.toSet());

        List<Map<String, Object>> offers = offerRepository.findAll().stream()
                .filter(o -> o.getHouse() != null && houseIds.contains(o.getHouse().getId())
                && o.getUser() == null) // owner-created = no user target (applies to ALL renters)
                .map(o -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", o.getId());
                    map.put("discountPercentage", o.getDiscountPercentage());
                    map.put("expiryDate", o.getExpiryDate());
                    map.put("active", o.isActive());
                    map.put("used", o.isUsed());
                    map.put("houseId", o.getHouse().getId());
                    map.put("houseTitle", o.getHouse().getTitle());
                    map.put("sameOwnerOnly", o.isSameOwnerOnly());
                    boolean expired = o.getExpiryDate().isBefore(LocalDate.now());
                    map.put("status", o.isUsed() ? "used" : expired ? "expired" : o.isActive() ? "active" : "inactive");
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(offers);
    }

 
    @PostMapping("/{userId}/offers")
    public ResponseEntity<?> createOwnerOffer(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {
        try {
            Long houseId = Long.parseLong(body.get("houseId").toString());
            int discount = (int) Math.round(Double.parseDouble(body.get("discountPercentage").toString()));
            LocalDate expiryDate = LocalDate.parse(body.get("expiryDate").toString());
            boolean sameOwnerOnly = body.containsKey("sameOwnerOnly")
                    && Boolean.parseBoolean(body.get("sameOwnerOnly").toString());

            if (discount <= 0 || discount > 100) {
                return ResponseEntity.badRequest().body("Discount must be between 1 and 100");
            }
            if (expiryDate.isBefore(LocalDate.now().plusDays(1))) {
                return ResponseEntity.badRequest().body("Expiry date must be in the future");
            }

            List<House> ownerHouses = getOwnerHouses(userId);
            House house = ownerHouses.stream()
                    .filter(h -> h.getId().equals(houseId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("House not found or not owned by you"));

            Offer offer = new Offer();
            offer.setHouse(house);
            offer.setUser(null);
            offer.setDiscountPercentage(discount);
            offer.setExpiryDate(expiryDate);
            offer.setSameOwnerOnly(sameOwnerOnly);
            offer.setActive(true);
            offer.setUsed(false);
            offer.setMinPoints(0);

            offerRepository.save(offer);
            return ResponseEntity.ok(Map.of("message", "Offer created successfully", "offerId", offer.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{userId}/offers/{offerId}")
    public ResponseEntity<?> updateOwnerOffer(
            @PathVariable Long userId,
            @PathVariable Long offerId,
            @RequestBody Map<String, Object> body) {
        try {
            Offer offer = offerRepository.findById(offerId)
                    .orElseThrow(() -> new RuntimeException("Offer not found"));

            List<House> ownerHouses = getOwnerHouses(userId);
            Set<Long> houseIds = ownerHouses.stream().map(House::getId).collect(Collectors.toSet());
            if (offer.getHouse() == null || !houseIds.contains(offer.getHouse().getId())) {
                return ResponseEntity.status(403).body("Not authorized to edit this offer");
            }

            if (offer.isUsed()) {
                return ResponseEntity.badRequest().body("Cannot edit a used offer");
            }

            if (body.containsKey("discountPercentage")) {
                int d = (int) Math.round(Double.parseDouble(body.get("discountPercentage").toString()));
                if (d <= 0 || d > 100) {
                    return ResponseEntity.badRequest().body("Discount must be 1–100");
                }
                offer.setDiscountPercentage(d);       // ✅ int now
            }
            if (body.containsKey("expiryDate")) {
                LocalDate exp = LocalDate.parse(body.get("expiryDate").toString());
                if (exp.isBefore(LocalDate.now().plusDays(1))) {
                    return ResponseEntity.badRequest().body("Expiry date must be in the future");
                }
                offer.setExpiryDate(exp);
            }
            if (body.containsKey("active")) {
                offer.setActive(Boolean.parseBoolean(body.get("active").toString()));
            }
            if (body.containsKey("sameOwnerOnly")) {
                offer.setSameOwnerOnly(Boolean.parseBoolean(body.get("sameOwnerOnly").toString()));
            }

            offerRepository.save(offer);
            return ResponseEntity.ok(Map.of("message", "Offer updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @DeleteMapping("/{userId}/offers/{offerId}")
    public ResponseEntity<?> deleteOwnerOffer(
            @PathVariable Long userId,
            @PathVariable Long offerId) {
        try {
            Offer offer = offerRepository.findById(offerId)
                    .orElseThrow(() -> new RuntimeException("Offer not found"));

            List<House> ownerHouses = getOwnerHouses(userId);
            Set<Long> houseIds = ownerHouses.stream().map(House::getId).collect(Collectors.toSet());
            if (offer.getHouse() == null || !houseIds.contains(offer.getHouse().getId())) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            offerRepository.delete(offer);
            return ResponseEntity.ok(Map.of("message", "Offer deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @GetMapping("/{userId}/stats")
    public ResponseEntity<Map<String, Object>> getOwnerStats(@PathVariable Long userId) {
        List<House> houses = getOwnerHouses(userId);

        long totalHouses = houses.size();
        long activeRents = 0;
        double totalRevenue = 0;
        long totalOffers = 0;

        for (House house : houses) {
            List<Rent> rents = rentRepository.findByHouse(house);
            activeRents += rents.stream()
                    .filter(r -> !r.getEndDate().isBefore(LocalDate.now()))
                    .count();
            totalRevenue += rents.stream()
                    .mapToDouble(Rent::getTotalPrice) // ✅ primitive double, no null check needed
                    .sum();
        }

        Set<Long> houseIds = houses.stream().map(House::getId).collect(Collectors.toSet());
        totalOffers = offerRepository.findAll().stream()
                .filter(o -> o.getHouse() != null
                && houseIds.contains(o.getHouse().getId())
                && o.isActive()
                && !o.isUsed()
                && o.getExpiryDate().isAfter(LocalDate.now()))
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHouses", totalHouses);
        stats.put("activeRents", activeRents);
        stats.put("totalRevenue", totalRevenue);
        stats.put("activeOffers", totalOffers);

        return ResponseEntity.ok(stats);
    }
}
