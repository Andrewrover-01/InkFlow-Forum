package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.NotificationVO;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.entity.Notification;
import com.inkflow.entity.Post;
import com.inkflow.entity.User;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.NotificationMapper;
import com.inkflow.mapper.PostMapper;
import com.inkflow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;
    private final UserMapper userMapper;
    private final PostMapper postMapper;

    public void createNotification(Long userId, String type, Long fromUserId, Long postId, Long replyId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setFromUserId(fromUserId);
        notification.setPostId(postId);
        notification.setReplyId(replyId);
        notification.setIsRead(false);
        notificationMapper.insert(notification);
    }

    public PageResponse<NotificationVO> getNotifications(Long userId, int page, int limit) {
        Page<Notification> pageObj = new Page<>(page, limit);
        notificationMapper.selectPage(pageObj, new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .orderByDesc(Notification::getCreatedAt));
        List<NotificationVO> voList = pageObj.getRecords().stream()
                .map(this::toNotificationVO)
                .collect(Collectors.toList());
        Page<NotificationVO> voPage = new Page<>(page, limit);
        voPage.setRecords(voList);
        voPage.setTotal(pageObj.getTotal());
        return PageResponse.of(voPage);
    }

    public void markRead(Long notificationId, Long userId) {
        Notification notification = notificationMapper.selectById(notificationId);
        if (notification == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        if (!notification.getUserId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION);
        notification.setIsRead(true);
        notificationMapper.updateById(notification);
    }

    public void markAllRead(Long userId) {
        notificationMapper.update(null, new LambdaUpdateWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .set(Notification::getIsRead, true));
    }

    public int getUnreadCount(Long userId) {
        return notificationMapper.countUnread(userId);
    }

    private NotificationVO toNotificationVO(Notification notification) {
        NotificationVO vo = new NotificationVO();
        vo.setId(notification.getId());
        vo.setUserId(notification.getUserId());
        vo.setType(notification.getType());
        vo.setFromUserId(notification.getFromUserId());
        vo.setPostId(notification.getPostId());
        vo.setReplyId(notification.getReplyId());
        vo.setIsRead(notification.getIsRead());
        vo.setCreatedAt(notification.getCreatedAt());
        if (notification.getFromUserId() != null) {
            User fromUser = userMapper.selectById(notification.getFromUserId());
            if (fromUser != null) {
                vo.setFromUserName(fromUser.getName());
                vo.setFromUserAvatar(fromUser.getAvatar());
            }
        }
        if (notification.getPostId() != null) {
            Post post = postMapper.selectById(notification.getPostId());
            if (post != null) {
                vo.setPostTitle(post.getTitle());
            }
        }
        return vo;
    }
}
