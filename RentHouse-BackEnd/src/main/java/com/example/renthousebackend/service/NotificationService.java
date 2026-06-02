package com.example.renthousebackend.service;

import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.repository.UserRepository;
import com.google.firebase.messaging.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    @Autowired
    private UserRepository userRepo;

    public void sendBatchNotification(List<String> fcmTokens,
                                      String houseTitle,
                                      String houseLocation,
                                      Long houseId) {

        if (fcmTokens == null || fcmTokens.isEmpty()) return;

        List<String> validTokens = fcmTokens.stream()
                .filter(t -> t != null && !t.isBlank())
                .toList();

        if (validTokens.isEmpty()) return;

        try {

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(validTokens)
                    .setNotification(Notification.builder()
                            .setTitle("🏠 House Now Available!")
                            .setBody(houseTitle + " in "
                                    + houseLocation
                                    + " is now available!")
                            .build())
                    .putData("houseId", String.valueOf(houseId))
                    .putData("type", "house_available")
                    .build();

            BatchResponse response =
                    FirebaseMessaging.getInstance()
                            .sendEachForMulticast(message);

            System.out.println("✅ Sent: "
                    + response.getSuccessCount()
                    + " success, "
                    + response.getFailureCount()
                    + " failed");

            // CHECK FAILED TOKENS
            for (int i = 0; i < response.getResponses().size(); i++) {

                SendResponse r = response.getResponses().get(i);

                if (!r.isSuccessful()) {

                    FirebaseMessagingException ex = r.getException();

                    String badToken = validTokens.get(i);

                    System.err.println("❌ Token failed: "
                            + ex.getMessage());

                    // REMOVE INVALID TOKEN
                    if (ex.getMessagingErrorCode()
                            == MessagingErrorCode.UNREGISTERED) {

                        removeInvalidToken(badToken);
                    }
                }
            }

        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Batch failed: " + e.getMessage());
        }
    }

    private void removeInvalidToken(String token) {

        Optional<User> userOpt = userRepo.findByFcmToken(token);

        if (userOpt.isPresent()) {

            User user = userOpt.get();

            user.setFcmToken(null);

            userRepo.save(user);

            System.out.println("🗑 Invalid token removed from DB");
        }
    }
}