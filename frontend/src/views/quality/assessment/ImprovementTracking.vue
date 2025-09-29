<template>
  <div class="improvement-tracking">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>改善期跟踪</h2>
        <p class="page-description">跟踪员工改善期状态，管理返还条件和处理流程</p>
      </div>
      <div class="header-right">
        <el-button type="success" @click="handleAutoReturn">
          <el-icon><Setting /></el-icon>
          自动返还处理
        </el-button>
      </div>
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
          <el-cascader
            v-model="filterForm.department"
            :options="departmentOptions"
            :props="cascaderProps"
            placeholder="选择部门"
            clearable
            filterable
            :show-all-levels="false"
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            @change="handleDepartmentChange"
          />
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
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="employeeName" label="员工姓名" width="100" align="center" />
        <el-table-column prop="department" label="责任部门" width="120" align="center" />
        <el-table-column prop="position" label="责任类型" width="120" align="center">
          <template #default="{ row }">
            {{ getResponsibilityTypeLabel(row.position) }}
          </template>
        </el-table-column>
        <el-table-column prop="assessmentCount" label="考核次数" width="100" align="center" />
        <el-table-column prop="totalAmount" label="总考核金额" width="120" align="center">
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.totalAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="improvementStartDate" label="改善期开始" width="120" align="center" />
        <el-table-column prop="improvementEndDate" label="改善期结束" width="120" align="center" />
        <el-table-column prop="remainingDays" label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRemainingDaysTagType(row.remainingDays)">
              {{ row.remainingDays }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastAssessmentDate" label="最后考核日期" width="120" align="center" />
        <el-table-column prop="noAssessmentDays" label="无考核天数" width="100" align="center">
          <template #default="{ row }">
            <span :class="getNoAssessmentDaysClass(row.noAssessmentDays)">
              {{ row.noAssessmentDays }}天
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="trackingStatus" label="跟踪状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTrackingStatusTagType(row.trackingStatus)">
              {{ getTrackingStatusLabel(row.trackingStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-row :gutter="8" justify="center">
              <!-- 详情按钮列 -->
              <el-col :span="8">
                <el-button 
                  type="primary" 
                  size="small" 
                  text 
                  @click="handleViewDetails(row)"
                  style="width: 100%"
                >
                  详情
                </el-button>
              </el-col>
              <!-- 时间线按钮列 -->
              <el-col :span="8">
                <el-button 
                  type="info" 
                  size="small" 
                  text 
                  @click="handleViewTimeline(row)"
                  style="width: 100%"
                >
                  时间线
                </el-button>
              </el-col>
              <!-- 返还按钮列 - 移动到第3列 -->
              <el-col :span="8">
                <el-button 
                  v-if="row.trackingStatus === 'eligible_return'"
                  type="success" 
                  size="small" 
                  text
                  @click="handleReturn(row)"
                  style="width: 100%"
                >
                  返还
                </el-button>
              </el-col>
            </el-row>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[5, 10, 20, 50, 100]"
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
      :style="{ maxHeight: '80vh' }"
      :body-style="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <div class="detail-content" v-if="selectedEmployee">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="员工姓名">{{ selectedEmployee.employeeName }}</el-descriptions-item>
          <el-descriptions-item label="责任部门">{{ selectedEmployee.department }}</el-descriptions-item>
          <el-descriptions-item label="责任类型">{{ selectedEmployee.position }}</el-descriptions-item>
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
import * as assessmentApi from '@/services/assessmentApi'
import api from '@/utils/api'

/**
 * 响应式数据定义
 */
// 筛选表单
const filterForm = reactive({
  employeeName: '',
  department: '',
  trackingStatus: ''
})

// 部门相关数据
const departmentOptions = ref([])
const cascaderProps = {
  value: 'ID',
  label: 'Name',
  children: 'children',
  checkStrictly: true,
  emitPath: false
}

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
  pageSize: 5,
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
  loadDepartments()
  loadData()
  loadOverview()
})

/**
 * 数据加载函数
 */
// 加载部门数据
const loadDepartments = async () => {
  try {
    console.log('开始加载部门数据...')
    const response = await api.get('/departments/tree')
    console.log('部门API响应:', response)
    
    if (response && response.success) {
      departmentOptions.value = response.data || []
      console.log('部门数据加载成功:', departmentOptions.value)
    } else {
      console.error('获取部门数据失败:', response?.message || '响应格式错误')
      console.error('完整响应:', response)
      ElMessage.error(`获取部门数据失败: ${response?.message || '响应格式错误'}`)
    }
  } catch (error) {
    console.error('获取部门数据失败:', error)
    console.error('错误详情:', error.response?.data)
    console.error('错误状态码:', error.response?.status)
    
    let errorMessage = '未知错误'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    ElMessage.error(`获取部门数据失败: ${errorMessage}`)
  }
}

// 加载跟踪数据
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      employeeName: filterForm.employeeName,
      department: filterForm.department,
      trackingStatus: filterForm.trackingStatus
    }
    
    const response = await assessmentApi.getImprovementTracking(params)
    
    if (response.data && response.data.success) {
      // 修复数据结构解析：后端返回的是data数组和pagination对象
      trackingData.value = response.data.data || []
      pagination.total = response.data.pagination?.total || 0
    } else {
      ElMessage.error('获取改善期跟踪数据失败')
    }
  } catch (error) {
    console.error('获取改善期跟踪数据失败:', error)
    ElMessage.error('加载数据失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载概览数据
const loadOverview = async () => {
  try {
    // 传递与列表查询相同的筛选条件参数，确保统计卡片数据与筛选结果一致
    const params = {
      employeeName: filterForm.employeeName,
      department: filterForm.department,
      trackingStatus: filterForm.trackingStatus
    }
    
    const response = await assessmentApi.getImprovementOverview(params)
    
    if (response.data && response.data.success) {
      Object.assign(overview, response.data.data || {
        inProgressCount: 0,
        expiringSoonCount: 0,
        eligibleReturnCount: 0,
        returnedAmount: 0
      })
    } else {
      ElMessage.error('获取概览数据失败')
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
    ElMessage.error('获取概览数据失败')
  }
}

/**
 * 事件处理函数
 */
// 筛选
const handleFilter = () => {
  pagination.currentPage = 1
  loadData()
  loadOverview() // 同时更新统计卡片数据
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
    await ElMessageBox.confirm(
      '确认要执行自动返还操作吗？系统将自动处理所有符合条件的改善期返还。',
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const { value: operatorName } = await ElMessageBox.prompt(
      '请输入操作人姓名：',
      '自动返还',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '操作人姓名不能为空'
      }
    )
    
    const response = await assessmentApi.autoReturn({
      operatorName,
      remarks: '系统自动返还处理'
    })
    
    if (response.data && response.data.success) {
      ElMessage.success('自动返还处理成功')
      await loadData()
      await loadOverview()
    } else {
      ElMessage.error(response.data?.message || '自动返还处理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('自动返还处理失败:', error)
      ElMessage.error('自动返还处理失败')
    }
  }
}

// 单个返还处理
const handleReturn = async (row) => {
  try {
    const { value: operatorName } = await ElMessageBox.prompt(
      '请输入操作人姓名：',
      '单个返还处理',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '操作人姓名不能为空'
      }
    )
    
    const response = await assessmentApi.processReturn(row.id, {
      operatorName,
      returnPercentage: 100,
      remarks: '手动返还处理'
    })
    
    if (response.data && response.data.success) {
      ElMessage.success('返还处理成功')
      await loadData()
      await loadOverview()
    } else {
      ElMessage.error(response.data?.message || '返还处理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('返还处理失败:', error)
      ElMessage.error('返还处理失败')
    }
  }
}

// 查看详情
const handleViewDetails = (row) => {
  // 使用真实数据填充详情对话框
  selectedEmployee.value = {
    employeeName: row.employeeName,
    department: row.department,
    position: row.position || '未知',
    assessmentCount: row.assessmentCount,
    totalAmount: row.totalAmount,
    improvementStartDate: row.improvementStartDate,
    improvementEndDate: row.improvementEndDate,
    remainingDays: row.remainingDays,
    lastAssessmentDate: row.lastAssessmentDate,
    noAssessmentDays: row.noAssessmentDays,
    trackingStatus: row.trackingStatus,
    assessmentRecords: row.assessmentRecords || []
  }
  detailDialogVisible.value = true
}

// 查看时间线
const handleViewTimeline = (row) => {
  // 使用真实数据填充时间线对话框
  timelineData.value = row.assessmentRecords?.map(record => ({
    date: record.assessmentDate,
    title: `考核记录 - ${record.complaintNumber}`,
    description: record.remarks,
    amount: record.assessmentAmount,
    status: record.status,
    type: 'assessment'
  })) || []
  
  // 添加改善期开始和结束节点
  if (row.improvementStartDate) {
    timelineData.value.unshift({
      date: row.improvementStartDate,
      title: '改善期开始',
      description: '开始改善期跟踪',
      type: 'start'
    })
  }
  
  if (row.improvementEndDate) {
    timelineData.value.push({
      date: row.improvementEndDate,
      title: '改善期结束',
      description: '改善期跟踪结束',
      type: 'end'
    })
  }
  
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
// 获取责任类型标签文本
const getResponsibilityTypeLabel = (responsibilityType) => {
  const labelMap = {
    // PersonType映射为ResponsibilityType（主要映射逻辑）
    'MainPerson': '直接责任',
    'ReworkMainPerson': '直接责任',
    'ExceptionMainPerson': '直接责任',
    'SecondPerson': '连带责任', 
    'Manager': '管理责任',
    // ResponsibilityType映射（直接映射）
    'direct': '直接责任',
    'management': '管理责任',
    'joint': '连带责任',
    // 兼容旧的中文映射
    '主责人': '直接责任',
    '返工主责人': '直接责任',
    '异常主责人': '直接责任',
    '次责人': '连带责任',
    '管理人员': '管理责任',
    '直接责任': '直接责任',
    '管理责任': '管理责任',
    '连带责任': '连带责任'
  }
  return labelMap[responsibilityType] || '直接责任'
}

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
    pending: '待考核',
    improving: '改善中',
    returned: '已返还',
    confirmed: '已确认',
    exempt: '免考核'  // 免考核状态标签文本
  }
  return labelMap[status] || status
}
/**
 * 事件处理函数
 */
// 部门选择变化处理
const handleDepartmentChange = (value) => {
  // 当选择部门时，获取部门名称用于筛选
  if (value) {
    const findDepartmentName = (options, id) => {
      for (const option of options) {
        if (option.ID === id) {
          return option.Name
        }
        if (option.children && option.children.length > 0) {
          const found = findDepartmentName(option.children, id)
          if (found) return found
        }
      }
      return null
    }
    
    const departmentName = findDepartmentName(departmentOptions.value, value)
    filterForm.department = departmentName || ''
  } else {
    filterForm.department = ''
  }
  
  // 自动触发筛选
  handleFilter()
}
</script>

<style scoped>
.improvement-tracking {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
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

/* 操作按钮对齐样式 */
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
}
</style>