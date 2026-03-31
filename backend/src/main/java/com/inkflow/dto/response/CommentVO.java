package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CommentVO {
    private Long id;
    private String content;
    private Long replyId;
    private Long parentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserVO author;
    private List<CommentVO> children;
}
