package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.inkflow.entity.HotNovel;
import com.inkflow.mapper.HotNovelMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class HotNovelService {

    private static final String CACHE_KEY = "inkflow:hot_novels";
    private final HotNovelMapper hotNovelMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @SuppressWarnings("unchecked")
    public List<HotNovel> getHotNovels() {
        Object cached = redisTemplate.opsForValue().get(CACHE_KEY);
        if (cached != null) {
            return (List<HotNovel>) cached;
        }
        List<HotNovel> novels = hotNovelMapper.selectList(
                new LambdaQueryWrapper<HotNovel>().orderByDesc(HotNovel::getHotScore).last("LIMIT 10"));
        redisTemplate.opsForValue().set(CACHE_KEY, novels, 1, TimeUnit.HOURS);
        return novels;
    }
}
