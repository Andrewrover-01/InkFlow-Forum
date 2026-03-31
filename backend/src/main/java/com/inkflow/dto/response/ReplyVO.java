package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReplyVO {
    private Long id;
    private String content;
    private Integer floor;
    private Long postId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserVO author;
    private int likeCount;
    private boolean isLiked;
    private List<CommentVO> comments;
}
