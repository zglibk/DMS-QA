<template>
  <div class="improvement-tracking">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>改善期跟踪</h2>
      <p class="page-description">跟踪员工改善期状态，管理返还条件和处理流程</p>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-input
            v-model="filterForm.employeeName"
            placeholder="员工姓名"
            clearable
            @keyup.enter="handleFilter"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterForm.department" placeholder="部门" clearable>
            <el-option label="生产部" value="生产部" />
            <el-option label="质检部" value="质检部" />
            <el-option label="技术部" value="技术部" />
            <el-option label="采购部" value="采购部" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterForm.trackingStatus" placeholder="跟踪状态" clearable>
            <el-option label="改善期内" value="in_progress" />
            <el-option label="即将到期" value="expiring_soon" />
            <el-option label="符合返还" value="eligible_return" />
            <el-option label="已返还" value="returned" />
            <el-option label="免考核" value="exempt" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleFilter">
            <el-icon><Search /></el-icon>
            筛选
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="handleAutoReturn">
            <el-icon><Setting /></el-icon>
            自动返还处理
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 改善期概览 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card in-progress">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overview.inProgressCount }}</div>
                <div class="card-label">改善期内</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card expiring">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overview.expiringSoonCount }}</div>
                <div class="card-label">即将到期</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card eligible">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overview.eligibleReturnCount }}</div>
                <div class="card-label">符合返还</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card returned">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">¥{{ overview.returnedAmount }}</div>
                <div class="card-label">已返还金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 改善期跟踪表格 -->
    <div class="tracking-table">
      <el-table
        :data="trackingData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="employeeName" label="员工姓名" width="100" />
        <el-table-column prop="department" label="部门" width="100" />
        <el-table-column prop="position" label="职位" width="120" />
        <el-table-column prop="assessmentCount" label="考核次数" width="100" align="center" />
        <el-table-column prop="totalAmount" label="总考核金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.totalAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="improvementStartDate" label="改善期开始" width="120" />
        <el-table-column prop="improvementEndDate" label="改善期结束" width="120" />
        <el-table-column prop="remainingDays" label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRemainingDaysTagType(row.remainingDays)">
              {{ row.remainingDays }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastAssessmentDate" label="最后考核日期" width="120" />
        <el-table-column prop="noAssessmentDays" label="无考核天数" width="100" align="center">
          <template #default="{ row }">
            <span :class="getNoAssessmentDaysClass(row.noAssessmentDays)">
              {{ row.noAssessmentDays }}天
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="trackingStatus" label="跟踪状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getTrackingStatusTagType(row.trackingStatus)">
              {{ getTrackingStatusLabel(row.trackingStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="handleReturn(row)"
              v-if="row.trackingStatus === 'eligible_return'"
            >
              <el-icon><Check /></el-icon>
              返还
            </el-button>
            <el-button type="primary" size="small" @click="handleViewDetails(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button type="info" size="small" @click="handleViewTimeline(row)">
              <el-icon><Timer /></el-icon>
              时间线
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="改善期详情"
      width="800px"
    >
      <div class="detail-content" v-if="selectedEmployee">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="员工姓名">{{ selectedEmployee.employeeName }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ selectedEmployee.department }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ selectedEmployee.position }}</el-descriptions-item>
          <el-descriptions-item label="考核次数">{{ selectedEmployee.assessmentCount }}</el-descriptions-item>
          <el-descriptions-item label="总考核金额">¥{{ selectedEmployee.totalAmount }}</el-descriptions-item>
          <el-descriptions-item label="改善期开始">{{ selectedEmployee.improvementStartDate }}</el-descriptions-item>
          <el-descriptions-item label="改善期结束">{{ selectedEmployee.improvementEndDate }}</el-descriptions-item>
          <el-descriptions-item label="剩余天数">{{ selectedEmployee.remainingDays }}天</el-descriptions-item>
          <el-descriptions-item label="最后考核日期">{{ selectedEmployee.lastAssessmentDate }}</el-descriptions-item>
          <el-descriptions-item label="无考核天数">{{ selectedEmployee.noAssessmentDays }}天</el-descriptions-item>
        </el-descriptions>

        <!-- 考核记录列表 -->
        <div class="assessment-records">
          <h4>考核记录</h4>
          <el-table :data="selectedEmployee.assessmentRecords" size="small" border>
            <el-table-column prop="complaintNumber" label="工单号" width="140" />
            <el-table-column prop="assessmentAmount" label="考核金额" width="100" align="right">
              <template #default="{ row }">
                ¥{{ row.assessmentAmount }}
              </template>
            </el-table-column>
            <el-table-column prop="assessmentDate" label="考核日期" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="150" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 时间线对话框 -->
    <el-dialog
      v-model="timelineDialogVisible"
      title="改善期时间线"
      width="600px"
    >
      <div class="timeline-content">
        <el-timeline>
          <el-timeline-item
            v-for="item in timelineData"
            :key="item.id"
            :timestamp="item.date"
            :type="item.type"
          >
            <div class="timeline-item">
              <h4>{{ item.title }}</h4>
              <p>{{ item.description }}</p>
              <div class="timeline-meta" v-if="item.amount">
                <span class="amount">金额：¥{{ item.amount }}</span>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Setting, Clock, Warning, Check, Money,
  User, View, Timer
} from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
// 筛选表单
const filterForm = reactive({
  employeeName: '',
  department: '',
  trackingStatus: ''
})

// 概览数据
const overview = reactive({
  inProgressCount: 0,
  expiringSoonCount: 0,
  eligibleReturnCount: 0,
  returnedAmount: 0
})

// 跟踪数据
const trackingData = ref([])
const loading = ref(false)
const selectedRows = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 对话框相关
const detailDialogVisible = ref(false)
const timelineDialogVisible = ref(false)
const selectedEmployee = ref(null)
const timelineData = ref([])

/**
 * 生命周期钩子
 */
onMounted(() => {
  loadData()
  loadOverview()
})

/**
 * 数据加载函数
 */
// 加载跟踪数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用后端API获取改善期跟踪数据
    // const response = await improvementApi.getTrackingData({
    //   ...filterForm,
    //   page: pagination.currentPage,
    //   pageSize: pagination.pageSize
    // })
    
    // 模拟数据
    const mockData = [
      {
        id: 1,
        employeeName: '张三',
        department: '生产部',
        position: '操作员',
        assessmentCount: 2,
        totalAmount: 300,
        improvementStartDate: '2024-01-16',
        improvementEndDate: '2024-04-16',
        remainingDays: 45,
        lastAssessmentDate: '2024-01-15',
        noAssessmentDays: 75,
        trackingStatus: 'eligible_return',
        assessmentRecords: [
          {
            complaintNumber: 'QC2024001',
            assessmentAmount: 100,
            assessmentDate: '2024-01-15',
            status: 'improving',
            remarks: '产品质量问题'
          },
          {
            complaintNumber: 'QC2024005',
            assessmentAmount: 200,
            assessmentDate: '2024-01-10',
            status: 'improving',
            remarks: '操作流程不当'
          }
        ]
      },
      {
        id: 2,
        employeeName: '李四',
        department: '质检部',
        position: '质检员',
        assessmentCount: 1,
        totalAmount: 200,
        improvementStartDate: '2024-02-01',
        improvementEndDate: '2024-05-01',
        remainingDays: 15,
        lastAssessmentDate: '2024-01-31',
        noAssessmentDays: 60,
        trackingStatus: 'expiring_soon',
        assessmentRecords: [
          {
            complaintNumber: 'QC2024002',
            assessmentAmount: 200,
            assessmentDate: '2024-01-31',
            status: 'improving',
            remarks: '检验疏漏'
          }
        ]
      }
    ]
    
    trackingData.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载数据失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载概览数据
const loadOverview = async () => {
  try {
    // TODO: 调用后端API获取概览数据
    // const response = await improvementApi.getOverview()
    
    // 模拟概览数据
    Object.assign(overview, {
      inProgressCount: 12,
      expiringSoonCount: 3,
      eligibleReturnCount: 5,
      returnedAmount: 1500
    })
  } catch (error) {
    console.error('加载概览数据失败：', error)
  }
}

/**
 * 事件处理函数
 */
// 筛选
const handleFilter = () => {
  pagination.currentPage = 1
  loadData()
}

// 重置筛选
const resetFilter = () => {
  Object.assign(filterForm, {
    employeeName: '',
    department: '',
    trackingStatus: ''
  })
  handleFilter()
}

// 自动返还处理
const handleAutoReturn = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '系统将自动检测符合返还条件的记录并执行返还处理，确定继续吗？',
      '自动返还处理',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (result === 'confirm') {
      loading.value = true
      // TODO: 调用后端API执行自动返还
      // const result = await improvementApi.autoReturn()
      
      ElMessage.success('自动返还处理完成')
      loadData()
      loadOverview()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('自动返还处理失败：' + error.message)
    }
  } finally {
    loading.value = false
  }
}

