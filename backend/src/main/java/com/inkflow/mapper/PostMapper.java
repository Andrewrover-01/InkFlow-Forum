package com.inkflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.PostVO;
import com.inkflow.dto.response.PostDetailVO;
import com.inkflow.entity.Post;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PostMapper extends BaseMapper<Post> {
    IPage<PostVO> selectPostListWithDetails(Page<PostVO> page, @Param("categoryId") Long categoryId,
                                            @Param("keyword") String keyword, @Param("currentUserId") Long currentUserId);

    PostDetailVO selectPostDetail(@Param("postId") Long postId, @Param("currentUserId") Long currentUserId);
}
