package com.inkflow.controller;

import com.inkflow.dto.request.LoginRequest;
import com.inkflow.dto.request.RegisterRequest;
import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.UserVO;
import com.inkflow.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<UserVO> me(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(authService.getMe(userId));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestHeader("Authorization") String authorization) {
        authService.logout(authorization);
        return ApiResponse.success();
    }
}
