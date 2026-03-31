package com.inkflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.inkflow.entity.Tag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface TagMapper extends BaseMapper<Tag> {
    @Select("SELECT t.name FROM tag t INNER JOIN post_tag pt ON t.id = pt.tag_id WHERE pt.post_id = #{postId}")
    List<String> findTagNamesByPostId(Long postId);
}
