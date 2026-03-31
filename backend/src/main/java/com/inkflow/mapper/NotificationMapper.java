package com.inkflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.inkflow.entity.Notification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
    @Select("SELECT COUNT(*) FROM notification WHERE user_id = #{userId} AND is_read = false")
    int countUnread(@Param("userId") Long userId);
}
