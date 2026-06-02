package com.example.renthousebackend.service;

import com.example.renthousebackend.entity.VisitRequest;
import com.example.renthousebackend.repository.VisitRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VisitRequestService {

    private final VisitRequestRepository visitRequestRepository;
    private final EmailService emailService;

    @Autowired
    public VisitRequestService(VisitRequestRepository visitRequestRepository, EmailService emailService) {
        this.visitRequestRepository = visitRequestRepository;
        this.emailService = emailService;
    }

    public void respondToVisit(Long requestId, boolean accepted) {
        VisitRequest visitRequest = visitRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Visit request not found"));

        if (visitRequest.isResponded()) return; // avoid duplicate actions

        visitRequest.setStatus(accepted ? "ACCEPTED" : "REJECTED");
        visitRequest.setResponded(true);
        visitRequestRepository.save(visitRequest);

        // Optionally notify the visitor by email
        emailService.sendResponseToVisitor(visitRequest.getVisitor().getEmail(), accepted);
    }
}
