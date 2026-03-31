package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    @Value("${inkflow.upload.path}")
    private String uploadPath;

    @PostMapping
    public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ApiResponse.error(400, "文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ApiResponse.error(400, "文件大小不能超过5MB");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ApiResponse.error(400, "仅支持上传 JPG、PNG、GIF、WebP 格式图片");
        }
        String filename = UUID.randomUUID().toString() + extension;
        File dir = new File(uploadPath);
        if (!dir.exists() && !dir.mkdirs()) {
            log.error("上传目录创建失败: {}", uploadPath);
            return ApiResponse.error(500, "文件上传失败");
        }
        File dest = new File(dir, filename);
        try {
            file.transferTo(dest);
        } catch (IOException e) {
            log.error("文件上传失败", e);
            return ApiResponse.error(500, "文件上传失败");
        }
        return ApiResponse.success(Map.of("url", "/uploads/" + filename));
    }
}
