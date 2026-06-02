package com.example.renthousebackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class B2StorageConfig {

    @Value("${b2.endpoint}")
    private String endpoint;

    @Value("${b2.key-id}")
    private String keyId;

    @Value("${b2.app-key}")
    private String appKey;

    // S3Client — used for upload and delete
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(keyId, appKey)
            ))
            .region(Region.US_EAST_1)   // required by SDK, ignored by B2
            .forcePathStyle(true)        // required for B2
            .build();
    }

    // S3Presigner — used for generating pre-signed GET URLs
    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(keyId, appKey)
            ))
            .region(Region.US_EAST_1)
            .build();
    }
}