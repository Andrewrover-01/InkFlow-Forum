package com.inkflow.controller;

import com.inkflow.dto.request.CreateReplyRequest;
import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.ReplyVO;
import com.inkflow.entity.Reply;
import com.inkflow.service.ReplyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReplyController {

    private final ReplyService replyService;

    @GetMapping("/posts/{postId}/replies")
    public ApiResponse<PageResponse<ReplyVO>> getReplies(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        return ApiResponse.success(replyService.getReplies(postId, page, limit, userId));
    }

    @PostMapping("/replies")
    public ApiResponse<Reply> createReply(@Valid @RequestBody CreateReplyRequest request,
                                          Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.success(replyService.createReply(request.getPostId(), userId, request.getContent()));
    }

    @DeleteMapping("/replies/{id}")
    public ApiResponse<Void> deleteReply(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        replyService.deleteReply(id, userId, role);
        return ApiResponse.success();
    }
}
