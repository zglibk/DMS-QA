<template>
  <div class="performance-wrapper">
    <!-- Page Header -->
    <div class="page-header" style="margin-bottom: 20px; display: flex; align-items: center; cursor: pointer;" @click="handleBackToHome">
      <el-icon :size="24" color="#409EFF" style="margin-right: 10px;"><Platform /></el-icon>
      <span style="font-size: 20px; font-weight: 600; color: #303133;">性能实验报告</span>
    </div>

    <div class="performance-inspection-container">
      <div class="left-panel">
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
             <el-button link :icon="ArrowLeft" @click="handleBackToHome" class="back-home-btn">
                 返回首页
             </el-button>
        </div>
        <div style="flex: 1; overflow-y: auto;">
            <ReportList ref="reportListRef" @select="handleSelect" />
        </div>
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
          <div class="dashboard-container" v-if="!loading" style="width: 100%; padding: 20px;">
              <!-- Statistics Cards -->
              <el-row :gutter="20" style="margin-bottom: 20px;">
                  <el-col :span="6">
                      <el-card shadow="hover" class="stat-card blue-card">
                          <template #header>
                              <div class="card-header">
                                  <span><el-icon class="card-icon"><Document /></el-icon> 总报告数</span>
                                  <el-tag type="primary" size="small" effect="plain">Total</el-tag>
                              </div>
                          </template>
                          <div class="stat-value text-blue">{{ dashboardStats.total }}</div>
                      </el-card>
                  </el-col>
                  <el-col :span="6">
                      <el-card shadow="hover" class="stat-card orange-card">
                          <template #header>
                              <div class="card-header">
                                  <span><el-icon class="card-icon"><Timer /></el-icon> 待审核</span>
                                  <el-tag type="warning" size="small" effect="plain">Pending</el-tag>
                              </div>
                          </template>
                          <div class="stat-value text-warning">{{ dashboardStats.pending }}</div>
                      </el-card>
                  </el-col>
                   <el-col :span="12">
                      <el-card shadow="hover" class="stat-card quick-actions-card">
                           <template #header>
                              <div class="card-header">
                                  <span><el-icon class="card-icon"><DataLine /></el-icon> 快捷操作</span>
                              </div>
                          </template>
                          <div class="quick-actions">
                              <el-button type="primary" :icon="Plus" @click="handleCreateReport" plain>新建报告</el-button>
                              <el-button type="success" :icon="Check" @click="handleBatchAudit" plain :disabled="!canBatchAudit">报告审核</el-button>
                              <el-button type="info" :icon="Refresh" @click="handleRefreshList" plain>刷新列表</el-button>
                              <el-button type="danger" :icon="CircleClose" :disabled="selectedRows.length === 0" @click="handleBatchDelete" plain>批量删除</el-button>
                          </div>
                      </el-card>
                  </el-col>
              </el-row>

              <!-- Recent Reports Table -->
              <el-card shadow="hover" class="list-card">
                  <template #header>
                      <div class="card-header">
                          <span><el-icon class="card-icon"><List /></el-icon> 最近更新</span>
                          <el-button link type="primary" :icon="Refresh" @click="handleRefreshList">刷新</el-button>
                      </div>
                  </template>
                  <el-table 
                      :data="recentReports" 
                      style="width: 100%" 
                      stripe 
                      border
                      header-cell-class-name="table-header-center" 
                      cell-class-name="table-cell-center" 
                      @selection-change="handleSelectionChange"
                  >
                      <el-table-column type="selection" width="55" align="center" />
                      <el-table-column type="index" label="序号" width="60" align="center" />
                      <el-table-column prop="ReportNo" label="报告编号" min-width="180" align="center" show-overflow-tooltip />
                      <el-table-column prop="SampleName" label="样品名称" min-width="200" align="left" header-align="center" show-overflow-tooltip />
                      <el-table-column prop="CreatorName" label="创建人" width="120" align="center" show-overflow-tooltip>
                          <template #default="{ row }">
                              {{ row.CreatorName || row.CreatedBy }}
                          </template>
                      </el-table-column>
                      <el-table-column label="状态" width="100" align="center">
                          <template #default="{ row }">
                              <el-tag :type="getStatusType(row.Status)" size="small">{{ getStatusText(row.Status || 'Draft') }}</el-tag>
                          </template>
                      </el-table-column>
                      <el-table-column label="创建时间" width="180" align="center" show-overflow-tooltip>
                          <template #default="{ row }">
                              {{ formatDate(row.CreatedAt) }}
                          </template>
                      </el-table-column>
                      <el-table-column label="操作" width="200" fixed="right" align="center">
                          <template #default="{ row }">
                              <el-button link type="primary" size="small" :icon="View" @click="handleSelect(row.ID)">查看</el-button>
                              <el-button link type="primary" size="small" :icon="Edit" @click="handleEdit(row)" :disabled="!checkPerformanceEditPermission(row)">编辑</el-button>
                              <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">删除</el-button>
                          </template>
                      </el-table-column>
                  </el-table>
                  
                  <div class="pagination-container" style="margin-top: 15px; display: flex; justify-content: flex-end;">
                      <el-pagination
                          v-model:current-page="currentPage"
                          v-model:page-size="pageSize"
                          :page-sizes="[5, 10, 20, 50]"
                          layout="total, sizes, prev, pager, next, jumper"
                          :total="total"
                          @size-change="handleSizeChange"
                          @current-change="handleCurrentChange"
                      />
                  </div>
              </el-card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ReportList from './ReportList.vue'
