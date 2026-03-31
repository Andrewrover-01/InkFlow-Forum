package com.inkflow.controller;

import com.inkflow.dto.response.ApiResponse;
import com.inkflow.dto.response.CategoryVO;
import com.inkflow.entity.Category;
import com.inkflow.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/api/categories")
    public ApiResponse<List<CategoryVO>> getCategories() {
        return ApiResponse.success(categoryService.getAllCategories());
    }

    @PostMapping("/api/admin/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CategoryVO> createCategory(@RequestBody Category category) {
        return ApiResponse.success(categoryService.createCategory(category));
    }

    @PatchMapping("/api/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CategoryVO> updateCategory(@PathVariable Long id, @RequestBody Category category) {
        return ApiResponse.success(categoryService.updateCategory(id, category));
    }

    @DeleteMapping("/api/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ApiResponse.success();
    }
}
