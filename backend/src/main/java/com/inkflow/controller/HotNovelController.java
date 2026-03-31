package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import com.inkflow.entity.HotNovel;
import com.inkflow.service.HotNovelService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/hot-novels")
@RequiredArgsConstructor
public class HotNovelController {

    private final HotNovelService hotNovelService;

    @GetMapping
    public ApiResponse<List<HotNovel>> getHotNovels() {
        return ApiResponse.success(hotNovelService.getHotNovels());
    }
}
