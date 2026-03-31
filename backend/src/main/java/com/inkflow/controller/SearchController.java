package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.PostVO;
import com.inkflow.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ApiResponse<PageResponse<PostVO>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            Authentication authentication) {
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;
        return ApiResponse.success(searchService.search(q, page, limit, userId));
    }
}
