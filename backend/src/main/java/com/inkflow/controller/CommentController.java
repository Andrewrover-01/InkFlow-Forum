package com.inkflow.controller;

import com.inkflow.dto.request.CreateCommentRequest;
import com.inkflow.dto.response.ApiResponse;
import com.inkflow.entity.Comment;
import com.inkflow.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ApiResponse<Comment> createComment(@Valid @RequestBody CreateCommentRequest request,
                                               Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(commentService.createComment(request, userId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteComment(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        commentService.deleteComment(id, userId, role);
        return ApiResponse.success();
    }
}
