package com.example.renthousebackend.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class FileService {

    // Use absolute path to your project or desired uploads folder
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + File.separator + "uploads";

    public String saveFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("File is null or empty");
        }

        // Create upload directory if it doesn't exist
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            boolean created = uploadDir.mkdirs();
            if (!created) {
                throw new IOException("Could not create upload directory");
            }
        }

        // Generate unique file name
        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        File destFile = new File(uploadDir, filename);

        System.out.println("Saving to: " + destFile.getAbsolutePath());

        // Save the file
        file.transferTo(destFile);

        return filename;
    }
    public String saveFile(String filename, byte[] bytes) throws IOException {
    Path uploadDir = Paths.get("uploads");
    if (!Files.exists(uploadDir)) {
        Files.createDirectories(uploadDir);
    }
    Path filePath = uploadDir.resolve(filename);
    Files.write(filePath, bytes);
    return filename;
}

}
