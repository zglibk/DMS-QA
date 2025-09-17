<template>
  <div class="assessment-records">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>考核记录管理</h2>
      <p class="page-description">质量考核记录查看、编辑和改善期跟踪管理</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <!-- 基础搜索条件 -->
      <el-row :gutter="20" style="margin-bottom: 16px;">
        <el-col :span="4">
          <el-input
            v-model="searchForm.employeeName"
            placeholder="请输入员工姓名"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-input
            v-model="searchForm.department"
            placeholder="请输入部门"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><OfficeBuilding /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="考核状态" clearable>
            <el-option label="待改善" value="pending" />
            <el-option label="改善中" value="improving" />
            <el-option label="已返还" value="returned" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="免考核" value="exempt" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon style="margin-right:5px"><Search /></el-icon>
            搜索
          </el-button>
          <el-button  type="warning" @click="resetSearch">
            <el-icon style="margin-right:5px"><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="primary" plain @click="toggleAdvancedSearch">
            <el-icon style="margin-right: 5px;"><Setting /></el-icon>
            {{ showAdvanced ? '收起查询' : '更多查询' }}
          </el-button>
        </el-col>
      </el-row>
      
      <!-- 高级搜索条件 -->
      <el-row :gutter="20" v-if="showAdvanced">
        <el-col :span="4">
          <el-select v-model="searchForm.position" placeholder="责任类型" clearable>
            <el-option label="直接责任" value="direct" />
            <el-option label="管理责任" value="management" />
            <el-option label="连带责任" value="joint" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.sourceType" placeholder="数据来源" clearable>
            <el-option label="客户投诉" value="complaint" />
            <el-option label="返工记录" value="rework" />
            <el-option label="异常记录" value="exception" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-input
            v-model="searchForm.complaintNumber"
            placeholder="请输入工单号"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-input
            v-model="searchForm.customerCode"
            placeholder="请输入客户编号"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Postcard /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-input
            v-model="searchForm.customerName"
            placeholder="请输入客户名称"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Avatar /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="3">
          <el-input-number
            v-model="searchForm.minAmount"
            placeholder="最小金额"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total-records">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-title">总记录</div>
                <div class="stats-number">{{ statistics.totalRecords }}<el-tag size="small" type="info">条</el-tag></div>
                <div class="stats-date-range">{{ statistics.dateRange }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon improving">
                <el-icon><Loading /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ statistics.improvingCount }}<el-tag size="small" type="warning">条</el-tag></div>
                <div class="stats-label">改善中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon returned">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ statistics.returnedCount }}<el-tag size="small" type="success">条</el-tag></div>
                <div class="stats-label">已返还</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">¥{{ statistics.totalAmount }}</div>
                <div class="stats-label">总考核金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <!-- 表格标题行 -->
      <div class="table-header">
        <div class="table-title">
          <h3>考核记录列表</h3>
        </div>
        <div class="table-actions">
          <!-- 列显示控制按钮 -->
          <el-button type="plan" plain @click="showColumnTransfer">
            <el-icon style="margin-right:5px"><Setting /></el-icon>
            列设置
          </el-button>
          
          <el-button type="success" @click="handleGenerateRecords">
            <el-icon style="margin-right:5px"><Plus /></el-icon>
            生成考核记录
          </el-button>
          <el-button type="primary" @click="handleExportRecords">
            <el-icon style="margin-right:5px"><Download /></el-icon>
            导出考核表
          </el-button>
        </div>
      </div>
      
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column 
          v-if="isColumnVisible('employeeName')"
          prop="employeeName" 
          label="员工姓名" 
          width="100" 
        />
        <el-table-column 
          v-if="isColumnVisible('department')"
          prop="department" 
          label="部门" 
          width="120" 
        />
        <el-table-column 
          v-if="isColumnVisible('position')"
          prop="position" 
          label="责任类型" 
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="getResponsibilityTagType(row.position)">
              {{ getResponsibilityLabel(row.position) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('sourceType')"
          prop="sourceType" 
          label="数据来源" 
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="getSourceTagType(row.sourceType)">
              {{ getSourceLabel(row.sourceType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('complaintNumber')"
          prop="complaintNumber" 
          label="工单号" 
          width="140"
        >
          <template #default="{ row }">
            <el-link type="primary" @click="viewComplaint(row.complaintId)">
              {{ row.complaintNumber }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('customerCode')"
          prop="customerCode" 
          label="客户编号" 
          width="120"
        >
          <template #default="{ row }">
            <span class="customer-code-text">{{ row.customerCode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('productName')"
          prop="productName" 
          label="产品名称" 
          width="150" 
          align="left" 
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="product-name-text" :title="row.productName">
              {{ row.productName || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('sourceDescription')"
          prop="sourceDescription" 
          label="问题描述" 
          min-width="200" 
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="description-text" :title="row.sourceDescription">
              {{ row.sourceDescription || '暂无描述' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('assessmentAmount')"
          prop="assessmentAmount" 
          label="考核金额" 
          width="100" 
          align="right"
        >
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.assessmentAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('assessmentDate')"
          prop="assessmentDate" 
          label="发生日期" 
          width="110" 
        />
        <el-table-column 
          v-if="isColumnVisible('status')"
          prop="status" 
          label="状态" 
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isColumnVisible('improvementStartDate')"
          prop="improvementStartDate" 
          label="改善期开始" 
          width="110" 
        />
        <el-table-column 
          v-if="isColumnVisible('improvementEndDate')"
          prop="improvementEndDate" 
          label="改善期结束" 
          width="110" 
        />
        <el-table-column 
          v-if="isColumnVisible('returnDate')"
          prop="returnDate" 
          label="返还日期" 
          width="110" 
        />
        <el-table-column 
          v-if="isColumnVisible('remarks')"
          prop="remarks" 
          label="备注" 
          min-width="150" 
          show-overflow-tooltip 
          align="left"
        >
          <template #default="{ row }">
            <span class="remarks-text">{{ row.remarks }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="handleProcessReturn(row)"
              v-if="row.status === 'improving'"
            >
              <el-icon><Check /></el-icon>
              处理返还
            </el-button>
            <el-button type="info" size="small" @click="handleViewHistory(row)">
              <el-icon><View /></el-icon>
              历史
            </el-button>
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

    <!-- 列设置穿梭框对话框 -->
    <el-dialog
      v-model="columnTransferVisible"
      title="列设置"
      width="800px"
      :close-on-click-modal="false"
      @close="handleColumnTransferClose"
    >
      <el-transfer
        v-model="selectedColumns"
        filterable
        :filter-method="filterMethod"
        filter-placeholder="搜索列名"
        :data="transferData"
        :titles="['可选列', '已选列']"
        :button-texts="['移除', '添加']"
        :format="{
          noChecked: '${total}',
          hasChecked: '${checked}/${total}'
        }"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetToDefaultColumns">重置默认</el-button>
          <el-button @click="columnTransferVisible = false">取消</el-button>
          <el-button type="primary" @click="saveColumnTransferSettings">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <AssessmentRecordDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :form-data="formData"
      :loading="saving"
      @save="handleSave"
      @cancel="dialogVisible = false"
    />

    <!-- 批量返还处理对话框 -->
    <el-dialog
      v-model="batchReturnDialogVisible"
      title="批量返还处理"
      width="500px"
    >
      <div class="batch-return-content">
        <el-alert
          title="系统将自动检测符合返还条件的记录"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="return-info">
          <p>返还条件：连续3个月无新的质量考核记录</p>
          <p>管理者免于返还机制：部门经理及以上职位</p>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchReturnDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleBatchReturn" :loading="processing">
            执行返还处理
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 生成考核记录对话框 -->
    <GenerateRecordsDialog
      v-model:visible="generateDialogVisible"
      @confirm="handleGenerateConfirm"
      ref="generateDialogRef"
    />

    <!-- 重复记录处理对话框 -->
    <DuplicateRecordsDialog
      v-model:visible="duplicateDialogVisible"
      :duplicate-records="duplicateRecords"
      :loading="duplicateLoading"
      @confirm="handleDuplicateConfirm"
      @cancel="handleDuplicateCancel"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import {
  Search, Refresh, Plus, Clock, Loading, Check, Money,
  User, OfficeBuilding, Edit, View, DataAnalysis, Download,
  Setting, Document, Postcard
} from '@element-plus/icons-vue'
import * as assessmentApi from '@/services/assessmentApi'
import AssessmentRecordDialog from '@/components/AssessmentRecordDialog.vue'
import GenerateRecordsDialog from '@/components/GenerateRecordsDialog.vue'
import DuplicateRecordsDialog from '@/components/DuplicateRecordsDialog.vue'

/**
 * 响应式数据定义
 */
// 搜索表单
const searchForm = reactive({
  employeeName: '',
  department: '',
  status: '',
  position: '',
  sourceType: '',
  complaintNumber: '',
  customerCode: '',
  customerName: '',
  dateRange: [],
  minAmount: null
})

// 高级搜索显示状态
const showAdvanced = ref(false)

// 切换高级搜索
const toggleAdvancedSearch = () => {
  showAdvanced.value = !showAdvanced.value
}

// 统计数据
const statistics = reactive({
  totalRecords: 0,
  dateRange: '',
  improvingCount: 0,
  returnedCount: 0,
  totalAmount: 0
})

// 表格数据
const tableData = ref([])
const loading = ref(false)
const selectedRows = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 5, // 默认设置为最小分页数5
  total: 0
})

// 对话框相关
const dialogVisible = ref(false)
const dialogTitle = ref('')
const saving = ref(false)
const batchReturnDialogVisible = ref(false)
const processing = ref(false)
const generateDialogVisible = ref(false)
const generateDialogRef = ref()
const duplicateDialogVisible = ref(false)
const duplicateRecords = ref([])
const duplicateLoading = ref(false)

// 表单数据
const formData = reactive({
  id: null,
  employeeName: '',
  department: '',
  assessmentAmount: 0,
  status: '',
  improvementStartDate: '',
  improvementEndDate: '',
  remarks: ''
})

// 表单验证规则
const formRules = {
  assessmentAmount: [
    { required: true, message: '请输入考核金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '考核金额不能小于0', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

const formRef = ref()

/**
 * 列显示控制相关数据和方法
 */
// 可用列配置
const availableColumns = ref([
  { key: 'employeeName', label: '员工姓名', required: true },
  { key: 'department', label: '部门', required: false },
  { key: 'position', label: '责任类型', required: false },
  { key: 'sourceType', label: '数据来源', required: false },
  { key: 'complaintNumber', label: '工单号', required: true },
  { key: 'customerCode', label: '客户编号', required: false },
  { key: 'productName', label: '产品名称', required: false },
  { key: 'sourceDescription', label: '问题描述', required: true },
  { key: 'assessmentAmount', label: '考核金额', required: true },
  { key: 'assessmentDate', label: '发生日期', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'improvementStartDate', label: '改善期开始', required: false },
  { key: 'improvementEndDate', label: '改善期结束', required: false },
  { key: 'returnDate', label: '返还日期', required: false },
  { key: 'remarks', label: '备注', required: false }
])

// 默认显示的列
const defaultColumns = [
  'employeeName', 'complaintNumber', 'sourceDescription', 
  'assessmentAmount', 'assessmentDate', 'status'
]

// 当前显示的列
const visibleColumns = ref([...defaultColumns])

// 穿梭框相关数据
const columnTransferVisible = ref(false)
const selectedColumns = ref([])
const transferData = ref([])

/**
 * 初始化穿梭框数据
 */
const initTransferData = () => {
  transferData.value = availableColumns.value.map(column => ({
    key: column.key,
    label: column.label + (column.required ? ' (必需)' : ''),
    disabled: column.required, // 必需列不能移除
    required: column.required
  }))
  
  // 设置已选择的列
  selectedColumns.value = [...visibleColumns.value]
}

/**
 * 穿梭框搜索过滤方法
 */
const filterMethod = (query, item) => {
  return item.label.toLowerCase().includes(query.toLowerCase())
}

/**
 * 显示列设置穿梭框对话框
 */
const showColumnTransfer = () => {
  initTransferData()
  columnTransferVisible.value = true
}

/**
 * 重置为默认列
 */
const resetToDefaultColumns = () => {
  selectedColumns.value = [...defaultColumns]
}

/**
 * 保存穿梭框列设置
 */
const saveColumnTransferSettings = () => {
  // 确保必需列始终显示
  const requiredColumns = availableColumns.value
    .filter(col => col.required)
    .map(col => col.key)
  
  visibleColumns.value = [...new Set([...requiredColumns, ...selectedColumns.value])]
  saveColumnSettings()
  columnTransferVisible.value = false
  ElMessage.success('列设置已保存')
}

/**
 * 处理穿梭框对话框关闭事件
 * 重置穿梭框的选项状态到初始状态
 */
const handleColumnTransferClose = () => {
  // 重置选中的列到当前可见列状态
  selectedColumns.value = [...visibleColumns.value]
}

/**
 * 列显示控制方法
 */
// 判断列是否可见
const isColumnVisible = (columnKey) => {
  return visibleColumns.value.includes(columnKey)
}
const saveColumnSettings = () => {
  localStorage.setItem('assessmentRecords_visibleColumns', JSON.stringify(visibleColumns.value))
}

// 从本地存储加载列设置
const loadColumnSettings = () => {
  const saved = localStorage.getItem('assessmentRecords_visibleColumns')
  if (saved) {
    try {
      const savedColumns = JSON.parse(saved)
      // 确保必需列始终显示
      const requiredColumns = availableColumns.value
        .filter(col => col.required)
        .map(col => col.key)
      
      visibleColumns.value = [...new Set([...requiredColumns, ...savedColumns])]
    } catch (error) {
      console.error('加载列设置失败:', error)
      visibleColumns.value = [...defaultColumns]
    }
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  loadColumnSettings() // 加载列设置
  loadData()
  loadStatistics()
})

/**
 * 数据加载函数
 */
// 加载考核记录数据
const loadData = async () => {
  loading.value = true
  try {
    const response = await assessmentApi.getAssessmentRecords({
      ...searchForm,
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    })
    
    if (response.data.success) {
      tableData.value = response.data.data.records
      pagination.total = response.data.data.pagination.total
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败：' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 * 获取考核记录的统计信息，包括总记录数、时间范围等
 */
const loadStatistics = async () => {
  try {
    const response = await assessmentApi.getAssessmentStatistics()
    
    if (response.data.success) {
      const data = response.data.data
      
      // 更新统计数据
      Object.assign(statistics, {
        totalRecords: data.totalRecords || data.pendingCount + data.improvingCount + data.returnedCount + data.exemptCount || 0,
        dateRange: data.dateRange || generateDateRange(),
        improvingCount: data.improvingCount || 0,
        returnedCount: data.returnedCount || 0,
        exemptCount: data.exemptCount || 0,  // 新增免考核状态统计
        totalAmount: data.totalAmount || 0
      })
    } else {
      console.error('获取统计数据失败:', response.data.message)
    }
  } catch (error) {
    console.error('加载统计数据失败：', error)
  }
}

/**
 * 生成默认时间范围
 * 当后端没有返回时间范围时，生成当前年份的时间范围
 * @returns {string} 格式化的时间范围字符串
 */
const generateDateRange = () => {
  const currentYear = new Date().getFullYear()
  const currentDate = new Date().toISOString().split('T')[0]
  return `${currentYear}-01-01~${currentDate}`
}

/**
 * 事件处理函数
 */
// 搜索
const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    employeeName: '',
    department: '',
    status: '',
    position: '',
    sourceType: '',
    complaintNumber: '',
    customerCode: '',
    customerName: '',
    dateRange: [],
    minAmount: null
  })
  handleSearch()
}

// 生成考核记录
const handleGenerateRecords = () => {
  generateDialogVisible.value = true
}

/**
 * 导出考核表
 * 将当前筛选条件下的考核记录导出为Excel文件
 */
const handleExportRecords = async () => {
  try {
    ElMessage.info('正在导出考核表，请稍候...')
    
    // 构建导出参数，包含当前筛选条件
    const exportParams = {
      ...searchForm,
      currentPage: 1,
      pageSize: 999999 // 导出所有数据
    }
    
    const response = await assessmentApi.exportAssessmentRecords(exportParams)
    
    if (response.data.success) {
      // 创建下载链接
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 生成文件名
      const currentDate = new Date().toISOString().split('T')[0]
      link.download = `考核记录表_${currentDate}.xlsx`
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('考核表导出成功')
    } else {
      ElMessage.error(response.data.message || '导出失败')
    }
  } catch (error) {
    console.error('导出考核表失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

/**
 * 处理生成考核记录确认
 * @param {Object} params - 生成参数
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {boolean} params.resetRecords - 是否重置记录
 * @param {boolean} params.resetAutoIncrement - 是否重置自增ID
 */
const handleGenerateConfirm = async (params) => {
  try {
    const response = await assessmentApi.generateAssessmentRecords(params)
    
    // 检查是否发现重复记录
    if (response.data.isDuplicate) {
      // 重置生成对话框加载状态
      generateDialogRef.value?.resetLoading()
      
      // 显示重复记录对话框
      duplicateRecords.value = response.data.duplicateRecords || []
      duplicateDialogVisible.value = true
      
      // 关闭生成对话框
      generateDialogVisible.value = false
      
      return
    }
    
    if (response.data.success) {
      ElMessage.success(response.data.message || `成功生成 ${response.data.data.generatedCount} 条考核记录`)
      loadData()
      loadStatistics()
      
      // 关闭生成对话框
      generateDialogVisible.value = false
      generateDialogRef.value?.closeDialog()
    } else {
      ElMessage.error(response.data.message || '生成失败')
      generateDialogRef.value?.resetLoading()
    }
  } catch (error) {
    console.error('生成考核记录失败:', error)
    ElMessage.error('生成失败，请重试')
    generateDialogRef.value?.resetLoading()
  }
}

/**
 * 处理重复记录对话框确认事件
 * 用户选择覆盖重复记录
 */
const handleDuplicateConfirm = async () => {
  duplicateLoading.value = true
  
  try {
    // 获取原始参数（从生成对话框或其他地方）
    const currentYear = new Date().getFullYear()
    const forceParams = {
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      resetRecords: true,
      resetAutoIncrement: false
    }
    
    const response = await assessmentApi.generateAssessmentRecords(forceParams)
    
    if (response.data.success) {
      ElMessage.success(response.data.message || `成功覆盖并生成 ${response.data.data.generatedCount} 条考核记录`)
      loadData()
      loadStatistics()
      
      // 关闭重复记录对话框
      duplicateDialogVisible.value = false
    } else {
      ElMessage.error(response.data.message || '覆盖失败')
    }
  } catch (error) {
    console.error('覆盖考核记录失败:', error)
    ElMessage.error('覆盖失败，请重试')
  } finally {
    duplicateLoading.value = false
  }
}

/**
 * 处理重复记录对话框取消事件
 */
const handleDuplicateCancel = () => {
  duplicateDialogVisible.value = false
  duplicateRecords.value = []
}
// 编辑记录
const handleEdit = (row) => {
  dialogTitle.value = '编辑考核记录'
  Object.assign(formData, { ...row })
  dialogVisible.value = true
}

// 保存编辑
const handleSave = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    const response = await assessmentApi.updateAssessmentRecord(formData.id, formData)
    
    if (response.data.success) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败：' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

// 处理返还
const handleProcessReturn = async (row) => {
  try {
    const result = await ElMessageBox.confirm(
      `确定要处理 ${row.employeeName} 的考核返还吗？`,
      '确认返还',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (result === 'confirm') {
      const response = await assessmentApi.processReturn(row.id)
      
      if (response.data.success) {
        ElMessage.success('返还处理成功')
        loadData()
        loadStatistics()
      } else {
        ElMessage.error(response.data.message || '返还处理失败')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('返还处理失败:', error)
      ElMessage.error('返还处理失败：' + (error.response?.data?.message || error.message))
    }
  }
}

// 批量返还处理
const handleBatchReturn = async () => {
  try {
    processing.value = true
    
    // TODO: 调用后端API执行批量返还
    // const result = await assessmentApi.batchReturn()
    
    ElMessage.success('批量返还处理完成')
    batchReturnDialogVisible.value = false
    loadData()
    loadStatistics()
  } catch (error) {
    ElMessage.error('批量返还处理失败：' + error.message)
  } finally {
    processing.value = false
  }
}

// 查看投诉详情
const viewComplaint = (complaintId) => {
  // TODO: 跳转到投诉详情页面
  console.log('查看投诉详情：', complaintId)
}

// 查看历史记录
const handleViewHistory = (row) => {
  // TODO: 显示历史记录对话框
  console.log('查看历史记录：', row)
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

/**
 * 获取责任类型标签类型
 * @param {string} responsibilityType - 责任类型
 * @returns {string} 标签类型
 */
const getResponsibilityTagType = (responsibilityType) => {
  const typeMap = {
    'MainPerson': 'danger',
    'SecondPerson': 'warning', 
    'Manager': 'info',
    // 兼容旧的中文映射
    '主责人': 'danger',
    '次责人': 'warning',
    '管理人员': 'info'
  }
  return typeMap[responsibilityType] || ''
}

/**
 * 获取责任类型标签文本
 * @param {string} responsibilityType - 责任类型
 * @returns {string} 显示文本
 */
const getResponsibilityLabel = (responsibilityType) => {
  const labelMap = {
    'MainPerson': '主责人',
    'SecondPerson': '次责人',
    'Manager': '管理人员',
    // 兼容旧的中文映射
    '主责人': '主责人',
    '次责人': '次责人',
    '管理人员': '管理人员'
  }
  return labelMap[responsibilityType] || responsibilityType
}

/**
 * 获取数据来源标签类型
 * @param {string} sourceType - 数据来源类型
 * @returns {string} 标签类型
 */
const getSourceTagType = (sourceType) => {
  const typeMap = {
    'complaint': 'primary',
    'rework': 'warning',
    'exception': 'danger'
  }
  return typeMap[sourceType] || ''
}

/**
 * 获取数据来源标签文本
 * @param {string} sourceType - 数据来源类型
 * @returns {string} 显示文本
 */
const getSourceLabel = (sourceType) => {
  const labelMap = {
    'complaint': '投诉记录',
    'rework': '返工记录', 
    'exception': '出版异常记录'
  }
  return labelMap[sourceType] || sourceType
}
</script>

<style scoped>
.assessment-records {
  padding: 0; /* 取消最外层容器的内边距 */
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

.search-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  border-radius: 8px;
  overflow: hidden;
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 80px; /* 设置固定高度 */
}

.stats-icon {
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

.stats-icon.pending {
  background: linear-gradient(135deg, #f39c12, #e67e22);
}

.stats-icon.total-records {
  background: linear-gradient(135deg, #8e44ad, #9b59b6);
}

.stats-icon.improving {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.stats-icon.returned {
  background: linear-gradient(135deg, #27ae60, #229954);
}

.stats-icon.total {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.stats-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60px; /* 设置最小高度确保一致性 */
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.stats-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-date-range {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.table-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 表格标题行样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.table-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.table-actions .el-button {
  margin-left: 0;
}

.amount-text {
  font-weight: 600;
  color: #e74c3c;
}

/* 重复记录确认对话框样式 */
:deep(.duplicate-confirm-dialog) {
  .el-message-box__message {
    white-space: pre-line;
    line-height: 1.6;
  }
  
  .el-message-box__btns {
    padding-top: 20px;
  }
  
  .el-button--primary {
    background-color: #e6a23c;
    border-color: #e6a23c;
  }
  
  .el-button--primary:hover {
    background-color: #ebb563;
    border-color: #ebb563;
  }
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}

.batch-return-content {
  padding: 10px 0;
}

.return-info {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.return-info p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 表格内容居中样式 */
:deep(.el-table th .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 600 !important;
  padding: 4px !important;
}

/* 减小表格行高 */
:deep(.el-table td) {
  padding: 6px 0 !important;
}

:deep(.el-table th) {
  padding: 8px 0 !important;
}

/* 表格内容居中样式 */
:deep(.el-table .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 4px !important;
}

:deep(.el-table th .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 600 !important;
  padding: 4px !important;
}

:deep(.el-table td) {
  text-align: center !important;
}

:deep(.el-table th) {
  text-align: center !important;
}

/* 确保标签组件也居中 */
:deep(.el-tag) {
  margin: 0 auto !important;
}

/* 确保按钮组也居中 */
:deep(.el-button-group) {
  display: flex !important;
  justify-content: center !important;
}

/* 问题描述列左对齐，常规粗细 */
:deep(.el-table .description-text) {
  text-align: left !important;
  display: block !important;
  width: 100% !important;
  font-weight: normal !important;
}

/* 问题描述列单元格左对齐 */
:deep(.el-table td .cell .description-text) {
  text-align: left !important;
  justify-content: flex-start !important;
  font-weight: normal !important;
}

/* 产品名称列左对齐样式 */
:deep(.el-table .product-name-text) {
  text-align: left !important;
  display: block !important;
  width: 100% !important;
  font-weight: normal !important;
}

/* 产品名称列单元格左对齐 */
:deep(.el-table td .cell .product-name-text) {
  text-align: left !important;
  justify-content: flex-start !important;
  font-weight: normal !important;
}

/* 备注列左对齐样式 */
:deep(.el-table .remarks-text) {
  text-align: left !important;
  display: block !important;
  width: 100% !important;
  font-weight: normal !important;
}

/* 备注列单元格左对齐 */
:deep(.el-table td .cell .remarks-text) {
  text-align: left !important;
  justify-content: flex-start !important;
  font-weight: normal !important;
}

:deep(.el-table-column--selection .cell) {
  text-align: center !important;
}

/* MessageBox 列设置样式 */
:deep(.column-settings-messagebox) {
  width: 500px !important;
  max-width: 90vw !important;
}

:deep(.column-settings-messagebox .el-message-box__content) {
  max-height: 500px !important;
  overflow-y: auto !important;
}

:deep(.column-settings-messagebox .column-item) {
  margin-bottom: 8px !important;
  padding: 4px 0 !important;
}

:deep(.column-settings-messagebox .column-item label) {
  display: flex !important;
  align-items: center !important;
  cursor: pointer !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

:deep(.column-settings-messagebox .column-item input[type="checkbox"]) {
  margin-right: 8px !important;
  transform: scale(1.1) !important;
}

:deep(.column-settings-messagebox .column-item input[type="checkbox"]:disabled) {
  cursor: not-allowed !important;
}

/* 穿梭框样式优化 */
:deep(.el-transfer) {
  display: flex;
  align-items: flex-start;
}

:deep(.el-transfer-panel) {
  width: 300px;
  height: 400px;
}

:deep(.el-transfer-panel__header) {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 15px;
  font-weight: 500;
}

:deep(.el-transfer-panel__body) {
  height: 320px;
}

:deep(.el-transfer-panel__filter) {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-transfer-panel__list) {
  height: 240px;
  overflow-y: auto;
}

:deep(.el-transfer-panel__item) {
  padding: 8px 15px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  min-height: 40px;
}

:deep(.el-transfer-panel__item) {
  display: flex !important;
  align-items: center !important;
  padding: 8px 15px !important;
  min-height: 32px !important;
  border: none !important;
  border-bottom: none !important;
}

:deep(.el-transfer-panel__list) {
  border: none !important;
}

:deep(.el-transfer-panel) {
  border: 1px solid #dcdfe6 !important;
}

:deep(.el-transfer-panel__item .el-checkbox) {
  display: flex !important;
  align-items: center !important;
  margin-right: 12px !important;
  flex-shrink: 0 !important;
}

:deep(.el-checkbox__inner) {
  position: static !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  margin: 0 !important;
}

:deep(.el-transfer-panel__item .el-checkbox__label) {
  display: flex;
  align-items: center;
  line-height: 1.7;
}

:deep(.el-transfer-panel__item:hover) {
  background-color: #f5f7fa;
}

:deep(.el-transfer-panel__item.is-disabled) {
  background-color: #f9f9f9;
  color: #c0c4cc;
}

:deep(.el-transfer-panel__item.is-disabled .el-checkbox__label) {
  color: #c0c4cc;
}

/* 已选列表项的勾选状态显示 - 强制覆盖Element Plus默认样式 */
:deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

:deep(.el-checkbox.is-checked .el-checkbox__inner::after) {
  content: "" !important;
  position: absolute !important;
  left: 4px !important;
  top: 1px !important;
  width: 3px !important;
  height: 7px !important;
  border: 2px solid #fff !important;
  border-left: 0 !important;
  border-top: 0 !important;
  transform: rotate(45deg) scaleY(1) !important;
  display: block !important;
  box-sizing: content-box !important;
}

/* 强制覆盖已选列表中禁用项的样式 */
:deep(.el-transfer-panel__item.is-disabled .el-checkbox) {
  opacity: 1 !important;
}

:deep(.el-transfer-panel__item.is-disabled .el-checkbox.is-checked .el-checkbox__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  opacity: 1 !important;
}

:deep(.el-transfer-panel__item.is-disabled .el-checkbox.is-checked .el-checkbox__inner::after) {
  content: "" !important;
  position: absolute !important;
  left: 4px !important;
  top: 1px !important;
  width: 3px !important;
  height: 7px !important;
  border: 2px solid #fff !important;
  border-left: 0 !important;
  border-top: 0 !important;
  transform: rotate(45deg) scaleY(1) !important;
  display: block !important;
  box-sizing: content-box !important;
}

/* 确保已选列表中的复选框始终显示为勾选状态 */
:deep(.el-transfer-panel:last-child .el-checkbox__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

:deep(.el-transfer-panel:last-child .el-checkbox__inner::after) {
  content: "" !important;
  position: absolute !important;
  left: 4px !important;
  top: 1px !important;
  width: 3px !important;
  height: 7px !important;
  border: 2px solid #fff !important;
  border-left: 0 !important;
  border-top: 0 !important;
  transform: rotate(45deg) scaleY(1) !important;
  display: block !important;
  box-sizing: content-box !important;
}

:deep(.el-transfer__buttons) {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  height: 400px;
}

:deep(.el-transfer__button) {
  width: 80px;
  height: 32px;
  border-radius: 6px;
  font-size: 12px;
  margin: 0;
}

/* 对话框样式 */
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 15px 20px;
  border-top: 1px solid #e4e7ed;
}
</style>