package com.inkflow.controller;

import com.inkflow.dto.request.CreatePostRequest;
import com.inkflow.dto.request.UpdatePostRequest;
import com.inkflow.dto.response.*;
import com.inkflow.service.CategoryService;
import com.inkflow.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final CategoryService categoryService;

    @GetMapping("/posts")
    public ApiResponse<PageResponse<PostVO>> getPosts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        return ApiResponse.success(postService.getPostList(page, limit, null, null, userId));
    }

    @GetMapping("/posts/{id}")
    public ApiResponse<PostDetailVO> getPost(@PathVariable Long id, Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        return ApiResponse.success(postService.getPostDetail(id, userId));
    }

    @PostMapping("/posts")
    public ApiResponse<PostVO> createPost(@Valid @RequestBody CreatePostRequest request,
                                          Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(postService.createPost(request, userId));
    }

    @PatchMapping("/posts/{id}")
    public ApiResponse<PostVO> updatePost(@PathVariable Long id,
                                          @RequestBody UpdatePostRequest request,
                                          Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        return ApiResponse.success(postService.updatePost(id, request, userId, role));
    }

    @DeleteMapping("/posts/{id}")
    public ApiResponse<Void> deletePost(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        postService.deletePost(id, userId, role);
        return ApiResponse.success();
    }

    @GetMapping("/categories/{slug}/posts")
    public ApiResponse<PageResponse<PostVO>> getCategoryPosts(
            @PathVariable String slug,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        com.inkflow.entity.Category category = categoryService.findBySlug(slug);
        return ApiResponse.success(postService.getPostList(page, limit, category.getId(), null, userId));
    }
}
