package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.entity.VisitRequest;
import com.example.renthousebackend.repository.HouseRepository;
import com.example.renthousebackend.repository.UserRepository;
import com.example.renthousebackend.repository.VisitRequestRepository;
import com.example.renthousebackend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.renthousebackend.service.VisitRequestService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/visits")
public class VisitRequestController {

    @Autowired
    private VisitRequestRepository visitRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private VisitRequestService visitRequestService;

    @PostMapping("/request")
    public ResponseEntity<?> createVisit(
            @RequestParam Long houseId,
            @RequestParam Long userId,
            @RequestParam String visitorName,
            @RequestParam String visitorEmail,
            @RequestParam String date,
            @RequestParam String time) {

        House house = houseRepository.findById(houseId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);

        if (house == null || user == null) {
            return ResponseEntity.badRequest().body("Invalid house or user ID");
        }

        LocalDate visitDate = LocalDate.parse(date);
        LocalTime visitTime = LocalTime.parse(time);

        boolean alreadyTaken = visitRequestRepository
                .existsByHouseIdAndVisitDateAndVisitTime(houseId, visitDate, visitTime);

        if (alreadyTaken) {
            return ResponseEntity.status(409).body("This date and time are already taken.");
        }

        VisitRequest visitRequest = VisitRequest.builder()
                .visitorName(visitorName)
                .visitorEmail(visitorEmail)
                .visitDate(visitDate)
                .visitTime(visitTime)
                .house(house)
                .user(user)
                .accepted(null) 
                .build();

        VisitRequest savedRequest = visitRequestRepository.save(visitRequest);


        String ownerEmail = house.getOwner().getEmail();
        String subject = "New Visit Request for Your Property";
        String acceptUrl = "http://localhost:5000/api/visits/respond-html/" + savedRequest.getId() + "?accepted=true";
        String rejectUrl = "http://localhost:5000/api/visits/respond-html/" + savedRequest.getId() + "?accepted=false";

        String body = String.format(
                """
                        <html>
                        <body>
                            <p>Dear %s,</p>
                            <p>You have a new visit request for your property at <strong>%s</strong>.</p>
                            <ul>
                                <li><strong>Visitor Name:</strong> %s</li>
                                <li><strong>Visitor Email:</strong> %s</li>
                                <li><strong>Date:</strong> %s</li>
                                <li><strong>Time:</strong> %s</li>
                            </ul>
                            <p>Please respond by clicking one of the buttons below:</p>
                            <a href="%s" style="padding:10px 20px; background-color:green; color:white; text-decoration:none; margin-right:10px;">Accept</a>
                            <a href="%s" style="padding:10px 20px; background-color:red; color:white; text-decoration:none;">Reject</a>
                        </body>
                        </html>
                        """,
                house.getOwner().getName(),
                house.getLocation(),
                visitorName,
                visitorEmail,
                visitDate,
                visitTime,
                acceptUrl,
                rejectUrl);
       
        emailService.sendHtmlEmail(ownerEmail, subject, body);

        return ResponseEntity.ok(savedRequest);
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<List<VisitRequest>> getVisitsForOwner(@PathVariable Long ownerId) {
        return ResponseEntity.ok(visitRequestRepository.findByHouseOwnerId(ownerId));
    }

    @PutMapping("/respond/{requestId}")
    public ResponseEntity<?> respondToVisit(
            @PathVariable Long requestId,
            @RequestParam boolean accepted) {

        VisitRequest visitRequest = visitRequestRepository.findById(requestId).orElse(null);
        if (visitRequest == null) {
            return ResponseEntity.badRequest().body("Visit request not found");
        }

        visitRequest.setAccepted(accepted);
        visitRequestRepository.save(visitRequest);

      
        String visitorEmail = visitRequest.getVisitorEmail();
        String visitorName = visitRequest.getVisitorName();
        String subject;
        String body;

        if (accepted) {
            subject = "Your Visit Request Has Been Accepted";
            body = String.format(
                    "Dear %s,\n\nYour visit request for the property at %s on %s at %s has been accepted.\nThe owner will contact you soon.\n\nThank you.",
                    visitorName,
                    visitRequest.getHouse().getLocation(),
                    visitRequest.getVisitDate(),
                    visitRequest.getVisitTime());
        } else {
            subject = "Your Visit Request Has Been Declined";
            body = String.format(
                    "Dear %s,\n\nWe are sorry to inform you that your visit request for the property at %s on %s at %s has been declined.\n\nThank you for your understanding.",
                    visitorName,
                    visitRequest.getHouse().getLocation(),
                    visitRequest.getVisitDate(),
                    visitRequest.getVisitTime());
        }

        emailService.sendSimpleEmail(visitorEmail, subject, body);

        return ResponseEntity.ok("Visit request " + (accepted ? "accepted" : "declined"));
    }

    @GetMapping("/respond-html/{requestId}")
    public ResponseEntity<String> respondToVisitHtml(
            @PathVariable Long requestId,
            @RequestParam boolean accepted) {

        VisitRequest visitRequest = visitRequestRepository.findById(requestId).orElse(null);
        if (visitRequest == null) {
            return ResponseEntity.badRequest().body("<h2>Visit request not found.</h2>");
        }

        if (visitRequest.getAccepted() != null) {
            return ResponseEntity.ok("<h2>This request has already been processed.</h2>");
        }

        visitRequest.setAccepted(accepted);
        visitRequestRepository.save(visitRequest);

      
        String visitorEmail = visitRequest.getVisitorEmail();
        String visitorName = visitRequest.getVisitorName();
        String subject;
        String body;

        if (accepted) {
            subject = "Your Visit Request Has Been Accepted";
            body = String.format(
                    "Dear %s,\n\nYour visit request for the property at %s on %s at %s has been accepted.\nThe owner will contact you soon.\n\nThank you.",
                    visitorName,
                    visitRequest.getHouse().getLocation(),
                    visitRequest.getVisitDate(),
                    visitRequest.getVisitTime());
        } else {
            subject = "Your Visit Request Has Been Declined";
            body = String.format(
                    "Dear %s,\n\nWe are sorry to inform you that your visit request for the property at %s on %s at %s has been declined.\n\nThank you for your understanding.",
                    visitorName,
                    visitRequest.getHouse().getLocation(),
                    visitRequest.getVisitDate(),
                    visitRequest.getVisitTime());
        }

        emailService.sendSimpleEmail(visitorEmail, subject, body);

        String confirmationHtml = "<html><head><title>Response Submitted</title></head><body style='font-family:sans-serif;text-align:center;margin-top:100px;'>"
                + "<h2>Visit request has been " + (accepted ? "accepted" : "rejected") + ".</h2>"
                + "<p>You can now close this tab.</p>"
                + "<script>setTimeout(() => window.close(), 0.0001);</script>"
                + "</body></html>";

        return ResponseEntity.ok().header("Content-Type", "text/html").body(confirmationHtml);
    }

}
