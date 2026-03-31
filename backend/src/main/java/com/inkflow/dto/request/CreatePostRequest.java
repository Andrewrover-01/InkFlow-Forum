package com.inkflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreatePostRequest {
    @NotBlank(message = "标题不能为空")
    private String title;

    @NotBlank(message = "内容不能为空")
    private String content;

    private String summary;

    @NotNull(message = "分类不能为空")
    private Long categoryId;

    private List<String> tags;

    private String status = "PUBLISHED";
}
