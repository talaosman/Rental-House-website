package com.example.renthousebackend.controller;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Owner;
import com.example.renthousebackend.repository.OwnerRepository;
import com.example.renthousebackend.service.FileService;
import com.example.renthousebackend.service.HouseService;

@RestController
@RequestMapping("/api/houses")
@CrossOrigin(origins = "http://localhost:3000") // your React frontend origin
public class HouseController {

    private final HouseService houseService;
    private final FileService fileService;
    private final OwnerRepository ownerRepository;

    public HouseController(HouseService houseService, FileService fileService, OwnerRepository ownerRepository) {
        this.houseService = houseService;
        this.fileService = fileService;
        this.ownerRepository = ownerRepository;
    }

    @GetMapping
    public List<House> getAllHouses() {
        return houseService.getAllHouses();
    }

    @GetMapping("/{id}")
    public House getHouseById(@PathVariable Long id) {
        return houseService.getHouseById(id);
    }

    @PostMapping(consumes = { "multipart/form-data" })
    public House createHouse(
            @RequestParam String title,
            @RequestParam String pricePerDay,
            @RequestParam String pricePerMonth,
            @RequestParam String location,
            @RequestParam String nbOfBedrooms,
            @RequestParam String propertyType,
            @RequestParam String ownerName,
            @RequestParam String ownerEmail,
            @RequestParam String ownerPhone,
            @RequestPart(required = false) MultipartFile image) throws IOException {

        Owner owner = new Owner();
        owner.setName(ownerName);
        owner.setEmail(ownerEmail);
        owner.setPhone(ownerPhone);

        House house = new House();
        house.setTitle(title);
        house.setPricePerDay(Double.parseDouble(pricePerDay));
        house.setPricePerMonth(Double.parseDouble(pricePerMonth));
        house.setLocation(location);
        house.setNbOfBedrooms(Integer.parseInt(nbOfBedrooms));
        house.setPropertyType(propertyType);

        if (image != null && !image.isEmpty()) {
            String savedFilename = fileService.saveFile(image);
            house.setImage(savedFilename);
        }

        house.setOwner(owner); // set the owner

        return houseService.createHouseWithOwner(house); // save both
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHouse(@PathVariable Long id) {
        try {
            houseService.deleteHouse(id);
            return ResponseEntity.ok().build();
        } catch (DataIntegrityViolationException e) {
            // Specific exception for FK violations
            return ResponseEntity.status(409)
                    .body("Cannot delete this house because it's referenced by other data (e.g., favorites).");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to delete house: " + e.getMessage());
        }
    }

    @PutMapping(value = "/update/{id}", consumes = "application/json")
    public ResponseEntity<?> updateHouse(
            @PathVariable Long id,
            @RequestBody Map<String, Object> houseData) {

        try {
            // Extract and parse fields from the incoming JSON map
            String title = (String) houseData.get("title");
            String location = (String) houseData.get("location");
            String status = (String) houseData.get("status");
            String description = (String) houseData.get("description");
            String propertyType = (String) houseData.get("propertyType");
            int nbOfBedrooms = (int) houseData.get("nbOfBedrooms");

            String ownerName = (String) houseData.get("ownerName");
            String ownerEmail = (String) houseData.get("ownerEmail");
            String ownerPhone = (String) houseData.get("ownerPhone");

            Double pricePerDay = Double.parseDouble(houseData.get("pricePerDay").toString());
            Double pricePerMonth = Double.parseDouble(houseData.get("pricePerMonth").toString());

            House existingHouse = houseService.getHouseById(id);
            if (existingHouse == null) {
                return ResponseEntity.notFound().build();
            }

            existingHouse.setTitle(title);
            existingHouse.setLocation(location);
            existingHouse.setPricePerDay(pricePerDay);
            existingHouse.setPricePerMonth(pricePerMonth);
            existingHouse.setNbOfBedrooms(nbOfBedrooms);
            existingHouse.setPropertyType(propertyType);
            existingHouse.setStatus(status);
            existingHouse.setDescription(description);

            Owner owner = ownerRepository.findByEmail(ownerEmail).orElse(null);
            if (owner == null) {
                owner = new Owner();
            }
            owner.setName(ownerName);
            owner.setEmail(ownerEmail);
            owner.setPhone(ownerPhone);
            owner = ownerRepository.save(owner);

            existingHouse.setOwner(owner);

            House updated = houseService.updateHouse(existingHouse);
            return ResponseEntity.ok(updated);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid number format for pricePerDay or pricePerMonth.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating house: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/related-count")
    public ResponseEntity<Map<String, Integer>> getRelatedCount(@PathVariable Long id) {
        int count = houseService.countRelatedFavoritesAndRentals(id);
        return ResponseEntity.ok(Collections.singletonMap("count", count));
    }

    @GetMapping("/most-rented")
    public ResponseEntity<List<House>> getTop3RecommendedHouses() {
        try {
            List<House> houses = houseService.getTop3MostRentedHouses();
            return ResponseEntity.ok(houses);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Collections.emptyList());
        }
    }

}
