package com.inkflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotNull(message = "回复ID不能为空")
    private Long replyId;

    @NotBlank(message = "评论内容不能为空")
    private String content;

    private Long parentId;
}
