package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Value("${inkflow.upload.path}")
    private String uploadPath;

    @PostMapping
    public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ApiResponse.error(400, "文件不能为空");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
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
