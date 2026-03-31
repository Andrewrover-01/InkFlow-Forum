package com.inkflow.dto.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String name;
    private String bio;
    private String avatar;
}
