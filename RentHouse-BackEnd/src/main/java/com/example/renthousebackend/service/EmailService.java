package com.example.renthousebackend.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender emailSender; // used locally only

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    // If BREVO_API_KEY is set → use HTTP API (production)
    // If not set → use Gmail SMTP (local)
    private boolean useBrevoApi() {
        return brevoApiKey != null && !brevoApiKey.isBlank();
    }

    @Async("emailTaskExecutor")
    public void sendOtpEmail(String to, String otp) {
        String subject = "Welcome to Rental House – Your OTP Code";
        String html = "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>"
                + "<h2 style='color: #2E86C1;'>Welcome to Rental House!</h2>"
                + "<p>Thank you for signing up. Use the verification code below:</p>"
                + "<h3 style='color: #27AE60;'>Your OTP Code: <strong>" + otp + "</strong></h3>"
                + "<p>If you didn't request this, please ignore this email.</p>"
                + "<br><p>Best regards,<br>The Rental House Team</p>"
                + "</div>";
        if (useBrevoApi()) sendViaBrevoApi(to, subject, html);
        else sendViaSmtp(to, subject, html);
    }

    @Async("emailTaskExecutor")
    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (useBrevoApi()) sendViaBrevoApi(to, subject, htmlBody);
        else sendViaSmtpHtml(to, subject, htmlBody);
    }

    public void sendSimpleEmail(String to, String subject, String body) {
        if (useBrevoApi()) sendViaBrevoApi(to, subject, "<pre>" + body + "</pre>");
        else {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to); msg.setSubject(subject); msg.setText(body);
            emailSender.send(msg);
        }
    }

    public void sendResponseToVisitor(String visitorEmail, boolean accepted) {
        String subject = accepted ? "Your Visit Request Has Been Accepted"
                                  : "Your Visit Request Has Been Declined";
        String body = accepted
                ? "Dear Visitor,\n\nYour visit request has been accepted. The owner will contact you soon.\n\nThank you."
                : "Dear Visitor,\n\nWe are sorry to inform you that your visit request has been declined.\n\nThank you for your understanding.";
        sendSimpleEmail(visitorEmail, subject, body);
    }

    // ── Brevo HTTP API (production) ─────────────────────────────────
    public void sendViaBrevoApi(String to, String subject, String htmlContent) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", "Rental House Website");
            sender.put("email", "talaosman180@gmail.com");

            Map<String, String> recipient = new HashMap<>();
            recipient.put("email", to);

            Map<String, Object> body = new HashMap<>();
            body.put("sender", sender);
            body.put("to", List.of(recipient));
            body.put("subject", subject);
            body.put("htmlContent", htmlContent);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://api.brevo.com/v3/smtp/email", request, String.class);
            System.out.println("✅ Brevo API sent to " + to + " | " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("❌ Brevo API error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ── Gmail SMTP (local only) ─────────────────────────────────────
    private void sendViaSmtp(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(new InternetAddress("talaosman180@gmail.com", "Rental House Website"));
            helper.setTo(to); helper.setSubject(subject); helper.setText(htmlContent, true);
            emailSender.send(message);
        } catch (Exception e) { e.printStackTrace(); }
    }

    private void sendViaSmtpHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to); helper.setSubject(subject); helper.setText(htmlBody, true);
            emailSender.send(message);
        } catch (Exception e) { e.printStackTrace(); }
    }
public void sendNewOwnerAccountEmail(String toEmail, String ownerName, String tempPassword) {
    String html = "<div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto'>"
        + "<div style='background:#2563eb;padding:28px 32px;border-radius:12px 12px 0 0'>"
        + "<h2 style='color:white;margin:0;font-size:22px'>🏠 Your Owner Account Is Ready</h2></div>"
        + "<div style='background:#fff;padding:28px 32px;border:1px solid #e2e8f0;"
        + "border-top:none;border-radius:0 0 12px 12px'>"
        + "<p style='color:#334155;font-size:15px'>Hi " + ownerName + ",</p>"
        + "<p style='color:#334155;font-size:15px'>A property has been listed under your name on "
        + "<strong>RentalHub</strong>, and an owner account has been created for you so you can "
        + "manage your listings from the Owner Dashboard.</p>"
        + "<div style='background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;"
        + "padding:18px 20px;margin:20px 0'>"
        + "<p style='margin:0 0 8px;color:#334155;font-size:14px'><strong>Email:</strong> " + toEmail + "</p>"
        + "<p style='margin:0;color:#334155;font-size:14px'><strong>Temporary password:</strong> "
        + "<span style='font-family:monospace;font-size:16px;color:#2563eb'>" + tempPassword + "</span></p>"
        + "</div>"
        + "<p style='color:#dc2626;font-size:13px'>⚠️ Please log in and change your password immediately.</p>"
        + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0'>"
        + "<p style='color:#94a3b8;font-size:12px;margin:0'>RentalHub · Sent to " + toEmail + "</p>"
        + "</div></div>";

    sendHtmlEmail(toEmail, "Your RentalHub Owner Account", html);
}
    
}