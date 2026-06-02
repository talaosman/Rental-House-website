package com.example.renthousebackend.config;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public CustomOAuth2SuccessHandler(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String login = oauthUser.getAttribute("login");
        String email = oauthUser.getAttribute("email");

        // If GitHub email is null, create a fallback email
        if (email == null || email.isEmpty()) {
            email = login + "@github.local";
        }

        // Ensure username always exists
        String username = (login != null && !login.isEmpty()) ? login : email.split("@")[0];

        Optional<User> existingUser = userRepo.findByEmail(email);
        User user;
        if (existingUser.isEmpty()) {
            user = new User();
            user.setEmail(email);
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setRole("USER");
            user = userRepo.save(user); // save and get the generated ID
        } else {
            user = existingUser.get();
        }

        // Redirect including the actual DB user ID
        response.sendRedirect(
                "http://localhost:3000/oauth-success?" +
                        "userId=" + user.getId() +
                        "&username=" + username +
                        "&email=" + email);

    }
}
