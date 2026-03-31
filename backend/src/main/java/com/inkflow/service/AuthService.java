package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.inkflow.dto.request.LoginRequest;
import com.inkflow.dto.request.RegisterRequest;
import com.inkflow.dto.response.UserVO;
import com.inkflow.entity.User;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.UserMapper;
import com.inkflow.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    public Map<String, Object> register(RegisterRequest request) {
        if (userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail())) != null) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS);
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("MEMBER");
        userMapper.insert(user);
        String token = jwtUtil.generateToken(user.getId(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", toUserVO(user));
        return result;
    }

    public Map<String, Object> login(LoginRequest request) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail()));
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.PASSWORD_ERROR);
        }
        String token = jwtUtil.generateToken(user.getId(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", toUserVO(user));
        return result;
    }

    public void logout(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (token != null && jwtUtil.validateToken(token)) {
            Date expiration = jwtUtil.getExpiration(token);
            long ttl = expiration.getTime() - System.currentTimeMillis();
            if (ttl > 0) {
                redisTemplate.opsForValue().set(
                        "inkflow:jwt:blacklist:" + token,
                        "1",
                        ttl,
                        TimeUnit.MILLISECONDS
                );
            }
        }
    }

    public UserVO getMe(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        return toUserVO(user);
    }

    public static UserVO toUserVO(User user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setName(user.getName());
        vo.setEmail(user.getEmail());
        vo.setBio(user.getBio());
        vo.setRole(user.getRole());
        vo.setAvatar(user.getAvatar());
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }
}
