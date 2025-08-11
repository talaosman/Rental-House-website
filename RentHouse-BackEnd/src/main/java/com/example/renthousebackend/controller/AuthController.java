
package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.service.EmailService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import com.example.renthousebackend.payload.UserUpdateRequest;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000") // Allow frontend access from React
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private EmailService emailService;

    // In-memory OTP storage (for demo)
    private Map<String, String> otpStore = new ConcurrentHashMap<>();

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        otpStore.put(email, otp);
        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok("OTP sent to email");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("otp");

        String expected = otpStore.get(email);
        if (expected != null && expected.equals(code)) {
            otpStore.remove(email); // clear OTP

            Optional<User> userOpt = userRepo.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();

                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("role", user.getRole());
                response.put("email", user.getEmail());
                response.put("password", user.getPassword());
                response.put("username", user.getUsername());
                response.put("phoneNumber", user.getPhoneNumber());
                response.put("profileImage", user.getProfileImage());

                return ResponseEntity.ok(response); // ✅ return user data
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found after OTP verification");
            }
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid OTP");
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userRepo.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("User already exists");
        }

        // Encode password before saving
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // Default role to USER if not set
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }

        userRepo.save(user);

        Map<String, Object> response = new HashMap<>();

        response.put("id", user.getId());
        response.put("role", user.getRole());
        response.put("email", user.getEmail());
        response.put("password", user.getPassword());
        response.put("username", user.getUsername());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profileImage", user.getProfileImage());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        Optional<User> userOpt = userRepo.findByEmail(loginRequest.getEmail());

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        // ✅ Return role and any other user info
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Sign in successful");
        response.put("id", user.getId());
        response.put("role", user.getRole());
        response.put("email", user.getEmail());
        response.put("password", user.getPassword());
        response.put("username", user.getUsername());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profileImage", user.getProfileImage());
        // this will be "ADMIN" or "USER"
        return ResponseEntity.ok(response);
    }

}
