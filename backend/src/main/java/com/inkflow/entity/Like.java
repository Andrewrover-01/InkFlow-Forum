package com.inkflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("`like`")
public class Like {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long postId;
    private Long replyId;
    private Long commentId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
