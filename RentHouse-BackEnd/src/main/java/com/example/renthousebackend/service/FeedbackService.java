package com.example.renthousebackend.service;

import com.example.renthousebackend.entity.Feedback;
import com.example.renthousebackend.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class FeedbackService {
    @Autowired
    private FeedbackRepository repository;

    
    public FeedbackService(FeedbackRepository feedbackRepository) {
        this.repository = feedbackRepository;
    }

    public List<Feedback> getAllFeedbacks() {
        return repository.findAll();
    }

    public Feedback saveFeedback(Feedback feedback) {
        return repository.save(feedback);
    }

   
    public boolean deleteFeedback(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

}
