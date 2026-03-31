package com.inkflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("hot_novel")
public class HotNovel {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Integer rank;
    private String title;
    private String author;
    private String category;
    private Double hotScore;
    private String sourceUrl;
    private LocalDateTime updatedAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
