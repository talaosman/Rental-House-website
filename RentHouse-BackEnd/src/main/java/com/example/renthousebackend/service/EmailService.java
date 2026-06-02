package com.example.renthousebackend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender emailSender;

    public void sendOtpEmail(String to, String otp) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            // Set custom sender name
            helper.setFrom(new InternetAddress("talaosman180@gmail.com", "Rental House Website"));
            helper.setTo(to);
            helper.setSubject("Your OTP Code");
            helper.setSubject("Welcome to Rental House – Your OTP Code");

            String emailContent = "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>"
                    + "<h2 style='color: #2E86C1;'>Welcome to Rental House!</h2>"
                    + "<p>Thank you for signing up. To access your account, please use the verification code below:</p>"
                    + "<h3 style='color: #27AE60;'>Your OTP Code: <strong>" + otp + "</strong></h3>"
                    + "<p>If you didn’t request this, please ignore this email.</p>"
                    + "<br>"
                    + "<p>Best regards,<br>The Rental House Team</p>"
                    + "</div>";

            helper.setText(emailContent, true);
            emailSender.send(message);
        } catch (MessagingException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        MimeMessage message = emailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // Enable HTML
            emailSender.send(message);
        } catch (MessagingException e) {
            e.printStackTrace();
        }
    }

    public void sendSimpleEmail(String to, String subject, String body) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(body);
        emailSender.send(msg);
    }
    public void sendResponseToVisitor(String visitorEmail, boolean accepted) {
        String subject;
        String body;

        if (accepted) {
            subject = "Your Visit Request Has Been Accepted";
            body = "Dear Visitor,\n\nYour visit request has been accepted. The owner will contact you soon.\n\nThank you.";
        } else {
            subject = "Your Visit Request Has Been Declined";
            body = "Dear Visitor,\n\nWe are sorry to inform you that your visit request has been declined.\n\nThank you for your understanding.";
        }

        // Use your existing method to send a simple text email
        sendSimpleEmail(visitorEmail, subject, body);
    }


}