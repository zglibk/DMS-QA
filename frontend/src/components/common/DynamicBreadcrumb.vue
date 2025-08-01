<template>
  <el-breadcrumb separator="/" class="dynamic-breadcrumb">
    <el-breadcrumb-item 
      v-for="(item, index) in breadcrumbs" 
      :key="index"
    >
      <span 
        v-if="item.clickable" 
        @click="handleBreadcrumbClick(item.path)"
        class="breadcrumb-link"
      >
        <el-icon v-if="item.icon" class="breadcrumb-icon">
          <component :is="item.icon" />
        </el-icon>
        {{ item.title }}
      </span>
      <span v-else class="breadcrumb-text">
        <el-icon v-if="item.icon" class="breadcrumb-icon">
          <component :is="item.icon" />
        </el-icon>
        {{ item.title }}
      </span>
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
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { getBreadcrumbConfig } from '@/config/breadcrumb'

// 获取当前路由信息
const route = useRoute()
const router = useRouter()
// 获取用户store
const userStore = useUserStore()

// 计算面包屑数据
const breadcrumbs = computed(() => {
  const currentPath = route.path
  return getBreadcrumbConfig(currentPath)
})

// 处理面包屑点击跳转
const handleBreadcrumbClick = (path) => {
  if (path && path !== route.path) {
    router.push(path)
  }
}






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

/* 面包屑链接样式 */
.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  color: #409EFF;
  cursor: pointer;
  transition: color 0.3s;
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

/* 面包屑文本样式 */
.breadcrumb-text {
  display: inline-flex;
  align-items: center;
  color: #606266;
}
</style>