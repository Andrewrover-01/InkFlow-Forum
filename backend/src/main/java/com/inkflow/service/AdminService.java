package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.inkflow.dto.response.PageResponse;
import com.inkflow.dto.response.PostVO;
import com.inkflow.dto.response.UserVO;
import com.inkflow.entity.Post;
import com.inkflow.entity.User;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.PostMapper;
import com.inkflow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserMapper userMapper;
    private final PostMapper postMapper;

    public PageResponse<UserVO> getUsers(int page, int limit) {
        Page<User> pageObj = new Page<>(page, limit);
        userMapper.selectPage(pageObj, new LambdaQueryWrapper<User>().orderByDesc(User::getCreatedAt));
        List<UserVO> voList = pageObj.getRecords().stream().map(AuthService::toUserVO).collect(Collectors.toList());
        Page<UserVO> voPage = new Page<>(page, limit);
        voPage.setRecords(voList);
        voPage.setTotal(pageObj.getTotal());
        return PageResponse.of(voPage);
    }

    public UserVO updateUser(Long userId, String role) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        user.setRole(role);
        userMapper.updateById(user);
        return AuthService.toUserVO(user);
    }

    public PageResponse<PostVO> getPosts(int page, int limit, Long currentUserId) {
        Page<PostVO> pageObj = new Page<>(page, limit);
        postMapper.selectPostListWithDetails(pageObj, null, null, currentUserId);
        return PageResponse.of(pageObj);
    }

    public void hardDeletePost(Long postId) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        postMapper.deleteById(postId);
    }
}
