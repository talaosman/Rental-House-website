package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // Custom query methods can be added here if needed
}