import ReportDetail from './ReportDetail.vue'
import { Platform, Document, Edit, Printer, Plus, DataLine, List, Timer, CircleCheck, CircleClose, View, Delete, Refresh, ArrowLeft, Check } from '@element-plus/icons-vue'
import { getReports, deleteReport, updateReport } from '@/api/performance'
import { getDashboardSummary } from '@/api/inspectionDashboard'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { checkPerformanceAuditPermission, checkPerformanceEditPermission } from '@/utils/permission'

const userStore = useUserStore()
const selectedId = ref(null)
const detailKey = ref(0)
const reportListRef = ref(null)
const loading = ref(false)

// Pagination State
const currentPage = ref(1)
const pageSize = ref(5)
const total = ref(0)

// Dashboard Data
const dashboardStats = ref({
    total: 0,
    pending: 0,
    passed: 0,
    rejected: 0
})
const recentReports = ref([])
const dashboardLoading = ref(false)

const fetchTableData = async () => {
    try {
        const res = await getReports({
            page: currentPage.value,
            pageSize: pageSize.value
        })
        if (res.data) {
            recentReports.value = res.data
            total.value = res.total
            dashboardStats.value.total = res.total
        }
    } catch(e) {
        console.error(e)
    }
}

const fetchDashboardData = async () => {
    dashboardLoading.value = true
    try {
        // Fetch Stats
        const summaryRes = await getDashboardSummary()
        if (summaryRes.data) {
            dashboardStats.value.pending = summaryRes.data.perfPending || 0
        }

        // Fetch Table Data
        await fetchTableData()
    } catch (e) {
        console.error(e)
    } finally {
        dashboardLoading.value = false
    }
}

const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    fetchTableData()
}

const handleCurrentChange = (val) => {
    currentPage.value = val
    fetchTableData()
}

onMounted(() => {
    fetchDashboardData()
})

const selectedRows = ref([])

const handleSelectionChange = (val) => {
    selectedRows.value = val
}

const canBatchAudit = computed(() => {
    // 1. Must select at least one row
    if (selectedRows.value.length === 0) return false
    
    // 2. Check every row using the centralized permission logic
    return selectedRows.value.every(row => checkPerformanceAuditPermission(row))
})

const handleBatchAudit = () => {
    if (selectedRows.value.length === 0) return
    ElMessageBox.confirm(
        `确定要批量审核通过这 ${selectedRows.value.length} 条报告吗？`,
        '审核确认',
        {
            confirmButtonText: '通过',
            cancelButtonText: '取消',
            type: 'success',
        }
    )
    .then(async () => {
        try {
            for (const row of selectedRows.value) {
                await updateReport(row.ID, { 
                    Status: 'Audited',
                    Auditor: userStore.user.username 
                })
            }
            ElMessage.success('批量审核成功')
            fetchTableData()
            handleRefreshList()
            selectedRows.value = [] // clear selection
        } catch (e) {
            console.error(e)
            ElMessage.error('批量审核过程中发生错误')
        }
    })
    .catch(() => {})
}

const handleBatchDelete = () => {
    if (selectedRows.value.length === 0) return
    ElMessageBox.confirm(
        `确定要批量删除这 ${selectedRows.value.length} 条报告吗？此操作不可恢复。`,
        '警告',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    )
    .then(async () => {
        try {
            // Sequential deletion (or backend could support batch delete API)
            // For now, loop delete
            for (const row of selectedRows.value) {
                await deleteReport(row.ID)
            }
            ElMessage.success('批量删除成功')
            // Refresh table data instead of full dashboard
            fetchTableData()
            // Optional: refresh left list if needed
            handleRefreshList()
            selectedRows.value = [] // clear selection
        } catch (e) {
            console.error(e)
            ElMessage.error('批量删除过程中发生错误')
        }
    })
    .catch(() => {})
}

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

