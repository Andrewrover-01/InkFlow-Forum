package com.inkflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReplyRequest {
    @NotNull(message = "帖子ID不能为空")
    private Long postId;

    @NotBlank(message = "回复内容不能为空")
    private String content;
}
