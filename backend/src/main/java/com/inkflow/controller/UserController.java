package com.inkflow.controller;

import com.inkflow.dto.request.UpdateUserRequest;
import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.UserVO;
import com.inkflow.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ApiResponse<UserVO> getUser(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    @PatchMapping("/me")
    public ApiResponse<UserVO> updateMe(@RequestBody UpdateUserRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(userService.updateMe(userId, request));
    }

    @PatchMapping("/me/password")
    public ApiResponse<Void> updatePassword(@RequestBody Map<String, String> body, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        userService.updatePassword(userId, body.get("oldPassword"), body.get("newPassword"));
        return ApiResponse.success();
    }
}
