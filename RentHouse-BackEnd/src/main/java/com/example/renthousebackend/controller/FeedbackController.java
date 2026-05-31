package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.Feedback;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.service.FeedbackService;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = {"http://localhost:3000", "https://your-frontend.vercel.app"})
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<Feedback> submitFeedback(
            @RequestBody Feedback feedback,
            @RequestParam(required = false) Long userId) {

        // Link to User if userId provided
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                feedback.setUser(user);
            }
        }

        Feedback saved = feedbackService.saveFeedback(feedback);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public List<Feedback> getAllFeedbacks() {
        return feedbackService.getAllFeedbacks();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFeedback(@PathVariable Long id) {
        boolean deleted = feedbackService.deleteFeedback(id);
        return deleted
            ? ResponseEntity.ok().build()
            : ResponseEntity.notFound().build();
    }
}