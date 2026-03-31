package com.inkflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserVO {
    private Long id;
    private String name;
    private String email;
    private String bio;
    private String role;
    private String avatar;
    private LocalDateTime createdAt;
}
