package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // Custom query methods can be added here if needed
      List<Feedback> findByUserId(Long userId);

      void deleteByUserId(Long userId);
}
