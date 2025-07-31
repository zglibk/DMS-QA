<template>
  <el-breadcrumb separator="/" class="dynamic-breadcrumb">
    <el-breadcrumb-item 
      v-for="(item, index) in breadcrumbs" 
      :key="index"
      :to="item.clickable ? item.path : undefined"
    >
      <el-icon v-if="item.icon" class="breadcrumb-icon">
        <component :is="item.icon" />
      </el-icon>
      <span>{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
/**
 * 动态面包屑导航组件
 * 
 * 功能说明：
 * 1. 根据当前路由自动生成面包屑导航
 * 2. 支持根据用户权限动态显示菜单项
 * 3. 支持图标显示和路由跳转
 * 4. 自动处理多级菜单结构
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { getBreadcrumbConfig } from '@/config/breadcrumb'

// 获取当前路由信息
const route = useRoute()
// 获取用户store
const userStore = useUserStore()

// 计算面包屑数据
const breadcrumbs = computed(() => {
  const currentPath = route.path
  return getBreadcrumbConfig(currentPath)
})






</script>

<style scoped>
.dynamic-breadcrumb {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.breadcrumb-icon {
  margin-right: 4px;
  font-size: 16px;
  display: flex;
  align-items: center;
}

:deep(.el-breadcrumb) {
  font-size: 14px;
  line-height: 1;
}

:deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
}

:deep(.el-breadcrumb__inner) {
  display: flex;
  align-items: center;
  color: #606266;
  font-weight: normal;
  transition: color 0.3s;
}

:deep(.el-breadcrumb__inner:hover) {
  color: #409EFF;
  cursor: pointer;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #303133;
  font-weight: 500;
  cursor: default;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner:hover) {
  color: #303133;
}
</style>