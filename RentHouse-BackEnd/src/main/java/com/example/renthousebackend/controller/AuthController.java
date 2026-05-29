package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.service.EmailService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import org.springframework.mail.javamail.JavaMailSender;

import java.io.UnsupportedEncodingException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.core.Authentication;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "https://your-frontend.vercel.app"})
public class AuthController {

    @Autowired private UserRepository userRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired private JavaMailSender emailSender;

    // ── Stores ────────────────────────────────────────────────────────────────

    // OTP signup: email → OTP code
    private final Map<String, String>   otpStore          = new ConcurrentHashMap<>();
    // OTP signup: email → expiry timestamp (ms)
    private final Map<String, Long>     otpExpiry         = new ConcurrentHashMap<>();
    // Pending (unverified) users: email → User object
    private final Map<String, User>     pendingUsersStore = new ConcurrentHashMap<>();
    // Pending: email → when they were stored (ms) — for auto-cleanup
    private final Map<String, Long>     pendingExpiry     = new ConcurrentHashMap<>();

    // Password-reset codes: email → code
    private final Map<String, String>   resetCodeStore    = new ConcurrentHashMap<>();
    // Password-reset expiry: email → expiry timestamp (ms)
    private final Map<String, Long>     resetCodeExpiry   = new ConcurrentHashMap<>();

    private static final long OTP_TTL_MS        = 10 * 60 * 1000L; // 10 minutes
    private static final long PENDING_TTL_MS    = 15 * 60 * 1000L; // 15 minutes
    private static final long RESET_CODE_TTL_MS = 15 * 60 * 1000L; // 15 minutes

