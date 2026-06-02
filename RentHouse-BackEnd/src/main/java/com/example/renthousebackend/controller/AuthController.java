package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.service.EmailService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import com.example.renthousebackend.payload.UserUpdateRequest;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.core.Authentication;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // Shared OTP store for both signup verification and password reset
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
        String code  = request.get("otp");
        String expected = otpStore.get(email);
        if (expected != null && expected.equals(code)) {
            otpStore.remove(email);
            Optional<User> userOpt = userRepo.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                Map<String, Object> response = new HashMap<>();
                response.put("id",          user.getId());
                response.put("role",        user.getRole());
                response.put("email",       user.getEmail());
                response.put("password",    user.getPassword());
                response.put("username",    user.getUsername());
                response.put("phoneNumber", user.getPhoneNumber());
                response.put("profileImage",user.getProfileImage());
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found after OTP verification");
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid OTP");
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userRepo.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }
        userRepo.save(user);
        Map<String, Object> response = new HashMap<>();
        response.put("id",          user.getId());
        response.put("role",        user.getRole());
        response.put("email",       user.getEmail());
        response.put("password",    user.getPassword());
        response.put("username",    user.getUsername());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profileImage",user.getProfileImage());
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
        Map<String, Object> response = new HashMap<>();
        response.put("message",     "Sign in successful");
        response.put("id",          user.getId());
        response.put("role",        user.getRole());
        response.put("email",       user.getEmail());
        response.put("password",    user.getPassword());
        response.put("username",    user.getUsername());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profileImage",user.getProfileImage());
        return ResponseEntity.ok(response);
    }

   

    // Separate store so reset codes don't collide with signup OTPs
    private Map<String, String> resetCodeStore = new ConcurrentHashMap<>();

   
    @PostMapping("/forgot-password/send-code")
    public ResponseEntity<?> sendResetCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        Optional<User> userOpt = userRepo.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            // Return 200 with a vague message — don't reveal whether the email exists
            return ResponseEntity.ok(Map.of("message", "If this email is registered, a code has been sent."));
        }

        String code = String.valueOf(new Random().nextInt(900000) + 100000);
        resetCodeStore.put(email.trim().toLowerCase(), code);

        // Send a branded HTML email
        String html = "<div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;'>"
            + "<div style='background: #2563eb; padding: 28px 32px; border-radius: 12px 12px 0 0;'>"
            + "<h2 style='color: white; margin: 0; font-size: 22px;'>🔑 Reset Your Password</h2>"
            + "</div>"
            + "<div style='background: #ffffff; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;'>"
            + "<p style='color: #334155; font-size: 15px;'>We received a request to reset the password for your <strong>RentalHub</strong> account.</p>"
            + "<p style='color: #334155; font-size: 15px;'>Use the verification code below. It is valid for <strong>15 minutes</strong>.</p>"
            + "<div style='text-align: center; margin: 28px 0;'>"
            + "<span style='font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #2563eb; "
            + "background: #eff6ff; padding: 16px 24px; border-radius: 10px; border: 2px solid #bfdbfe; display: inline-block;'>"
            + code
            + "</span>"
            + "</div>"
            + "<p style='color: #64748b; font-size: 13px;'>If you did not request a password reset, you can safely ignore this email.</p>"
            + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'>"
            + "<p style='color: #94a3b8; font-size: 12px; margin: 0;'>RentalHub · Sent to " + email + "</p>"
            + "</div>"
            + "</div>";

        emailService.sendHtmlEmail(email, "Reset Your RentalHub Password", html);

        return ResponseEntity.ok(Map.of("message", "Reset code sent to your email."));
    }

  
    @PostMapping("/forgot-password/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestBody Map<String, String> body) {
        String email    = (body.get("email")    != null) ? body.get("email").trim().toLowerCase()    : "";
        String code     = (body.get("code")     != null) ? body.get("code").trim()     : "";

        if (email.isEmpty() || code.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and code are required"));
        }

        String stored = resetCodeStore.get(email);
        if (stored == null || !stored.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or expired verification code"));
        }

        return ResponseEntity.ok(Map.of("verified", true));
    }

   
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email           = (body.get("email")           != null) ? body.get("email").trim().toLowerCase()           : "";
        String code            = (body.get("code")            != null) ? body.get("code").trim()            : "";
        String newPassword     = (body.get("newPassword")     != null) ? body.get("newPassword")     : "";
        String confirmPassword = (body.get("confirmPassword") != null) ? body.get("confirmPassword") : "";

        if (email.isEmpty() || code.isEmpty() || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email, code, and new password are required"));
        }

        // Re-validate code
        String stored = resetCodeStore.get(email);
        if (stored == null || !stored.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or expired verification code"));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);

        // Consume the code so it cannot be reused
        resetCodeStore.remove(email);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now sign in."));
    }

   

    @RestController
    @RequestMapping("/api/auth/oauth2")
    public class OAuth2UserController {

        private final UserRepository userRepo;
        private final PasswordEncoder passwordEncoder;

        public OAuth2UserController(UserRepository userRepo, PasswordEncoder passwordEncoder) {
            this.userRepo        = userRepo;
            this.passwordEncoder = passwordEncoder;
        }

        @GetMapping("/user")
        public ResponseEntity<?> getOAuth2User(Authentication authentication) {
            if (authentication == null) {
                return ResponseEntity.status(401).body("Not authenticated");
            }
            Object principalObj = authentication.getPrincipal();
            if (!(principalObj instanceof OAuth2User)) {
                return ResponseEntity.status(401).body("Not an OAuth2 user");
            }
            OAuth2User oauthUser = (OAuth2User) principalObj;
            String email = oauthUser.getAttribute("email");
            if (email == null || email.isEmpty()) {
                email = oauthUser.getAttribute("login") + "@github.local";
            }
            Optional<User> existingUser = userRepo.findByEmail(email);
            User user;
            if (existingUser.isPresent()) {
                user = existingUser.get();
            } else {
                String rawPassword     = UUID.randomUUID().toString().substring(0, 8);
                String encodedPassword = passwordEncoder.encode(rawPassword);
                user = new User();
                user.setEmail(email);
                user.setUsername(oauthUser.getAttribute("name") != null
                        ? oauthUser.getAttribute("name") : email);
                user.setRole("USER");
                user.setPassword(encodedPassword);
                userRepo.save(user);
                Map<String, Object> response = new HashMap<>();
                response.put("id",          user.getId());
                response.put("username",    user.getUsername());
                response.put("email",       user.getEmail());
                response.put("role",        user.getRole());
                response.put("profileImage",user.getProfileImage());
                response.put("password",    rawPassword);
                return ResponseEntity.ok(response);
            }
            Map<String, Object> response = new HashMap<>();
            response.put("id",          user.getId());
            response.put("username",    user.getUsername());
            response.put("email",       user.getEmail());
            response.put("role",        user.getRole());
            response.put("profileImage",user.getProfileImage());
            response.put("password",    null);
            return ResponseEntity.ok(response);
        }
    }
}