// 单个返还处理
const handleReturn = async (row) => {
  try {
    const result = await ElMessageBox.confirm(
      `确定要为 ${row.employeeName} 执行返还处理吗？返还金额：¥${row.totalAmount}`,
      '确认返还',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (result === 'confirm') {
      // TODO: 调用后端API执行返还
      // await improvementApi.processReturn(row.id)
      
      ElMessage.success('返还处理成功')
      loadData()
      loadOverview()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('返还处理失败：' + error.message)
    }
  }
}

// 查看详情
const handleViewDetails = (row) => {
  selectedEmployee.value = row
  detailDialogVisible.value = true
}

// 查看时间线
const handleViewTimeline = (row) => {
  // 模拟时间线数据
  timelineData.value = [
    {
      id: 1,
      date: '2024-01-15',
      type: 'danger',
      title: '质量考核',
      description: '因产品质量问题被考核',
      amount: 100
    },
    {
      id: 2,
      date: '2024-01-16',
      type: 'primary',
      title: '改善期开始',
      description: '进入3个月改善期'
    },
    {
      id: 3,
      date: '2024-04-01',
      type: 'success',
      title: '符合返还条件',
      description: '连续3个月无新的质量考核记录'
    }
  ]
  
  timelineDialogVisible.value = true
}

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadData()
}

