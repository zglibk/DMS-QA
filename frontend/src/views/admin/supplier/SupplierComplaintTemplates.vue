<template>
  <div class="complaint-templates-page">
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2>投诉书模板管理</h2>
      </div>
    </div>
    <div class="page-content">
      <SupplierComplaintTemplateManager ref="managerRef" @template-change="handleTemplateChange" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import SupplierComplaintTemplateManager from '@/components/SupplierComplaintTemplateManager.vue'

const router = useRouter()
const managerRef = ref(null)

const goBack = () => {
  router.push('/admin/supplier/complaints')
}

const handleTemplateChange = () => {
  // 模板变更时的回调，可用于通知其他页面刷新
}
</script>

<style scoped>
.complaint-templates-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.page-content > * {
  height: 100%;
}
</style>
