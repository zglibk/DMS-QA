<template>
  <AppLayout>
    <div class="doc-container">
      <div class="doc-header">
        <h1>投诉记录批量导入使用说明</h1>
        <p class="doc-subtitle">指导你通过Excel模板进行批量导入，并完成数据校验与问题定位</p>
        <el-alert type="success" :closable="false">
          <template #title>
            本文档可直接访问，无需登录和权限校验
          </template>
        </el-alert>
      </div>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">一、准备Excel模板</div>
        </template>
        <ul>
          <li>在“质量异常数据导入”页面下载最新模板（文件名：complaint_template.xlsx）。</li>
          <li>按模板列填充数据，确保数据类型与示例一致。</li>
          <li>图片附件路径可为空；如需导入图片，请填写可访问路径。</li>
        </ul>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">二、导入流程</div>
        </template>
        <ol class="doc-steps">
          <li>打开“质量异常数据导入”页面。</li>
          <li>选择 Excel 文件并点击“开始导入”。</li>
          <li>等待系统校验与导入完成，查看导入结果反馈。</li>
        </ol>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">三、数据校验</div>
        </template>
        <ul>
          <li>必填字段：投诉日期、供应商、投诉描述。</li>
          <li>数据类型：日期列需为合法日期格式，文本列需去除多余空格。</li>
          <li>图片路径：为空或不可访问时系统会忽略，并在日志中记录。</li>
        </ul>
      </el-card>

      <el-card class="doc-section" shadow="never">
        <template #header>
          <div class="card-header">四、常见问题与处理</div>
        </template>
        <ul>
          <li>导入失败：检查Excel格式是否正确，或查看后端导入日志。</li>
          <li>图片未显示：确保路径为HTTP或受支持的上传目录（uploads）。</li>
          <li>重复记录：导入时系统会根据关键字段去重，详见后端逻辑。</li>
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
 * 投诉记录批量导入使用说明页面
 * 功能：提供模板准备、导入流程与校验说明
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
.doc-footer {
  margin-top: 16px;
}
</style>