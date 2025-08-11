package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.payload.UserUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

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
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String loggedInEmail = auth.getName();

            Optional<User> userOpt = userRepo.findByEmail(loggedInEmail);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setUsername(request.getUsername());
                user.setEmail(request.getEmail());

                if (request.getPassword() != null && !request.getPassword().isEmpty()) {
                    user.setPassword(passwordEncoder.encode(request.getPassword()));
                }

                user.setPhoneNumber(request.getPhoneNumber());

                if (request.getProfileImage() != null && !request.getProfileImage().isEmpty()) {
                    user.setProfileImage(request.getProfileImage());
                }

                userRepo.save(user);
                return ResponseEntity.ok("User updated successfully");
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        } catch (Exception e) {
            // Log the error (or print stack trace)
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating user: " + e.getMessage());
        }
    }
}
