<template>
  <div class="instrument-management-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><Tools /></el-icon>
          仪器管理
        </h1>
        <p class="page-subtitle">仪器设备台账管理、校准检定结果登记、年度计划制定</p>
      </div>
    </div>

    <!-- 标签页内容 -->
    <div class="content-section">
      <el-tabs v-model="activeTab" type="card" class="instrument-tabs">
        <!-- 仪器台账 -->
        <el-tab-pane label="仪器台账" name="instruments">
          <InstrumentList />
        </el-tab-pane>
        
        <!-- 校准检定 -->
        <el-tab-pane label="校准检定" name="calibration">
          <CalibrationResults ref="calibrationResultsRef" />
        </el-tab-pane>
        
        <!-- 年度计划 -->
        <el-tab-pane label="年度计划" name="annual-plan">
          <AnnualPlan />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
/**
 * 仪器管理主页面组件
 * 
 * 功能说明：
 * 1. 提供仪器台账管理功能
 * 2. 第三方校准检定结果登记
 * 3. 年度校准计划制定和导出
 * 4. 统一的页面布局和导航
 * 5. 根据路由参数自动切换到对应的标签页
 */

import { ref, onMounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tools } from '@element-plus/icons-vue'
import InstrumentList from './InstrumentList.vue'
import CalibrationResults from './CalibrationResults.vue'
import AnnualPlan from './AnnualPlan.vue'

const route = useRoute()
const router = useRouter()

// 当前激活的标签页
const activeTab = ref('instruments')

// 组件引用
const calibrationResultsRef = ref(null)

/**
 * 处理仪器删除后的数据刷新
 * 当仪器删除成功后，需刷新校准检定结果列表
 */
const handleInstrumentDeleted = () => {
  // 如果校准检定结果组件存在且有刷新方法，则调用刷新
  if (calibrationResultsRef.value && calibrationResultsRef.value.refreshData) {
    calibrationResultsRef.value.refreshData()
  }
}

// 向子组件提供刷新方法
provide('onInstrumentDeleted', handleInstrumentDeleted)

/**
 * 根据路由路径设置激活的标签页
 */
const setActiveTabFromRoute = () => {
  const path = route.path
  if (path.includes('/ledger')) {
    activeTab.value = 'instruments'
  } else if (path.includes('/calibration')) {
    activeTab.value = 'calibration'
  } else if (path.includes('/annual-plan')) {
    activeTab.value = 'annual-plan'
  } else {
    activeTab.value = 'instruments'
  }
}

/**
 * 标签页切换时更新路由
 */
const handleTabChange = (tabName) => {
  let newPath = '/admin/instruments/ledger'
  
  switch (tabName) {
    case 'instruments':
      newPath = '/admin/instruments/ledger'
      break
    case 'calibration':
      newPath = '/admin/instruments/calibration'
      break
    case 'annual-plan':
      newPath = '/admin/instruments/annual-plan'
      break
  }
  
  if (route.path !== newPath) {
    router.push(newPath)
  }
}

// 监听路由变化
watch(() => route.path, () => {
  setActiveTabFromRoute()
})

// 监听标签页变化
watch(activeTab, (newTab) => {
  handleTabChange(newTab)
})

// 组件挂载时设置初始标签页
onMounted(() => {
  setActiveTabFromRoute()
})
</script>

<style scoped>
.instrument-management-container {
  padding: 0;
  background: #f5f7fa;
}

/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
}

.header-left .page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-left .page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 内容区域样式 */
.content-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 标签页样式 */
.instrument-tabs {
  padding: 0;
}

.instrument-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.instrument-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 20px;
}

.instrument-tabs :deep(.el-tabs__item) {
  font-weight: 500;
  font-size: 14px;
  padding: 0 20px;
  height: 50px;
  line-height: 50px;
  border: none !important;
  border-left: none !important;
  border-right: none !important;
  background: transparent;
  color: #606266;
}

.instrument-tabs :deep(.el-tabs__item:first-child) {
  border-left: none !important;
}

.instrument-tabs :deep(.el-tabs__item:last-child) {
  border-right: none !important;
}

.instrument-tabs :deep(.el-tabs__nav) {
  border: none !important;
}

.instrument-tabs :deep(.el-tabs__nav .el-tabs__item) {
  border-left: none !important;
  border-right: none !important;
}

.instrument-tabs :deep(.el-tabs__item.is-active) {
  background: white;
  color: #409eff;
  font-weight: 600;
  border-bottom: 2px solid #409eff;
}

.instrument-tabs :deep(.el-tabs__item:hover) {
  color: #409eff;
}

.instrument-tabs :deep(.el-tabs__content) {
  padding: 20px;
}
</style>