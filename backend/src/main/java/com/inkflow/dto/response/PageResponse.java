package com.inkflow.dto.response;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.util.List;

@Data
public class PageResponse<T> {
    private List<T> records;
    private long total;
    private long current;
    private long size;
    private long pages;

    public static <T> PageResponse<T> of(IPage<T> page) {
        PageResponse<T> response = new PageResponse<>();
        response.setRecords(page.getRecords());
        response.setTotal(page.getTotal());
        response.setCurrent(page.getCurrent());
        response.setSize(page.getSize());
        response.setPages(page.getPages());
        return response;
    }
}
