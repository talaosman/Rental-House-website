package com.example.renthousebackend.controller;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
import com.example.renthousebackend.entity.Favorite;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.RentRepository;
import com.example.renthousebackend.repository.FavoriteRepository;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    @Value("${google.ai.api.key}")
    private String apiKey;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=";

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private RentRepository rentRepository;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> payload) {
        String userMessage = payload.get("message");
        String rawUsername = payload.get("username");
        String username = (rawUsername == null || rawUsername.trim().isEmpty() || rawUsername.equalsIgnoreCase("null"))
                ? null
                : rawUsername;

        Long userId = null;
        try {
            if (payload.get("userId") != null && !payload.get("userId").trim().isEmpty()) {
                userId = Long.parseLong(payload.get("userId"));
            }
        } catch (Exception e) {
           
        }

        String lowered = userMessage.toLowerCase();
        List<House> houses;

        if (lowered.contains("recommend") || lowered.contains("suggest") || lowered.contains("for me")) {
            if (userId == null) {
                return Map.of("reply", "⚠️ Please log in to get personalized recommendations!");
            }
            return getPersonalizedRecommendations(userId, username);
        }


        if (lowered.contains("my rented houses") || lowered.contains("what did i rent") 
                || lowered.contains("rental history") || lowered.contains("my rentals") || lowered.contains("rent history")) {
            if (userId == null) {
                return Map.of("reply", "⚠️ Please log in to see your rented houses.");
            }
            return getUserRentalHistory(userId);
        }

        if (lowered.contains("my favorites") || lowered.contains("my favourite") 
                || lowered.contains("saved houses")) {
            if (userId == null) {
                return Map.of("reply", "⚠️ Please log in to see your favorite houses.");
            }
            return getUserFavorites(userId);
        }

       
        if (lowered.contains("similar") || lowered.contains("like this")) {
            if (userId == null) {
                return Map.of("reply", "⚠️ Please log in to get similar house suggestions!");
            }
            return getSimilarHouses(userId);
        }

     
        if (lowered.contains("trending") || lowered.contains("popular") || lowered.contains("most rented")) {
            return getTrendingHouses();
        }

       
        if (lowered.contains("new") || lowered.contains("latest") || lowered.contains("recent")) {
            return getNewListings(userId);
        }

        if (lowered.contains("compare prices") || lowered.contains("price comparison")) {
            return getPriceComparison();
        }

       
        if (lowered.matches(".*\\bbudget\\b.*") && lowered.matches(".*\\$?(\\d+).*")) {
            return calculateBudgetOptions(userMessage);
        }

        List<String> allLocations = houseRepository.findDistinctLocations();
        String matchedLocation = null;

        for (String loc : allLocations) {
            if (lowered.contains(loc.toLowerCase())) {
                matchedLocation = loc;
                break;
            }
        }

        if (containsPossibleLocation(userMessage) && matchedLocation == null) {
            String locationGuess = extractLocationFromMessage(userMessage);
            return Map.of("reply", "❌ Sorry, there are no available houses in " + locationGuess + ".");
        }

       
        boolean isHouseQuery = lowered.contains("available houses") ||
                lowered.contains("rent") || lowered.contains("apartment") || lowered.contains("house");
        
        if (isHouseQuery) {
            if (matchedLocation != null) {
                houses = houseRepository.findByStatusAndLocationContainingIgnoreCase("available", matchedLocation);
            } else {
                houses = houseRepository.findByStatus("available");
            }

            if (houses == null || houses.isEmpty()) {
                return Map.of("reply", "❌ Sorry, there are no available houses" +
                        (matchedLocation != null ? " in " + matchedLocation : "") + " at the moment.");
            }

            
            if (lowered.contains("cheapest") || lowered.contains("affordable")) {
                return getCheapestHouse(houses, matchedLocation);
            }

         
            if (lowered.matches(".*\\bbetween \\$?(\\d+) and \\$?(\\d+).*")) {
                return filterByPriceRange(houses, lowered);
            }

            if (lowered.matches(".*\\b(\\d+) bedroom.*")) {
                return filterByBedrooms(houses, lowered);
            }

            if (lowered.contains("apartment") || lowered.contains("villa") || 
                lowered.contains("studio") || lowered.contains("condo")) {
                return filterByPropertyType(houses, lowered);
            }

           
            return getDefaultHouseList(houses, matchedLocation, username);
        }

        return sendToGemini(userMessage, username, userId);
    }

  
    private Map<String, String> getPersonalizedRecommendations(Long userId, String username) {
    try {
        List<Rent> userRents = rentRepository.findByUserId(userId);
        List<Favorite> userFavorites = favoriteRepository.findByUserId(userId);

        Map<String, Integer> locationPreferences = new HashMap<>();
        Map<String, Integer> propertyTypePreferences = new HashMap<>();
        Map<Integer, Integer> bedroomPreferences = new HashMap<>();
        double totalPrice = 0;
        int priceCount = 0;

       
        for (Rent rent : userRents) {
            House house = rent.getHouse();
            locationPreferences.merge(house.getLocation(), 2, Integer::sum);
            propertyTypePreferences.merge(house.getPropertyType(), 2, Integer::sum);
            bedroomPreferences.merge(house.getNbOfBedrooms(), 2, Integer::sum);
            totalPrice += house.getPricePerMonth();
            priceCount++;
        }

    
        for (Favorite fav : userFavorites) {
            House house = fav.getProperty();
            locationPreferences.merge(house.getLocation(), 1, Integer::sum);
            propertyTypePreferences.merge(house.getPropertyType(), 1, Integer::sum);
            bedroomPreferences.merge(house.getNbOfBedrooms(), 1, Integer::sum);
            totalPrice += house.getPricePerMonth();
            priceCount++;
        }

        if (priceCount == 0) {
            return Map.of("reply", "🤔 You haven't rented or favorited any houses yet. Try browsing some options first!");
        }

        final double avgPriceRange = totalPrice / priceCount;

      
        String preferredLocation = getTopPreference(locationPreferences);
        String preferredPropertyType = getTopPreference(propertyTypePreferences);
        Integer preferredBedrooms = getTopPreferenceInt(bedroomPreferences);

        
        List<House> recommendations = houseRepository.findByStatus("available").stream()
                .filter(h -> !userRents.stream().anyMatch(r -> r.getHouse().getId().equals(h.getId())))
                .sorted((h1, h2) -> {
                    int score1 = calculateMatchScore(h1, preferredLocation, preferredPropertyType, 
                                                     preferredBedrooms, avgPriceRange);
                    int score2 = calculateMatchScore(h2, preferredLocation, preferredPropertyType, 
                                                     preferredBedrooms, avgPriceRange);
                    return Integer.compare(score2, score1);
                })
                .limit(5)
                .collect(Collectors.toList());

        if (recommendations.isEmpty()) {
            return Map.of("reply", "😔 No personalized recommendations available at the moment.");
        }

        StringBuilder sb = new StringBuilder("✨ Hi " + username + "! Based on your preferences:\n");
        sb.append("📍 Location: ").append(preferredLocation).append("\n");
        sb.append("🏠 Property Type: ").append(preferredPropertyType).append("\n");
        sb.append("🛏️ Bedrooms: ").append(preferredBedrooms).append("\n");
        sb.append("💰 Avg Budget: $").append(String.format("%.0f", avgPriceRange)).append("/month\n\n");
        sb.append("Here are your personalized recommendations:\n\n");

        for (House house : recommendations) {
            sb.append("✅ ").append(house.getTitle())
                    .append(" (").append(house.getPropertyType()).append(")")
                    .append("\n   📍 ").append(house.getLocation())
                    .append("\n   🛏️ ").append(house.getNbOfBedrooms()).append(" bedrooms")
                    .append("\n   💰 $").append(house.getPricePerMonth()).append("/month or $")
                    .append(house.getPricePerDay()).append("/day\n\n");
        }

        return Map.of("reply", sb.toString());

    } catch (Exception e) {
        return Map.of("reply", "❌ Error generating recommendations: " + e.getMessage());
    }
}



    private int calculateMatchScore(House house, String prefLocation, String prefType, 
                                    Integer prefBedrooms, double avgPrice) {
        int score = 0;
        if (house.getLocation().equalsIgnoreCase(prefLocation)) score += 3;
        if (house.getPropertyType().equalsIgnoreCase(prefType)) score += 2;
        if (house.getNbOfBedrooms() == prefBedrooms) score += 2;
        if (Math.abs(house.getPricePerMonth() - avgPrice) < avgPrice * 0.2) score += 1;
        return score;
    }

    private String getTopPreference(Map<String, Integer> map) {
        return map.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Unknown");
    }

    private Integer getTopPreferenceInt(Map<Integer, Integer> map) {
        return map.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(2);
    }

    private Map<String, String> getUserRentalHistory(Long userId) {
        try {
            List<Rent> userRents = rentRepository.findByUserId(userId);
            if (userRents.isEmpty()) {
                return Map.of("reply", "📭 You haven't rented any houses yet.");
            }

            StringBuilder sb = new StringBuilder("📦 Your Rental History:\n\n");
            for (Rent rent : userRents) {
                House h = rent.getHouse();
                sb.append("🏠 ").append(h.getTitle())
                        .append("\n   📍 ").append(h.getLocation())
                        .append("\n   📅 From ").append(rent.getStartDate())
                        .append(" to ").append(rent.getEndDate())
                        .append("\n   💰 $").append(h.getPricePerMonth()).append("/month\n\n");
            }

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error fetching rental history: " + e.getMessage());
        }
    }

    private Map<String, String> getUserFavorites(Long userId) {
        try {
            List<Favorite> favorites = favoriteRepository.findByUserId(userId);
            if (favorites.isEmpty()) {
                return Map.of("reply", "💔 You haven't favorited any houses yet.");
            }

            StringBuilder sb = new StringBuilder("💖 Your Favorite Houses:\n\n");
            for (Favorite fav : favorites) {
                House h = fav.getProperty();
                sb.append("⭐ ").append(h.getTitle())
                        .append("\n   📍 ").append(h.getLocation())
                        .append("\n   🛏️ ").append(h.getNbOfBedrooms()).append(" bedrooms")
                        .append("\n   💰 $").append(h.getPricePerMonth()).append("/month or $")
                        .append(h.getPricePerDay()).append("/day")
                        .append("\n   ").append(h.getStatus().equals("available") ? "✅ Available" : "❌ Rented")
                        .append("\n\n");
            }

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error fetching favorites: " + e.getMessage());
        }
    }

    private Map<String, String> getSimilarHouses(Long userId) {
        try {
            List<Rent> recentRents = rentRepository.findByUserId(userId);
            List<Favorite> favorites = favoriteRepository.findByUserId(userId);

            if (recentRents.isEmpty() && favorites.isEmpty()) {
                return Map.of("reply", "🤔 No history found. Try renting or favoriting a house first!");
            }

            House referenceHouse = null;
            if (!recentRents.isEmpty()) {
                referenceHouse = recentRents.get(recentRents.size() - 1).getHouse();
            } else {
                referenceHouse = favorites.get(favorites.size() - 1).getProperty();
            }

            final House refHouse = referenceHouse;
            List<House> similar = houseRepository.findByStatus("available").stream()
                    .filter(h -> !h.getId().equals(refHouse.getId()))
                    .filter(h -> h.getPropertyType().equalsIgnoreCase(refHouse.getPropertyType()) ||
                                 h.getLocation().equalsIgnoreCase(refHouse.getLocation()) ||
                                 h.getNbOfBedrooms() == refHouse.getNbOfBedrooms())
                    .limit(5)
                    .collect(Collectors.toList());

            if (similar.isEmpty()) {
                return Map.of("reply", "😔 No similar houses found at the moment.");
            }

            StringBuilder sb = new StringBuilder("🔍 Houses similar to '" + refHouse.getTitle() + "':\n\n");
            for (House house : similar) {
                sb.append("🏠 ").append(house.getTitle())
                        .append("\n   📍 ").append(house.getLocation())
                        .append("\n   🛏️ ").append(house.getNbOfBedrooms()).append(" bedrooms")
                        .append("\n   💰 $").append(house.getPricePerMonth()).append("/month\n\n");
            }

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error finding similar houses: " + e.getMessage());
        }
    }

    private Map<String, String> getTrendingHouses() {
        try {
            List<Long> trendingIds = houseRepository.findMostRentedHouseIds();
            if (trendingIds.isEmpty()) {
                return Map.of("reply", "🤔 No trending houses available yet.");
            }

            StringBuilder sb = new StringBuilder("🔥 Trending Houses (Most Rented):\n\n");
            int count = 1;
            for (Long id : trendingIds.stream().limit(5).collect(Collectors.toList())) {
                House house = houseRepository.findById(id).orElse(null);
                if (house != null && house.getStatus().equals("available")) {
                    sb.append(count++).append(". ").append(house.getTitle())
                            .append("\n   📍 ").append(house.getLocation())
                            .append("\n   💰 $").append(house.getPricePerMonth()).append("/month\n\n");
                }
            }

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error fetching trending houses: " + e.getMessage());
        }
    }

    private Map<String, String> getNewListings(Long userId) {
        try {
            List<House> newHouses = houseRepository.findTop10ByStatusOrderByCreatedAtDesc("available");
            
            if (newHouses.isEmpty()) {
                return Map.of("reply", "📭 No new listings available.");
            }

            StringBuilder sb = new StringBuilder("🆕 Latest House Listings:\n\n");
            for (House house : newHouses) {
                sb.append("✨ ").append(house.getTitle())
                        .append("\n   📍 ").append(house.getLocation())
                        .append("\n   🛏️ ").append(house.getNbOfBedrooms()).append(" bedrooms")
                        .append("\n   💰 $").append(house.getPricePerMonth()).append("/month\n\n");
            }

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error fetching new listings: " + e.getMessage());
        }
    }

    private Map<String, String> getPriceComparison() {
        try {
            List<House> allHouses = houseRepository.findByStatus("available");
            
            if (allHouses.isEmpty()) {
                return Map.of("reply", "❌ No houses available for comparison.");
            }

            DoubleSummaryStatistics stats = allHouses.stream()
                    .mapToDouble(House::getPricePerMonth)
                    .summaryStatistics();

            StringBuilder sb = new StringBuilder("💰 Price Comparison Analysis:\n\n");
            sb.append("📊 Average: $").append(String.format("%.2f", stats.getAverage())).append("/month\n");
            sb.append("💸 Cheapest: $").append(String.format("%.2f", stats.getMin())).append("/month\n");
            sb.append("💎 Most Expensive: $").append(String.format("%.2f", stats.getMax())).append("/month\n");
            sb.append("📈 Total Properties: ").append(stats.getCount()).append("\n");

            return Map.of("reply", sb.toString());
        } catch (Exception e) {
            return Map.of("reply", "❌ Error calculating price comparison: " + e.getMessage());
        }
    }

    private Map<String, String> calculateBudgetOptions(String message) {
        try {
            Pattern pattern = Pattern.compile("\\$?(\\d+)");
            Matcher matcher = pattern.matcher(message);
            
            if (matcher.find()) {
                double budget = Double.parseDouble(matcher.group(1));
                List<House> withinBudget = houseRepository.findByStatus("available").stream()
                        .filter(h -> h.getPricePerMonth() <= budget)
                        .sorted(Comparator.comparingDouble(House::getPricePerMonth).reversed())
                        .limit(5)
                        .collect(Collectors.toList());

                if (withinBudget.isEmpty()) {
                    return Map.of("reply", "😔 No houses found within your budget of $" + budget + "/month.");
                }

                StringBuilder sb = new StringBuilder("💰 Houses within your $" + budget + " budget:\n\n");
                for (House house : withinBudget) {
                    double remaining = budget - house.getPricePerMonth();
                    sb.append("🏠 ").append(house.getTitle())
                            .append("\n   📍 ").append(house.getLocation())
                            .append("\n   💰 $").append(house.getPricePerMonth()).append("/month")
                            .append("\n   ✅ Saves you $").append(String.format("%.2f", remaining))
                            .append("/month\n\n");
                }

                return Map.of("reply", sb.toString());
            }
        } catch (Exception e) {
            return Map.of("reply", "❌ Error calculating budget: " + e.getMessage());
        }
        return Map.of("reply", "❌ Please specify a valid budget amount.");
    }

    private Map<String, String> getCheapestHouse(List<House> houses, String location) {
        House cheapest = houses.stream()
                .min(Comparator.comparingDouble(House::getPricePerMonth))
                .orElse(null);
        
        if (cheapest != null) {
            String reply = "💸 The most affordable option" + 
                          (location != null ? " in " + location : "") + " is:\n\n" +
                          "🏠 " + cheapest.getTitle() + 
                          "\n📍 " + cheapest.getLocation() +
                          "\n🛏️ " + cheapest.getNbOfBedrooms() + " bedrooms" +
                          "\n💰 $" + cheapest.getPricePerMonth() + "/month or $" + 
                          cheapest.getPricePerDay() + "/day";
            return Map.of("reply", reply);
        }
        return Map.of("reply", "❌ No houses found.");
    }

    private Map<String, String> filterByPriceRange(List<House> houses, String lowered) {
        Matcher matcher = Pattern.compile(".*\\bbetween \\$?(\\d+) and \\$?(\\d+).*").matcher(lowered);
        if (matcher.find()) {
            double min = Double.parseDouble(matcher.group(1));
            double max = Double.parseDouble(matcher.group(2));

            List<House> filtered = houses.stream()
                    .filter(h -> h.getPricePerMonth() >= min && h.getPricePerMonth() <= max)
                    .toList();

            if (filtered.isEmpty()) {
                return Map.of("reply", "❌ No houses found between $" + min + " and $" + max + " per month.");
            }

            StringBuilder sb = new StringBuilder("🏠 Houses between $" + min + " and $" + max + ":\n\n");
            for (House house : filtered) {
                sb.append("✅ ").append(house.getTitle())
                        .append("\n   📍 ").append(house.getLocation())
                        .append("\n   💰 $").append(house.getPricePerMonth())
                        .append("/month or $").append(house.getPricePerDay()).append("/day\n\n");
            }
            return Map.of("reply", sb.toString());
        }
        return Map.of("reply", "❌ Invalid price range format.");
    }

    private Map<String, String> filterByBedrooms(List<House> houses, String lowered) {
        Matcher matcher = Pattern.compile(".*\\b(\\d+) bedroom.*").matcher(lowered);
        if (matcher.find()) {
            int bedrooms = Integer.parseInt(matcher.group(1));

            List<House> filtered = houses.stream()
                    .filter(h -> h.getNbOfBedrooms() == bedrooms)
                    .toList();

            if (filtered.isEmpty()) {
                return Map.of("reply", "❌ No houses found with " + bedrooms + " bedrooms.");
            }

            StringBuilder sb = new StringBuilder("🛏️ Houses with " + bedrooms + " bedrooms:\n\n");
            for (House house : filtered) {
                sb.append("🏠 ").append(house.getTitle())
                        .append("\n   📍 ").append(house.getLocation())
                        .append("\n   💰 $").append(house.getPricePerMonth())
                        .append("/month or $").append(house.getPricePerDay()).append("/day\n\n");
            }
            return Map.of("reply", sb.toString());
        }
        return Map.of("reply", "❌ Invalid bedroom filter.");
    }

    private Map<String, String> filterByPropertyType(List<House> houses, String lowered) {
        String propertyType = null;
        if (lowered.contains("apartment")) propertyType = "Apartment";
        else if (lowered.contains("villa")) propertyType = "Villa";
        else if (lowered.contains("studio")) propertyType = "Studio";
        else if (lowered.contains("condo")) propertyType = "Condo";

        if (propertyType != null) {
            final String type = propertyType;
            List<House> filtered = houses.stream()
                    .filter(h -> h.getPropertyType().equalsIgnoreCase(type))
                    .toList();

            if (filtered.isEmpty()) {
                return Map.of("reply", "❌ No " + propertyType.toLowerCase() + "s found.");
            }

            StringBuilder sb = new StringBuilder("🏢 " + propertyType + "s available:\n\n");
            for (House house : filtered) {
                sb.append("🏠 ").append(house.getTitle())
                        .append("\n   📍 ").append(house.getLocation())
                        .append("\n   💰 $").append(house.getPricePerMonth()).append("/month\n\n");
            }
            return Map.of("reply", sb.toString());
        }
        return Map.of("reply", "❌ Invalid property type.");
    }

    private Map<String, String> getDefaultHouseList(List<House> houses, String location, String username) {
        StringBuilder sb = new StringBuilder("Dear " + username + "! 👋\n\n🏠 Here are some available houses");
        if (location != null) sb.append(" in ").append(location);
        sb.append(":\n\n");

        for (House house : houses.stream().limit(5).toList()) {
            sb.append("🏠 ").append(house.getTitle())
                    .append("\n   📍 ").append(house.getLocation())
                    .append("\n   🛏️ ").append(house.getNbOfBedrooms()).append(" bedrooms")
                    .append("\n   💰 $").append(house.getPricePerMonth())
                    .append("/month or $").append(house.getPricePerDay()).append("/day\n\n");
        }

        return Map.of("reply", sb.toString());
    }

    private Map<String, String> sendToGemini(String userMessage, String username, Long userId) {
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
            
            String greeting = (username == null) ? "Hello Dear! 👋" : "Hello " + username + "! 👋";
            String cleanedReply = geminiReply.replaceFirst("(?i)^hello[^\\n]*\\n*", "").trim();
            String reply = greeting + "\n\n" + cleanedReply;

            return Map.of("reply", reply);

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("reply", "❌ Something went wrong: " + e.getMessage());
        }
    }

    private boolean containsPossibleLocation(String message) {
        return message.toLowerCase().matches(".*\\b(in|at)\\s+\\w+.*");
    }

    private String extractLocationFromMessage(String message) {
        Pattern pattern = Pattern.compile("\\b(?:in|at)\\s+([a-zA-Z\\s]+)");
        Matcher matcher = pattern.matcher(message.toLowerCase());
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "the specified location";
    }
}