package com.inkflow;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.inkflow.mapper")
public class InkFlowApplication {
    public static void main(String[] args) {
        SpringApplication.run(InkFlowApplication.class, args);
    }
}
