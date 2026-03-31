package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationVO {
    private Long id;
    private Long userId;
    private String type;
    private Long fromUserId;
    private String fromUserName;
    private String fromUserAvatar;
    private Long postId;
    private String postTitle;
    private Long replyId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
