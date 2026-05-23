package com.example.renthousebackend.controller;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.repository.HouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/houses")
@CrossOrigin(origins = "http://localhost:3000")
public class VirtualTourController {

    @Autowired
    private HouseRepository houseRepository;

    @Autowired
    private S3Client s3Client;

    @Autowired
    private S3Presigner s3Presigner;

    @Value("${b2.bucket}")
    private String bucket;

    @Value("${b2.presign-expiry-minutes}")
    private int presignExpiryMinutes;

    @PutMapping("/{id}/virtual-tour")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadVirtualTour(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        // 1. Validate content type
        String contentType = file.getContentType();
        if (contentType == null
                || (!contentType.equals("image/jpeg")
                && !contentType.equals("image/png"))) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error",
                            "Only JPEG or PNG equirectangular images are accepted."));
        }

        // 2. Validate file size — max 50 MB
        if (file.getSize() > 50L * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File exceeds the 50 MB size limit."));
        }

        // 3. Find the property
        House house = houseRepository.findById(id).orElse(null);
        if (house == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            // 4. Delete old file from B2 if replacing
            if (house.getVirtualTourUrl() != null) {
                deleteFromB2(house.getVirtualTourUrl());
            }

            // 5. Build a deterministic object key
            String extension = contentType.equals("image/png") ? ".png" : ".jpg";
            String key = "virtual-tours/house-" + id + "-360" + extension;

            // 6. Upload to B2 private bucket
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));

            // 7. Store only the object key in the database (NOT a URL)
            // We generate pre-signed URLs on demand at read time
            house.setVirtualTourUrl(key);
            houseRepository.save(house);

            return ResponseEntity.ok(Map.of(
                    "message", "Virtual tour uploaded successfully.",
                    "key", key));

        } catch (Exception e) {
            return ResponseEntity
                    .internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/virtual-tour-url")
    public ResponseEntity<?> getVirtualTourUrl(@PathVariable Long id) {

        House house = houseRepository.findById(id).orElse(null);
        if (house == null) {
            return ResponseEntity.notFound().build();
        }

        if (house.getVirtualTourUrl() == null) {
            return ResponseEntity.ok(Map.of("virtualTourUrl", ""));
        }

        try {
            // Generate a pre-signed URL valid for `presignExpiryMinutes`
            String presignedUrl = generatePresignedUrl(house.getVirtualTourUrl());

            return ResponseEntity.ok(Map.of("virtualTourUrl", presignedUrl));
        } catch (Exception e) {
            return ResponseEntity
                    .internalServerError()
                    .body(Map.of("error", "Failed to generate URL: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/virtual-tour")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteVirtualTour(@PathVariable Long id) {

        House house = houseRepository.findById(id).orElse(null);
        if (house == null) {
            return ResponseEntity.notFound().build();
        }

        if (house.getVirtualTourUrl() == null) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", "This property has no virtual tour."));
        }

        try {
            deleteFromB2(house.getVirtualTourUrl());
            house.setVirtualTourUrl(null);
            houseRepository.save(house);

            return ResponseEntity.ok(Map.of(
                    "message", "Virtual tour deleted successfully."));

        } catch (Exception e) {
            return ResponseEntity
                    .internalServerError()
                    .body(Map.of("error", "Delete failed: " + e.getMessage()));
        }
    }

    private String generatePresignedUrl(String key) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignExpiryMinutes))
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build())
                .build();

        return s3Presigner.presignGetObject(presignRequest)
                .url()
                .toString();
    }

    private void deleteFromB2(String key) {
        // key is stored directly (e.g. "virtual-tours/house-1-360.jpg")
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    @GetMapping("/{id}/virtual-tour-image")
    public ResponseEntity<StreamingResponseBody> proxyVirtualTourImage(@PathVariable Long id) {

        House house = houseRepository.findById(id).orElse(null);
        if (house == null || house.getVirtualTourUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            String key = house.getVirtualTourUrl();
            var getRequest = GetObjectRequest.builder()
                    .bucket(bucket).key(key).build();

            ResponseInputStream<GetObjectResponse> s3Stream = s3Client.getObject(getRequest);
            GetObjectResponse s3Meta = s3Stream.response();

            MediaType mediaType = key.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(mediaType);
            if (s3Meta.contentLength() != null) {
                headers.setContentLength(s3Meta.contentLength());
            }

            // ✅ Tell browser to cache the full image aggressively
            headers.setCacheControl("private, max-age=86400, immutable");
            headers.set("Content-Encoding", "identity");
            headers.set("X-Content-Type-Options", "nosniff");
            // ✅ Hint the full file size so browser doesn't throttle
            headers.set("Accept-Ranges", "bytes");

            StreamingResponseBody body = outputStream -> {
                try (s3Stream) {
                    // ✅ 2MB buffer instead of 512KB — fewer flushes, faster transfer
                    byte[] buffer = new byte[2 * 1024 * 1024];
                    int bytesRead;
                    while ((bytesRead = s3Stream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        outputStream.flush();
                    }
                }
            };

            return ResponseEntity.ok().headers(headers).body(body);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
