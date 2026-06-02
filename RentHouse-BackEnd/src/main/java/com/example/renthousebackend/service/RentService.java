package com.example.renthousebackend.service;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Offer;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.OfferRepository;
import com.example.renthousebackend.repository.RentRepository;
import com.example.renthousebackend.repository.UserRepository;

@Service
public class RentService {

    @Autowired
    private RentRepository rentRepository;

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OfferRepository offerRepository;

    public Rent getCurrentRent(House house) {
        LocalDate today = LocalDate.now();
        return rentRepository
                .findFirstByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, today, today)
                .orElse(null);
    }

    public Rent getLastRent(House house) {
        return rentRepository.findTopByHouseIdOrderByEndDateDesc(house.getId());
    }

    @Transactional
    public Rent rentHouse(Long userId, Long houseId, LocalDate startDate, LocalDate endDate) {

        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (isHouseRentedDuring(house, startDate, endDate)) {
            throw new RuntimeException("House already rented during this period.");
        }

        double finalPrice = house.getPricePerMonth();
        boolean offerApplied = false;

        List<Offer> userOffers = offerRepository.findByUserIdAndUsedFalse(userId);
        for (Offer offer : userOffers) {
            boolean valid = offer.isActive()
                    && offer.getExpiryDate().isAfter(LocalDate.now())
                    && (!offer.isSameOwnerOnly()
                    || offer.getHouse() == null
                    || offer.getHouse().getOwner().getId().equals(house.getOwner().getId()))
                    && (offer.getHouse() == null || offer.getHouse().getId().equals(houseId));

            if (valid) {
                finalPrice = finalPrice * (1 - offer.getDiscountPercentage() / 100.0);
                offer.setUsed(true);
                offerRepository.save(offer);
                offerApplied = true;
                break;
            }
        }

        if (!offerApplied) {
            List<Offer> ownerOffers = offerRepository.findAll().stream()
                    .filter(o -> o.getUser() == null // owner-created (no specific user target)
                    && o.getHouse() != null
                    && o.getHouse().getId().equals(houseId) // for this house specifically
                    && o.isActive()
                    && !o.isUsed()
                    && o.getExpiryDate().isAfter(LocalDate.now()))
                    .toList();

            if (!ownerOffers.isEmpty()) {
                Offer ownerOffer = ownerOffers.get(0); // take the first valid one
                finalPrice = finalPrice * (1 - ownerOffer.getDiscountPercentage() / 100.0);
                // NOTE: Owner offers are NOT marked used — they can apply to multiple renters.
                // If you want single-use owner offers, uncomment:
                // ownerOffer.setUsed(true);
                // offerRepository.save(ownerOffer);
            }
        }

        long rentsBefore = rentRepository.findByUser(user).size();

        Rent rent = new Rent();
        rent.setHouse(house);
        rent.setUser(user);
        rent.setStartDate(startDate);
        rent.setEndDate(endDate);
        rent.setTotalPrice(finalPrice);

        Rent savedRent = rentRepository.save(rent);

        house.setStatus("rented");
        houseRepository.saveAndFlush(house);

        user.setPoints(user.getPoints() + 10);

        long totalRentsAfter = rentsBefore + 1;
        if (totalRentsAfter % 3 == 0) {
            Offer newOffer = new Offer();
            newOffer.setUser(user);
            newOffer.setDiscountPercentage(20);
            newOffer.setExpiryDate(LocalDate.now().plusDays(30));
            newOffer.setSameOwnerOnly(true);
            newOffer.setActive(true);
            newOffer.setUsed(false);
            newOffer.setHouse(house);   // same owner's properties
            newOffer.setMinPoints(0);
            offerRepository.save(newOffer);
        }

        userRepository.save(user);
        return savedRent;
    }

    public boolean isHouseCurrentlyRented(House house) {
        LocalDate today = LocalDate.now();
        return rentRepository
                .existsByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, today, today);
    }

    public boolean isHouseRentedDuring(House house, LocalDate startDate, LocalDate endDate) {
        return rentRepository
                .existsByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(house, endDate, startDate);
    }

    public List<Rent> getRentsByHouse(Long houseId) {
        House house = houseRepository.findById(houseId)
                .orElseThrow(() -> new RuntimeException("House not found"));
        return rentRepository.findByHouse(house);
    }

    public List<Rent> getRentsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return rentRepository.findByUser(user);
    }

    public long countAllRents() {
        return rentRepository.count();
    }

    public long countActiveRents() {
        return rentRepository.countByEndDateGreaterThanEqualAndStartDateLessThanEqual(
                LocalDate.now(), LocalDate.now());
    }

    public Rent getNextFutureRent(House house) {
        LocalDate today = LocalDate.now();
        return rentRepository.findByHouse(house).stream()
                .filter(r -> r.getEndDate() != null && !r.getEndDate().isBefore(today))
                .min(java.util.Comparator.comparing(Rent::getStartDate))
                .orElse(null);
    }
}
