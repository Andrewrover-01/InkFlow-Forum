package com.inkflow.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class UpdatePostRequest {
    private String title;
    private String content;
    private String summary;
    private Long categoryId;
    private List<String> tags;
    private String status;
    private Boolean isPinned;
    private Boolean isLocked;
}
