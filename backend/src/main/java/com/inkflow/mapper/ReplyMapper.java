package com.inkflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.ReplyVO;
import com.inkflow.entity.Reply;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ReplyMapper extends BaseMapper<Reply> {
    @Select("SELECT COALESCE(MAX(floor), 0) FROM reply WHERE post_id = #{postId}")
    Integer selectMaxFloor(@Param("postId") Long postId);

    IPage<ReplyVO> selectReplyListWithDetails(Page<ReplyVO> page, @Param("postId") Long postId,
                                               @Param("currentUserId") Long currentUserId);
}
