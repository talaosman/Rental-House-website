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

import java.util.Base64;
import java.io.FileOutputStream;
import java.io.IOException;

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

    @PostMapping("/uploadBase64")
    public House uploadBase64(@RequestBody UploadBase64Request req) throws IOException {
        Owner owner = new Owner();
        owner.setName(req.ownerName);
        owner.setEmail(req.ownerEmail);
        owner.setPhone(req.ownerPhone);

        House house = new House();
        house.setTitle(req.title);
        house.setPricePerDay(Double.parseDouble(req.pricePerDay));
        house.setPricePerMonth(Double.parseDouble(req.pricePerMonth));
        house.setLocation(req.location);
        house.setNbOfBedrooms(Integer.parseInt(req.nbOfBedrooms));
        house.setPropertyType(req.propertyType);
        house.setDescription(req.description);

        if (req.imageData != null && !req.imageData.isEmpty()) {
            // Remove prefix like "data:image/png;base64,"
            String base64Image = req.imageData.split(",")[1];
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            String savedFilename = fileService.saveFile(req.imageFilename, imageBytes);
            house.setImage(savedFilename);
        }

        house.setOwner(owner);

        return houseService.createHouseWithOwner(house);
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
            // Extract and parse fields
            String title = (String) houseData.get("title");
            String location = (String) houseData.get("location");
            String status = (String) houseData.get("status");
            String description = (String) houseData.get("description");
            String propertyType = (String) houseData.get("propertyType");
            int nbOfBedrooms = Integer.parseInt(houseData.get("nbOfBedrooms").toString());

            String ownerName = (String) houseData.get("ownerName");
            String ownerEmail = (String) houseData.get("ownerEmail");
            String ownerPhone = (String) houseData.get("ownerPhone");

            Double pricePerDay = Double.parseDouble(houseData.get("pricePerDay").toString());
            Double pricePerMonth = Double.parseDouble(houseData.get("pricePerMonth").toString());

            House existingHouse = houseService.getHouseById(id);
            if (existingHouse == null) {
                return ResponseEntity.notFound().build();
            }

            // Update normal fields
            existingHouse.setTitle(title);
            existingHouse.setLocation(location);
            existingHouse.setPricePerDay(pricePerDay);
            existingHouse.setPricePerMonth(pricePerMonth);
            existingHouse.setNbOfBedrooms(nbOfBedrooms);
            existingHouse.setPropertyType(propertyType);
            existingHouse.setStatus(status);
            existingHouse.setDescription(description);

            // Handle image update (optional)
            if (houseData.containsKey("imageData") && houseData.get("imageData") != null) {
                String imageData = (String) houseData.get("imageData");
                if (!imageData.isEmpty()) {
                    String base64Image = imageData.contains(",") ? imageData.split(",")[1] : imageData;
                    byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                    String savedFilename = fileService.saveFile(
                            houseData.get("imageFilename") != null ? (String) houseData.get("imageFilename")
                                    : "house.png",
                            imageBytes);
                    existingHouse.setImage(savedFilename);
                }
            }

            // Owner update
            List<Owner> owners = ownerRepository.findByEmail(ownerEmail);

            Owner owner;
            if (owners.isEmpty()) {
                // no owner yet → create new
                owner = new Owner();
            } else {
                // pick first match (or add better logic: latest, matching phone, etc.)
                owner = owners.get(0);
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

    public static class UploadBase64Request {
        public String title;
        public String pricePerDay;
        public String pricePerMonth;
        public String location;
        public String nbOfBedrooms;
        public String propertyType;
        public String ownerName;
        public String ownerEmail;
        public String ownerPhone;
        public String description;
        public String imageFilename;
        public String imageData; // Base64 string starting with "data:image/..."
    }
}
