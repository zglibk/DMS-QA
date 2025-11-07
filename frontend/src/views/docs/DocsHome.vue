<template>
  <!-- 使用文档首页，统一采用前台 AppLayout 布局 -->
  <AppLayout>
    <div class="docs-home">
      <!-- 标题区 -->
      <div class="page-header">
        <h1 class="page-title">使用文档</h1>
        <p class="page-subtitle">为系统各项功能提供清晰的上手指南与操作说明</p>
        <el-alert type="info" :closable="false" class="no-auth-tip">
          <template #title>
            本页面及子页面为公共路由，无需登录与权限校验即可访问
          </template>
        </el-alert>
      </div>

      <!-- 文档目录（优先展示投诉记录相关） -->
      <div class="docs-grid">
        <el-card shadow="hover" class="doc-card" @click="goComplaintRegisterDocs">
          <div class="card-body">
            <h2 class="card-title">投诉记录登记使用说明</h2>
            <p class="card-desc">一步步教你如何创建、编辑和删除投诉记录，包含图片附件处理与表单提交细节。</p>
            <el-tag type="success">优先完成</el-tag>
          </div>
        </el-card>

        <el-card shadow="hover" class="doc-card" @click="goComplaintBatchImportDocs">
          <div class="card-body">
            <h2 class="card-title">投诉记录批量导入使用说明</h2>
            <p class="card-desc">介绍Excel模板准备、数据校验、导入流程与常见问题定位。</p>
            <el-tag type="success">优先完成</el-tag>
          </div>
        </el-card>

        <!-- 预留其他文档入口 -->
        <el-card shadow="hover" class="doc-card" @click="goVersionUpdatesDocs">
          <div class="card-body">
            <h2 class="card-title">版本更新日志</h2>
            <p class="card-desc">查看系统版本历史与近期功能更新。</p>
          </div>
        </el-card>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * 使用文档首页
 * 功能：
 * 1) 展示文档目录卡片
 * 2) 提供跳转到具体文档页面的导航函数
 * 3) 明确公共路由无需权限
 */
import { useRouter } from 'vue-router'
import AppLayout from '@/components/common/AppLayout.vue'

// 路由实例
const router = useRouter()

/**
 * 跳转到投诉记录登记使用说明
 * 说明：进入 /docs/complaint-register 文档页面
 */
function goComplaintRegisterDocs() {
  router.push('/docs/complaint-register')
}

/**
 * 跳转到投诉记录批量导入使用说明
 * 说明：进入 /docs/complaint-batch-import 文档页面
 */
function goComplaintBatchImportDocs() {
  router.push('/docs/complaint-batch-import')
}

/**
 * 跳转到版本更新日志文档（前台页面）
 * 说明：复用现有前台路由 /version-updates
 */
function goVersionUpdatesDocs() {
  router.push('/version-updates')
}
</script>

<style scoped>
.docs-home {
  padding: 24px;
}
.page-header {
  margin-bottom: 16px;
}
.page-title {
  font-size: 22px;
  margin: 0 0 6px 0;
}
.page-subtitle {
  color: #666;
  margin: 0 0 10px 0;
}
.no-auth-tip {
  margin-bottom: 12px;
}
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.doc-card {
  cursor: pointer;
}
.card-body {
  min-height: 120px;
}
.card-title {
  font-size: 18px;
  margin: 0 0 8px 0;
}
.card-desc {
  color: #666;
  margin: 0;
}
</style>