package com.inkflow.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PostDetailVO extends PostVO {
    private String content;
}
