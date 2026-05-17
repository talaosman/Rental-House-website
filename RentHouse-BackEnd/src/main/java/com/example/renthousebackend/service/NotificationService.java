package com.example.renthousebackend.service;

import com.google.firebase.messaging.*;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    /**
     * Sends a push notification via FCM to a specific device token.
     * The notification appears as a message on the user's phone.
     */
    public void sendHouseAvailableNotification(String fcmToken,
                                                String houseTitle,
                                                String houseLocation,
                                                Long houseId) {
        if (fcmToken == null || fcmToken.isBlank()) {
            System.out.println("⚠️ No FCM token for user — skipping notification");
            return;
        }

        try {
            Notification notification = Notification.builder()
                .setTitle("🏠 House Now Available!")
                .setBody("Good news! " + houseTitle + " in " + houseLocation
                         + " is now available for rent.")
                .build();

            Message message = Message.builder()
                .setToken(fcmToken)
                .setNotification(notification)
                // Extra data payload for deep linking
                .putData("houseId", String.valueOf(houseId))
                .putData("type", "house_available")
                .putData("click_action", "OPEN_HOUSE_DETAILS")
                .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Notification sent successfully: " + response);

        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Failed to send notification: " + e.getMessage());
        }
    }

    /**
     * Send to multiple users (for batch notification when a house becomes available).
     */
    public void sendBatchNotification(java.util.List<String> fcmTokens,
                                       String houseTitle,
                                       String houseLocation,
                                       Long houseId) {
        if (fcmTokens == null || fcmTokens.isEmpty()) return;

        // Filter out blank tokens
        java.util.List<String> validTokens = fcmTokens.stream()
            .filter(t -> t != null && !t.isBlank())
            .toList();

        if (validTokens.isEmpty()) return;

        try {
            MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(validTokens)
                .setNotification(Notification.builder()
                    .setTitle("🏠 House Now Available!")
                    .setBody(houseTitle + " in " + houseLocation
                             + " is now available for rent. Book it before someone else does!")
                    .build())
                .putData("houseId", String.valueOf(houseId))
                .putData("type", "house_available")
                .build();

            BatchResponse response = FirebaseMessaging.getInstance()
                                                      .sendEachForMulticast(message);
            System.out.println("✅ Batch sent: " + response.getSuccessCount()
                               + " success, " + response.getFailureCount() + " failed");

        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Batch notification failed: " + e.getMessage());
        }
    }
}