package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Rating;
import com.example.renthousebackend.repository.RatingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "http://localhost:3000")
public class RatingController {

    @Autowired
    private RatingRepository ratingRepository;

    @GetMapping
    public List<Rating> getAllRatings() {
        return ratingRepository.findAll();
    }

    @PostMapping("/add")
    public Rating addRating(@RequestParam Long userId,
            @RequestParam Long houseId,
            @RequestParam int stars,
            @RequestParam(required = false) String comment) {
        Rating rating = new Rating();
        rating.setStars(stars);
        rating.setComment(comment);

        // only attach IDs without loading whole object
        rating.setUser(new com.example.renthousebackend.entity.User());
        rating.getUser().setId(userId);

        rating.setHouse(new com.example.renthousebackend.entity.House());
        rating.getHouse().setId(houseId);

        return ratingRepository.save(rating);
    }

    @GetMapping("/house/{houseId}")
    public List<Rating> getRatingsByHouse(@PathVariable Long houseId) {
        return ratingRepository.findByHouseId(houseId);
    }

}
