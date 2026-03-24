package com.example.renthousebackend.controller;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.*;
import java.util.stream.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
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

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";

    private static final double UTILITY_PER_BEDROOM  = 80.0;
    private static final double DEPOSIT_MONTHS       = 2.0;
    private static final double GOOD_YIELD_THRESHOLD = 0.06;

    private static final String DIV_THIN  = "─────────────────────────────────────";
    private static final String DIV_THICK = "═════════════════════════════════════";

    @Autowired private HouseRepository    houseRepository;
    @Autowired private RentRepository     rentRepository;
    @Autowired private FavoriteRepository favoriteRepository;

    private final Map<Long, String>     lastLocation    = new HashMap<>();
    private final Map<Long, List<Long>> lastShownHouses = new HashMap<>();

    // ─────────────────────────────────────────────────────────────────────────
    // Main dispatcher
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> payload) {

        String userMessage = payload.getOrDefault("message", "").trim();
        String rawUsername = payload.get("username");
        String username    = (rawUsername == null || rawUsername.isBlank() ||
                              rawUsername.equalsIgnoreCase("null")) ? "Guest" : rawUsername;
        Long   userId      = parseLong(payload.get("userId"));
        String low         = userMessage.toLowerCase();

        // ── Help / greeting ──────────────────────────────────────────────────
        if (low.matches(".*(\\bhelp\\b|what can you do|features|commands|how.*work|what.*do|hi|hello|hey).*")
                || low.trim().length() < 4)
            return buildHelp(username);

        // ── Personalized recommendations ─────────────────────────────────────
        if (low.matches(".*(recommend|suggest|for me|personali[sz]ed|pick for me|good for me).*"))
            return requireLogin(userId, () -> getPersonalizedRecommendations(userId, username));

        // ── Rental history ───────────────────────────────────────────────────
        if (low.matches(".*(my rented|what did i rent|rental history|my rentals|rent history|past rent|previous rent).*"))
            return requireLogin(userId, () -> getUserRentalHistory(userId, username));

        // ── Favorites ────────────────────────────────────────────────────────
        if (low.matches(".*(my favou?rites|saved houses|my saved|wishlist).*"))
            return requireLogin(userId, () -> getUserFavorites(userId, username));

        // ── Similar houses ───────────────────────────────────────────────────
        if (low.matches(".*(similar|like this|like the last one|same type|something like).*"))
            return requireLogin(userId, () -> getSimilarHouses(userId));

        // ── Trending ─────────────────────────────────────────────────────────
        if (low.matches(".*(trending|popular|most rented|most liked|top house).*"))
            return getTrendingHouses();

        // ── New listings ─────────────────────────────────────────────────────
        if (low.matches(".*(\\bnew\\b|latest|recent listing|just added|newly listed).*"))
            return getNewListings();

        // ── Price comparison / market stats ──────────────────────────────────
        if (low.matches(".*(compare prices|price comparison|market stats|market overview|price overview|average price|avg price).*"))
            return getPriceComparison();

        // ── Market health ────────────────────────────────────────────────────
        if (low.matches(".*(market health|vacancy rate|days listed|market dashboard|occupancy).*"))
            return getMarketHealthDashboard();

        // ── Seasonal insights ────────────────────────────────────────────────
        if (low.matches(".*(season|seasonal|best time|when to rent|price trend|best month).*"))
            return getSeasonalInsights();

        // ── Move-in cost ─────────────────────────────────────────────────────
        if (low.matches(".*(move.?in cost|move in|how much to move|total cost|initial cost|first payment|upfront cost).*"))
            return getMoveInCostEstimator(userMessage);

        // ── Investment / ROI ─────────────────────────────────────────────────
        if (low.matches(".*(\\broi\\b|invest|return on investment|rental yield|income property|worth buying).*"))
            return getInvestmentAnalysis();

        // ── Negotiation ──────────────────────────────────────────────────────
        if (low.matches(".*(negotiat|bargain|lower the price|discount|offer|price down|reduce price).*"))
            return getNegotiationAdvice(userMessage);

        // ── Availability forecast ────────────────────────────────────────────
        if (low.matches(".*(when.*(available|free)|availability forecast|will it be free|coming available|soon available).*"))
            return getAvailabilityForecast();

        // ── Waitlist ─────────────────────────────────────────────────────────
        if (low.matches(".*(waitlist|notify me|alert me|tell me when|let me know when).*"))
            return requireLogin(userId, () -> getWaitlistSuggestions(userId));

        // ── Compare two houses ───────────────────────────────────────────────
        if (low.matches(".*(compare\\s+.+\\s+(and|vs\\.?|versus)\\s+.+).*"))
            return compareHousesByName(userMessage);

        // ── Budget matching ──────────────────────────────────────────────────
        if (low.matches(".*\\bbudget\\b.*\\$?(\\d+).*") || low.matches(".*\\$?(\\d+).*\\bbudget\\b.*"))
            return calculateBudgetOptions(userMessage, userId);

        // ── CHEAPEST — handle BEFORE location/house-type routing ─────────────
        if (low.matches(".*(cheapest|most affordable|lowest price|lowest rent|cheapest house|most cheap|budget friendly|least expensive).*")) {
            List<String> allLocs  = houseRepository.findDistinctLocations();
            String       cheapLoc = resolveLocation(low, allLocs, userId);
            List<House> cheapPool = cheapLoc != null
                    ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", cheapLoc)
                    : houseRepository.findByStatus("available");
            if (cheapPool == null || cheapPool.isEmpty())
                return reply(section("❌ No Houses Available",
                        "There are no available houses right now. Check back soon!"));
            return getCheapestHouse(cheapPool, cheapLoc);
        }

        // ── Location / house-type queries ─────────────────────────────────────
        List<String> allLocations    = houseRepository.findDistinctLocations();
        String       matchedLocation = resolveLocation(low, allLocations, userId);

        boolean isHouseQuery = low.matches(
                ".*(available|rent|apartment|villa|studio|condo|bedroom|property|house|flat|listing|show me|find me|looking for).*");

        if (isHouseQuery || matchedLocation != null) {
            List<House> pool = matchedLocation != null
                    ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", matchedLocation)
                    : houseRepository.findByStatus("available");

            if (pool == null || pool.isEmpty())
                return reply(section("❌ Nothing Available Right Now",
                        "Sorry, there are no available houses"
                        + (matchedLocation != null ? " in **" + matchedLocation + "**" : "")
                        + " at the moment.\n\nTry a different area or ask me anything else!"));

            boolean hasPrice   = low.matches(".*between \\$?(\\d+) and \\$?(\\d+).*") ||
                                 low.matches(".*(?:under|below) \\$?(\\d+).*");
            boolean hasBedroom = low.matches(".*\\b(\\d+)[ -]bed(room)?.*");
            boolean hasType    = low.matches(".*(apartment|villa|studio|condo).*");
            boolean hasAmenity = low.matches(
                    ".*(pool|gym|parking|pet|balcony|elevator|garden|\\bac\\b|air.?con|furnished|wifi|internet).*");

            List<House> filtered = applyFilters(pool, low, hasPrice, hasBedroom, hasType, hasAmenity);

            if (filtered.isEmpty())
                return reply(section("😔 No Matches Found",
                        "No houses match those filters"
                        + (matchedLocation != null ? " in **" + matchedLocation + "**" : "")
                        + ".\n\nTry removing a filter — for example, drop the bedroom count or price limit."));

            if (userId != null) {
                if (matchedLocation != null) lastLocation.put(userId, matchedLocation);
                lastShownHouses.put(userId,
                        filtered.stream().map(House::getId).limit(5).collect(Collectors.toList()));
            }

            return buildFilteredList(filtered, matchedLocation, username, low);
        }

        if (containsPossibleLocation(userMessage) && matchedLocation == null) {
            String guess = extractLocationFromMessage(userMessage);
            return reply(section("❌ Area Not Found",
                    "I couldn't find any houses in **" + guess + "**.\n\nTry another city name or just ask me to show all available houses!"));
        }

        return sendToGemini(userMessage, username, userId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Help  — friendly, no command syntax required
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> buildHelp(String username) {
        long available = houseRepository.countByStatus("available");
        long rented    = houseRepository.countByStatus("rented");

        String msg = DIV_THICK + "\n"
                + "  👋  Hi " + username + "!  I'm your RentHouse Assistant\n"
                + DIV_THICK + "\n\n"
                + "  There are currently  ✅ " + available + " available  and  🔴 " + rented + " rented houses.\n\n"
                + "  Just tell me what you need!\n\n"
                + DIV_THIN + "\n"
                + "  🔍  FIND A HOUSE\n"
                // + DIV_THIN + "\n"
                // + "  → \"Show me houses in Dubai\"\n"
                // + "  → \"I need a 2-bedroom apartment\"\n"
                // + "  → \"Find me the cheapest house\"\n"
                // + "  → \"Studios with a pool under $1,000\"\n\n"
                + DIV_THIN + "\n"
                + "  💡  GET RECOMMENDATIONS\n"
                + DIV_THIN + "\n"
                + "  → \"Recommend something for me\"\n"
                // + "  → \"What's trending right now?\"\n"
                // + "  → \"Show me the latest listings\"\n"
                + "  → \"Find something similar to what I rented\"\n\n"
                + DIV_THIN + "\n"
                + "  💰  MONEY & BUDGETING\n"
                + DIV_THIN + "\n"
                + "  → \"My budget is $1,200\"\n"
                + "  → \"How much does it cost to move in?\"\n"
                + "  → \"Is this a good investment?\"\n"
                + "  → \"Help me negotiate a lower price\"\n\n"
                + DIV_THIN + "\n"
                + "  📊  MARKET INFO\n"
                + DIV_THIN + "\n"
                + "  → \"What are average prices like?\"\n"
                + "  → \"Is it a good time to rent?\"\n"
                + "  → \"Which houses are becoming available soon?\"\n\n"
                + DIV_THIN + "\n"
                + "  🗂️  MY ACCOUNT\n"
                + DIV_THIN + "\n"
                + "  → \"Show my rental history\"\n"
                + "  → \"What are my saved houses?\"\n"
                + "  → \"Compare [House A] and [House B]\"\n\n"
                + DIV_THICK + "\n"
                + "  💬  Not sure what to say? Just describe what you're looking for\n"
                + "      and I'll figure out the rest!\n"
                + DIV_THICK;
        return reply(msg);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Personalized Recommendations
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getPersonalizedRecommendations(Long userId, String username) {
        List<Rent>     userRents     = rentRepository.findByUserId(userId);
        List<Favorite> userFavorites = favoriteRepository.findByUserId(userId);

        if (userRents.isEmpty() && userFavorites.isEmpty())
            return reply(section("🤔 No History Yet",
                    "You haven't rented or saved any houses yet.\n"
                    + "Browse a few listings first and I'll personalise your picks!"));

        Map<String, Integer>  locPref  = new HashMap<>();
        Map<String, Integer>  typePref = new HashMap<>();
        Map<Integer, Integer> bedPref  = new HashMap<>();
        double totalPrice = 0; int priceCount = 0;

        for (Rent r : userRents) {
            House h = r.getHouse();
            locPref.merge(h.getLocation(), 2, Integer::sum);
            typePref.merge(h.getPropertyType(), 2, Integer::sum);
            bedPref.merge(h.getNbOfBedrooms(), 2, Integer::sum);
            totalPrice += h.getPricePerMonth(); priceCount++;
        }
        for (Favorite f : userFavorites) {
            House h = f.getProperty();
            locPref.merge(h.getLocation(), 1, Integer::sum);
            typePref.merge(h.getPropertyType(), 1, Integer::sum);
            bedPref.merge(h.getNbOfBedrooms(), 1, Integer::sum);
            totalPrice += h.getPricePerMonth(); priceCount++;
        }

        double avgPrice = totalPrice / priceCount;
        String prefLoc  = topString(locPref);
        String prefType = topString(typePref);
        int    prefBeds = topInt(bedPref);

        // Include ALL houses (available + rented) so we always return results
        List<House> recs = houseRepository.findAll().stream()
                .sorted(Comparator.comparingInt(
                        (House h) -> calcMatchScore(h, prefLoc, prefType, prefBeds, avgPrice)).reversed())
                .limit(6)
                .collect(Collectors.toList());

        if (recs.isEmpty())
            return reply(section("😔 No Recommendations", "No houses match your profile right now. Try again soon!"));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  ✨  Personalised Picks for ").append(username).append("\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  Based on your history, you seem to prefer:\n");
        sb.append("  📍 ").append(prefLoc).append("   🏠 ").append(prefType)
          .append("   🛏️  ").append(prefBeds).append(" beds   💰 ~$").append(fmt(avgPrice)).append("/mo\n\n");
        sb.append(DIV_THIN).append("\n");
        sb.append("  🎯  TOP PICKS FOR YOU\n");
        sb.append(DIV_THIN).append("\n\n");

        int rank = 1;
        for (House h : recs) {
            double matchPct   = Math.min(100, calcMatchScore(h, prefLoc, prefType, prefBeds, avgPrice) * 12.5);
            boolean isAvail   = "available".equals(h.getStatus());
            String  statusBadge = isAvail ? "✅ Available" : "🔴 Currently Rented";
            sb.append("  ").append(rank++).append("▸  ").append(h.getTitle())
              .append("  [").append(h.getPropertyType()).append("]\n");
            sb.append("     📍 ").append(h.getLocation()).append("\n");
            sb.append("     🛏️  ").append(h.getNbOfBedrooms()).append(" beds");
            sb.append("   💰 $").append(h.getPricePerMonth()).append("/mo\n");
            sb.append("     🎯 Match  ").append(String.format("%.0f%%", matchPct));
            sb.append("   ").append(statusBadge).append("\n\n");
        }
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    private int calcMatchScore(House h, String loc, String type, int beds, double avgPrice) {
        int s = 0;
        if (h.getLocation().equalsIgnoreCase(loc))       s += 3;
        if (h.getPropertyType().equalsIgnoreCase(type))  s += 2;
        if (h.getNbOfBedrooms() == beds)                 s += 2;
        if (Math.abs(h.getPricePerMonth() - avgPrice) < avgPrice * 0.2) s += 1;
        return s;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Rental History
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getUserRentalHistory(Long userId, String username) {
        List<Rent> rents = rentRepository.findByUserId(userId);
        if (rents.isEmpty())
            return reply(section("📭 No Rentals Yet",
                    "You haven't rented any houses yet.\nStart browsing to find your first home!"));

        double total = 0;
        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  📦  Rental History  —  ").append(username).append("\n");
        sb.append(DIV_THICK).append("\n\n");

        int idx = 1;
        for (Rent r : rents) {
            House  h      = r.getHouse();
            long   nights = daysBetween(r.getStartDate(), r.getEndDate());
            double cost   = nights > 0 ? nights * h.getPricePerDay() : h.getPricePerMonth();
            total += cost;
            sb.append("  ").append(idx++).append("▸  ").append(h.getTitle()).append("\n");
            sb.append("     📍 ").append(h.getLocation()).append("\n");
            sb.append("     📅 ").append(r.getStartDate()).append(" → ").append(r.getEndDate())
              .append("  (").append(nights).append(" nights)\n");
            sb.append("     💰 Est. total  $").append(fmt(cost)).append("\n\n");
        }

        sb.append(DIV_THIN).append("\n");
        sb.append("  💳  Total spent  :  $").append(fmt(total)).append("\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Favorites
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getUserFavorites(Long userId, String username) {
        List<Favorite> favs = favoriteRepository.findByUserId(userId);
        if (favs.isEmpty())
            return reply(section("💔 No Saved Houses",
                    "You haven't saved any houses yet.\nTap the heart icon on any listing to save it here!"));

        long available = favs.stream()
                .filter(f -> "available".equals(f.getProperty().getStatus())).count();

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  💖  Saved Houses  —  ").append(username).append("\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  ✅ Available now: ").append(available)
          .append("   🔴 Currently rented: ").append(favs.size() - available).append("\n\n");
        sb.append(DIV_THIN).append("\n\n");

        for (Favorite f : favs) {
            House   h     = f.getProperty();
            boolean avail = "available".equals(h.getStatus());
            sb.append(avail ? "  ✅  " : "  🔴  ").append(h.getTitle())
              .append("  [").append(h.getPropertyType()).append("]\n");
            sb.append("      📍 ").append(h.getLocation()).append("\n");
            sb.append("      🛏️  ").append(h.getNbOfBedrooms()).append(" beds");
            sb.append("   💰 $").append(h.getPricePerMonth()).append("/mo");
            if (!avail) sb.append("   ← currently rented");
            sb.append("\n\n");
        }
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Similar Houses
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getSimilarHouses(Long userId) {
        List<Rent>     rents = rentRepository.findByUserId(userId);
        List<Favorite> favs  = favoriteRepository.findByUserId(userId);

        if (rents.isEmpty() && favs.isEmpty())
            return reply(section("🤔 No History", "Rent or save a house first, then I can find similar ones!"));

        House ref = rents.isEmpty()
                ? favs.get(favs.size() - 1).getProperty()
                : rents.get(rents.size() - 1).getHouse();

        List<House> similar = houseRepository.findByStatus("available").stream()
                .filter(h -> !h.getId().equals(ref.getId()))
                .sorted(Comparator.comparingInt((House h) -> {
                    int s = 0;
                    if (h.getPropertyType().equalsIgnoreCase(ref.getPropertyType())) s += 3;
                    if (h.getLocation().equalsIgnoreCase(ref.getLocation()))         s += 2;
                    if (h.getNbOfBedrooms() == ref.getNbOfBedrooms())               s += 2;
                    if (Math.abs(h.getPricePerMonth() - ref.getPricePerMonth())
                            < ref.getPricePerMonth() * 0.25)                         s += 1;
                    return s;
                }).reversed())
                .limit(5)
                .collect(Collectors.toList());

        if (similar.isEmpty())
            return reply(section("😔 No Similar Houses", "No similar houses available right now. Check back soon!"));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🔍  Similar to  \"").append(ref.getTitle()).append("\"\n");
        sb.append(DIV_THICK).append("\n\n");

        for (House h : similar) {
            sb.append("  ▸  ").append(h.getTitle()).append("  [").append(h.getPropertyType()).append("]\n");
            sb.append("     📍 ").append(h.getLocation()).append("\n");
            sb.append("     🛏️  ").append(h.getNbOfBedrooms()).append(" beds");
            sb.append("   💰 $").append(h.getPricePerMonth()).append("/mo\n\n");
        }
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Trending Houses
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getTrendingHouses() {
        List<Long> ids = houseRepository.findMostRentedHouseIds();
        if (ids.isEmpty()) return reply(section("🤔 No Data Yet", "Not enough rental data to show trending houses yet."));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🔥  Trending Houses  —  Most Rented\n");
        sb.append(DIV_THICK).append("\n\n");

        int[] rank = {1};
        ids.stream().limit(5).forEach(id ->
            houseRepository.findById(id).ifPresent(h -> {
                long rentals = rentRepository.countByHouseId(h.getId());
                sb.append("  ").append(rank[0]++).append("▸  ").append(h.getTitle()).append("\n");
                sb.append("     📍 ").append(h.getLocation()).append("\n");
                sb.append("     💰 $").append(h.getPricePerMonth()).append("/mo");
                sb.append("   📈 Rented ").append(rentals).append("×\n");
                sb.append("     ").append("available".equals(h.getStatus()) ? "✅ Available now" : "🔴 Currently occupied");
                sb.append("\n\n");
            })
        );
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. New Listings
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getNewListings() {
        List<House> houses = houseRepository.findTop10ByStatusOrderByCreatedAtDesc("available");
        if (houses.isEmpty())
            return reply(section("📭 No New Listings", "No new listings right now. Check back soon!"));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🆕  Latest Listings\n");
        sb.append(DIV_THICK).append("\n\n");

        for (House h : houses) {
            sb.append("  ✨  ").append(h.getTitle()).append("  [").append(h.getPropertyType()).append("]\n");
            sb.append("      📍 ").append(h.getLocation()).append("\n");
            sb.append("      🛏️  ").append(h.getNbOfBedrooms()).append(" beds");
            sb.append("   💰 $").append(h.getPricePerMonth()).append("/mo  ·  $")
              .append(h.getPricePerDay()).append("/day\n\n");
        }
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Price Comparison
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getPriceComparison() {
        List<House> all = houseRepository.findByStatus("available");
        if (all.isEmpty()) return reply(section("❌ No Data", "No houses available for comparison right now."));

        DoubleSummaryStatistics stats = all.stream()
                .mapToDouble(House::getPricePerMonth).summaryStatistics();

        long under800 = all.stream().filter(h -> h.getPricePerMonth() <  800).count();
        long mid1200  = all.stream().filter(h -> h.getPricePerMonth() >= 800
                                              && h.getPricePerMonth() < 1200).count();
        long upper    = all.stream().filter(h -> h.getPricePerMonth() >= 1200).count();

        String topLoc = all.stream()
                .collect(Collectors.groupingBy(House::getLocation, Collectors.counting()))
                .entrySet().stream().max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("N/A");

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  💰  Market Price Overview\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  📊 Average rent      :  $").append(fmt(stats.getAverage())).append("/month\n");
        sb.append("  💸 Cheapest listing   :  $").append(fmt(stats.getMin())).append("/month\n");
        sb.append("  💎 Most expensive     :  $").append(fmt(stats.getMax())).append("/month\n");
        sb.append("  🏘️  Total available   :  ").append(stats.getCount()).append(" properties\n");
        sb.append("  📍 Most listings in   :  ").append(topLoc).append("\n\n");
        sb.append(DIV_THIN).append("\n");
        sb.append("  📈  PRICE TIERS\n");
        sb.append(DIV_THIN).append("\n\n");
        sb.append("  Budget  (under $800)   →  ").append(under800).append(" properties\n");
        sb.append("  Mid     ($800–$1,200)  →  ").append(mid1200).append(" properties\n");
        sb.append("  Premium (over $1,200)  →  ").append(upper).append(" properties\n\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Market Health Dashboard
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getMarketHealthDashboard() {
        long available = houseRepository.countByStatus("available");
        long rented    = houseRepository.countByStatus("rented");
        long total     = available + rented;
        if (total == 0) return reply(section("❌ No Data", "No market data available yet."));

        double vacancyRate   = (double) available / total * 100;
        double occupancyRate = 100 - vacancyRate;

        List<Double> prices = houseRepository.findByStatus("available").stream()
                .map(House::getPricePerMonth).sorted().collect(Collectors.toList());
        DoubleSummaryStatistics priceStats = prices.stream()
                .mapToDouble(Double::doubleValue).summaryStatistics();
        double median = prices.isEmpty() ? 0
                : prices.size() % 2 == 0
                    ? (prices.get(prices.size() / 2 - 1) + prices.get(prices.size() / 2)) / 2.0
                    : prices.get(prices.size() / 2);

        String healthLabel = vacancyRate > 30 ? "🟢 Renter's Market — lots of choice!"
                           : vacancyRate > 15 ? "🟡 Balanced Market"
                           :                    "🔴 Landlord's Market — act fast!";

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🏙️   Market Health Dashboard\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  🏘️  Total properties  :  ").append(total).append("\n");
        sb.append("  ✅ Available           :  ").append(available)
          .append("  (").append(String.format("%.1f%%", vacancyRate)).append(")\n");
        sb.append("  🔴 Occupied            :  ").append(rented)
          .append("  (").append(String.format("%.1f%%", occupancyRate)).append(")\n\n");
        sb.append(DIV_THIN).append("\n\n");
        sb.append("  💰 Median rent         :  $").append(fmt(median)).append("/mo\n");
        sb.append("  📉 Lowest rent         :  $").append(fmt(priceStats.getMin())).append("/mo\n");
        sb.append("  📈 Highest rent        :  $").append(fmt(priceStats.getMax())).append("/mo\n\n");
        sb.append(DIV_THIN).append("\n");
        sb.append("  📊  ").append(healthLabel).append("\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Seasonal Insights
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getSeasonalInsights() {
        int    m = LocalDate.now().getMonthValue();
        String season, tip, priceExpect;

        if      (m >= 6 && m <= 8)  { season = "☀️ Summer";  tip = "Demand peaks — prices are typically 10–15% higher.";  priceExpect = "📈 Above average"; }
        else if (m == 12 || m <= 2) { season = "❄️ Winter";  tip = "Fewest renters — best time to negotiate discounts.";  priceExpect = "📉 Below average  (great time to lock in a deal!)"; }
        else if (m >= 3 && m <= 5)  { season = "🌸 Spring";  tip = "Market picks up — act quickly on good listings.";     priceExpect = "📊 Rising"; }
        else                         { season = "🍂 Autumn";  tip = "Demand cools; landlords are more flexible.";          priceExpect = "📊 Stabilising  (good negotiation window)"; }

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🗓️   Seasonal Rental Insights\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  Current season   :  ").append(season).append("\n");
        sb.append("  Price outlook    :  ").append(priceExpect).append("\n\n");
        sb.append("  💡 ").append(tip).append("\n\n");
        sb.append(DIV_THIN).append("\n");
        sb.append("  📅  BEST MONTHS TO RENT\n");
        sb.append(DIV_THIN).append("\n\n");
        sb.append("  Jan – Feb   →  Lowest prices, most negotiating power\n");
        sb.append("  Mar – Apr   →  Good selection before the summer rush\n");
        sb.append("  Jun – Aug   →  Widest choice but premium pricing\n");
        sb.append("  Oct – Nov   →  Hidden gems as summer tenants move out\n\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Move-in Cost Estimator
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getMoveInCostEstimator(String message) {
        List<House> all = houseRepository.findByStatus("available");
        House target = all.stream()
                .filter(h -> message.toLowerCase().contains(h.getTitle().toLowerCase()))
                .findFirst()
                .orElseGet(() -> all.stream()
                        .min(Comparator.comparingDouble(House::getPricePerMonth))
                        .orElse(null));

        if (target == null) return reply(section("❌ No Houses", "No available houses to estimate right now."));

        double monthly   = target.getPricePerMonth();
        double deposit   = monthly * DEPOSIT_MONTHS;
        double utilities = target.getNbOfBedrooms() * UTILITY_PER_BEDROOM;
        double moving    = 300;
        double total     = monthly + deposit + utilities + moving;

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  💼  Move-in Cost Estimate\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  🏠 Property             :  ").append(target.getTitle()).append("\n\n");
        sb.append(DIV_THIN).append("\n\n");
        sb.append("  💰 First month's rent   :  $").append(fmt(monthly)).append("\n");
        sb.append("  🔐 Security deposit     :  $").append(fmt(deposit))
          .append("  (").append((int) DEPOSIT_MONTHS).append(" months)\n");
        sb.append("  ⚡ Est. utilities/mo    :  $").append(fmt(utilities)).append("\n");
        sb.append("  🚚 Moving costs (est.)  :  $").append(fmt(moving)).append("\n\n");
        sb.append(DIV_THIN).append("\n");
        sb.append("  💳  TOTAL DAY-1 COST    :  $").append(fmt(total)).append("\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  📌 Tip: Keep a 3-month emergency reserve ($").append(fmt(monthly * 3)).append(") just in case.\n");
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. ROI / Investment Analysis
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getInvestmentAnalysis() {
        List<House> all = houseRepository.findByStatus("available");
        if (all.isEmpty()) return reply(section("❌ No Data", "No properties available for analysis right now."));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  📈  Rental Investment Analysis\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  Assumption: purchase price ≈ 120× monthly rent\n\n");
        sb.append(DIV_THIN).append("\n\n");

        all.stream().sorted(Comparator.comparingDouble(House::getPricePerMonth).reversed())
           .limit(5).forEach(h -> {
               double monthly    = h.getPricePerMonth();
               double annual     = monthly * 12;
               double estValue   = monthly * 120;
               double grossYield = annual / estValue * 100;
               double payback    = estValue / annual;
               String signal     = grossYield >= GOOD_YIELD_THRESHOLD * 100 ? "🟢 Good" : "🟡 Average";
               sb.append("  ▸  ").append(h.getTitle()).append("\n");
               sb.append("     💰 Rent            :  $").append(fmt(monthly)).append("/mo\n");
               sb.append("     🏷️  Est. value      :  $").append(fmt(estValue)).append("\n");
               sb.append("     📊 Gross yield     :  ")
                 .append(String.format("%.1f%%", grossYield)).append("  ").append(signal).append("\n");
               sb.append("     ⏳ Payback period  :  ")
                 .append(String.format("%.1f", payback)).append(" years\n\n");
           });

        sb.append(DIV_THIN).append("\n");
        sb.append("  💡 A gross yield above 6% is generally considered a solid investment.\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Negotiation Assistant
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getNegotiationAdvice(String message) {
        List<House> all = houseRepository.findByStatus("available");
        House target = all.stream()
                .filter(h -> message.toLowerCase().contains(h.getTitle().toLowerCase()))
                .findFirst().orElse(null);

        double avg = all.stream().mapToDouble(House::getPricePerMonth).average().orElse(0);

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🤝  Negotiation Guide\n");
        sb.append(DIV_THICK).append("\n\n");

        if (target != null) {
            double price          = target.getPricePerMonth();
            double diff           = price - avg;
            double suggestedOffer = price * 0.92;
            String leverage       = diff > 0
                    ? "This is above market average by $" + fmt(diff) + " — you have strong negotiating leverage!"
                    : "This is already below market average — adjust your expectations accordingly.";
            sb.append("  🏠 Property               :  ").append(target.getTitle()).append("\n");
            sb.append("  💰 Listed at               :  $").append(fmt(price)).append("/mo\n");
            sb.append("  📊 Market average          :  $").append(fmt(avg)).append("/mo\n");
            sb.append("  💡 ").append(leverage).append("\n\n");
            sb.append(DIV_THIN).append("\n");
            sb.append("  🎯  Suggested opening offer  :  $").append(fmt(suggestedOffer)).append("/mo\n");
            sb.append(DIV_THIN).append("\n\n");
        }

        sb.append("  📋  NEGOTIATION TIPS\n\n");
        sb.append("  1.  Market average is $").append(fmt(avg)).append("/mo — use this as your anchor\n");
        sb.append("  2.  Start 8–10% below the asking price\n");
        sb.append("  3.  Offer a longer lease (12+ months) in exchange for a discount\n");
        sb.append("  4.  Offer to pay 2–3 months upfront for a better rate\n");
        sb.append("  5.  Mention any maintenance issues you spotted as leverage\n");
        sb.append("  6.  Nov–Feb is the best time — landlords are most motivated then\n");
        sb.append("  7.  Get competing quotes in writing before making your final offer\n\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Availability Forecast
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getAvailabilityForecast() {
        List<Rent> activeRents = rentRepository.findAll().stream()
                .filter(r -> r.getEndDate() != null && r.getEndDate().isAfter(LocalDate.now()))
                .sorted(Comparator.comparing(Rent::getEndDate))
                .limit(10)
                .collect(Collectors.toList());

        if (activeRents.isEmpty())
            return reply(section("📅 No Forecast Data", "No upcoming lease end dates found right now."));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy");
        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  📅  Houses Becoming Available Soon\n");
        sb.append(DIV_THICK).append("\n\n");

        for (Rent r : activeRents) {
            House  h    = r.getHouse();
            long   days = ChronoUnit.DAYS.between(LocalDate.now(), r.getEndDate());
            String urgency = days <= 7  ? "🟢 Available very soon!"
                           : days <= 30 ? "🟡 Available within a month"
                           :              "🔵 Available in " + days + " days";
            sb.append("  ▸  ").append(h.getTitle()).append("\n");
            sb.append("     📍 ").append(h.getLocation()).append("\n");
            sb.append("     💰 $").append(h.getPricePerMonth()).append("/mo\n");
            sb.append("     📅 Free from  :  ").append(r.getEndDate().format(dtf)).append("\n");
            sb.append("     ").append(urgency).append("\n\n");
        }
        sb.append(DIV_THIN).append("\n");
        sb.append("  💡 Tip: Reach out to the landlord ~2 weeks before the end date to get first priority.\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 15. Waitlist Suggestions
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getWaitlistSuggestions(Long userId) {
        List<Favorite> favs = favoriteRepository.findByUserId(userId);
        List<House> occupied = favs.stream()
                .map(Favorite::getProperty)
                .filter(h -> !"available".equals(h.getStatus()))
                .collect(Collectors.toList());

        if (occupied.isEmpty())
            return reply(section("✅ Great News!", "All your saved houses are currently available!"));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🔔  Houses to Watch  —  Currently Rented\n");
        sb.append(DIV_THICK).append("\n\n");

        for (House h : occupied) {
            Rent latestRent = rentRepository.findTopByHouseIdOrderByEndDateDesc(h.getId());
            sb.append("  ▸  ").append(h.getTitle()).append("\n");
            sb.append("     📍 ").append(h.getLocation()).append("\n");
            sb.append("     💰 $").append(h.getPricePerMonth()).append("/mo\n");

            if (latestRent != null && latestRent.getEndDate() != null) {
                long days = ChronoUnit.DAYS.between(LocalDate.now(), latestRent.getEndDate());
                if (days >= 0)
                    sb.append("     📅 Expected to be free in ~").append(days).append(" days\n");
            }
            sb.append("     💡 Contact the landlord now to reserve your spot!\n\n");
        }

        sb.append(DIV_THIN).append("\n");
        sb.append("  🚀 Reaching out early gives you a much higher chance of securing it!\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 16. House Comparison Engine
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> compareHousesByName(String message) {
        Pattern p = Pattern.compile(
                "compare\\s+(.+?)\\s+(?:and|vs\\.?|versus)\\s+(.+)",
                Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(message);

        if (!m.find())
            return reply(section("❌ Couldn't Parse That",
                    "Try something like:\n\"Compare Sunset Villa and Ocean Breeze\""));

        String nameA = m.group(1).trim();
        String nameB = m.group(2).trim();
        List<House> all = houseRepository.findAll();

        House houseA = all.stream()
                .filter(h -> h.getTitle().toLowerCase().contains(nameA.toLowerCase()))
                .findFirst().orElse(null);
        House houseB = all.stream()
                .filter(h -> h.getTitle().toLowerCase().contains(nameB.toLowerCase()))
                .findFirst().orElse(null);

        if (houseA == null && houseB == null)
            return reply(section("❌ Not Found", "Neither house was found. Please double-check the names."));
        if (houseA == null) return reply(section("❌ Not Found", "Couldn't find \"" + nameA + "\". Please check the name."));
        if (houseB == null) return reply(section("❌ Not Found", "Couldn't find \"" + nameB + "\". Please check the name."));

        String winner = houseA.getPricePerMonth() <= houseB.getPricePerMonth()
                ? houseA.getTitle() : houseB.getTitle();

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  ⚖️   Side-by-Side Comparison\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append(String.format("  %-18s  %-20s  %-20s\n", "Feature", houseA.getTitle(), houseB.getTitle()));
        sb.append("  ").append("─".repeat(60)).append("\n");
        sb.append(String.format("  %-18s  %-20s  %-20s\n", "📍 Location",   houseA.getLocation(),     houseB.getLocation()));
        sb.append(String.format("  %-18s  %-20s  %-20s\n", "🏠 Type",       houseA.getPropertyType(), houseB.getPropertyType()));
        sb.append(String.format("  %-18s  %-20s  %-20s\n", "🛏️  Bedrooms",  houseA.getNbOfBedrooms(), houseB.getNbOfBedrooms()));
        sb.append(String.format("  %-18s  $%-19s  $%-19s\n","💰 /month",    fmt(houseA.getPricePerMonth()), fmt(houseB.getPricePerMonth())));
        sb.append(String.format("  %-18s  $%-19s  $%-19s\n","💰 /day",      fmt(houseA.getPricePerDay()),   fmt(houseB.getPricePerDay())));
        sb.append(String.format("  %-18s  %-20s  %-20s\n", "📊 Status",
                "available".equals(houseA.getStatus()) ? "✅ Available" : "🔴 Rented",
                "available".equals(houseB.getStatus()) ? "✅ Available" : "🔴 Rented"));
        sb.append("  ").append("─".repeat(60)).append("\n");
        sb.append("  🏆 Better value  :  ").append(winner).append("\n");
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 17. Budget Matching
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> calculateBudgetOptions(String message, Long userId) {
        Matcher m = Pattern.compile("\\$?(\\d+(?:,\\d{3})*)").matcher(message);
        if (!m.find()) return reply(section("❌ Invalid Budget",
                "Please include a number, e.g. \"my budget is $1,200\""));

        double budget = Double.parseDouble(m.group(1).replace(",", ""));
        String loc    = userId != null ? lastLocation.get(userId) : null;

        List<House> pool = loc != null
                ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", loc)
                : houseRepository.findByStatus("available");

        List<House> within = pool.stream()
                .filter(h -> h.getPricePerMonth() <= budget)
                .sorted(Comparator.comparingDouble(House::getPricePerMonth).reversed())
                .limit(5)
                .collect(Collectors.toList());

        if (within.isEmpty())
            return reply(section("😔 Nothing in That Range",
                    "No houses found within your $" + fmt(budget) + "/mo budget"
                    + (loc != null ? " in " + loc : "") + ".\n\n"
                    + "💡 Try bumping your budget up by 10–15% or searching a different area."));

        double avgMarket = pool.stream().mapToDouble(House::getPricePerMonth).average().orElse(0);

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  💰  Houses within your $").append(fmt(budget)).append("/mo budget");
        if (loc != null) sb.append("  in ").append(loc);
        sb.append("\n");
        sb.append(DIV_THICK).append("\n\n");
        sb.append("  Market average  :  $").append(fmt(avgMarket)).append("/mo\n\n");
        sb.append(DIV_THIN).append("\n\n");

        for (House h : within) {
            double saving = budget - h.getPricePerMonth();
            sb.append("  ✅  ").append(h.getTitle()).append("  [").append(h.getPropertyType()).append("]\n");
            sb.append("      📍 ").append(h.getLocation()).append("\n");
            sb.append("      🛏️  ").append(h.getNbOfBedrooms()).append(" beds\n");
            sb.append("      💰 $").append(fmt(h.getPricePerMonth())).append("/mo");
            sb.append("   — saves you $").append(fmt(saving)).append("/mo\n\n");
        }
        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 18. Multi-filter Pipeline
    // ─────────────────────────────────────────────────────────────────────────

    private List<House> applyFilters(List<House> pool, String low,
                                     boolean hasPrice, boolean hasBedroom,
                                     boolean hasType, boolean hasAmenity) {
        List<House> result = new ArrayList<>(pool);

        Matcher rangeMatcher = Pattern.compile("between \\$?(\\d+) and \\$?(\\d+)").matcher(low);
        if (rangeMatcher.find()) {
            double min = Double.parseDouble(rangeMatcher.group(1));
            double max = Double.parseDouble(rangeMatcher.group(2));
            result = result.stream()
                    .filter(h -> h.getPricePerMonth() >= min && h.getPricePerMonth() <= max)
                    .collect(Collectors.toList());
        }

        Matcher underMatcher = Pattern.compile("(?:under|below|less than|max|maximum) \\$?(\\d+)").matcher(low);
        if (underMatcher.find()) {
            double max = Double.parseDouble(underMatcher.group(1));
            result = result.stream()
                    .filter(h -> h.getPricePerMonth() <= max)
                    .collect(Collectors.toList());
        }

        Matcher bedMatcher = Pattern.compile("(\\d+)[- ]bed(room)?s?").matcher(low);
        if (bedMatcher.find()) {
            int beds = Integer.parseInt(bedMatcher.group(1));
            result = result.stream()
                    .filter(h -> h.getNbOfBedrooms() == beds)
                    .collect(Collectors.toList());
        }

        if      (low.contains("apartment")) result = filterType(result, "Apartment");
        else if (low.contains("villa"))     result = filterType(result, "Villa");
        else if (low.contains("studio"))    result = filterType(result, "Studio");
        else if (low.contains("condo"))     result = filterType(result, "Condo");

        if (hasAmenity) {
            List<String> wanted = new ArrayList<>();
            if (low.contains("pool"))                             wanted.add("pool");
            if (low.contains("gym"))                              wanted.add("gym");
            if (low.contains("parking"))                          wanted.add("parking");
            if (low.contains("pet"))                              wanted.add("pet");
            if (low.contains("balcony"))                          wanted.add("balcony");
            if (low.contains("elevator"))                         wanted.add("elevator");
            if (low.contains("garden"))                           wanted.add("garden");
            if (low.contains("furnished"))                        wanted.add("furnished");
            if (low.contains("wifi") || low.contains("internet")) wanted.add("wifi");
            if (low.contains("ac") || low.contains("air con"))    wanted.add("ac");

            if (!wanted.isEmpty()) {
                result = result.stream()
                        .filter(h -> {
                            String desc = h.getDescription() == null ? "" : h.getDescription().toLowerCase();
                            return wanted.stream().anyMatch(desc::contains);
                        })
                        .collect(Collectors.toList());
            }
        }

        return result;
    }

    private List<House> filterType(List<House> list, String type) {
        return list.stream()
                .filter(h -> h.getPropertyType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 19. Filtered List Display
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> buildFilteredList(List<House> filtered, String location,
                                                   String username, String low) {
        List<String> activeFilters = new ArrayList<>();
        if (location != null)           activeFilters.add("📍 " + location);
        if (low.contains("apartment"))  activeFilters.add("🏢 Apartments");
        if (low.contains("villa"))      activeFilters.add("🏡 Villas");
        if (low.contains("studio"))     activeFilters.add("🛋️ Studios");
        if (low.contains("condo"))      activeFilters.add("🏙️ Condos");

        Matcher bedM = Pattern.compile("(\\d+)[- ]bed").matcher(low);
        if (bedM.find()) activeFilters.add("🛏️ " + bedM.group(1) + " bedrooms");

        Matcher underM = Pattern.compile("(?:under|below) \\$?(\\d+)").matcher(low);
        if (underM.find()) activeFilters.add("💰 under $" + underM.group(1));

        Matcher rangeM = Pattern.compile("between \\$?(\\d+) and \\$?(\\d+)").matcher(low);
        if (rangeM.find()) activeFilters.add("💰 $" + rangeM.group(1) + "–$" + rangeM.group(2));

        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  🏠  Available Houses");
        if (location != null) sb.append("  in ").append(location);
        sb.append("\n");
        sb.append(DIV_THICK).append("\n\n");

        if (!activeFilters.isEmpty()) {
            sb.append("  🔎 Filters  :  ").append(String.join("  ·  ", activeFilters)).append("\n");
            sb.append("  Found  ").append(filtered.size()).append(" matching propert")
              .append(filtered.size() == 1 ? "y" : "ies").append("\n\n");
        }

        sb.append(DIV_THIN).append("\n\n");

        filtered.stream().limit(6).forEach(h ->
            sb.append("  ✅  ").append(h.getTitle()).append("  [").append(h.getPropertyType()).append("]\n")
              .append("      📍 ").append(h.getLocation()).append("\n")
              .append("      🛏️  ").append(h.getNbOfBedrooms()).append(" beds")
              .append("   💰 $").append(h.getPricePerMonth()).append("/mo  ·  $")
              .append(h.getPricePerDay()).append("/day\n\n")
        );

        if (filtered.size() > 6) {
            sb.append(DIV_THIN).append("\n");
            sb.append("  … and ").append(filtered.size() - 6)
              .append(" more — add a filter to narrow it down.\n");
        }

        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 20. Cheapest House  — now with breakdown
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> getCheapestHouse(List<House> houses, String location) {
        // Sort by price and return top 3 most affordable, not just one
        List<House> cheapest = houses.stream()
                .sorted(Comparator.comparingDouble(House::getPricePerMonth))
                .limit(3)
                .collect(Collectors.toList());

        if (cheapest.isEmpty())
            return reply(section("❌ Not Found", "No houses found."));

        House top = cheapest.get(0);
        StringBuilder sb = new StringBuilder();
        sb.append(DIV_THICK).append("\n");
        sb.append("  💸  Most Affordable Options");
        if (location != null) sb.append("  in ").append(location);
        sb.append("\n").append(DIV_THICK).append("\n\n");

        // Highlight the cheapest one
        sb.append("  🥇  BEST DEAL\n\n");
        sb.append("  🏠  ").append(top.getTitle()).append("  [").append(top.getPropertyType()).append("]\n");
        sb.append("  📍  ").append(top.getLocation()).append("\n");
        sb.append("  🛏️   ").append(top.getNbOfBedrooms()).append(" bedrooms\n");
        sb.append("  💰  $").append(fmt(top.getPricePerMonth())).append("/month");
        sb.append("  ·  $").append(fmt(top.getPricePerDay())).append("/day\n");
        sb.append("  💼  Est. move-in cost  :  $")
          .append(fmt(top.getPricePerMonth() * (1 + DEPOSIT_MONTHS)))
          .append("  (first month + deposit)\n\n");

        // Show runners-up if any
        if (cheapest.size() > 1) {
            sb.append(DIV_THIN).append("\n");
            sb.append("  Also affordable:\n\n");
            for (int i = 1; i < cheapest.size(); i++) {
                House h = cheapest.get(i);
                sb.append("  ").append(i + 1).append("▸  ").append(h.getTitle())
                  .append("  [").append(h.getPropertyType()).append("]\n");
                sb.append("     📍 ").append(h.getLocation())
                  .append("   🛏️  ").append(h.getNbOfBedrooms()).append(" beds")
                  .append("   💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n\n");
            }
        }

        sb.append(DIV_THICK);
        return reply(sb.toString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 21. Gemini Fallback
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, String> sendToGemini(String userMessage, String username, Long userId) {
        try {
            long   available   = houseRepository.countByStatus("available");
            String ctxLocation = userId != null
                    ? lastLocation.getOrDefault(userId, "not specified") : "not specified";

            String fullPrompt =
                    "You are a friendly and helpful rental assistant for the RentHouse platform. "
                    + "Currently there are " + available + " available properties. "
                    + "The user's last searched location is " + ctxLocation + ". "
                    + "IMPORTANT: Do NOT start your reply with any greeting, salutation, or the user's name. "
                    + "Go straight to the answer. Be conversational, warm, and concise. "
                    + "If asked about specific properties, suggest they describe what they're looking for "
                    + "in plain English.\n\n"
                    + "User: " + userMessage;

            Map<String, Object> userContent = Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", fullPrompt)));
            Map<String, Object> requestBody = Map.of("contents", List.of(userContent));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = new RestTemplate().exchange(
                    GEMINI_API_URL + apiKey, HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers), Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.getBody().get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");

            String raw = parts.get(0).get("text");

            String cleaned = raw
                    .replaceAll("(?i)^(hi|hello|hey)[^\\n]*\\n+", "")
                    .replaceAll("(?i)^(sure|of course|absolutely)[^\\n]*\\n+", "")
                    .trim();

            StringBuilder sb = new StringBuilder();
            sb.append(DIV_THICK).append("\n");
            sb.append("  🤖  RentHouse Assistant  —  ").append(username).append("\n");
            sb.append(DIV_THICK).append("\n\n");
            sb.append(cleaned).append("\n\n");
            sb.append(DIV_THICK);
            return reply(sb.toString());

        } catch (Exception e) {
            e.printStackTrace();
            return reply(section("❌ Something Went Wrong",
                    "I couldn't reach my AI brain right now.\n\nJust describe what you're looking for "
                    + "and I'll do my best to help!"));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String section(String title, String body) {
        return DIV_THIN + "\n  " + title + "\n" + DIV_THIN + "\n\n  " + body + "\n\n" + DIV_THIN;
    }

    private String resolveLocation(String low, List<String> allLocations, Long userId) {
        for (String loc : allLocations)
            if (low.contains(loc.toLowerCase())) return loc;
        if ((low.contains("near me") || low.contains("around here") || low.contains("nearby"))
                && userId != null)
            return lastLocation.get(userId);
        return null;
    }

    private Map<String, String> reply(String text) {
        return Map.of("reply", text);
    }

    private Map<String, String> requireLogin(Long userId,
                                              java.util.function.Supplier<Map<String, String>> action) {
        if (userId == null)
            return reply(section("⚠️ Please Log In", "You need to be logged in to use this feature."));
        try { return action.get(); }
        catch (Exception e) { return reply(section("❌ Something went wrong", e.getMessage())); }
    }

    private String fmt(double value) {
        return value == Math.floor(value)
                ? String.format("%.0f", value)
                : String.format("%.2f", value);
    }

    private Long parseLong(String s) {
        try { return (s != null && !s.isBlank()) ? Long.parseLong(s) : null; }
        catch (Exception e) { return null; }
    }

    private long daysBetween(LocalDate start, LocalDate end) {
        if (start == null || end == null) return 0;
        return ChronoUnit.DAYS.between(start, end);
    }

    private <K> K topString(Map<K, Integer> map) {
        return map.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(null);
    }

    private int topInt(Map<Integer, Integer> map) {
        return map.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(2);
    }

    private boolean containsPossibleLocation(String message) {
        return message.toLowerCase().matches(".*\\b(in|at)\\s+\\w+.*");
    }

    private String extractLocationFromMessage(String message) {
        Matcher m = Pattern.compile("\\b(?:in|at)\\s+([a-zA-Z\\s]+)")
                           .matcher(message.toLowerCase());
        return m.find() ? m.group(1).trim() : "the specified location";
    }
}