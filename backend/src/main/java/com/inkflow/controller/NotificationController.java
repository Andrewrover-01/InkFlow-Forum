package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.NotificationVO;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<PageResponse<NotificationVO>> getNotifications(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(notificationService.getNotifications(userId, page, limit));
    }

    @PatchMapping("/{id}")
    public ApiResponse<Void> markRead(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        notificationService.markRead(id, userId);
        return ApiResponse.success();
    }

    @PostMapping("/read-all")
    public ApiResponse<Void> markAllRead(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        notificationService.markAllRead(userId);
        return ApiResponse.success();
    }

    @GetMapping("/unread-count")
    public ApiResponse<Integer> getUnreadCount(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(notificationService.getUnreadCount(userId));
    }
}
