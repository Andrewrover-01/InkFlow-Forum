package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.inkflow.entity.Like;
import com.inkflow.entity.Post;
import com.inkflow.entity.Reply;
import com.inkflow.mapper.LikeMapper;
import com.inkflow.mapper.PostMapper;
import com.inkflow.mapper.ReplyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeMapper likeMapper;
    private final PostMapper postMapper;
    private final ReplyMapper replyMapper;
    private final NotificationService notificationService;

    public boolean toggleLike(Long userId, Long postId, Long replyId, Long commentId) {
        LambdaQueryWrapper<Like> wrapper = new LambdaQueryWrapper<Like>().eq(Like::getUserId, userId);
        if (postId != null) wrapper.eq(Like::getPostId, postId);
        else if (replyId != null) wrapper.eq(Like::getReplyId, replyId);
        else if (commentId != null) wrapper.eq(Like::getCommentId, commentId);
        Like existing = likeMapper.selectOne(wrapper);
        if (existing != null) {
            likeMapper.deleteById(existing.getId());
            return false;
        }
        Like like = new Like();
        like.setUserId(userId);
        like.setPostId(postId);
        like.setReplyId(replyId);
        like.setCommentId(commentId);
        likeMapper.insert(like);
        if (postId != null) {
            Post post = postMapper.selectById(postId);
            if (post != null && !post.getAuthorId().equals(userId)) {
                notificationService.createNotification(post.getAuthorId(), "LIKE", userId, postId, null);
            }
        } else if (replyId != null) {
            Reply reply = replyMapper.selectById(replyId);
            if (reply != null && !reply.getAuthorId().equals(userId)) {
                notificationService.createNotification(reply.getAuthorId(), "LIKE", userId, reply.getPostId(), replyId);
            }
        }
        return true;
    }

    public boolean isLiked(Long userId, Long postId, Long replyId, Long commentId) {
        LambdaQueryWrapper<Like> wrapper = new LambdaQueryWrapper<Like>().eq(Like::getUserId, userId);
        if (postId != null) wrapper.eq(Like::getPostId, postId);
        else if (replyId != null) wrapper.eq(Like::getReplyId, replyId);
        else if (commentId != null) wrapper.eq(Like::getCommentId, commentId);
        return likeMapper.selectCount(wrapper) > 0;
    }

    public long getLikeCount(Long postId, Long replyId, Long commentId) {
        LambdaQueryWrapper<Like> wrapper = new LambdaQueryWrapper<>();
        if (postId != null) wrapper.eq(Like::getPostId, postId);
        else if (replyId != null) wrapper.eq(Like::getReplyId, replyId);
        else if (commentId != null) wrapper.eq(Like::getCommentId, commentId);
        return likeMapper.selectCount(wrapper);
    }
}
