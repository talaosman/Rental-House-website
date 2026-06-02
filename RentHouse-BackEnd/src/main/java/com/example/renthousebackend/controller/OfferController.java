package com.example.renthousebackend.controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Offer;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.OfferRepository;

@RestController
@RequestMapping("/api/offers")
@CrossOrigin(origins = "http://localhost:3000")
public class OfferController {

    @Autowired
    private OfferRepository offerRepository;

    @Autowired
    private HouseRepository houseRepository;

    @GetMapping("/user/{userId}")
    public List<Offer> getUserOffers(@PathVariable Long userId) {
        return offerRepository.findByUserIdAndUsedFalse(userId);
    }


    @GetMapping("/user/{userId}/applicable/{houseId}")
    public ResponseEntity<Map<String, Object>> getApplicableOffer(
            @PathVariable Long userId,
            @PathVariable Long houseId) {

        House house = houseRepository.findById(houseId).orElse(null);
        if (house == null) return ResponseEntity.notFound().build();

       
        List<Offer> userOffers = offerRepository.findByUserIdAndUsedFalse(userId);
        for (Offer offer : userOffers) {
            boolean valid = offer.isActive()
                    && offer.getExpiryDate().isAfter(LocalDate.now())
                    && (!offer.isSameOwnerOnly()
                        || offer.getHouse() == null
                        || offer.getHouse().getOwner().getId().equals(house.getOwner().getId()))
                    && (offer.getHouse() == null || offer.getHouse().getId().equals(houseId));

            if (valid) {
                Map<String, Object> result = new HashMap<>();
                result.put("hasOffer", true);
                result.put("discountPercentage", offer.getDiscountPercentage());
                result.put("offerType", "loyalty");
                return ResponseEntity.ok(result);
            }
        }

        
        List<Offer> ownerOffers = offerRepository.findAll().stream()
                .filter(o -> o.getUser() == null
                        && o.getHouse() != null
                        && o.getHouse().getId().equals(houseId)
                        && o.isActive()
                        && !o.isUsed()
                        && o.getExpiryDate().isAfter(LocalDate.now()))
                .toList();

        if (!ownerOffers.isEmpty()) {
            Offer best = ownerOffers.stream()
                    .max((a, b) -> Double.compare(a.getDiscountPercentage(), b.getDiscountPercentage()))
                    .get();
            Map<String, Object> result = new HashMap<>();
            result.put("hasOffer", true);
            result.put("discountPercentage", best.getDiscountPercentage());
            result.put("offerType", "owner");
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.ok(Map.of("hasOffer", false));
    }
}