const handleEdit = (row) => {
    handleSelect(row.ID)
}

const handleDelete = (row) => {
    ElMessageBox.confirm(
        '确定要删除该报告吗？此操作不可恢复。',
        '警告',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    )
    .then(async () => {
        try {
            await deleteReport(row.ID)
            ElMessage.success('删除成功')
            fetchTableData()
            handleRefreshList()
        } catch (e) {
            console.error(e)
            ElMessage.error('删除失败')
        }
    })
    .catch(() => {})
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

const handleBackToHome = () => {
    handleCloseDetail()
    // Optional: Refresh dashboard data when returning home
    fetchDashboardData()
}

/**
 * 格式化日期时间
 * @param {string} date - 日期字符串
 * @returns {string} 格式化后的日期时间
 */
const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
}

/**
 * 获取状态对应的标签类型
 * @param {string} status - 状态值
 * @returns {string} Element Plus Tag Type
 */
const getStatusType = (status) => {
    const map = {
        'Draft': 'info',
        'Submitted': 'warning',
        'Audited': 'success',
        'Rejected': 'danger'
    }
    return map[status] || 'info'
}

/**
 * 获取状态对应的显示文本
 * @param {string} status - 状态值
 * @returns {string} 显示文本
 */
const getStatusText = (status) => {
    const map = {
        'Draft': '草稿',
        'Submitted': '待审核',
        'Audited': '已审核',
        'Rejected': '已驳回'
    }
    return map[status] || status
}
</script>

<style scoped>
.performance-wrapper {
    /* 
       Calculate height: 100vh - Header(80px) - MainPaddingTop(24px) - MainPaddingBottom(24px) - Footer(45px) = 173px
       Let's use 180px to be safe.
    */
    height: calc(100vh - 180px); 
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Prevent body scroll */
}

.performance-inspection-container {
  flex: 1; /* Take remaining height */
  display: flex;
  background: transparent;
  padding: 0;
  gap: 10px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden; /* Prevent container scroll */
  align-items: stretch; /* Stretch children to full height */
}
.left-panel {
  width: 380px;
  background: white;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  border: 1px solid #e4e7ed;
  /* position: sticky; Remove sticky */
  /* top: 20px; */
  height: 100%; /* Full height */
}
.right-panel {
  flex: 1;
  background: white;
  overflow-y: auto; /* Independent scroll */
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  padding: 0;
  box-shadow: none;
  border: 1px solid #e4e7ed;
  height: 100%; /* Full height */
}
.empty-state {
    display: flex;
    justify-content: center;
    align-items: flex-start; 
    height: 100%;
    color: #606266;
    overflow-y: auto; 
}

/* Dashboard Styles */
.stat-card {
    border: none;
    border-radius: 8px;
    transition: all 0.3s;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* Always show shadow */
    height: 100%; /* Ensure equal height */
    display: flex;
    flex-direction: column;
}
.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px 0 rgba(64, 158, 255, 0.2); /* Change shadow color on hover */
}
.blue-card :deep(.el-card__header) {
    background: linear-gradient(to right, #ecf5ff, #ffffff);
}
.orange-card :deep(.el-card__header) {
    background: linear-gradient(to right, #fdf6ec, #ffffff);
}
.quick-actions-card:hover {
     box-shadow: 0 4px 16px 0 rgba(103, 194, 58, 0.2);
}

.stat-card :deep(.el-card__header) {
    padding: 12px 20px;
    border-bottom: 1px solid #ebeef5;
}
.stat-card :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 15px;
    font-weight: 500;
    color: #606266;
}
.card-icon {
    margin-right: 6px;
    vertical-align: middle;
    font-size: 16px;
}
.stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #303133;
    text-align: center;
    padding: 15px 0;
}
.text-blue {
    color: #409EFF;
}
.text-warning {
    color: #e6a23c;
}
.quick-actions {
    display: flex;
    gap: 15px;
    justify-content: flex-start; /* Align left */
    padding: 15px 10px;
}
.list-card {
    border: none;
    border-radius: 8px;
    margin-top: 10px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* Always show shadow */
    transition: all 0.3s;
}
.list-card:hover {
     box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15); /* Slightly darker shadow on hover */
}
.list-card :deep(.el-card__header) {
    padding: 12px 20px;
    background: #fafafa;
}

.back-home-btn {
    width: 100%;
    justify-content: flex-start;
    color: #606266;
    font-size: 14px;
    transition: color 0.3s;
}
.back-home-btn:hover {
    color: #409EFF;
}
</style>
