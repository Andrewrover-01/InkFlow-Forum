package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class HotNovelVO {
    private Long id;
    private Integer rank;
    private String title;
    private String author;
    private String category;
    private Double hotScore;
    private String sourceUrl;
    private LocalDateTime updatedAt;
    private LocalDateTime createdAt;
}