/**
 * 工具函数
 */
// 获取剩余天数标签类型
const getRemainingDaysTagType = (days) => {
  if (days <= 7) return 'danger'
  if (days <= 30) return 'warning'
  return 'success'
}

// 获取无考核天数样式类
const getNoAssessmentDaysClass = (days) => {
  if (days >= 90) return 'no-assessment-eligible'
  if (days >= 60) return 'no-assessment-warning'
  return 'no-assessment-normal'
}

// 获取跟踪状态标签类型
const getTrackingStatusTagType = (status) => {
  const typeMap = {
    in_progress: 'primary',
    expiring_soon: 'warning',
    eligible_return: 'success',
    returned: 'info'
  }
  return typeMap[status] || ''
}

// 获取跟踪状态标签文本
const getTrackingStatusLabel = (status) => {
  const labelMap = {
    in_progress: '改善期内',
    expiring_soon: '即将到期',
    eligible_return: '符合返还',
    returned: '已返还'
  }
  return labelMap[status] || status
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    improving: 'primary',
    returned: 'success',
    confirmed: 'info',
    exempt: 'info'  // 免考核状态使用info类型
  }
  return typeMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const labelMap = {
    pending: '待改善',
    improving: '改善中',
    returned: '已返还',
    confirmed: '已确认',
    exempt: '免考核'  // 免考核状态标签文本
  }
  return labelMap[status] || status
}
</script>

<style scoped>
.improvement-tracking {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.overview-section {
  margin-bottom: 20px;
}

.overview-card {
  border-radius: 8px;
  overflow: hidden;
}

.card-content {
  display: flex;
  align-items: center;
  padding: 15px;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.overview-card.in-progress .card-icon {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.overview-card.expiring .card-icon {
  background: linear-gradient(135deg, #f39c12, #e67e22);
}

.overview-card.eligible .card-icon {
  background: linear-gradient(135deg, #27ae60, #229954);
}

.overview-card.returned .card-icon {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.card-info {
  flex: 1;
}

.card-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.tracking-table {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.amount-text {
  font-weight: 600;
  color: #e74c3c;
}

.no-assessment-normal {
  color: #606266;
}

.no-assessment-warning {
  color: #e6a23c;
  font-weight: 600;
}

.no-assessment-eligible {
  color: #67c23a;
  font-weight: 600;
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}

.detail-content {
  padding: 10px 0;
}

.assessment-records {
  margin-top: 20px;
}

.assessment-records h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.timeline-content {
  padding: 10px 0;
}

.timeline-item h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.timeline-item p {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 13px;
}

.timeline-meta {
  display: flex;
  gap: 15px;
}

.timeline-meta .amount {
  color: #e74c3c;
  font-weight: 600;
  font-size: 12px;
}
</style>