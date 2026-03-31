package com.inkflow.service;

import com.inkflow.dto.request.CreateCommentRequest;
import com.inkflow.entity.Comment;
import com.inkflow.entity.Reply;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.CommentMapper;
import com.inkflow.mapper.ReplyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentMapper commentMapper;
    private final ReplyMapper replyMapper;

    public Comment createComment(CreateCommentRequest request, Long authorId) {
        Reply reply = replyMapper.selectById(request.getReplyId());
        if (reply == null) throw new BusinessException(ErrorCode.REPLY_NOT_FOUND);
        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setReplyId(request.getReplyId());
        comment.setAuthorId(authorId);
        comment.setParentId(request.getParentId());
        commentMapper.insert(comment);
        return comment;
    }

    public void deleteComment(Long commentId, Long userId, String userRole) {
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        if (!comment.getAuthorId().equals(userId) && !"ADMIN".equals(userRole) && !"MODERATOR".equals(userRole)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        commentMapper.deleteById(commentId);
    }
}
