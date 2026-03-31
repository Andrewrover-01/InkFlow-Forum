package com.inkflow.controller;

import com.inkflow.dto.request.LikeRequest;
import com.inkflow.dto.response.ApiResponse;
import com.inkflow.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/likes")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @PostMapping
    public ApiResponse<Map<String, Object>> toggleLike(@RequestBody LikeRequest request,
                                                        Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean liked = likeService.toggleLike(userId, request.getPostId(), request.getReplyId(), request.getCommentId());
        return ApiResponse.success(Map.of("liked", liked));
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> getLikeInfo(@RequestParam(required = false) Long postId,
                                                         @RequestParam(required = false) Long replyId,
                                                         @RequestParam(required = false) Long commentId,
                                                         Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        long count = likeService.getLikeCount(postId, replyId, commentId);
        boolean liked = userId != null && likeService.isLiked(userId, postId, replyId, commentId);
        return ApiResponse.success(Map.of("count", count, "liked", liked));
    }
}
