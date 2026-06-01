package com.example.renthousebackend.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
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
import com.example.renthousebackend.entity.Offer;
import com.example.renthousebackend.entity.Owner;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.OfferRepository;
import com.example.renthousebackend.repository.OwnerRepository;
import com.example.renthousebackend.service.FileService;
import com.example.renthousebackend.service.HouseService;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.entity.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.renthousebackend.service.EmailService;
import org.springframework.http.MediaType;

import java.util.Base64;

@RestController
@RequestMapping("/api/houses")
@CrossOrigin(origins = {
  "http://localhost:3000",
  "https://rental-house-website-ten.vercel.app"
})
public class HouseController {

    private final HouseService houseService;
    private final FileService fileService;
    private final OwnerRepository ownerRepository;
    private final OfferRepository offerRepository;

   private final UserRepository userRepository;
   private final PasswordEncoder passwordEncoder;
   private final EmailService emailService;

public HouseController(HouseService houseService, FileService fileService,
        OwnerRepository ownerRepository, OfferRepository offerRepository,
        UserRepository userRepository, PasswordEncoder passwordEncoder,
        EmailService emailService) {
    this.houseService = houseService;
    this.fileService = fileService;
    this.ownerRepository = ownerRepository;
    this.offerRepository = offerRepository;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.emailService = emailService;
}

    @GetMapping
    public List<Map<String, Object>> getAllHouses() {

        List<House> houses = houseService.getAllHouses();

        return houses.stream().map(house -> {

            Map<String, Object> map = new java.util.HashMap<>();

            map.put("id", house.getId());
            map.put("title", house.getTitle());
            map.put("location", house.getLocation());
            map.put("image", house.getImage());
            map.put("nbOfBedrooms", house.getNbOfBedrooms());
            map.put("propertyType", house.getPropertyType());
            map.put("pricePerDay", house.getPricePerDay());
            map.put("pricePerMonth", house.getPricePerMonth());

            return map;

        }).toList();
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
    house.setLatitude(req.latitude);
    house.setLongitude(req.longitude);

    // Store image bytes in the DB (survives Render restarts/deploys)
    if (req.imageData != null && !req.imageData.isEmpty()) {
        String base64Image = req.imageData.contains(",")
                ? req.imageData.split(",")[1]
                : req.imageData;
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);
        house.setImageData(imageBytes);
        house.setImage(req.imageFilename); // keep filename for content-type
    }

    house.setOwner(owner);
    House created = houseService.createHouseWithOwner(house);

    provisionOwnerAccount(req.ownerEmail, req.ownerName, req.ownerPhone);

    return created;
}

private void provisionOwnerAccount(String email, String name, String phone) {
    if (email == null || email.isBlank()) return;

    String normalizedEmail = email.trim().toLowerCase();

    // Skip if a user already exists for this email
    if (userRepository.findByEmail(normalizedEmail).isPresent()) return;

    // Generate a default password
    String tempPassword = generateTempPassword();

    User user = new User();
    user.setUsername(name != null && !name.isBlank() ? name : normalizedEmail);
    user.setEmail(normalizedEmail);
    user.setPassword(passwordEncoder.encode(tempPassword));
    user.setRole("HOUSE_OWNER");
    user.setPhoneNumber(phone);
    userRepository.save(user);

    // Email the credentials to the new owner
    try {
        emailService.sendNewOwnerAccountEmail(normalizedEmail, user.getUsername(), tempPassword);
    } catch (Exception e) {
        e.printStackTrace(); // account is created even if email fails
    }
}

private String generateTempPassword() {
    String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    StringBuilder sb = new StringBuilder();
    java.security.SecureRandom rnd = new java.security.SecureRandom();
    for (int i = 0; i < 10; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
    return sb.toString();
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
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
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

        house.setLatitude(latitude);
        house.setLongitude(longitude);

        if (image != null && !image.isEmpty()) {
            String savedFilename = fileService.saveFile(image);
            house.setImage(savedFilename);
        }

        house.setOwner(owner);
        return houseService.createHouseWithOwner(house);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHouse(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean force) {
        try {
            House house = houseService.getHouseById(id);
            if (house == null)
                return ResponseEntity.notFound().build();

            if (!force) {
                int relatedCount = houseService.countRelatedFavoritesAndRentals(id);
                if (relatedCount > 0) {
                    return ResponseEntity.status(409)
                            .body("Cannot delete this house because it's referenced by other data.");
                }
            }

            houseService.deleteHouse(id, force);
            return ResponseEntity.ok().body("House deleted successfully");

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

            Double latitude = null;
            Double longitude = null;
            if (houseData.get("latitude") != null && !houseData.get("latitude").toString().isBlank()) {
                latitude = Double.parseDouble(houseData.get("latitude").toString());
            }
            if (houseData.get("longitude") != null && !houseData.get("longitude").toString().isBlank()) {
                longitude = Double.parseDouble(houseData.get("longitude").toString());
            }

            House existingHouse = houseService.getHouseById(id);
            if (existingHouse == null)
                return ResponseEntity.notFound().build();

            existingHouse.setTitle(title);
            existingHouse.setLocation(location);
            existingHouse.setPricePerDay(pricePerDay);
            existingHouse.setPricePerMonth(pricePerMonth);
            existingHouse.setNbOfBedrooms(nbOfBedrooms);
            existingHouse.setPropertyType(propertyType);
            existingHouse.setStatus(status);
            existingHouse.setDescription(description);

            existingHouse.setLatitude(latitude);
            existingHouse.setLongitude(longitude);

           if (houseData.containsKey("imageData") && houseData.get("imageData") != null) {
    String imageData = (String) houseData.get("imageData");
    if (!imageData.isEmpty()) {
        String base64Image = imageData.contains(",") ? imageData.split(",")[1] : imageData;
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);
        existingHouse.setImageData(imageBytes);
        existingHouse.setImage(
                houseData.get("imageFilename") != null
                        ? (String) houseData.get("imageFilename")
                        : "house.jpg");
    }
}

            List<Owner> owners = ownerRepository.findByEmail(ownerEmail);
            Owner owner = owners.isEmpty() ? new Owner() : owners.get(0);
            owner.setName(ownerName);
            owner.setEmail(ownerEmail);
            owner.setPhone(ownerPhone);
            owner = ownerRepository.save(owner);
            existingHouse.setOwner(owner);

            House updated = houseService.updateHouse(existingHouse);
            return ResponseEntity.ok(updated);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid number format.");
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

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getHouseCount() {
        long count = houseService.countAllHouses(); 
        return ResponseEntity.ok(Collections.singletonMap("count", count));
    }

    @GetMapping("/{id}/image")
public ResponseEntity<byte[]> getHouseImage(@PathVariable Long id) {
    House house = houseService.getHouseById(id);
    if (house == null || house.getImageData() == null) {
        return ResponseEntity.notFound().build();
    }
    String name = house.getImage() != null ? house.getImage().toLowerCase() : "";
    MediaType type = name.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
    return ResponseEntity.ok().contentType(type).body(house.getImageData());
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
        public String imageData;
        public Double latitude;
        public Double longitude;
    }
}