package com.inkflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.inkflow.dto.response.CommentVO;
import com.inkflow.entity.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface CommentMapper extends BaseMapper<Comment> {
    @Select("""
        SELECT c.id, c.content, c.reply_id, c.parent_id, c.created_at, c.updated_at,
               u.id as author_id, u.name as author_name, u.avatar as author_avatar
        FROM comment c
        LEFT JOIN user u ON c.author_id = u.id
        WHERE c.reply_id = #{replyId} AND c.parent_id IS NULL
        ORDER BY c.created_at ASC
    """)
    List<CommentVO> selectCommentsByReplyId(@Param("replyId") Long replyId);
}
