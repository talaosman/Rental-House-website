
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
@CrossOrigin(origins = {"http://localhost:3000", "https://your-frontend.vercel.app"})
public class ChatController {

    @Value("${google.ai.api.key}")
    private String apiKey;

    private static final String GEMINI_API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";

    private static final double UTILITY_PER_BEDROOM  = 80.0;
    private static final double DEPOSIT_MONTHS       = 2.0;
    private static final double GOOD_YIELD_THRESHOLD = 0.06;

    @Autowired private HouseRepository    houseRepository;
    @Autowired private RentRepository     rentRepository;
    @Autowired private FavoriteRepository favoriteRepository;

    private final Map<Long, String>       lastLocation    = new HashMap<>();
    private final Map<Long, List<Long>>   lastShownHouses = new HashMap<>();

  
    private enum Intent {
        MENU_OPTION,
        HELP,
        PERSONALIZED,
        RENTAL_HISTORY,
        FAVOURITES,
        SIMILAR,
        TRENDING,
        NEW_LISTINGS,
        PRICE_COMPARISON,
        MARKET_HEALTH,
        SEASONAL,
        MOVE_IN_COST,
        INVESTMENT,
        NEGOTIATION,
        AVAILABILITY,
        WAITLIST,
        COMPARE_HOUSES,
        BUDGET,
        CHEAPEST,
        HOUSE_SEARCH,
        UNKNOWN
    }

   
    private static final Map<Intent, String[]> SEEDS = new LinkedHashMap<>();
    static {
       
        SEEDS.put(Intent.HELP, new String[]{
            "help","hello","hi","hey","start","menu","commands","features",
            "what can you do","how does this work","what do you do"
        });

      
        SEEDS.put(Intent.PERSONALIZED, new String[]{
            "recommend","recommendation","suggest","suggestion","personalized",
            "personalised","pick for me","good for me","for me","best for me",
            "what should i","tailor","curated","based on me","my picks","my taste"
        });

     
        SEEDS.put(Intent.RENTAL_HISTORY, new String[]{
            "rental history","rent history","my rentals","my rented","my bookings",
            "what did i rent","past rent","previous rent","renting history",
            "history of rent","booked before","my past","past properties",
            "rentale history","rental histori","rantal history","rental historey",
            "rentall history","rentel history","my rental","rental histry",
            "my rent history","show my rent","renting record","rent record",
            "booking history","previous booking","past booking","spent on rent",
            "how much did i spend","my spending","rent spending"
        });

      
        SEEDS.put(Intent.FAVOURITES, new String[]{
            "favourites","favorites","favourite","favorite","saved","wishlist",
            "my saved","saved houses","saved properties","saved homes","liked",
            "my likes","saved list","bookmark","bookmarked","heart","hearted",
            "my hearts","favs","fav","my favs","favouirites","favourits",
            "favorits","my favorit","favoritt","favoruite","favoirites"
        });

       
        SEEDS.put(Intent.SIMILAR, new String[]{
            "similar","like this","like the last","same type","something like",
            "comparable","resembles","looks like","similar to","akin to",
            "close to","nearby type","same kind","simlar","similiar","similer"
        });

       
        SEEDS.put(Intent.TRENDING, new String[]{
            "trending","popular","most rented","most liked","top house",
            "top property","top homes","hot right now","in demand","highly rated",
            "best rated","top rated","most booked","trending now","whats hot",
            "trendng","trnding","trending houses","populer","popullar"
        });

       
        SEEDS.put(Intent.NEW_LISTINGS, new String[]{
            "new listing","latest listing","recent listing","just added","newly listed",
            "new property","new home","new house","fresh listing","just listed",
            "added recently","new arrival","new arrivals","lattest","lates listing",
            "newest","brand new listing","newly available"
        });

      
        SEEDS.put(Intent.PRICE_COMPARISON, new String[]{
            "compare prices","price comparison","market stats","market overview",
            "average price","avg price","price overview","price breakdown",
            "rent statistics","how much does it cost","market prices","pricing stats",
            "price range","how expensive","how cheap","rent average","avg rent",
            "market average","rental prices","pric comparison","price comparsion"
        });

      
        SEEDS.put(Intent.MARKET_HEALTH, new String[]{
            "market health","vacancy rate","days listed","market dashboard",
            "occupancy","supply demand","landlord market","renters market",
            "market condition","market status","vacancy","available ratio",
            "market overview","how is the market","rental market","market trend",
            "markt health","market helth","market dashbord","occupency"
        });

        
        SEEDS.put(Intent.SEASONAL, new String[]{
            "seasonal","season","best time","when to rent","price trend",
            "best month","time of year","winter rent","summer rent","spring rent",
            "autumn rent","cheap season","peak season","off season","low season",
            "sesonl","seasonel","sesonal","best time to rent","rent in winter",
            "rent in summer","seasonal insight","season insight"
        });

    
        SEEDS.put(Intent.MOVE_IN_COST, new String[]{
            "move in cost","move-in cost","moving cost","how much to move",
            "total cost","initial cost","first payment","upfront cost",
            "move in","moving in","start cost","setup cost","initial payment",
            "first month cost","deposit cost","moving expense","move in price",
            "movin cost","move in cst","movein cost","move-in","movin in",
            "what does it cost to move","cost to move in"
        });

        
        SEEDS.put(Intent.INVESTMENT, new String[]{
            "roi","invest","return on investment","rental yield","income property",
            "worth buying","investment","yield","gross yield","property value",
            "buy to let","buy to rent","profitability","profit","return",
            "investment analysis","investement","investmnt","yeild","rental roi"
        });

       
        SEEDS.put(Intent.NEGOTIATION, new String[]{
            "negotiate","negotiation","bargain","lower the price","discount",
            "offer","price down","reduce price","haggle","talk down","deal",
            "get cheaper","price negotiation","negotiating tip","how to negotiate",
            "negotaite","negociate","negoatiate","negotitate","negociation",
            "get a discount","lower rent","reduce rent","ask for discount"
        });

       
        SEEDS.put(Intent.AVAILABILITY, new String[]{
            "when available","when free","availability forecast","will it be free",
            "coming available","soon available","upcoming availability","lease end",
            "moving out","end of lease","when will","availability","free soon",
            "availabilty","avalability","availabiliti","avalable soon","when vacant"
        });

        SEEDS.put(Intent.WAITLIST, new String[]{
            "waitlist","wait list","notify me","alert me","tell me when",
            "let me know when","notify when","watch list","watchlist","alert when",
            "inform me","ping me","remind me","notify","alert","waint list",
            "waitlest","waitlst","wantlist","notify when free"
        });

        SEEDS.put(Intent.COMPARE_HOUSES, new String[]{
            "compare","vs","versus","side by side","which is better",
            "comparison","compare these","compare house","compare property",
            "compair","compre","cmopare","which one is better","difference between"
        });

      
        SEEDS.put(Intent.BUDGET, new String[]{
            "budget","my budget","afford","can i afford","within budget",
            "under budget","price limit","max price","maximum rent",
            "spending limit","budjet","budgt","budgit","buget","monthly budget"
        });

        // Cheapest
        SEEDS.put(Intent.CHEAPEST, new String[]{
            "cheapest","most affordable","lowest price","lowest rent","cheap house",
            "budget friendly","least expensive","most cheap","cheapest house",
            "cheapest apartment","cheapest villa","low cost","low price",
            "cheapst","chepeast","cheapeast","most afforable","cheapest option"
        });

        // General house search
        SEEDS.put(Intent.HOUSE_SEARCH, new String[]{
            "available","rent","apartment","villa","studio","condo","bedroom",
            "property","house","flat","listing","show me","find me","looking for",
            "search","find house","find property","find apartment","search for"
        });
    }

  
    private static int levenshtein(String a, String b) {
        int la = a.length(), lb = b.length();
        if (Math.abs(la - lb) > 4) return Integer.MAX_VALUE; // fast-reject
        int[][] dp = new int[la + 1][lb + 1];
        for (int i = 0; i <= la; i++) dp[i][0] = i;
        for (int j = 0; j <= lb; j++) dp[0][j] = j;
        for (int i = 1; i <= la; i++)
            for (int j = 1; j <= lb; j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1,
                           Math.min(dp[i][j - 1] + 1,
                                    dp[i - 1][j - 1] + cost));
            }
        return dp[la][lb];
    }


    private static int threshold(int wordLen) {
        if (wordLen <= 3) return 0;
        if (wordLen <= 5) return 1;
        if (wordLen <= 7) return 2;
        return 3;
    }

 

  
    private int scoreIntent(String message, Intent intent) {
        String[] seeds = SEEDS.get(intent);
        if (seeds == null) return Integer.MAX_VALUE;

        String low = message.toLowerCase().trim();
        int best = Integer.MAX_VALUE;

        for (String seed : seeds) {
          
            if (low.contains(seed)) return 0;

          
            String[] seedWords = seed.split("\\s+");
            String[] msgWords  = low.split("\\s+");

            if (seedWords.length == 1) {
                // Single-word seed: compare against every word in the message
                for (String w : msgWords) {
                    int dist = levenshtein(w, seed);
                    if (dist <= threshold(seed.length())) best = Math.min(best, dist);
                }
            } else {
                // Multi-word seed: use sliding window over message words
                if (msgWords.length >= seedWords.length) {
                    for (int start = 0; start <= msgWords.length - seedWords.length; start++) {
                        int windowDist = 0;
                        for (int k = 0; k < seedWords.length; k++) {
                            windowDist += levenshtein(msgWords[start + k], seedWords[k]);
                        }
                        // Allow total window distance proportional to seed length
                        int windowThreshold = seedWords.length * 2;
                        if (windowDist <= windowThreshold) best = Math.min(best, windowDist);
                    }
                }

                // Also check if the seed (squished) is fuzzy-close to a substring
                String squished     = seed.replace(" ", "");
                String lowSquished  = low.replace(" ", "");
                if (lowSquished.contains(squished)) best = Math.min(best, 0);
            }
        }
        return best;
    }

   
    private Intent detectIntent(String message, Long userId) {
        String low = message.toLowerCase().trim();

        if (low.matches("^\\s*option\\s*[1-6]\\s*$|^\\s*[1-6]\\s*$"))
            return Intent.MENU_OPTION;

       
        if (low.trim().length() < 3)
            return Intent.HELP;

       
        if (low.matches(".*(compare\\s+.+\\s+(and|vs\\.?|versus)\\s+.+).*"))
            return Intent.COMPARE_HOUSES;

        // Budget with dollar amount
        if (low.matches(".*\\bbudget\\b.*\\$?(\\d+).*") || low.matches(".*\\$?(\\d+).*\\bbudget\\b.*"))
            return Intent.BUDGET;

        Intent bestIntent = Intent.UNKNOWN;
        int    bestScore  = Integer.MAX_VALUE;

        // Define priority order (earlier = checked first for ties)
        Intent[] orderedIntents = {
            Intent.HELP, Intent.PERSONALIZED, Intent.RENTAL_HISTORY,
            Intent.FAVOURITES, Intent.SIMILAR, Intent.TRENDING,
            Intent.NEW_LISTINGS, Intent.PRICE_COMPARISON, Intent.MARKET_HEALTH,
            Intent.SEASONAL, Intent.MOVE_IN_COST, Intent.INVESTMENT,
            Intent.NEGOTIATION, Intent.AVAILABILITY, Intent.WAITLIST,
            Intent.COMPARE_HOUSES, Intent.BUDGET, Intent.CHEAPEST,
            Intent.HOUSE_SEARCH
        };

        for (Intent intent : orderedIntents) {
            int score = scoreIntent(message, intent);
            if (score < bestScore) {
                bestScore  = score;
                bestIntent = intent;
            }
        }

        // Only accept fuzzy match if score is within reasonable range
        // (prevents totally unrelated messages from matching)
        if (bestScore <= 3) return bestIntent;

        // Last resort: check if it looks like a house search by context
        List<String> allLocations = houseRepository.findDistinctLocations();
        String matchedLocation = resolveLocation(low, allLocations, userId);
        if (matchedLocation != null) return Intent.HOUSE_SEARCH;

        return Intent.UNKNOWN;
    }


    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> payload) {

        String userMessage = payload.getOrDefault("message", "").trim();
        String rawUsername = payload.get("username");
        String username = (rawUsername == null || rawUsername.isBlank() ||
                rawUsername.equalsIgnoreCase("null")) ? "Guest" : rawUsername;
        Long userId = parseLong(payload.get("userId"));
        String low  = userMessage.toLowerCase();

        Intent intent = detectIntent(userMessage, userId);

        switch (intent) {

            case MENU_OPTION: {
                int option = Character.getNumericValue(low.replaceAll("[^1-6]", "").charAt(0));
                return handleMenuOption(option, userId, username);
            }

            case HELP:
                return buildHelp(username);

            case PERSONALIZED:
                return requireLogin(userId, () -> getPersonalizedRecommendations(userId, username));

            case RENTAL_HISTORY:
                return requireLogin(userId, () -> getUserRentalHistory(userId, username));

            case FAVOURITES:
                return requireLogin(userId, () -> getUserFavorites(userId, username));

            case SIMILAR:
                return requireLogin(userId, () -> getSimilarHouses(userId));

            case TRENDING:
                return getTrendingHouses();

            case NEW_LISTINGS:
                return getNewListings();

            case PRICE_COMPARISON:
                return getPriceComparison();

            case MARKET_HEALTH:
                return getMarketHealthDashboard();

            case SEASONAL:
                return getSeasonalInsights();

            case MOVE_IN_COST:
                return getMoveInCostEstimator(userMessage);

            case INVESTMENT:
                return getInvestmentAnalysis();

            case NEGOTIATION:
                return getNegotiationAdvice(userMessage);

            case AVAILABILITY:
                return getAvailabilityForecast();

            case WAITLIST:
                return requireLogin(userId, () -> getWaitlistSuggestions(userId));

            case COMPARE_HOUSES:
                return compareHousesByName(userMessage);

            case BUDGET:
                return calculateBudgetOptions(userMessage, userId);

            case CHEAPEST: {
                List<String> allLocs  = houseRepository.findDistinctLocations();
                String cheapLoc       = resolveLocation(low, allLocs, userId);
                List<House> cheapPool = cheapLoc != null
                    ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", cheapLoc)
                    : houseRepository.findByStatus("available");
                if (cheapPool == null || cheapPool.isEmpty())
                    return reply("There are no available houses right now. Check back soon — new listings are added regularly.");
                return getCheapestHouse(cheapPool, cheapLoc);
            }

            case HOUSE_SEARCH: {
                List<String> allLocations = houseRepository.findDistinctLocations();
                String matchedLocation    = resolveLocation(low, allLocations, userId);
                List<House> pool = matchedLocation != null
                    ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", matchedLocation)
                    : houseRepository.findByStatus("available");

                if (pool == null || pool.isEmpty())
                    return reply("I couldn't find any available houses"
                        + (matchedLocation != null ? " in **" + matchedLocation + "**" : "")
                        + " right now. Try a different area or check back soon.");

                boolean hasPrice   = low.matches(".*between \\$?(\\d+) and \\$?(\\d+).*") ||
                                     low.matches(".*(?:under|below) \\$?(\\d+).*");
                boolean hasBedroom = low.matches(".*\\b(\\d+)[ -]bed(room)?.*");
                boolean hasType    = low.matches(".*(apartment|villa|studio|condo).*");
                boolean hasAmenity = low.matches(
                    ".*(pool|gym|parking|pet|balcony|elevator|garden|\\bac\\b|air.?con|furnished|wifi|internet).*");

                List<House> filtered = applyFilters(pool, low, hasPrice, hasBedroom, hasType, hasAmenity);

                if (filtered.isEmpty())
                    return reply("No houses match those filters"
                        + (matchedLocation != null ? " in **" + matchedLocation + "**" : "")
                        + ". Try relaxing a constraint — for example, remove the bedroom count or adjust the price range.");

                if (userId != null) {
                    if (matchedLocation != null) lastLocation.put(userId, matchedLocation);
                    lastShownHouses.put(userId, filtered.stream().map(House::getId).limit(5).collect(Collectors.toList()));
                }
                return buildFilteredList(filtered, matchedLocation, username, low);
            }

            case UNKNOWN:
            default:
                // If the message mentions a location we don't have, give a graceful hint
                if (containsPossibleLocation(userMessage)) {
                    String guess = extractLocationFromMessage(userMessage);
                    List<String> locs = houseRepository.findDistinctLocations();
                    if (resolveLocation(low, locs, userId) == null)
                        return reply("I couldn't find any listings in **" + guess
                            + "**. Try another city name or ask me to show all available houses.");
                }
                return sendToGemini(userMessage, username, userId);
        }
    }

  

    private Map<String, String> handleMenuOption(int option, Long userId, String username) {
        switch (option) {
            case 1: return requireLogin(userId, () -> getPersonalizedRecommendations(userId, username));
            case 2: return getTrendingHouses();
            case 3: return getPriceComparison();
            case 4: return getMarketHealthDashboard();
            case 5: return requireLogin(userId, () -> getUserRentalHistory(userId, username));
            case 6: return requireLogin(userId, () -> getUserFavorites(userId, username));
            default: return buildHelp(username);
        }
    }


    private Map<String, String> buildHelp(String username) {
        long available = houseRepository.countByStatus("available");
        long rented    = houseRepository.countByStatus("rented");
        String msg =
            "# 🏠 Welcome to RentalHub, " + username + "!\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "📦 " + available + " properties available  |  🔴 " + rented + " occupied\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "1 · 💡 Personalized Picks\n"
          + "2 · 🔥 Trending Now\n"
          + "3 · 💰 Market Prices\n"
          + "4 · 📊 Market Health\n"
          + "5 · 🗂️ My Rental History\n"
          + "6 · ❤️ My Favourites\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "💬 Or just describe what you need:\n"
          + "> *\"2-bedroom apartment in Dubai under $1,200\"*\n"
          + "> *\"Cheapest villa with a pool\"*\n"
          + "> *\"Compare Sunset Villa vs Ocean Breeze\"*\n\n"
          + "Reply 1–6 or type freely 👇";
        return reply(msg);
    }

 

    private Map<String, String> getPersonalizedRecommendations(Long userId, String username) {
        List<Rent>     userRents     = rentRepository.findByUserId(userId);
        List<Favorite> userFavorites = favoriteRepository.findByUserId(userId);

        if (userRents.isEmpty() && userFavorites.isEmpty())
            return reply(
                "## 💡 Personalized Recommendations\n\n"
              + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
              + "We don't have enough data yet.\n\n"
              + "**Browse or save a few listings** and I'll tailor picks for you. 🎯");

        Map<String, Integer> locPref  = new HashMap<>();
        Map<String, Integer> typePref = new HashMap<>();
        Map<Integer, Integer> bedPref = new HashMap<>();
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

        List<House> recs = houseRepository.findAll().stream()
            .sorted(Comparator.comparingInt(
                (House h) -> calcMatchScore(h, prefLoc, prefType, prefBeds, avgPrice)).reversed())
            .limit(5).collect(Collectors.toList());

        if (recs.isEmpty())
            return reply("## 💡 Personalized Recommendations\n\nNo matching properties right now. Check back soon!");

        StringBuilder sb = new StringBuilder();
        sb.append("## 💡 Personalized Recommendations\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Based on your history:\n\n");
        sb.append("> 📍 **Location:** ").append(prefLoc).append("\n");
        sb.append("> 🏠 **Type:** ").append(prefBeds).append("-bed ").append(prefType).append("\n");
        sb.append("> 💰 **Budget:** ~$").append(fmt(avgPrice)).append("/mo\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("**Your Top Picks** 🎯\n\n");

        int rank = 1;
        for (House h : recs) {
            double matchPct = Math.min(100, calcMatchScore(h, prefLoc, prefType, prefBeds, avgPrice) * 12.5);
            sb.append("**").append(rank++).append(". ").append(h.getTitle()).append("**  ")
              .append("available".equals(h.getStatus()) ? "✅" : "🔴").append("\n");
            sb.append("📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n");
            sb.append("Match: ").append(matchBar(matchPct))
              .append(" ").append(String.format("%.0f%%", matchPct)).append("\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Want details on any of these? Just type the property name 👇");
        return reply(sb.toString());
    }

    private String matchBar(double pct) {
        int filled = (int) Math.round(pct / 10);
        return "█".repeat(filled) + "░".repeat(10 - filled);
    }

    private int calcMatchScore(House h, String loc, String type, int beds, double avgPrice) {
        int s = 0;
        if (h.getLocation().equalsIgnoreCase(loc))      s += 3;
        if (h.getPropertyType().equalsIgnoreCase(type)) s += 2;
        if (h.getNbOfBedrooms() == beds)                s += 2;
        if (Math.abs(h.getPricePerMonth() - avgPrice) < avgPrice * 0.2) s += 1;
        return s;
    }


    private Map<String, String> getUserRentalHistory(Long userId, String username) {
        List<Rent> rents = rentRepository.findByUserId(userId);
        if (rents.isEmpty())
            return reply(
                "## 🗂️ My Rental History\n\n"
              + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
              + "📭 **You haven't rented any properties yet.**\n\n"
              + "Start exploring listings and your history will appear here!");

        double total = 0, mostExpensive = 0; int count = 0;
        StringBuilder sb = new StringBuilder();
        sb.append("## 🗂️ My Rental History\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        for (Rent r : rents) {
            House  h    = r.getHouse();
            long   days = daysBetween(r.getStartDate(), r.getEndDate());
            double cost = days > 0 ? days * h.getPricePerDay() : h.getPricePerMonth();
            total += cost; count++;
            if (cost > mostExpensive) mostExpensive = cost;

            sb.append("**🏠 ").append(h.getTitle()).append("**\n");
            sb.append("┌─ 📍 ").append(h.getLocation())
              .append("  ·  🏷️ ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed\n");
            sb.append("├─ 📅 ").append(r.getStartDate()).append(" → ").append(r.getEndDate())
              .append("  (").append(days).append(" days)\n");
            sb.append("└─ 💰 **$").append(fmt(cost)).append(" total**")
              .append("  ·  $").append(fmt(h.getPricePerDay())).append("/day\n\n");
        }

        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("**📊 Summary**\n\n");
        sb.append("| Stat | Value |\n|------|-------|\n");
        sb.append("| Total bookings | ").append(count).append(" |\n");
        sb.append("| Total spent | **$").append(fmt(total)).append("** |\n");
        sb.append("| Average per booking | $").append(fmt(total / count)).append(" |\n");
        sb.append("| Highest single booking | $").append(fmt(mostExpensive)).append(" |\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💡 Want recommendations? Reply **1** or type *\"recommend me something\"*.");
        return reply(sb.toString());
    }

 

    private Map<String, String> getUserFavorites(Long userId, String username) {
        List<Favorite> favs = favoriteRepository.findByUserId(userId);
        if (favs.isEmpty())
            return reply(
                "## ❤️ My Favourites\n\n"
              + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
              + "You haven't saved any properties yet.\n\n"
              + "**Tap the ♡ icon** on any listing to save it here.");

        long available = favs.stream().filter(f -> "available".equals(f.getProperty().getStatus())).count();
        long occupied  = favs.size() - available;

        StringBuilder sb = new StringBuilder();
        sb.append("## ❤️ My Favourites\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("**").append(favs.size()).append(" saved properties**");
        sb.append("  ·  ✅ ").append(available).append(" available");
        sb.append("  ·  🔴 ").append(occupied).append(" occupied\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        favs.stream().filter(f -> "available".equals(f.getProperty().getStatus())).forEach(f -> {
            House h = f.getProperty();
            sb.append("✅ **").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n\n");
        });
        favs.stream().filter(f -> !"available".equals(f.getProperty().getStatus())).forEach(f -> {
            House h = f.getProperty();
            sb.append("🔴 **").append(h.getTitle()).append("** *(currently rented)*\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n\n");
        });

        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        if (occupied > 0)
            sb.append("⏰ Type *\"waitlist\"* to track when a rented property frees up.\n\n");
        sb.append("💡 Reply **1** for personalised picks.");
        return reply(sb.toString());
    }

 

    private Map<String, String> getSimilarHouses(Long userId) {
        List<Rent>     rents = rentRepository.findByUserId(userId);
        List<Favorite> favs  = favoriteRepository.findByUserId(userId);
        if (rents.isEmpty() && favs.isEmpty())
            return reply("Rent or save a property first, then I can find similar ones for you.");

        House ref = rents.isEmpty()
            ? favs.get(favs.size() - 1).getProperty()
            : rents.get(rents.size() - 1).getHouse();

        List<House> similar = houseRepository.findByStatus("available").stream()
            .filter(h -> !h.getId().equals(ref.getId()))
            .sorted(Comparator.comparingInt((House h) -> {
                int s = 0;
                if (h.getPropertyType().equalsIgnoreCase(ref.getPropertyType())) s += 3;
                if (h.getLocation().equalsIgnoreCase(ref.getLocation()))         s += 2;
                if (h.getNbOfBedrooms() == ref.getNbOfBedrooms())                s += 2;
                if (Math.abs(h.getPricePerMonth() - ref.getPricePerMonth()) < ref.getPricePerMonth() * 0.25) s += 1;
                return s;
            }).reversed())
            .limit(5).collect(Collectors.toList());

        if (similar.isEmpty())
            return reply("No similar properties available right now. Check back soon!");

        StringBuilder sb = new StringBuilder();
        sb.append("## 🔍 Similar Properties\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Based on **").append(ref.getTitle()).append("**:\n\n");
        int i = 1;
        for (House h : similar) {
            sb.append("**").append(i++).append(". ").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Want details? Just type the property name.");
        return reply(sb.toString());
    }


    private Map<String, String> getTrendingHouses() {
        List<Long> ids = houseRepository.findMostRentedHouseIds();
        if (ids.isEmpty())
            return reply("## 🔥 Trending Properties\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nNot enough data yet — check back soon!");

        StringBuilder sb = new StringBuilder();
        sb.append("## 🔥 Trending Properties\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Most-booked homes right now:\n\n");
        String[] medals = {"🥇","🥈","🥉","4️⃣","5️⃣"};
        int[] rank = {0};
        ids.stream().limit(5).forEach(id -> houseRepository.findById(id).ifPresent(h -> {
            long    rentals = rentRepository.countByHouseId(h.getId());
            boolean avail   = "available".equals(h.getStatus());
            String  medal   = rank[0] < medals.length ? medals[rank[0]] : (rank[0]+1)+".";
            sb.append(medal).append(" **").append(h.getTitle()).append("**  ").append(avail ? "✅" : "🔴").append("\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n");
            sb.append("   📈 Rented **").append(rentals).append(rentals==1?" time**":" times**").append("\n\n");
            rank[0]++;
        }));
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💡 Type *\"find me something like [name]\"* for similar picks.");
        return reply(sb.toString());
    }



    private Map<String, String> getNewListings() {
        List<House> houses = houseRepository.findTop10ByStatusOrderByCreatedAtDesc("available");
        if (houses.isEmpty())
            return reply("No new listings right now. Check back soon — we add properties regularly.");

        StringBuilder sb = new StringBuilder();
        sb.append("## ✨ Latest Listings\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Freshest properties just added:\n\n");
        for (House h : houses) {
            sb.append("🆕 **").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed\n");
            sb.append("   💰 $").append(fmt(h.getPricePerMonth())).append("/mo")
              .append("  ·  $").append(fmt(h.getPricePerDay())).append("/day\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("See something you like? Type the name for a full breakdown.");
        return reply(sb.toString());
    }

 

    private Map<String, String> getPriceComparison() {
        List<House> all = houseRepository.findByStatus("available");
        if (all.isEmpty())
            return reply("## 💰 Market Prices\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nNo properties available right now.");

        DoubleSummaryStatistics stats = all.stream().mapToDouble(House::getPricePerMonth).summaryStatistics();
        long budget  = all.stream().filter(h -> h.getPricePerMonth() < 800).count();
        long mid     = all.stream().filter(h -> h.getPricePerMonth() >= 800 && h.getPricePerMonth() < 1200).count();
        long premium = all.stream().filter(h -> h.getPricePerMonth() >= 1200).count();
        long total   = stats.getCount();

        String topLoc = all.stream()
            .collect(Collectors.groupingBy(House::getLocation, Collectors.counting()))
            .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A");
        String cheapestLoc = all.stream()
            .collect(Collectors.groupingBy(House::getLocation, Collectors.averagingDouble(House::getPricePerMonth)))
            .entrySet().stream().min(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A");

        String msg =
            "## 💰 Market Prices & Stats\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "**Overview — " + total + " available properties**\n\n"
          + "| Metric | Value |\n|--------|-------|\n"
          + "| 📊 Average rent | **$" + fmt(stats.getAverage()) + "/mo** |\n"
          + "| ⬇️ Lowest | $" + fmt(stats.getMin()) + "/mo |\n"
          + "| ⬆️ Highest | $" + fmt(stats.getMax()) + "/mo |\n"
          + "| 🏙️ Most listings | " + topLoc + " |\n"
          + "| 💸 Most affordable area | " + cheapestLoc + " |\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "**Price Segments**\n\n"
          + "🟢 Budget  (< $800)      " + barSegment(budget,  total, 20) + " " + budget  + "\n"
          + "🟡 Mid     ($800–$1,200) " + barSegment(mid,     total, 20) + " " + mid     + "\n"
          + "🔵 Premium (> $1,200)    " + barSegment(premium, total, 20) + " " + premium + "\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "💬 Tell me your budget — e.g. *\"budget $1,000\"*";
        return reply(msg);
    }

    private String barSegment(long part, long total, int width) {
        int filled = total == 0 ? 0 : (int) Math.round((double) part / total * width);
        return "█".repeat(filled) + "░".repeat(width - filled);
    }



    private Map<String, String> getMarketHealthDashboard() {
        long available = houseRepository.countByStatus("available");
        long rented    = houseRepository.countByStatus("rented");
        long total     = available + rented;
        if (total == 0) return reply("## 📊 Market Health\n\nNo market data available yet.");

        double vacancyRate   = (double) available / total * 100;
        double occupancyRate = 100 - vacancyRate;

        List<Double> prices = houseRepository.findByStatus("available").stream()
            .map(House::getPricePerMonth).sorted().collect(Collectors.toList());
        DoubleSummaryStatistics priceStats = prices.stream().mapToDouble(Double::doubleValue).summaryStatistics();
        double median = prices.isEmpty() ? 0
            : prices.size() % 2 == 0
                ? (prices.get(prices.size()/2-1) + prices.get(prices.size()/2)) / 2.0
                : prices.get(prices.size()/2);

        String conditionIcon, conditionLabel, advice, signalColor;
        if (vacancyRate > 30) {
            conditionIcon = "🟢"; conditionLabel = "Renter's Market";
            advice = "Plenty of choice — take your time and negotiate confidently.";
            signalColor = "🟢🟢🟢🟢🟢🟡🟡🟡🟡🟡";
        } else if (vacancyRate > 15) {
            conditionIcon = "🟡"; conditionLabel = "Balanced Market";
            advice = "Good properties move fast. Have your documents ready.";
            signalColor = "🟢🟢🟢🟡🟡🟡🟡🔴🔴🔴";
        } else {
            conditionIcon = "🔴"; conditionLabel = "Landlord's Market";
            advice = "Competition is high — act quickly when you find a great fit.";
            signalColor = "🟢🟡🔴🔴🔴🔴🔴🔴🔴🔴";
        }

        int occ10 = (int) Math.round(occupancyRate / 10);
        String occupancyBar = "█".repeat(occ10) + "░".repeat(10 - occ10);

        String msg =
            "## 📊 Market Health Dashboard\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "| | Count | Share |\n|--|-------|-------|\n"
          + "| ✅ Available | " + available + " | " + String.format("%.1f%%", vacancyRate) + " |\n"
          + "| 🔴 Occupied  | " + rented    + " | " + String.format("%.1f%%", occupancyRate) + " |\n"
          + "| 🏠 Total     | " + total     + " | 100% |\n\n"
          + "**Occupancy:** " + occupancyBar + " " + String.format("%.1f%%", occupancyRate) + "\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "| Metric | Value |\n|--------|-------|\n"
          + "| Median rent | **$" + fmt(median) + "/mo** |\n"
          + "| Lowest | $" + fmt(priceStats.getMin()) + "/mo |\n"
          + "| Highest | $" + fmt(priceStats.getMax()) + "/mo |\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "**Signal:** " + signalColor + "\n\n"
          + conditionIcon + " **" + conditionLabel + "** — " + advice + "\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "💬 Type *\"seasonal insights\"* for timing tips.";
        return reply(msg);
    }

  

    private Map<String, String> getSeasonalInsights() {
        int m = LocalDate.now().getMonthValue();
        String season, tip, priceExpect, bestAction, seasonBar;
        if (m >= 6 && m <= 8) {
            season = "Summer ☀️"; priceExpect = "📈 10–15% above average";
            tip = "Demand is at its peak. Landlords hold the upper hand.";
            bestAction = "Move quickly when you find something suitable.";
            seasonBar = "🔴🔴🔴🔴🔴 Peak demand";
        } else if (m == 12 || m <= 2) {
            season = "Winter ❄️"; priceExpect = "📉 Best deals of the year";
            tip = "Fewest renters searching — you have real leverage.";
            bestAction = "Negotiate 5–10% off or request extras (parking, furnishing).";
            seasonBar = "🟢🟢🟢🟢🟢 Buyer's advantage";
        } else if (m >= 3 && m <= 5) {
            season = "Spring 🌸"; priceExpect = "📈 Rising fast";
            tip = "Good listings disappear quickly as demand builds.";
            bestAction = "Act early. Summer prices will be 10–15% higher.";
            seasonBar = "🟡🟡🟡🟡🟡 Moderate — rising";
        } else {
            season = "Autumn 🍂"; priceExpect = "📊 Stabilising";
            tip = "Summer tenants moving out creates fresh inventory.";
            bestAction = "Good time to find well-priced properties with motivated landlords.";
            seasonBar = "🟡🟡🟡🟡🟢 Moderate — softening";
        }
        String msg =
            "## 📅 Seasonal Insights\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "**Season:** " + season + "  ·  **Signal:** " + seasonBar + "\n"
          + "**Price outlook:** " + priceExpect + "\n\n"
          + "> " + tip + "\n\n"
          + "**Best move:** " + bestAction + "\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "| Month | Demand | Tip |\n|-------|--------|-----|\n"
          + "| Jan–Feb | 🟢 Low | Best prices, most leverage |\n"
          + "| Mar–Apr | 🟡 Rising | Good choice before summer |\n"
          + "| Jun–Aug | 🔴 Peak | Most options, premium pricing |\n"
          + "| Sep–Nov | 🟡 Falling | Hidden gems as summer tenants leave |\n"
          + "| Dec | 🟢 Low | Second-best negotiating window |\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "💬 Tell me your location and budget and I'll find the best fit.";
        return reply(msg);
    }



    private Map<String, String> getMoveInCostEstimator(String message) {
        List<House> all = houseRepository.findByStatus("available");
        House target = all.stream()
            .filter(h -> message.toLowerCase().contains(h.getTitle().toLowerCase()))
            .findFirst()
            .orElseGet(() -> all.stream().min(Comparator.comparingDouble(House::getPricePerMonth)).orElse(null));
        if (target == null) return reply("No available properties to estimate right now.");

        double monthly = target.getPricePerMonth(), deposit = monthly * DEPOSIT_MONTHS;
        double utilities = target.getNbOfBedrooms() * UTILITY_PER_BEDROOM, moving = 300;
        double total = monthly + deposit + utilities + moving, buffer = monthly * 3;

        String msg =
            "## 🚛 Move-in Cost Estimator\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "**Property:** " + target.getTitle() + "  ·  " + target.getLocation() + "\n\n"
          + "| Item | Amount |\n|------|--------|\n"
          + "| 🏠 First month | $" + fmt(monthly) + " |\n"
          + "| 🔐 Deposit (×2) | $" + fmt(deposit) + " |\n"
          + "| ⚡ Est. utilities | $" + fmt(utilities) + " |\n"
          + "| 🚛 Moving costs | $" + fmt(moving) + " |\n"
          + "| **💰 Day-one total** | **$" + fmt(total) + "** |\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "💡 Keep ~**$" + fmt(buffer) + "** buffer (3 months rent) for emergencies.\n\n"
          + "**Recommended savings:** $" + fmt(total + buffer) + "\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "Need cheaper? Type *\"cheapest\"* or *\"budget $X\"*.";
        return reply(msg);
    }


    private Map<String, String> getInvestmentAnalysis() {
        List<House> all = houseRepository.findByStatus("available");
        if (all.isEmpty()) return reply("No properties available for investment analysis right now.");

        StringBuilder sb = new StringBuilder();
        sb.append("## 📈 Investment Analysis\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("*Est. purchase = 120× monthly rent. Yield above **6%** is solid.*\n\n");

        all.stream().sorted(Comparator.comparingDouble(House::getPricePerMonth).reversed()).limit(5).forEach(h -> {
            double monthly = h.getPricePerMonth(), annual = monthly * 12;
            double estValue = monthly * 120, grossYield = annual / estValue * 100;
            double payback = estValue / annual;
            String signal = grossYield >= GOOD_YIELD_THRESHOLD * 100 ? "🟢 Good" : "🟡 Average";
            sb.append("**").append(h.getTitle()).append("**\n");
            sb.append("| Metric | Value |\n|--------|-------|\n");
            sb.append("| Monthly | $").append(fmt(monthly)).append(" |\n");
            sb.append("| Annual income | $").append(fmt(annual)).append(" |\n");
            sb.append("| Est. value | $").append(fmt(estValue)).append(" |\n");
            sb.append("| Gross yield | **").append(String.format("%.1f%%", grossYield)).append("** ").append(signal).append(" |\n");
            sb.append("| Payback | ").append(String.format("%.1f", payback)).append(" yrs |\n\n");
        });
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💬 Ask about a specific property for a tailored breakdown.");
        return reply(sb.toString());
    }


    private Map<String, String> getNegotiationAdvice(String message) {
        List<House> all = houseRepository.findByStatus("available");
        House target = all.stream()
            .filter(h -> message.toLowerCase().contains(h.getTitle().toLowerCase()))
            .findFirst().orElse(null);
        double avg = all.stream().mapToDouble(House::getPricePerMonth).average().orElse(0);

        StringBuilder sb = new StringBuilder();
        sb.append("## 🤝 Negotiation Guide\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        if (target != null) {
            double price = target.getPricePerMonth(), diff = price - avg;
            double offer = price * 0.92;
            sb.append("**Property:** ").append(target.getTitle()).append("\n\n");
            sb.append("| | Value |\n|-|-------|\n");
            sb.append("| Listed | $").append(fmt(price)).append("/mo |\n");
            sb.append("| Market avg | $").append(fmt(avg)).append("/mo |\n");
            sb.append("| Diff | ").append(diff > 0 ? "+" : "").append("$").append(fmt(diff)).append("/mo |\n");
            sb.append("| **Opening offer** | **$").append(fmt(offer)).append("/mo** |\n\n");
            sb.append(diff > 0
                ? "📊 **$" + fmt(diff) + " above market** — solid leverage. 💪\n\n"
                : "📊 **Below market average** — still worth trying.\n\n");
        } else {
            sb.append("**Market avg: $").append(fmt(avg)).append("/mo**\n\n");
            sb.append("Start 8–10% below asking and work up.\n\n");
        }

        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("**Playbook**\n\n");
        sb.append("1. 💬 Open **8–10% below** asking\n");
        sb.append("2. 📅 Offer **12+ month lease** — landlords love stability\n");
        sb.append("3. 💵 **2–3 months upfront** — often unlocks 5% off\n");
        sb.append("4. 🔧 Point out **maintenance issues** as leverage\n");
        sb.append("5. ❄️ **Nov–Feb** — landlords most motivated\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💡 The worst they can say is no — always try!");
        return reply(sb.toString());
    }



    private Map<String, String> getAvailabilityForecast() {
        List<Rent> activeRents = rentRepository.findAll().stream()
            .filter(r -> r.getEndDate() != null && r.getEndDate().isAfter(LocalDate.now()))
            .sorted(Comparator.comparing(Rent::getEndDate)).limit(10).collect(Collectors.toList());
        if (activeRents.isEmpty())
            return reply("No upcoming lease end dates found right now. Check back soon.");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy");
        StringBuilder sb = new StringBuilder();
        sb.append("## 📆 Availability Forecast\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Coming available soon:\n\n");

        for (Rent r : activeRents) {
            House h    = r.getHouse();
            long  days = ChronoUnit.DAYS.between(LocalDate.now(), r.getEndDate());
            String urgency = days <= 7  ? "🟢 Very soon — contact now!"
                           : days <= 30 ? "🟡 Within a month"
                           : "🔵 In " + days + " days";
            sb.append("**").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation()).append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n");
            sb.append("   🗓️ Free from **").append(r.getEndDate().format(dtf)).append("**  ").append(urgency).append("\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💡 Contact landlord **2 weeks before** end date for best chance of securing it.");
        return reply(sb.toString());
    }



    private Map<String, String> getWaitlistSuggestions(Long userId) {
        List<Favorite> favs     = favoriteRepository.findByUserId(userId);
        List<House>    occupied = favs.stream().map(Favorite::getProperty)
            .filter(h -> !"available".equals(h.getStatus())).collect(Collectors.toList());

        if (occupied.isEmpty())
            return reply(
                "## ⏰ Waitlist\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
              + "🎉 **All your saved properties are currently available!**\n\n"
              + "Browse with option **6** or type *\"my favourites\"*.");

        StringBuilder sb = new StringBuilder();
        sb.append("## ⏰ Waitlist — Properties to Watch\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        for (House h : occupied) {
            Rent lr = rentRepository.findTopByHouseIdOrderByEndDateDesc(h.getId());
            sb.append("**🔴 ").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation()).append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n");
            if (lr != null && lr.getEndDate() != null) {
                long days = ChronoUnit.DAYS.between(LocalDate.now(), lr.getEndDate());
                if (days >= 0) {
                    String urgency = days <= 14 ? "🟢 Contact NOW — very soon"
                                   : days <= 30 ? "🟡 ~" + days + " days"
                                   : "🔵 ~" + days + " days";
                    sb.append("   ⏳ ").append(urgency).append("\n");
                }
            }
            sb.append("\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("📬 **Reaching out early** greatly increases your chances. Landlords prefer proactive tenants.");
        return reply(sb.toString());
    }

  

    private Map<String, String> compareHousesByName(String message) {
        Pattern p = Pattern.compile("compare\\s+(.+?)\\s+(?:and|vs\\.?|versus)\\s+(.+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(message);
        if (!m.find())
            return reply("Try: *\"Compare Sunset Villa and Ocean Breeze\"*");

        String nameA = m.group(1).trim(), nameB = m.group(2).trim();
        List<House> all = houseRepository.findAll();
        House houseA = all.stream().filter(h -> h.getTitle().toLowerCase().contains(nameA.toLowerCase())).findFirst().orElse(null);
        House houseB = all.stream().filter(h -> h.getTitle().toLowerCase().contains(nameB.toLowerCase())).findFirst().orElse(null);

        if (houseA == null && houseB == null) return reply("Neither property found. Check the names.");
        if (houseA == null) return reply("Couldn't find **\"" + nameA + "\"**. Check the name.");
        if (houseB == null) return reply("Couldn't find **\"" + nameB + "\"**. Check the name.");

        House winner = houseA.getPricePerMonth() <= houseB.getPricePerMonth() ? houseA : houseB;
        double priceDiff = Math.abs(houseA.getPricePerMonth() - houseB.getPricePerMonth());

        StringBuilder sb = new StringBuilder();
        sb.append("## ⚖️ Side-by-Side Comparison\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("| | **").append(houseA.getTitle()).append("** | **").append(houseB.getTitle()).append("** |\n");
        sb.append("|---|:---:|:---:|\n");
        sb.append("| 📍 Location | ").append(houseA.getLocation()).append(" | ").append(houseB.getLocation()).append(" |\n");
        sb.append("| 🏠 Type | ").append(houseA.getPropertyType()).append(" | ").append(houseB.getPropertyType()).append(" |\n");
        sb.append("| 🛏️ Beds | ").append(houseA.getNbOfBedrooms()).append(" | ").append(houseB.getNbOfBedrooms()).append(" |\n");
        sb.append("| 💰 Monthly | **$").append(fmt(houseA.getPricePerMonth())).append("** | **$").append(fmt(houseB.getPricePerMonth())).append("** |\n");
        sb.append("| 📅 Daily | $").append(fmt(houseA.getPricePerDay())).append(" | $").append(fmt(houseB.getPricePerDay())).append(" |\n");
        sb.append("| 📊 Status | ").append("available".equals(houseA.getStatus()) ? "✅" : "🔴")
          .append(" | ").append("available".equals(houseB.getStatus()) ? "✅" : "🔴").append(" |\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("🏆 **Better value: ").append(winner.getTitle()).append("**\n");
        sb.append("   Saves **$").append(fmt(priceDiff)).append("/mo = $").append(fmt(priceDiff * 12)).append("/year**");
        return reply(sb.toString());
    }


    private Map<String, String> calculateBudgetOptions(String message, Long userId) {
        Matcher m = Pattern.compile("\\$?(\\d+(?:,\\d{3})*)").matcher(message);
        if (!m.find()) return reply("Include a number — e.g. *\"my budget is $1,200\"*");

        double budget = Double.parseDouble(m.group(1).replace(",", ""));
        String loc    = userId != null ? lastLocation.get(userId) : null;

        List<House> pool = loc != null
            ? houseRepository.findByStatusAndLocationContainingIgnoreCase("available", loc)
            : houseRepository.findByStatus("available");

        List<House> within = pool.stream()
            .filter(h -> h.getPricePerMonth() <= budget)
            .sorted(Comparator.comparingDouble(House::getPricePerMonth).reversed())
            .limit(5).collect(Collectors.toList());

        if (within.isEmpty())
            return reply("## 🔍 Budget — $" + fmt(budget) + "/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                + "No houses within that budget" + (loc != null ? " in " + loc : "") + ".\n\n"
                + "Try bumping 10–15% or searching a different area.");

        double avgMarket = pool.stream().mapToDouble(House::getPricePerMonth).average().orElse(0);
        StringBuilder sb = new StringBuilder();
        sb.append("## 🔍 Budget Match — $").append(fmt(budget)).append("/mo\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("Found **").append(within.size()).append(within.size()==1?" property":" properties").append("**");
        if (loc != null) sb.append(" in **").append(loc).append("**");
        sb.append("  ·  Market avg: **$").append(fmt(avgMarket)).append("/mo**\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        for (House h : within) {
            double saving = budget - h.getPricePerMonth();
            sb.append("✅ **").append(h.getTitle()).append("**\n");
            sb.append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed\n");
            sb.append("   💰 **$").append(fmt(h.getPricePerMonth())).append("/mo**")
              .append("  ·  saves **$").append(fmt(saving)).append("/mo**\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💡 Want a move-in breakdown? Just ask!");
        return reply(sb.toString());
    }

  
 

    private List<House> applyFilters(List<House> pool, String low,
            boolean hasPrice, boolean hasBedroom, boolean hasType, boolean hasAmenity) {
        List<House> result = new ArrayList<>(pool);

        Matcher rangeMatcher = Pattern.compile("between \\$?(\\d+) and \\$?(\\d+)").matcher(low);
        if (rangeMatcher.find()) {
            double min = Double.parseDouble(rangeMatcher.group(1));
            double max = Double.parseDouble(rangeMatcher.group(2));
            result = result.stream().filter(h -> h.getPricePerMonth() >= min && h.getPricePerMonth() <= max).collect(Collectors.toList());
        }
        Matcher underMatcher = Pattern.compile("(?:under|below|less than|max|maximum) \\$?(\\d+)").matcher(low);
        if (underMatcher.find()) {
            double max = Double.parseDouble(underMatcher.group(1));
            result = result.stream().filter(h -> h.getPricePerMonth() <= max).collect(Collectors.toList());
        }
        Matcher bedMatcher = Pattern.compile("(\\d+)[- ]bed(room)?s?").matcher(low);
        if (bedMatcher.find()) {
            int beds = Integer.parseInt(bedMatcher.group(1));
            result = result.stream().filter(h -> h.getNbOfBedrooms() == beds).collect(Collectors.toList());
        }
        if (low.contains("apartment"))   result = filterType(result, "Apartment");
        else if (low.contains("villa"))  result = filterType(result, "Villa");
        else if (low.contains("studio")) result = filterType(result, "Studio");
        else if (low.contains("condo"))  result = filterType(result, "Condo");

        if (hasAmenity) {
            List<String> wanted = new ArrayList<>();
            if (low.contains("pool"))      wanted.add("pool");
            if (low.contains("gym"))       wanted.add("gym");
            if (low.contains("parking"))   wanted.add("parking");
            if (low.contains("pet"))       wanted.add("pet");
            if (low.contains("balcony"))   wanted.add("balcony");
            if (low.contains("elevator"))  wanted.add("elevator");
            if (low.contains("garden"))    wanted.add("garden");
            if (low.contains("furnished")) wanted.add("furnished");
            if (low.contains("wifi") || low.contains("internet")) wanted.add("wifi");
            if (low.contains("ac") || low.contains("air con"))    wanted.add("ac");
            if (!wanted.isEmpty()) {
                result = result.stream().filter(h -> {
                    String desc = h.getDescription() == null ? "" : h.getDescription().toLowerCase();
                    return wanted.stream().anyMatch(desc::contains);
                }).collect(Collectors.toList());
            }
        }
        return result;
    }

    private List<House> filterType(List<House> list, String type) {
        return list.stream().filter(h -> h.getPropertyType().equalsIgnoreCase(type)).collect(Collectors.toList());
    }

    private Map<String, String> buildFilteredList(List<House> filtered, String location, String username, String low) {
        List<String> activeFilters = new ArrayList<>();
        if (location != null)          activeFilters.add("📍 " + location);
        if (low.contains("apartment")) activeFilters.add("🏠 Apartments");
        if (low.contains("villa"))     activeFilters.add("🏠 Villas");
        if (low.contains("studio"))    activeFilters.add("🏠 Studios");
        if (low.contains("condo"))     activeFilters.add("🏠 Condos");

        Matcher bedM = Pattern.compile("(\\d+)[- ]bed").matcher(low);
        if (bedM.find()) activeFilters.add("🛏️ " + bedM.group(1) + " bedrooms");
        Matcher underM = Pattern.compile("(?:under|below) \\$?(\\d+)").matcher(low);
        if (underM.find()) activeFilters.add("💰 under $" + underM.group(1));
        Matcher rangeM = Pattern.compile("between \\$?(\\d+) and \\$?(\\d+)").matcher(low);
        if (rangeM.find()) activeFilters.add("💰 $" + rangeM.group(1) + "–$" + rangeM.group(2));

        StringBuilder sb = new StringBuilder();
        sb.append("## 🔍 Search Results\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        if (!activeFilters.isEmpty())
            sb.append("**Filters:** ").append(String.join("  ·  ", activeFilters)).append("\n");
        sb.append("**").append(filtered.size()).append(filtered.size()==1?" property":" properties").append(" found**\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        filtered.stream().limit(6).forEach(h ->
            sb.append("✅ **").append(h.getTitle()).append("**\n")
              .append("   📍 ").append(h.getLocation())
              .append("  ·  🏠 ").append(h.getPropertyType())
              .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
              .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo")
              .append("  ·  $").append(fmt(h.getPricePerDay())).append("/day\n\n")
        );

        if (filtered.size() > 6)
            sb.append("*...and **").append(filtered.size()-6).append(" more**. Add a filter to narrow down.*\n\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💬 Refine: *\"under $1,000\"*, *\"2 bedrooms\"*, *\"with pool\"*");
        return reply(sb.toString());
    }

    private Map<String, String> getCheapestHouse(List<House> houses, String location) {
        List<House> cheapest = houses.stream()
            .sorted(Comparator.comparingDouble(House::getPricePerMonth)).limit(3).collect(Collectors.toList());
        if (cheapest.isEmpty()) return reply("No houses found.");

        House top = cheapest.get(0);
        StringBuilder sb = new StringBuilder();
        sb.append("## 💸 Most Affordable\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        if (location != null) sb.append("In **").append(location).append("**:\n\n");
        sb.append("🏆 **").append(top.getTitle()).append("**\n");
        sb.append("   📍 ").append(top.getLocation())
          .append("  ·  🏠 ").append(top.getPropertyType())
          .append("  ·  🛏️ ").append(top.getNbOfBedrooms()).append(" bed\n");
        sb.append("   💰 **$").append(fmt(top.getPricePerMonth())).append("/mo**")
          .append("  ·  $").append(fmt(top.getPricePerDay())).append("/day\n");
        sb.append("   🔐 Move-in est: **$").append(fmt(top.getPricePerMonth() * (1 + DEPOSIT_MONTHS))).append("**\n\n");

        if (cheapest.size() > 1) {
            sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**Also affordable:**\n\n");
            for (int i = 1; i < cheapest.size(); i++) {
                House h = cheapest.get(i);
                sb.append(i+1).append(". **").append(h.getTitle()).append("**\n");
                sb.append("   📍 ").append(h.getLocation())
                  .append("  ·  🛏️ ").append(h.getNbOfBedrooms()).append(" bed")
                  .append("  ·  💰 $").append(fmt(h.getPricePerMonth())).append("/mo\n\n");
            }
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        sb.append("💬 Type *\"move-in cost\"* or *\"budget $X\"* for more detail.");
        return reply(sb.toString());
    }

    

    private Map<String, String> sendToGemini(String userMessage, String username, Long userId) {
        try {
            long available  = houseRepository.countByStatus("available");
            String ctxLoc   = userId != null ? lastLocation.getOrDefault(userId, "not specified") : "not specified";
            String fullPrompt =
                "You are a knowledgeable, friendly rental assistant for RentalHub. "
              + "There are currently " + available + " available properties. "
              + "The user's last searched location is: " + ctxLoc + ". "
              + "Reply directly and helpfully — no greetings, no filler. "
              + "Use markdown (bold, lists) where it helps clarity. Be warm and concise.\n\n"
              + "User: " + userMessage;

            Map<String, Object> body = Map.of("contents",
                List.of(Map.of("role", "user", "parts", List.of(Map.of("text", fullPrompt)))));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = new RestTemplate().exchange(
                GEMINI_API_URL + apiKey, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");

            String cleaned = parts.get(0).get("text")
                .replaceAll("(?i)^(hi|hello|hey)[^\\n]*\\n+", "")
                .replaceAll("(?i)^(sure|of course|absolutely)[^\\n]*\\n+", "")
                .trim();
            return reply(cleaned);
        } catch (Exception e) {
            e.printStackTrace();
            return reply("Something went wrong. Try describing what you're looking for and I'll do my best to help.");
        }
    }

  

    private String resolveLocation(String low, List<String> allLocations, Long userId) {
        for (String loc : allLocations)
            if (low.contains(loc.toLowerCase())) return loc;
        if ((low.contains("near me") || low.contains("around here") || low.contains("nearby")) && userId != null)
            return lastLocation.get(userId);
        return null;
    }

    private Map<String, String> reply(String text) { return Map.of("reply", text); }

    private Map<String, String> requireLogin(Long userId, java.util.function.Supplier<Map<String, String>> action) {
        if (userId == null)
            return reply("🔒 You need to be logged in for this feature. Sign in and try again!");
        try   { return action.get(); }
        catch (Exception e) { return reply("Something went wrong: " + e.getMessage()); }
    }

    private String fmt(double v) {
        return v == Math.floor(v) ? String.format("%.0f", v) : String.format("%.2f", v);
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
        return map.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
    }

    private int topInt(Map<Integer, Integer> map) {
        return map.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(2);
    }

    private boolean containsPossibleLocation(String msg) {
        return msg.toLowerCase().matches(".*\\b(in|at)\\s+\\w+.*");
    }

    private String extractLocationFromMessage(String msg) {
        Matcher m = Pattern.compile("\\b(?:in|at)\\s+([a-zA-Z\\s]+)").matcher(msg.toLowerCase());
        return m.find() ? m.group(1).trim() : "the specified location";
    }
}