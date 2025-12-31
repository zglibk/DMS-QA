<template>
  <div class="performance-wrapper">
    <!-- Page Header -->
    <div class="page-header" style="margin-bottom: 20px; display: flex; align-items: center;">
      <el-icon :size="24" color="#409EFF" style="margin-right: 10px;"><Platform /></el-icon>
      <span style="font-size: 20px; font-weight: 600; color: #303133;">性能实验报告</span>
    </div>

    <div class="performance-inspection-container">
      <div class="left-panel">
        <ReportList ref="reportListRef" @select="handleSelect" />
      </div>
      <div class="right-panel">
        <ReportDetail 
          v-if="selectedId" 
          :report-id="selectedId" 
          :key="selectedId + '-' + detailKey"
          @refresh="handleRefreshList" 
          @close="handleCloseDetail"
        />
        <div v-else class="empty-state" v-loading="loading">
          <div class="welcome-container" v-if="!loading">
              <el-icon class="welcome-icon" color="#409EFF"><Platform /></el-icon>
              <h2>实验报告管理</h2>
              <p>请在左侧列表中选择一份报告查看详情，或者点击下方按钮新建报告</p>
              <div class="features">
                  <div class="feature-item blue">
                      <div class="icon-wrapper"><el-icon><Document /></el-icon></div>
                      <span>报告管理</span>
                  </div>
                  <div class="feature-item orange">
                      <div class="icon-wrapper"><el-icon><Edit /></el-icon></div>
                      <span>数据录入</span>
                  </div>
                  <div class="feature-item green">
                      <div class="icon-wrapper"><el-icon><Printer /></el-icon></div>
                      <span>打印导出</span>
                  </div>
              </div>
              <div class="action-area">
                  <el-button type="primary" size="large" :icon="Plus" @click="handleCreateReport" round class="create-btn">立即新建报告</el-button>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ReportList from './ReportList.vue'
import ReportDetail from './ReportDetail.vue'
import { Platform, Document, Edit, Printer, Plus } from '@element-plus/icons-vue'

const selectedId = ref(null)
const detailKey = ref(0)
const reportListRef = ref(null)
const loading = ref(false)

const handleSelect = (id) => {
  if (selectedId.value === id) {
      detailKey.value++ // Force refresh if clicking same ID (e.g. withdraw action)
  }
  selectedId.value = id
  if (id) {
    loading.value = true
    // Simulate loading or wait for child to mount
    // Actually ReportDetail handles its own loading, but we need to show loading while component mounts
    setTimeout(() => { loading.value = false }, 300)
  }
}

const handleRefreshList = () => {
    if (reportListRef.value) {
        reportListRef.value.fetchList()
    }
}

const handleCreateReport = () => {
    reportListRef.value?.handleCreate()
}

const handleCloseDetail = () => {
    selectedId.value = null
    reportListRef.value?.selectItem(null)
}
</script>

<style scoped>
.performance-inspection-container {
  display: flex;
  min-height: calc(100vh - 200px); /* Minimum height for the whole area */
  background: transparent;
  padding: 0; /* Remove padding */
  gap: 10px;
  box-sizing: border-box;
  position: relative;
  align-items: flex-start; /* Ensure children align to top */
}
.left-panel {
  width: 380px;
  background: white;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  border: 1px solid #e4e7ed;
  /* Removed sticky positioning */
  min-height: 500px;
}
.right-panel {
  flex: 1;
  background: white;
  overflow: visible;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  padding: 0;
  box-shadow: none;
  border: 1px solid #e4e7ed;
  min-height: calc(100vh - 200px);
}
.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #606266;
    padding: 20px;
}
.welcome-container {
    text-align: center;
}
.welcome-icon {
    font-size: 120px;
    margin-bottom: 20px;
}
.welcome-container h2 {
    font-size: 24px;
    color: #303133;
    margin-bottom: 10px;
}
.welcome-container p {
    font-size: 14px;
    color: #909399;
    margin-bottom: 30px;
}
.features {
    display: flex;
    justify-content: center;
    gap: 60px;
    margin-bottom: 40px;
}
.feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: #606266;
    cursor: default;
    transition: transform 0.3s;
}
.feature-item:hover {
    transform: translateY(-5px);
}
.icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
    transition: all 0.3s;
}
.feature-item .el-icon {
    font-size: 28px;
    transition: all 0.3s;
}

/* Blue */
.feature-item.blue .icon-wrapper { background: #ecf5ff; }
.feature-item.blue .el-icon { color: #409EFF; }
.feature-item.blue:hover .icon-wrapper { 
    background: #409EFF; 
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* Orange */
.feature-item.orange .icon-wrapper { background: #fdf6ec; }
.feature-item.orange .el-icon { color: #E6A23C; }
.feature-item.orange:hover .icon-wrapper { 
    background: #E6A23C; 
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
}

/* Green */
.feature-item.green .icon-wrapper { background: #f0f9eb; }
.feature-item.green .el-icon { color: #67C23A; }
.feature-item.green:hover .icon-wrapper { 
    background: #67C23A; 
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.feature-item:hover .el-icon {
    color: #fff;
}

.action-area {
    margin-top: 30px;
}
.create-btn {
    padding-left: 40px;
    padding-right: 40px;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    transition: all 0.3s;
}
.create-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}
</style>
