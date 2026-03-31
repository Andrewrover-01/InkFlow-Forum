package com.inkflow.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "没有权限"),
    NOT_FOUND(404, "资源不存在"),
    CONFLICT(409, "资源已存在"),
    INTERNAL_ERROR(500, "服务器内部错误"),
    USER_NOT_FOUND(1001, "用户不存在"),
    USER_ALREADY_EXISTS(1002, "用户已存在"),
    PASSWORD_ERROR(1003, "密码错误"),
    POST_NOT_FOUND(1004, "帖子不存在"),
    POST_LOCKED(1005, "帖子已锁定，无法回复"),
    CATEGORY_NOT_FOUND(1006, "分类不存在"),
    REPLY_NOT_FOUND(1007, "回复不存在"),
    COMMENT_NOT_FOUND(1008, "评论不存在"),
    NO_PERMISSION(1009, "没有操作权限");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
