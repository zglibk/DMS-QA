<template>
  <div class="print-preview-page">
    <!-- Close Icon -->
    <div class="close-icon-wrapper no-print" @click="handleClose">
      <el-icon :size="30" color="#909399"><CircleCloseFilled /></el-icon>
    </div>

    <!-- Print Button (Fixed Right) -->
    <div class="print-btn-wrapper no-print">
        <el-button type="primary" size="large" class="print-float-btn" :icon="Printer" @click="handlePrint">
            打印
        </el-button>
    </div>
    
    <div class="preview-content" v-loading="loading">
      <IncomingReportPrint v-if="reportData" :data="reportData" :preview-mode="true" ref="printComponentRef" />
      <div v-else-if="!loading" class="error-msg">
        加载报告数据失败或数据不存在
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getIncomingReportDetail } from '@/api/inspection'
import IncomingReportPrint from './components/IncomingReportPrint.vue'
import { CircleCloseFilled, Printer } from '@element-plus/icons-vue'

const route = useRoute()
const loading = ref(false)
const reportData = ref(null)
const printComponentRef = ref(null)

onMounted(() => {
  const id = route.params.id
  if (id) {
    fetchData(id)
  }
})

const fetchData = async (id) => {
  loading.value = true
  try {
    const res = await getIncomingReportDetail(id)
    if (res.success) {
      reportData.value = res.data
      // 等待DOM渲染，然后刷新配置（如LOGO）
      nextTick(() => {
        if (printComponentRef.value && printComponentRef.value.refreshConfig) {
          printComponentRef.value.refreshConfig()
        }
      })
    }
  } catch (error) {
    console.error('Fetch report detail error:', error)
  } finally {
    loading.value = false
  }
}

const handlePrint = () => {
  // 设置页面标题为：报告编号-材料名称 采购单号
  const originalTitle = document.title
  if (reportData.value) {
      let title = reportData.value.ReportNo || '来料检验报告'
      if (reportData.value.ProductName) {
          title += '-' + reportData.value.ProductName
      }
      if (reportData.value.PONumber) {
          title += ' ' + reportData.value.PONumber
      }
      document.title = title
  }

  window.print()

  // 恢复标题 (虽然后续页面可能关闭或不再重要，但保持整洁)
  document.title = originalTitle
}

const handleClose = () => {
  window.close()
}
</script>

<style scoped>
.print-preview-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.close-icon-wrapper {
    position: absolute;
    /* Position relative to the page container, or we can make it fixed if desired */
    /* Since we want it 'outside top right of the report', let's use absolute relative to the flex container */
    /* The report is 210mm wide. Let's position it carefully. */
    /* Easier approach: absolute top right of the viewport or container */
    top: 20px;
    right: calc(50% - 105mm - 50px); /* 210mm/2 = 105mm. 50px gap */
    cursor: pointer;
    transition: transform 0.3s;
    z-index: 1000;
}

.close-icon-wrapper:hover {
    transform: scale(1.2);
}

.print-btn-wrapper {
    position: fixed;
    top: 50%;
    left: calc(50% + 105mm + 20px);
    transform: translateY(-50%);
    z-index: 1000;
}

.print-float-btn {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Fallback for smaller screens where the close icon calculation might go off-screen */
@media screen and (max-width: 1200px) {
    .close-icon-wrapper {
        right: 20px;
    }
    .print-btn-wrapper {
        left: auto;
        right: 20px;
    }
}

.preview-content {
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
  /* Make sure content is centered */
  position: relative;
}

.error-msg {
  padding: 40px;
  color: #909399;
}

@media print {
  .print-preview-page {
    padding: 0;
    background: white;
    display: block; /* 恢复默认流布局 */
  }
  .close-icon-wrapper,
  .print-btn-wrapper {
      display: none !important;
  }

  .preview-content {
    box-shadow: none;
    margin: 0;
  }
  /* 确保内容可见 */
  :deep(.print-container) {
    display: block !important;
    position: static !important; /* 不再绝对定位，而是流式 */
    margin: 0 !important; /* 避免居中 margin 影响打印 */
    box-shadow: none !important;
  }
}
</style>
