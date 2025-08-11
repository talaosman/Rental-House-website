package com.example.renthousebackend.service;

import com.example.renthousebackend.entity.Favorite;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.repository.FavoriteRepository;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.repository.HouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FavoriteService {

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseRepository propertyRepository;

    public Favorite addFavorite(Long userId, Long propertyId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        House property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new RuntimeException("Property not found"));

        Optional<Favorite> existing = favoriteRepository.findByUserAndProperty(user, property);
        if(existing.isPresent()) {
            return existing.get();  // already favorite, no duplicates
        }

        Favorite favorite = new Favorite(user, property);
        return favoriteRepository.save(favorite);
    }

    public void removeFavorite(Long userId, Long propertyId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        House property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new RuntimeException("Property not found"));

        Optional<Favorite> existing = favoriteRepository.findByUserAndProperty(user, property);
        existing.ifPresent(favoriteRepository::delete);
    }

    public List<Favorite> getUserFavorites(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return favoriteRepository.findAllByUser(user);
    }
}
