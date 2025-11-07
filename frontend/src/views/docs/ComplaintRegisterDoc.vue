<template>
  <AppLayout>
    <div class="doc-container">
      <div class="doc-header">
        <h1>投诉记录登记使用说明</h1>
        <p class="doc-subtitle">面向新手的分步指南，帮助你正确登记投诉记录并处理图片附件</p>
        <el-alert type="success" :closable="false">
          <template #title>
            本文档可直接访问，无需登录和权限校验
          </template>
        </el-alert>
      </div>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">一、进入登记页面</div>
        </template>
        <ol class="doc-steps">
          <li>登录系统后，进入后台“供应商管理 > 供应商投诉”页面。</li>
          <li>点击“新增投诉”按钮，打开投诉登记对话框。</li>
          <li>未登录用户也可先阅读本文档了解流程。</li>
        </ol>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">二、填写基本信息</div>
        </template>
        <ul>
          <li>投诉日期：选择实际发生日期。</li>
          <li>供应商：从下拉列表选择目标供应商。</li>
          <li>投诉描述：清晰、完整地描述问题。</li>
          <li>责任人：选择或填写对应责任人。</li>
        </ul>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">三、图片附件处理</div>
        </template>
        <ul>
          <li>上传图片：支持拖拽上传或点击选择，支持多图。</li>
          <li>删除图片：在编辑模式下删除图片后，系统会同步清空数据库的图片路径字段，同时删除物理文件。</li>
          <li>图片预览：系统会根据路径类型自动生成预览地址。</li>
        </ul>
        <el-alert type="info" :closable="false" class="tip">
          <template #title>
            注意：删除所有图片后，前端会将 AttachedImages 置为 null；后端会将其更新为空字符串，保证数据一致性。
          </template>
        </el-alert>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">四、提交与校验</div>
        </template>
        <ul>
          <li>提交前会校验必填字段与图片URL合法性。</li>
          <li>提交成功后，系统返回提示并在列表中回显新记录。</li>
          <li>编辑模式下再次提交会更新原有记录。</li>
        </ul>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">五、常见问题</div>
        </template>
        <ul>
          <li>图片无法预览：检查路径是否为 blob/HTTP/上传目录（uploads），系统会自动处理。</li>
          <li>删除后仍有路径：前端已修复清空逻辑；请刷新列表或检查后端日志。</li>
          <li>批量导入相关问题请参考下一篇文档。</li>
        </ul>
      </el-card>

      <div class="doc-footer">
        <el-button type="primary" @click="goBack">返回文档首页</el-button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * 投诉记录登记使用说明页面
 * 功能：提供登记流程、图片处理与提交校验的说明
 */
import { useRouter } from 'vue-router'
import AppLayout from '@/components/common/AppLayout.vue'
const router = useRouter()

/**
 * 返回文档首页
 */
function goBack() {
  router.push('/docs')
}
</script>

<style scoped>
.doc-container {
  padding: 24px;
}
.doc-header {
  margin-bottom: 16px;
}
.doc-subtitle {
  color: #666;
  margin: 6px 0 12px 0;
}
.doc-section {
  margin-bottom: 14px;
}
.card-header {
  font-weight: 600;
}
.doc-steps {
  padding-left: 20px;
}
.tip {
  margin-top: 10px;
}
.doc-footer {
  margin-top: 16px;
}
</style>