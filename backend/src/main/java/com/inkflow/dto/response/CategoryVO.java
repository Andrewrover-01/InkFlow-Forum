package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CategoryVO {
    private Long id;
    private String name;
    private String description;
    private String slug;
    private String icon;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
