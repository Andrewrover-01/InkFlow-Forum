package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.request.CreatePostRequest;
import com.inkflow.dto.request.UpdatePostRequest;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.PostDetailVO;
import com.inkflow.dto.response.PostVO;
import com.inkflow.entity.Post;
import com.inkflow.entity.Tag;
import com.inkflow.entity.PostTag;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.PostMapper;
import com.inkflow.mapper.TagMapper;
import com.inkflow.mapper.PostTagMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final int SUMMARY_MAX_LENGTH = 200;

    private final PostMapper postMapper;
    private final TagMapper tagMapper;
    private final PostTagMapper postTagMapper;

    public PageResponse<PostVO> getPostList(int page, int limit, Long categoryId, String keyword, Long currentUserId) {
        Page<PostVO> pageObj = new Page<>(page, limit);
        postMapper.selectPostListWithDetails(pageObj, categoryId, keyword, currentUserId);
        return PageResponse.of(pageObj);
    }

    public PostDetailVO getPostDetail(Long postId, Long currentUserId) {
        postMapper.update(null, new LambdaUpdateWrapper<Post>()
                .eq(Post::getId, postId)
                .setSql("view_count = view_count + 1"));
        PostDetailVO vo = postMapper.selectPostDetail(postId, currentUserId);
        if (vo == null) throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        return vo;
    }

    @Transactional
    public PostVO createPost(CreatePostRequest request, Long authorId) {
        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setSummary(request.getSummary() != null ? request.getSummary() : generateSummary(request.getContent()));
        post.setCategoryId(request.getCategoryId());
        post.setAuthorId(authorId);
        post.setStatus(request.getStatus() != null ? request.getStatus() : "PUBLISHED");
        post.setViewCount(0L);
        post.setIsPinned(false);
        post.setIsLocked(false);
        postMapper.insert(post);
        if (request.getTags() != null) {
            saveTags(post.getId(), request.getTags());
        }
        return postMapper.selectPostDetail(post.getId(), authorId);
    }

    @Transactional
    public PostVO updatePost(Long postId, UpdatePostRequest request, Long userId, String userRole) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        if (!post.getAuthorId().equals(userId) && !isAdminOrModerator(userRole)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        if (request.getTitle() != null) post.setTitle(request.getTitle());
        if (request.getContent() != null) post.setContent(request.getContent());
        if (request.getSummary() != null) post.setSummary(request.getSummary());
        if (request.getCategoryId() != null) post.setCategoryId(request.getCategoryId());
        if (request.getStatus() != null) post.setStatus(request.getStatus());
        if (request.getIsPinned() != null) post.setIsPinned(request.getIsPinned());
        if (request.getIsLocked() != null) post.setIsLocked(request.getIsLocked());
        postMapper.updateById(post);
        if (request.getTags() != null) {
            postTagMapper.delete(new LambdaQueryWrapper<PostTag>().eq(PostTag::getPostId, postId));
            saveTags(postId, request.getTags());
        }
        return postMapper.selectPostDetail(postId, userId);
    }

    public void deletePost(Long postId, Long userId, String userRole) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        if (!post.getAuthorId().equals(userId) && !isAdminOrModerator(userRole)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        post.setStatus("DELETED");
        postMapper.updateById(post);
    }

    private void saveTags(Long postId, List<String> tagNames) {
        for (String tagName : tagNames) {
            Tag tag = tagMapper.selectOne(new LambdaQueryWrapper<Tag>().eq(Tag::getName, tagName));
            if (tag == null) {
                tag = new Tag();
                tag.setName(tagName);
                tagMapper.insert(tag);
            }
            PostTag postTag = new PostTag();
            postTag.setPostId(postId);
            postTag.setTagId(tag.getId());
            postTagMapper.insert(postTag);
        }
    }

    private String generateSummary(String content) {
        if (content == null) return "";
        // Use codePoint-aware truncation to avoid splitting multi-byte UTF-8 characters
        if (content.codePointCount(0, content.length()) <= SUMMARY_MAX_LENGTH) return content;
        int offset = content.offsetByCodePoints(0, SUMMARY_MAX_LENGTH);
        return content.substring(0, offset) + "...";
    }

    private boolean isAdminOrModerator(String role) {
        return "ADMIN".equals(role) || "MODERATOR".equals(role);
    }
}
