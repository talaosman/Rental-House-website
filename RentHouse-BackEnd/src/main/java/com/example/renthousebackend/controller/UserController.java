package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.payload.UserUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PutMapping("/update")
    public ResponseEntity<?> updateUser(@RequestBody UserUpdateRequest request) {
        try {
           
            Optional<User> userOpt = userRepo.findById(request.getUserId());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            User user = userOpt.get();
            if (request.getUsername() != null && !request.getUsername().isEmpty()) {
                user.setUsername(request.getUsername());
            }

            if (request.getEmail() != null && !request.getEmail().isEmpty()) {
                user.setEmail(request.getEmail());
            }

            if (request.getPassword() != null && !request.getPassword().isEmpty()) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            }

            if (request.getPhoneNumber() != null) {
                user.setPhoneNumber(request.getPhoneNumber());
            }

            if (request.getProfileImage() != null && !request.getProfileImage().isEmpty()) {
                user.setProfileImage(request.getProfileImage());
            }

            userRepo.save(user);
            return ResponseEntity.ok("User updated successfully");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating user: " + e.getMessage());
        }
    }
}
