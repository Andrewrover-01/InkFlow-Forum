package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PostVO {
    private Long id;
    private String title;
    private String summary;
    private String status;
    private Long viewCount;
    private Boolean isPinned;
    private Boolean isLocked;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserVO author;
    private CategoryVO category;
    private int replyCount;
    private int likeCount;
    private boolean isLiked;
    private List<String> tags;
}
