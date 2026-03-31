package com.inkflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.inkflow.dto.response.CategoryVO;
import com.inkflow.entity.Category;
import com.inkflow.exception.BusinessException;
import com.inkflow.exception.ErrorCode;
import com.inkflow.mapper.CategoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryMapper categoryMapper;

    public List<CategoryVO> getAllCategories() {
        return categoryMapper.selectList(new LambdaQueryWrapper<Category>().orderByAsc(Category::getSortOrder))
                .stream().map(this::toCategoryVO).collect(Collectors.toList());
    }

    public CategoryVO createCategory(Category category) {
        categoryMapper.insert(category);
        return toCategoryVO(category);
    }

    public CategoryVO updateCategory(Long id, Category category) {
        Category existing = categoryMapper.selectById(id);
        if (existing == null) throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
        category.setId(id);
        categoryMapper.updateById(category);
        return toCategoryVO(categoryMapper.selectById(id));
    }

    public void deleteCategory(Long id) {
        Category existing = categoryMapper.selectById(id);
        if (existing == null) throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
        categoryMapper.deleteById(id);
    }

    public Category findBySlug(String slug) {
        Category category = categoryMapper.selectOne(new LambdaQueryWrapper<Category>().eq(Category::getSlug, slug));
        if (category == null) throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
        return category;
    }

    public CategoryVO toCategoryVO(Category category) {
        CategoryVO vo = new CategoryVO();
        vo.setId(category.getId());
        vo.setName(category.getName());
        vo.setDescription(category.getDescription());
        vo.setSlug(category.getSlug());
        vo.setIcon(category.getIcon());
        vo.setSortOrder(category.getSortOrder());
        vo.setCreatedAt(category.getCreatedAt());
        return vo;
    }
}
