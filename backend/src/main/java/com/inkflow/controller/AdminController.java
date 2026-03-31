package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.PostVO;
import com.inkflow.dto.response.UserVO;
import com.inkflow.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ApiResponse<PageResponse<UserVO>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(adminService.getUsers(page, limit));
    }

    @PatchMapping("/users/{id}")
    public ApiResponse<UserVO> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ApiResponse.success(adminService.updateUser(id, body.get("role")));
    }

    @GetMapping("/posts")
    public ApiResponse<PageResponse<PostVO>> getPosts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(adminService.getPosts(page, limit, userId));
    }

    @DeleteMapping("/posts/{id}")
    public ApiResponse<Void> hardDeletePost(@PathVariable Long id) {
        adminService.hardDeletePost(id);
        return ApiResponse.success();
    }
}
