package com.inkflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("reply")
public class Reply {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String content;
    private Integer floor;
    private Long postId;
    private Long authorId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
