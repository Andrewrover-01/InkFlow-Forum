package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.ReplyVO;
import com.inkflow.entity.Post;
import com.inkflow.entity.Reply;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.PostMapper;
import com.inkflow.mapper.ReplyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReplyService {

    private final ReplyMapper replyMapper;
    private final PostMapper postMapper;
    private final NotificationService notificationService;

    public PageResponse<ReplyVO> getReplies(Long postId, int page, int limit, Long currentUserId) {
        Page<ReplyVO> pageObj = new Page<>(page, limit);
        replyMapper.selectReplyListWithDetails(pageObj, postId, currentUserId);
        return PageResponse.of(pageObj);
    }

    @Transactional
    public Reply createReply(Long postId, Long authorId, String content) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        if (Boolean.TRUE.equals(post.getIsLocked())) throw new BusinessException(ErrorCode.POST_LOCKED);
        Integer maxFloor = replyMapper.selectMaxFloor(postId);
        Reply reply = new Reply();
        reply.setPostId(postId);
        reply.setAuthorId(authorId);
        reply.setContent(content);
        reply.setFloor(maxFloor + 1);
        replyMapper.insert(reply);
        if (!authorId.equals(post.getAuthorId())) {
            notificationService.createNotification(post.getAuthorId(), "REPLY", authorId, postId, reply.getId());
        }
        return reply;
    }

    public void deleteReply(Long replyId, Long userId, String userRole) {
        Reply reply = replyMapper.selectById(replyId);
        if (reply == null) throw new BusinessException(ErrorCode.REPLY_NOT_FOUND);
        if (!reply.getAuthorId().equals(userId) && !"ADMIN".equals(userRole) && !"MODERATOR".equals(userRole)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        replyMapper.deleteById(replyId);
    }
}
