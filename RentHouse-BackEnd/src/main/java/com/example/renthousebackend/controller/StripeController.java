package com.example.renthousebackend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.renthousebackend.dto.RequestDTO;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;

import jakarta.annotation.PostConstruct;

@CrossOrigin(origins = {"http://localhost:3000", "https://your-frontend.vercel.app"})
@RestController
@RequestMapping("/api/stripe")
public class StripeController {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    // @PostMapping("/create-checkout-session")
    // public ResponseEntity<Map<String, String>> createCheckoutSession(@RequestBody
    // StripeCheckoutRequest request) {
    // try {
    // // You can use request.getUserId(), etc. to process logic later if needed.

    // // For now, just charge a static amount ($10)
    // SessionCreateParams params = SessionCreateParams.builder()
    // .setMode(SessionCreateParams.Mode.PAYMENT)
    // .setSuccessUrl("http://localhost:3000/property/" + request.getHouseId() +
    // "?payment=success")
    // .setCancelUrl("http://localhost:3000/property-details/" +
    // request.getHouseId())
    // .addLineItem(
    // SessionCreateParams.LineItem.builder()
    // .setQuantity(1L)
    // .setPriceData(
    // SessionCreateParams.LineItem.PriceData.builder()
    // .setCurrency("usd")
    // .setUnitAmount(100000L) // $10
    // .setProductData(
    // SessionCreateParams.LineItem.PriceData.ProductData.builder()
    // .setName("Rental Payment")
    // .build())
    // .build())
    // .build())
    // .build();

    // Session session = Session.create(params);
    // Map<String, String> response = new HashMap<>();
    // response.put("url", session.getUrl());
    // return ResponseEntity.ok(response);
    // } catch (Exception e) {
    // e.printStackTrace(); // Optional: logs for debugging
    // return ResponseEntity.status(500)
    // .body(Map.of("error", "Stripe session creation failed: " + e.getMessage()));
    // }
    // }
    public class CustomerUtil {
        public static Customer findOrCreateCustomer(String email, String name) throws StripeException {
            Map<String, Object> customerParams = new HashMap<>();
            customerParams.put("email", email);
            customerParams.put("name", name);
            return Customer.create(customerParams); // or search and reuse if needed
        }
    }

    @PostMapping("/checkout/integrated")
    public String integratedCheckout(@RequestBody RequestDTO requestDTO) throws StripeException {
        Stripe.apiKey = stripeApiKey;

        Customer customer = CustomerUtil.findOrCreateCustomer(
                requestDTO.getCustomerEmail(),
                requestDTO.getCustomerName());

        Long amount = requestDTO.getItems().get(0).getPrice(); // already in cents

        if (amount == null || amount < 50) {
            // Update this message to be clearer
            throw new IllegalArgumentException("Amount must be at least 50 cents (provided: " + amount + " cents)");
        }

        PaymentIntentCreateParams createParams = PaymentIntentCreateParams.builder()
                .setCustomer(customer.getId())
                .setCurrency("usd")
                .setAmount(amount)
                .build();

        PaymentIntent intent = PaymentIntent.create(createParams);

        return intent.getClientSecret();
    }

    private long calculateOrderAmount(List<RequestDTO.Item> items) {
        long total = 0;
        for (RequestDTO.Item item : items) {
            total += item.getPrice();
        }
        return total;
    }

}
