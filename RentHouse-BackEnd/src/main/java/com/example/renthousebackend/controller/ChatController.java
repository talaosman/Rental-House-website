package com.example.renthousebackend.controller;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.RentRepository;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    @Value("${google.ai.api.key}")
    private String apiKey;

    private final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=";

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private RentRepository rentRepository;

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> payload) {
        String userMessage = payload.get("message");
        String rawUsername = payload.get("username");
        String username = (rawUsername == null || rawUsername.trim().isEmpty() || rawUsername.equalsIgnoreCase("null"))
                ? null
                : rawUsername;

        String lowered = userMessage.toLowerCase();
        List<House> houses;

        if (lowered.contains("my rented houses") || lowered.contains("what did i rent")) {
            if (username == null) {
                return Map.of("reply", "⚠️ Please log in to see your rented houses.");
            }

            try {
                // Assume you pass userId in payload
                Long userId = Long.parseLong(payload.get("userId"));
                List<Rent> userRents = rentRepository.findByUserId(userId);

                if (userRents.isEmpty()) {
                    return Map.of("reply", "❌ You haven’t rented any houses yet.");
                }

                StringBuilder sb = new StringBuilder("📦 Here are your rented houses:\n\n");
                for (Rent rent : userRents) {
                    House h = rent.getHouse();
                    sb.append("- ").append(h.getTitle())
                            .append(" 📍 ").append(h.getLocation())
                            .append(" (From ").append(rent.getStartDate())
                            .append(" to ").append(rent.getEndDate()).append(")\n");
                }

                return Map.of("reply", sb.toString());
            } catch (Exception e) {
                return Map.of("reply", "❌ Could not fetch your rented houses. Error: " + e.getMessage());
            }
        }

        // ✅ Check for recommendation request
        if (lowered.contains("recommend") || lowered.contains("suggest")) {
            List<Long> ids = houseRepository.findMostRentedHouseIds();
            if (ids.isEmpty()) {
                return Map.of("reply", "🤔 No recommendations available yet.");
            }

            Long topHouseId = ids.get(0); // most rented house
            House recommended = houseRepository.findById(topHouseId).orElse(null);

            if (recommended != null) {
                String reply = "🔥 Our most recommended house is:\n\n- " +
                        recommended.getTitle() + " 📍 in " + recommended.getLocation() +
                        " 💰 $" + recommended.getPricePerMonth() + "/month or $" + recommended.getPricePerDay()
                        + "/day\n";
                return Map.of("reply", reply);
            }
        }

        // Step 1: Get all known locations
        List<String> allLocations = houseRepository.findDistinctLocations();

        // Step 2: Try to detect a location from the user's message
        String matchedLocation = null;

        // Try to detect location from known DB locations
        for (String loc : allLocations) {
            if (lowered.contains(loc.toLowerCase())) {
                matchedLocation = loc;
                break;
            }
        }

        // If user mentioned a location but it's NOT in the database, reject it
        if (containsPossibleLocation(userMessage) && matchedLocation == null) {
            String locationGuess = extractLocationFromMessage(userMessage); // helper method
            return Map.of("reply", "Sorry, there are no available houses in " + locationGuess + ".");
        }

        // Step 3: Check if it's a house-related query
        boolean isHouseQuery = lowered.contains("available houses") ||
                lowered.contains("rent") || lowered.contains("apartment") || lowered.contains("house");
        if (isHouseQuery) {
            // Get all available houses (location-filtered or not)
            if (matchedLocation != null) {
                houses = houseRepository.findByStatusAndLocationContainingIgnoreCase("available", matchedLocation);
            } else {
                houses = houseRepository.findByStatus("available");
            }

            if (houses == null || houses.isEmpty()) {
                return Map.of("reply", "Sorry, there are no available houses" +
                        (matchedLocation != null ? " in " + matchedLocation : "") + " at the moment.");
            }

            // 🧠 Check for 'cheapest' keyword
            if (lowered.contains("cheapest") || lowered.contains("affordable")) {
                House cheapest = houses.stream()
                        .min(Comparator.comparingDouble(House::getPricePerMonth))
                        .orElse(null);
                if (cheapest != null) {
                    String reply = "💸 The most affordable option is:\n\n- " +
                            cheapest.getTitle() + " 📍 in " + cheapest.getLocation() +
                            " 💰 $" + cheapest.getPricePerMonth() + "/month or $" + cheapest.getPricePerDay() + "/day";
                    return Map.of("reply", reply);
                }
            }

            // 🔍 Parse for "between X and Y dollars"
            if (lowered.matches(".*\\bbetween \\$?(\\d+) and \\$?(\\d+).*")) {
                Matcher matcher = Pattern.compile(".*\\bbetween \\$?(\\d+) and \\$?(\\d+).*").matcher(lowered);
                if (matcher.find()) {
                    double min = Double.parseDouble(matcher.group(1));
                    double max = Double.parseDouble(matcher.group(2));

                    List<House> filtered = houses.stream()
                            .filter(h -> h.getPricePerMonth() >= min && h.getPricePerMonth() <= max)
                            .toList();

                    if (filtered.isEmpty()) {
                        return Map.of("reply",
                                "No available houses found between $" + min + " and $" + max + " per month.");
                    }

                    StringBuilder sb = new StringBuilder("🏠 Houses between $" + min + " and $" + max + ":\n\n");
                    for (House house : filtered) {
                        sb.append("- ").append(house.getTitle())
                                .append(" 📍 in ").append(house.getLocation())
                                .append(" 💰 $").append(house.getPricePerMonth())
                                .append("/month or $").append(house.getPricePerDay()).append("/day\n");
                    }
                    return Map.of("reply", sb.toString());
                }
            }

            // 🔍 Parse for "X bedrooms"
            if (lowered.matches(".*\\b(\\d+) bedroom.*")) {
                Matcher matcher = Pattern.compile(".*\\b(\\d+) bedroom.*").matcher(lowered);
                if (matcher.find()) {
                    int bedrooms = Integer.parseInt(matcher.group(1));

                    List<House> filtered = houses.stream()
                            .filter(h -> h.getNbOfBedrooms() == bedrooms)
                            .toList();

                    if (filtered.isEmpty()) {
                        return Map.of("reply", "No houses found with " + bedrooms + " bedrooms.");
                    }

                    StringBuilder sb = new StringBuilder("🏠 Houses with " + bedrooms + " bedrooms:\n\n");
                    for (House house : filtered) {
                        sb.append("- ").append(house.getTitle())
                                .append(" 📍 in ").append(house.getLocation())
                                .append(" 💰 $").append(house.getPricePerMonth())
                                .append("/month or $").append(house.getPricePerDay()).append("/day\n");
                    }
                    return Map.of("reply", sb.toString());
                }
            }

            // Default response if no specific filters
            StringBuilder sb = new StringBuilder("Dear " + username + "! 👋\n\n🏠 Here are some available houses");

            if (matchedLocation != null)
                sb.append(" in ").append(matchedLocation);
            sb.append(":\n\n");

            for (House house : houses.stream().limit(5).toList()) {
                sb.append("- ").append(house.getTitle())
                        .append(" 📍 in ").append(house.getLocation())
                        .append(" 💰 $").append(house.getPricePerMonth())
                        .append("/month or $").append(house.getPricePerDay()).append("/day\n");
            }

            return Map.of("reply", sb.toString());
        }

        // If not a house query, send message to Gemini
        try {
            RestTemplate restTemplate = new RestTemplate();

            Map<String, Object> userContent = Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", userMessage)));

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(userContent));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    GEMINI_API_URL + apiKey,
                    HttpMethod.POST,
                    request,
                    Map.class);

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");
            String geminiReply = parts.get(0).get("text");
            String greeting = (username == null)
                    ? "Hello Dear! 👋"
                    : "Hello " + username + "! 👋";

            // Remove leading "Hello..." from Gemini reply if present
            String cleanedReply = geminiReply.replaceFirst("(?i)^hello[^\\n]*\\n*", "").trim();

            // Add your own greeting
            String reply = greeting + "\n\n" + cleanedReply;

            return Map.of("reply", reply);

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("reply", "Something went wrong: " + e.getMessage());
        }
    }

    private boolean containsPossibleLocation(String message) {
        // Match phrases like "in [location]" or "at [location]"
        return message.toLowerCase().matches(".*\\b(in|at)\\s+\\w+.*");
    }

    private String extractLocationFromMessage(String message) {
        // Tries to extract a location word after "in" or "at"
        Pattern pattern = Pattern.compile("\\b(?:in|at)\\s+([a-zA-Z\\s]+)");
        Matcher matcher = pattern.matcher(message.toLowerCase());
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "the specified location";
    }

}
