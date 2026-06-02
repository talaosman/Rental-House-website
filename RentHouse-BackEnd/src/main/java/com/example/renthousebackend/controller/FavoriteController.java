package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Favorite;
import com.example.renthousebackend.entity.Feedback;
import com.example.renthousebackend.service.FavoriteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService;

    
   
    @PostMapping("/add")
    public Favorite addFavorite(@RequestParam Long userId, @RequestParam Long propertyId) {
        return favoriteService.addFavorite(userId, propertyId);
    }

  
    @DeleteMapping("/remove")
    public void removeFavorite(@RequestParam Long userId, @RequestParam Long propertyId) {
        favoriteService.removeFavorite(userId, propertyId);
    }


    @GetMapping("/user/{userId}")
    public List<Favorite> getUserFavorites(@PathVariable Long userId) {
        return favoriteService.getUserFavorites(userId);
    }
}
