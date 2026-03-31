package com.inkflow.dto.request;

import lombok.Data;

@Data
public class LikeRequest {
    private Long postId;
    private Long replyId;
    private Long commentId;
}