    // ── Auto-cleanup expired entries every 5 minutes ─────────────────────────
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanupExpired() {
        long now = Instant.now().toEpochMilli();

        otpExpiry.entrySet().removeIf(e -> {
            if (e.getValue() < now) { otpStore.remove(e.getKey()); return true; }
            return false;
        });

        pendingExpiry.entrySet().removeIf(e -> {
            if (e.getValue() < now) {
                pendingUsersStore.remove(e.getKey());
                // Also remove any dangling OTP for this email
                otpStore.remove(e.getKey());
                otpExpiry.remove(e.getKey());
                return true;
            }
            return false;
        });

        resetCodeExpiry.entrySet().removeIf(e -> {
            if (e.getValue() < now) { resetCodeStore.remove(e.getKey()); return true; }
            return false;
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateOtp() {
        return String.valueOf(new Random().nextInt(900000) + 100000);
    }

    private boolean isOtpExpired(String email) {
        Long expiry = otpExpiry.get(email);
        return expiry == null || Instant.now().toEpochMilli() > expiry;
    }

    private boolean isResetCodeExpired(String email) {
        Long expiry = resetCodeExpiry.get(email);
        return expiry == null || Instant.now().toEpochMilli() > expiry;
    }

    // ── Signup ────────────────────────────────────────────────────────────────
    // Stores user in memory AND sends OTP in one step.
    // Nothing is written to the DB until verify-otp succeeds.
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        // Already verified and in DB
        if (userRepo.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already exists");
        }

        // Encode password and set default role
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }

        // Overwrite any previous pending entry (handles re-signup attempts)
        pendingUsersStore.put(user.getEmail(), user);
        pendingExpiry.put(user.getEmail(), Instant.now().toEpochMilli() + PENDING_TTL_MS);

        // Generate OTP and send immediately
        String otp = generateOtp();
        otpStore.put(user.getEmail(), otp);
        otpExpiry.put(user.getEmail(), Instant.now().toEpochMilli() + OTP_TTL_MS);
        emailService.sendOtpEmail(user.getEmail(), otp);

        Map<String, Object> response = new HashMap<>();
        response.put("id", null);  // no DB id yet — user is NOT saved
        response.put("role", user.getRole());
        response.put("email", user.getEmail());
        response.put("username", user.getUsername());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profileImage", user.getProfileImage());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── Resend OTP ────────────────────────────────────────────────────────────
    // Only works if the user is in pendingUsersStore (not yet verified).
    // Replaces the old OTP and resets its expiry.
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        // Must be pending (not yet verified)
        if (!pendingUsersStore.containsKey(email)) {
            // Could be already verified, or never signed up
            if (userRepo.findByEmail(email).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("This email is already verified. Please log in.");
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("No pending registration found. Please sign up first.");
        }

        // Refresh pending TTL so they get another 15 min window
        pendingExpiry.put(email, Instant.now().toEpochMilli() + PENDING_TTL_MS);

        // Issue a fresh OTP
        String otp = generateOtp();
        otpStore.put(email, otp);
        otpExpiry.put(email, Instant.now().toEpochMilli() + OTP_TTL_MS);
        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok("OTP resent to " + email);
    }

    // ── Send OTP (used only for existing DB users, e.g. 2FA login) ───────────
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        boolean exists = pendingUsersStore.containsKey(email)
                || userRepo.findByEmail(email).isPresent();
        if (!exists) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        String otp = generateOtp();
        otpStore.put(email, otp);
        otpExpiry.put(email, Instant.now().toEpochMilli() + OTP_TTL_MS);
        emailService.sendOtpEmail(email, otp);
        return ResponseEntity.ok("OTP sent to email");
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email    = request.get("email");
        String code     = request.get("otp");
        String expected = otpStore.get(email);

        // Check expired first
        if (isOtpExpired(email)) {
            otpStore.remove(email);
            otpExpiry.remove(email);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body("OTP has expired. Please request a new one.");
        }

        if (expected == null || !expected.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid OTP");
        }

        // OTP is correct — consume it
        otpStore.remove(email);
        otpExpiry.remove(email);

        // New signup path: save to DB now for the first time
        if (pendingUsersStore.containsKey(email)) {
            User user = pendingUsersStore.remove(email);
            pendingExpiry.remove(email);
            userRepo.save(user);  // ← ONLY place a signup user ever hits the DB

            Map<String, Object> response = new HashMap<>();
            response.put("id",           user.getId());
            response.put("role",         user.getRole());
            response.put("email",        user.getEmail());
            response.put("password",     user.getPassword());
            response.put("username",     user.getUsername());
            response.put("phoneNumber",  user.getPhoneNumber());
            response.put("profileImage", user.getProfileImage());
            return ResponseEntity.ok(response);
        }

        // Fallback: OTP for an already-verified DB user (e.g. 2FA)
        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("id",           user.getId());
            response.put("role",         user.getRole());
            response.put("email",        user.getEmail());
            response.put("password",     user.getPassword());
            response.put("username",     user.getUsername());
            response.put("phoneNumber",  user.getPhoneNumber());
            response.put("profileImage", user.getProfileImage());
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("User not found after OTP verification");
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        String email = loginRequest.getEmail();

        if (pendingUsersStore.containsKey(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Please verify your email before logging in.");
        }

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message",      "Sign in successful");
        response.put("id",           user.getId());
        response.put("role",         user.getRole());
        response.put("email",        user.getEmail());
        response.put("password",     user.getPassword());
        response.put("username",     user.getUsername());
        response.put("phoneNumber",  user.getPhoneNumber());
        response.put("profileImage", user.getProfileImage());
        return ResponseEntity.ok(response);
    }

    // ── Forgot Password ───────────────────────────────────────────────────────

    @PostMapping("/forgot-password/send-code")
    public ResponseEntity<?> sendResetCode(@RequestBody Map<String, String> body)
            throws UnsupportedEncodingException {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        email = email.trim().toLowerCase();

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(
                Map.of("message", "If this email is registered, a code has been sent."));
        }

        String code = generateOtp();
        resetCodeStore.put(email, code);
        resetCodeExpiry.put(email, Instant.now().toEpochMilli() + RESET_CODE_TTL_MS);

        String html = "<div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto'>"
            + "<div style='background:#2563eb;padding:28px 32px;border-radius:12px 12px 0 0'>"
            + "<h2 style='color:white;margin:0;font-size:22px'>🔑 Reset Your Password</h2></div>"
            + "<div style='background:#fff;padding:28px 32px;border:1px solid #e2e8f0;"
            + "border-top:none;border-radius:0 0 12px 12px'>"
            + "<p style='color:#334155;font-size:15px'>We received a request to reset the password "
            + "for your <strong>RentalHub</strong> account.</p>"
            + "<p style='color:#334155;font-size:15px'>Use the code below — valid for "
            + "<strong>15 minutes</strong>.</p>"
            + "<div style='text-align:center;margin:28px 0'>"
            + "<span style='font-size:36px;font-weight:700;letter-spacing:10px;color:#2563eb;"
            + "background:#eff6ff;padding:16px 24px;border-radius:10px;"
            + "border:2px solid #bfdbfe;display:inline-block'>" + code + "</span></div>"
            + "<p style='color:#64748b;font-size:13px'>If you didn't request this, ignore this email.</p>"
            + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0'>"
            + "<p style='color:#94a3b8;font-size:12px;margin:0'>RentalHub · Sent to " + email + "</p>"
            + "</div></div>";

        emailService.sendHtmlEmail(email, "Reset Your RentalHub Password", html);
        return ResponseEntity.ok(Map.of("message", "Reset code sent to your email."));
    }

    @PostMapping("/forgot-password/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestBody Map<String, String> body) {
        String email = (body.get("email") != null) ? body.get("email").trim().toLowerCase() : "";
        String code  = (body.get("code")  != null) ? body.get("code").trim()               : "";

        if (email.isEmpty() || code.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email and code are required"));
        }
        if (isResetCodeExpired(email)) {
            resetCodeStore.remove(email);
            resetCodeExpiry.remove(email);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(Map.of("error", "Reset code has expired. Please request a new one."));
        }
        String stored = resetCodeStore.get(email);
        if (stored == null || !stored.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid verification code"));
        }
        return ResponseEntity.ok(Map.of("verified", true));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email           = (body.get("email")           != null) ? body.get("email").trim().toLowerCase()  : "";
        String code            = (body.get("code")            != null) ? body.get("code").trim()                  : "";
        String newPassword     = (body.get("newPassword")     != null) ? body.get("newPassword")                  : "";
        String confirmPassword = (body.get("confirmPassword") != null) ? body.get("confirmPassword")              : "";

        if (email.isEmpty() || code.isEmpty() || newPassword.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email, code, and new password are required"));
        }
        if (isResetCodeExpired(email)) {
            resetCodeStore.remove(email);
            resetCodeExpiry.remove(email);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(Map.of("error", "Reset code has expired. Please request a new one."));
        }
        String stored = resetCodeStore.get(email);
        if (stored == null || !stored.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid verification code"));
        }
        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Password must be at least 6 characters"));
        }

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        resetCodeStore.remove(email);
        resetCodeExpiry.remove(email);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now sign in."));
    }

    // ── Test email ────────────────────────────────────────────────────────────
    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail() {
        try {
            emailService.sendViaBrevoApi(
                "talaosman180@gmail.com",
                "RentalHub Production Test",
                "<h2>✅ Brevo HTTP API is working!</h2>"
            );
            return ResponseEntity.ok("✅ Request sent — check Gmail inbox and Brevo Logs");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ " + e.getMessage());
        }
    }

    // ── OAuth2 ────────────────────────────────────────────────────────────────
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
                response.put("id",           user.getId());
                response.put("username",     user.getUsername());
                response.put("email",        user.getEmail());
                response.put("role",         user.getRole());
                response.put("profileImage", user.getProfileImage());
                response.put("password",     rawPassword);
                return ResponseEntity.ok(response);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id",           user.getId());
            response.put("username",     user.getUsername());
            response.put("email",        user.getEmail());
            response.put("role",         user.getRole());
            response.put("profileImage", user.getProfileImage());
            response.put("password",     null);
            return ResponseEntity.ok(response);
        }
    }
}