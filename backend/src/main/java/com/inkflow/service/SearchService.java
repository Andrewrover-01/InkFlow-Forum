package com.inkflow.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.PostVO;
import com.inkflow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final PostMapper postMapper;

    public PageResponse<PostVO> search(String keyword, int page, int limit, Long currentUserId) {
        Page<PostVO> pageObj = new Page<>(page, limit);
        postMapper.selectPostListWithDetails(pageObj, null, keyword, currentUserId);
        return PageResponse.of(pageObj);
    }
}
