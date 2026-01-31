<template>
  <div class="assessment-records">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h2>考核记录管理</h2>
        <el-popover
          placement="bottom-start"
          title="使用说明"
          :width="350"
          trigger="hover"
        >
          <template #reference>
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </template>
          <div class="help-content">
            <p>1. 本模块数据来源于投诉、返工和异常记录。</p>
            <p>2. 数据<strong>非实时同步</strong>，需点击“+生成考核记录”按钮获取最新数据。</p>
            <p>3. 如果统计数据为0或列表为空，请尝试执行生成操作。</p>
          </div>
        </el-popover>
      </div>
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
            <el-option label="待考核" value="pending" />
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
            <el-option label="投诉记录" value="complaint" />
            <el-option label="返工记录" value="rework" />
            <el-option label="出版异常记录" value="exception" />
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
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
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
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
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
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
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
        <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
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
          <el-button type="info" plain @click="showColumnTransfer">
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
          label="责任部门" 
          width="120" 
        />
        <el-table-column 
          v-if="isColumnVisible('position')"
          prop="responsibilityType" 
          label="责任类型" 
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="getResponsibilityTagType(row.responsibilityType || row.position)">
              {{ getResponsibilityLabel(row.responsibilityType || row.position) }}
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

    <!-- 列设置对话框 -->
    <el-dialog
      v-model="columnTransferVisible"
      title="列设置"
      width="600px"
      height="450px"
      :close-on-click-modal="false"
      @close="handleColumnTransferClose"
    >
      <div class="column-settings-container">
        <div class="column-settings-header">
          <div class="header-info">
            <span class="info-text">拖拽列名可调整顺序，勾选/取消勾选可控制列的显示</span>
            <span class="selected-count">已选择 {{ selectedColumnsCount }} / {{ availableColumns.length }} 列</span>
          </div>
        </div>
        
        <div class="column-settings-content">
          <div class="column-list">
            <div class="column-list-header">
              <el-checkbox 
                v-model="selectAllColumns" 
                :indeterminate="isIndeterminate"
                @change="handleSelectAllColumns"
              >
                全选
              </el-checkbox>
              <span class="filter-input">
                <el-input
                  v-model="columnFilterText"
                  placeholder="搜索列名"
                  size="small"
                  clearable
                  style="width: 200px"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </span>
            </div>
            
            <div class="draggable-column-list">
              <div
                v-for="(column, index) in filteredColumnSettings"
                :key="column.key"
                class="column-item"
                :class="{ 'column-disabled': column.required }"
                draggable="true"
                @dragstart="handleDragStart(index, $event)"
                @dragover="handleDragOver($event)"
                @drop="handleDrop(index, $event)"
                @dragend="handleDragEnd"
              >
                <div class="column-item-content">
                  <div class="drag-handle">
                    <el-icon><Rank /></el-icon>
                  </div>
                  <el-checkbox
                    v-model="column.visible"
                    :disabled="column.required"
                    @change="updateColumnVisibility"
                  >
                    {{ column.label }}
                    <span v-if="column.required" class="required-tag">(必需)</span>
                  </el-checkbox>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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

    <!-- 考核记录历史对话框 -->
    <AssessmentHistoryDialog
      v-model:visible="historyDialogVisible"
      :record-id="currentRecordId"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import {
  Search, Refresh, Plus, Clock, Loading, Check, Money,
  User, OfficeBuilding, Edit, View, DataAnalysis, Download,
  Setting, Document, Postcard, Rank, QuestionFilled
} from '@element-plus/icons-vue'
import * as assessmentApi from '@/services/assessmentApi'
import AssessmentRecordDialog from '@/components/AssessmentRecordDialog.vue'
import GenerateRecordsDialog from '@/components/GenerateRecordsDialog.vue'
import DuplicateRecordsDialog from '@/components/DuplicateRecordsDialog.vue'
import AssessmentHistoryDialog from '@/components/AssessmentHistoryDialog.vue'
import { useUserStore } from '@/store/user'

/**
 * 响应式数据定义
 */
// 用户store
const userStore = useUserStore()

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
const historyDialogVisible = ref(false)
const currentRecordId = ref(null)

// 表单数据 - 包含对话框所需的所有字段
const formData = reactive({
  id: null,
  employeeName: '',
  department: '',
  position: '',
  responsibilityType: '',
  sourceType: '',
  complaintNumber: '',
  customerCode: '',
  productName: '',
  assessmentAmount: 0,
  assessmentDate: '',
  status: '',
  problemDescription: '',
  remarks: '',
  improvementStartDate: '',
  improvementEndDate: '',
  returnDate: '',
  returnAmount: null,
  returnReason: ''
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
  { key: 'department', label: '责任部门', required: false },
  { key: 'position', label: '责任类型', required: false },
  { key: 'sourceType', label: '数据来源', required: false },
  { key: 'complaintNumber', label: '工单号', required: true },
  { key: 'customerCode', label: '客户编号', required: false },
  { key: 'productName', label: '产品名称', required: false },
  { key: 'sourceDescription', label: '问题描述', required: true },
  { key: 'assessmentAmount', label: '考核金额', required: true },
  { key: 'assessmentDate', label: '发生日期', required: true },
  { key: 'status', label: '状态', required: false },
  { key: 'improvementStartDate', label: '改善期开始', required: false },
  { key: 'improvementEndDate', label: '改善期结束', required: false },
  { key: 'returnDate', label: '返还日期', required: false },
  { key: 'remarks', label: '备注', required: false }
])

// 默认显示的列
const defaultColumns = [
  'employeeName', 'complaintNumber', 'sourceDescription', 
  'assessmentAmount', 'assessmentDate', 'status', 'remarks'
]

// 当前显示的列
const visibleColumns = ref([...defaultColumns])

// 列设置对话框相关数据
const columnTransferVisible = ref(false)
const columnFilterText = ref('')
const selectAllColumns = ref(false)
const isIndeterminate = ref(false)
const draggedIndex = ref(-1)

// 列设置数据 - 用于拖拽排序和显示控制
const columnSettings = ref([])

/**
 * 初始化列设置数据
 */
const initColumnSettings = () => {
  // 根据当前可见列的顺序创建列设置
  const orderedColumns = []
  
  // 首先添加当前可见的列，保持其顺序
  visibleColumns.value.forEach(columnKey => {
    const column = availableColumns.value.find(col => col.key === columnKey)
    if (column) {
      orderedColumns.push({
        key: column.key,
        label: column.label,
        required: column.required,
        visible: true
      })
    }
  })
  
  // 然后添加不可见的列
  availableColumns.value.forEach(column => {
    if (!visibleColumns.value.includes(column.key)) {
      orderedColumns.push({
        key: column.key,
        label: column.label,
        required: column.required,
        visible: false
      })
    }
  })
  
  columnSettings.value = orderedColumns
  updateColumnVisibility()
}

/**
 * 过滤后的列设置
 */
const filteredColumnSettings = computed(() => {
  if (!columnFilterText.value) {
    return columnSettings.value
  }
  return columnSettings.value.filter(column =>
    column.label.toLowerCase().includes(columnFilterText.value.toLowerCase())
  )
})

/**
 * 已选择的列数量
 */
const selectedColumnsCount = computed(() => {
  return columnSettings.value.filter(col => col.visible).length
})

/**
 * 更新列可见性状态
 */
const updateColumnVisibility = () => {
  const visibleCount = columnSettings.value.filter(col => col.visible).length
  const totalCount = columnSettings.value.filter(col => !col.required).length + columnSettings.value.filter(col => col.required).length
  const nonRequiredCount = columnSettings.value.filter(col => !col.required).length
  const visibleNonRequiredCount = columnSettings.value.filter(col => col.visible && !col.required).length
  
  // 必需列始终选中，所以只考虑非必需列的选择状态
  selectAllColumns.value = visibleNonRequiredCount === nonRequiredCount
  isIndeterminate.value = visibleNonRequiredCount > 0 && visibleNonRequiredCount < nonRequiredCount
}

/**
 * 处理全选/取消全选
 */
const handleSelectAllColumns = (checked) => {
  columnSettings.value.forEach(column => {
    if (!column.required) { // 必需列不受全选影响
      column.visible = checked
    }
  })
  isIndeterminate.value = false
}

/**
 * 拖拽开始事件
 */
const handleDragStart = (index, event) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.5'
}

/**
 * 拖拽结束事件
 */
const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedIndex.value = -1
}

/**
 * 拖拽悬停事件
 */
const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

/**
 * 拖拽放置事件
 */
const handleDrop = (targetIndex, event) => {
  event.preventDefault()
  
  if (draggedIndex.value === -1 || draggedIndex.value === targetIndex) {
    return
  }
  
  // 获取实际的索引（考虑过滤）
  const draggedItem = filteredColumnSettings.value[draggedIndex.value]
  const targetItem = filteredColumnSettings.value[targetIndex]
  
  const draggedRealIndex = columnSettings.value.findIndex(col => col.key === draggedItem.key)
  const targetRealIndex = columnSettings.value.findIndex(col => col.key === targetItem.key)
  
  // 交换位置
  const temp = columnSettings.value[draggedRealIndex]
  columnSettings.value.splice(draggedRealIndex, 1)
  columnSettings.value.splice(targetRealIndex, 0, temp)
}

/**
 * 显示列设置对话框
 */
const showColumnTransfer = () => {
  initColumnSettings()
  columnTransferVisible.value = true
}

/**
 * 重置为默认列
 */
const resetToDefaultColumns = () => {
  // 重置为默认显示状态
  columnSettings.value.forEach(column => {
    column.visible = defaultColumns.includes(column.key) || column.required
  })
  
  // 重新排序为默认顺序
  const defaultOrder = [...defaultColumns]
  availableColumns.value.forEach(col => {
    if (!defaultOrder.includes(col.key)) {
      defaultOrder.push(col.key)
    }
  })
  
  columnSettings.value.sort((a, b) => {
    return defaultOrder.indexOf(a.key) - defaultOrder.indexOf(b.key)
  })
  
  updateColumnVisibility()
}

/**
 * 保存列设置
 */
const saveColumnTransferSettings = async () => {
  try {
    // 更新可见列列表，按照当前设置的顺序
    visibleColumns.value = columnSettings.value
      .filter(col => col.visible)
      .map(col => col.key)
    
    // 调用保存函数，等待完成
    await saveColumnSettings()
    
    columnTransferVisible.value = false
    ElMessage.success('列设置已保存')
  } catch (error) {
    console.error('保存列设置失败:', error)
    ElMessage.error('保存列设置失败，请重试')
  }
}

/**
 * 获取当前列的顺序配置（用于导出）
 */
const getColumnOrder = () => {
  return columnSettings.value
    .filter(col => col.visible)
    .map(col => col.key)
}

/**
 * 处理列设置对话框关闭事件
 */
const handleColumnTransferClose = () => {
  // 重置到当前状态
  initColumnSettings()
  columnFilterText.value = ''
}

/**
 * 列显示控制方法
 */
// 判断列是否可见
const isColumnVisible = (columnKey) => {
  return visibleColumns.value.includes(columnKey)
}

// 保存列设置到本地存储
/**
 * 保存列设置到数据库
 */
const saveColumnSettings = async () => {
  try {
    const userId = userStore.user?.id
    const userName = userStore.user?.realName || userStore.user?.RealName
    
    if (!userId) {
      console.warn('用户未登录，无法保存列设置')
      return false
    }
    
    // 构建列设置对象，与后端API期望的结构匹配
    const columnSettings = {
      visibleColumns: visibleColumns.value,
      columnOrder: getColumnOrder()
    }
    
    // 传递用户姓名到后端，避免后端查询数据库
    await assessmentApi.saveColumnSettings(userId, columnSettings, userName)
    console.log('列设置保存成功')
    return true
  } catch (error) {
    console.error('保存列设置失败:', error)
    // 如果API保存失败，回退到localStorage
    localStorage.setItem('assessmentRecords_visibleColumns', JSON.stringify(visibleColumns.value))
    throw error // 重新抛出错误，让调用者处理
  }
}

/**
 * 从数据库加载列设置
 */
const loadColumnSettings = async () => {
  try {
    const userId = userStore.user?.id
    if (!userId) {
      console.warn('用户未登录，使用本地存储的列设置')
      loadColumnSettingsFromLocal()
      return
    }
    
    const response = await assessmentApi.getColumnSettings(userId)
    if (response.data.success && response.data.data) {
      const savedSettings = response.data.data
      
      // 确保必需列始终显示
      const requiredColumns = availableColumns.value
        .filter(col => col.required)
        .map(col => col.key)
      
      // 如果有保存的列顺序，使用保存的顺序；否则使用可见列
      if (savedSettings.columnOrder && Array.isArray(savedSettings.columnOrder)) {
        // 使用保存的列顺序，并确保必需列包含在内
        const orderedColumns = [...savedSettings.columnOrder]
        requiredColumns.forEach(reqCol => {
          if (!orderedColumns.includes(reqCol)) {
            orderedColumns.unshift(reqCol) // 必需列放在前面
          }
        })
        visibleColumns.value = orderedColumns
      } else {
        // 回退到使用visibleColumns
        visibleColumns.value = [...new Set([...requiredColumns, ...(savedSettings.visibleColumns || [])])]
      }
    } else {
      // 如果数据库中没有设置，尝试从localStorage加载
      loadColumnSettingsFromLocal()
    }
  } catch (error) {
    console.error('从数据库加载列设置失败:', error)
    // 如果API加载失败，回退到localStorage
    loadColumnSettingsFromLocal()
  }
  
  // 初始化列设置数据，确保columnSettings正确填充
  initColumnSettings()
}

/**
 * 从本地存储加载列设置（回退方案）
 */
const loadColumnSettingsFromLocal = () => {
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
      console.error('加载本地列设置失败:', error)
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
    // 检查当前筛选结果的记录数
    if (pagination.total === 0) {
      ElMessage.warning('没有符合条件的任何记录，无法导出')
      return
    }
    
    // 构建导出信息摘要
    const exportSummary = buildExportSummary()
    
    // 显示确认对话框
    await ElMessageBox.confirm(
      `
        <div style="line-height: 1.6; color: #606266;">
          <div style="margin-bottom: 16px; font-weight: 600; color: #303133;">
            📊 即将导出考核记录表
          </div>
          
          <div style="background: #f5f7fa; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
            <div style="margin-bottom: 8px;"><strong>导出范围：</strong></div>
            ${exportSummary.conditions}
          </div>
          
          <div style="background: #e8f4fd; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
            <div style="margin-bottom: 8px;"><strong>导出内容：</strong></div>
            <div>• 包含记录：${pagination.total} 条</div>
            <div>• 包含列数：${getColumnOrder().length} 列</div>
            <div>• 文件格式：Excel (.xlsx)</div>
          </div>
          
          <div style="color: #909399; font-size: 13px;">
            💡 提示：导出可能需要几秒钟时间，请耐心等待
          </div>
        </div>
      `,
      '确认导出',
      {
        confirmButtonText: '确认导出',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true,
        customStyle: {
          width: '520px',
          maxWidth: '90vw'
        },
        customClass: 'export-confirm-dialog'
      }
    )
    
    // 用户确认后开始导出
    ElMessage.info('正在导出考核表，请稍候...')
    
    // 构建导出参数，包含当前筛选条件和列设置
    const exportParams = {
      ...searchForm,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1],
      columns: JSON.stringify(getColumnOrder()) // 传递当前列的顺序配置
    }
    
    // 移除dateRange字段，避免后端接收到不需要的参数
    delete exportParams.dateRange
    
    const response = await assessmentApi.exportAssessmentRecords(exportParams)
    
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
    
    ElMessage.success('考核表导出成功！')
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消导出
      ElMessage.info('已取消导出')
      return
    }
    console.error('导出考核表失败:', error)
    
    // 处理后端返回的错误消息
    let errorMessage = '导出失败，请重试'
    if (error.response && error.response.data) {
      // 优先使用后端返回的message字段
      errorMessage = error.response.data.message || errorMessage
    }
    
    ElMessage.error(errorMessage)
  }
}

/**
 * 构建导出信息摘要
 * 根据当前筛选条件生成导出范围描述
 */
const buildExportSummary = () => {
  const conditions = []
  
  // 员工姓名筛选
  if (searchForm.employeeName) {
    conditions.push(`员工：${searchForm.employeeName}`)
  }
  
  // 部门筛选
  if (searchForm.department) {
    conditions.push(`部门：${searchForm.department}`)
  }
  
  // 状态筛选
  if (searchForm.status) {
    const statusMap = {
      'pending': '待考核',
      'improving': '改善中', 
      'returned': '已返还',
      'confirmed': '已确认',
      'exempt': '免考核'
    }
    conditions.push(`状态：${statusMap[searchForm.status] || searchForm.status}`)
  }
  
  // 责任类型筛选
  if (searchForm.position) {
    const positionMap = {
      'primary': '主责人',
      'secondary': '次责人',
      'manager': '管理者'
    }
    conditions.push(`责任类型：${positionMap[searchForm.position] || searchForm.position}`)
  }
  
  // 数据来源筛选
  if (searchForm.sourceType) {
    const sourceMap = {
      'complaint': '投诉记录',
      'rework': '返工记录',
      'exception': '异常记录'
    }
    conditions.push(`数据来源：${sourceMap[searchForm.sourceType] || searchForm.sourceType}`)
  }
  
  // 工单号筛选
  if (searchForm.complaintNumber) {
    conditions.push(`工单号：${searchForm.complaintNumber}`)
  }
  
  // 客户编号筛选
  if (searchForm.customerCode) {
    conditions.push(`客户编号：${searchForm.customerCode}`)
  }
  
  // 客户名称筛选
  if (searchForm.customerName) {
    conditions.push(`客户名称：${searchForm.customerName}`)
  }
  
  // 日期范围筛选
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const startDate = new Date(searchForm.dateRange[0]).toLocaleDateString()
    const endDate = new Date(searchForm.dateRange[1]).toLocaleDateString()
    conditions.push(`日期范围：${startDate} ~ ${endDate}`)
  }
  
  // 最小金额筛选
  if (searchForm.minAmount !== null && searchForm.minAmount !== '') {
    conditions.push(`最小金额：≥ ${searchForm.minAmount} 元`)
  }
  
  return {
    conditions: conditions.length > 0 
      ? conditions.map(c => `<div>• ${c}</div>`).join('')
      : '<div>• 全部记录（无筛选条件）</div>'
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
/**
 * 编辑考核记录
 * @param {Object} row - 表格行数据
 */
const handleEdit = async (row) => {
  try {
    if (dialogVisible.value) {
      dialogVisible.value = false
      // 等待一个事件循环，确保状态更新
      await nextTick()
    }
    
    // 设置对话框标题
    dialogTitle.value = '编辑考核记录'
    
    // 尝试从API获取详细数据
    const response = await assessmentApi.getAssessmentRecord(row.id)
    
    if (response.data && response.data.success && response.data.data) {
      const apiData = response.data.data
      
      // 字段映射逻辑
      const mappedFormData = {
        id: apiData.id || apiData.ID || row.id, // 修复：添加多种ID字段的映射
        employeeName: apiData.personName || apiData.employeeName || apiData.PersonName,
        department: apiData.department || apiData.Department,
        position: apiData.position || apiData.Position,
        sourceType: apiData.SourceType,
        assessmentAmount: apiData.AssessmentAmount,
        assessmentDate: apiData.AssessmentDate ? apiData.AssessmentDate.split('T')[0] : null,
        status: apiData.Status,
        problemDescription: apiData.problemDescription,
        // 修复remarks字段映射逻辑：优先使用后端处理后的remarks字段，然后是Remarks字段
        remarks: apiData.remarks || apiData.Remarks || apiData.AssessmentDescription || '',
        
        // 客户信息映射
        customerCode: apiData.customerCode || apiData.Customer, // 优先使用customerCode字段
        
        // 产品名称映射
        productName: apiData.productName || apiData.ProductName || apiData.Product,
        
        // 工单号映射
        complaintNumber: apiData.orderNumber || apiData.ComplaintOrderNo || apiData.ReworkOrderNo || apiData.ExceptionOrderNo,
        
        // 改善期相关字段
        improvementStartDate: apiData.ImprovementStartDate ? apiData.ImprovementStartDate.split('T')[0] : null,
        improvementEndDate: apiData.ImprovementEndDate ? apiData.ImprovementEndDate.split('T')[0] : null,
        
        // 返还相关字段
        returnDate: apiData.ReturnDate ? apiData.ReturnDate.split('T')[0] : null,
        returnAmount: apiData.ReturnAmount,
        returnReason: apiData.ReturnReason,
        
        // 责任类型（根据PersonType映射）
        // 注意：除了ComplaintRegister表中涉及"直接责任"、"管理责任"、"连带责任"外，其余的都是直接责任
        responsibilityType: apiData.PersonType === 'MainPerson' ? 'direct' : 
                           apiData.PersonType === 'Manager' ? 'management' : 
                           apiData.PersonType === 'SecondPerson' ? 'joint' : 
                           // ReworkMainPerson和ExceptionMainPerson都是直接责任
                           'direct'
      }
      
      // 将映射后的数据赋值给formData
      Object.assign(formData, mappedFormData)
      
    } else {
      // 如果API调用失败，回退到使用表格行数据
      // 确保ID字段正确传递
      const rowDataWithId = { ...row, id: row.id || row.ID }
      Object.assign(formData, rowDataWithId)
      
      // 尝试将sourceDescription映射到problemDescription
      if (row.sourceDescription && !formData.problemDescription) {
        formData.problemDescription = row.sourceDescription
      }
    }
    
    // 等待一个事件循环，确保数据更新完成
    await nextTick()
    
    dialogVisible.value = true
    
  } catch (error) {
    console.error('获取考核记录详情失败:', error)
    // 出错时使用表格行数据
    // 确保ID字段正确传递
    const rowDataWithId = { ...row, id: row.id || row.ID }
    Object.assign(formData, rowDataWithId)
    
    // 尝试将sourceDescription映射到problemDescription
    if (row.sourceDescription && !formData.problemDescription) {
      formData.problemDescription = row.sourceDescription
    }
    
    // 等待一个事件循环，确保数据更新完成
    await nextTick()
    
    dialogVisible.value = true
  }
}

// 保存编辑
const handleSave = async (formDataFromDialog) => {
  try {
    saving.value = true
    
    // 使用从对话框传递过来的表单数据，如果没有则使用当前formData
    const dataToSave = formDataFromDialog || formData
    
    // 确保ID字段存在且有效
    const recordId = dataToSave.id || formData.id
    
    if (!recordId) {
      ElMessage.error('记录ID缺失，无法保存')
      return
    }
    
    // 修复字段映射问题：将employeeName映射为personName传递给后端
    const apiData = {
      ...dataToSave,
      id: recordId, // 确保ID字段存在
      personName: dataToSave.employeeName || dataToSave.personName // 确保personName字段存在
    }
    
    const response = await assessmentApi.updateAssessmentRecord(recordId, apiData)
    
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
}

// 查看历史记录
const handleViewHistory = (row) => {
  currentRecordId.value = row.id
  historyDialogVisible.value = true
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
    pending: '待考核',
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
    // PersonType映射（旧版本兼容）
    'MainPerson': 'danger',
    'SecondPerson': 'warning', 
    'Manager': 'info',
    // 新增的PersonType映射（区分不同来源）
    'ReworkMainPerson': 'danger',
    'ExceptionMainPerson': 'danger',
    // ResponsibilityType映射（新版本）
    'direct': 'danger',
    'management': 'info',
    'joint': 'warning',
    // 兼容旧的中文映射
    '主责人': 'danger',
    '次责人': 'warning',
    '管理人员': 'info',
    '直接责任': 'danger',
    '管理责任': 'info',
    '连带责任': 'warning'
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
    // PersonType映射（旧版本兼容）
    'MainPerson': '主责人',
    'SecondPerson': '次责人',
    'Manager': '管理人员',
    // 新增的PersonType映射（区分不同来源）
    // 注意：除了ComplaintRegister表中涉及"直接责任"、"管理责任"、"连带责任"外，其余的都是直接责任
    'ReworkMainPerson': '返工主责人',
    'ExceptionMainPerson': '异常主责人',
    // ResponsibilityType映射（新版本）
    'direct': '直接责任',
    'management': '管理责任',
    'joint': '连带责任',
    // 兼容旧的中文映射
    '主责人': '主责人',
    '次责人': '次责人',
    '管理人员': '管理人员',
    '直接责任': '直接责任',
    '管理责任': '管理责任',
    '连带责任': '连带责任'
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

.stats-section .el-col {
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
  background-color: #f5f7fa !important;
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

/* 表格选择列复选框居中 - 仅针对表格 */
:deep(.el-table .el-table-column--selection .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}

:deep(.el-table .el-table-column--selection .el-checkbox) {
  margin: 0 !important;
}

:deep(.el-table .el-table-column--selection .el-checkbox__input) {
  margin: 0 auto  !important;
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

/* 列设置对话框样式 */
.column-settings-container {
  padding: 10px 0;
}

.column-settings-header {
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.info-text {
  color: #6c757d;
  font-size: 14px;
}

.selected-count {
  color: #409eff;
  font-weight: 500;
  font-size: 14px;
}

.column-settings-content {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
}

.column-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.filter-input {
  display: flex;
  align-items: center;
}

.draggable-column-list {
  max-height: 250px;
  overflow-y: auto;
}

.column-item {
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  cursor: move;
}

.column-item:hover {
  background-color: #f8f9fa;
}

.column-item:last-child {
  border-bottom: none;
}

.column-item.column-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.column-item-content {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
}

.drag-handle {
  color: #909399;
  cursor: move;
  display: flex;
  align-items: center;
  font-size: 16px;
}

.column-item.column-disabled .drag-handle {
  cursor: not-allowed;
  opacity: 0.5;
}

.required-tag {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 4px;
}

:deep(.el-checkbox) {
  display: flex;
  align-items: center;
  flex: 1;
}

:deep(.el-checkbox__label) {
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
}

:deep(.el-checkbox__input.is-disabled .el-checkbox__inner) {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  cursor: not-allowed;
}

:deep(.el-checkbox__input.is-disabled + .el-checkbox__label) {
  color: #c0c4cc;
  cursor: not-allowed;
}

/* 导出确认对话框样式优化 */
:deep(.export-confirm-dialog) {
  border-radius: 12px;
  box-shadow: 0 12px 32px 4px rgba(0, 0, 0, 0.12), 0 8px 20px rgba(0, 0, 0, 0.08);
}

:deep(.export-confirm-dialog .el-message-box__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.export-confirm-dialog .el-message-box__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

:deep(.export-confirm-dialog .el-message-box__content) {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.export-confirm-dialog .el-message-box__message) {
  margin: 0;
  line-height: 1.6;
}

:deep(.export-confirm-dialog .el-message-box__btns) {
  padding: 16px 24px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.export-confirm-dialog .el-button) {
  min-width: 80px;
  height: 36px;
  border-radius: 6px;
  font-weight: 500;
}

:deep(.export-confirm-dialog .el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

:deep(.export-confirm-dialog .el-button--primary:hover) {
  background: linear-gradient(135deg, #3a8ee6 0%, #337ecc 100%);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  transform: translateY(-1px);
}

.empty-tip {
  color: #909399;
  font-size: 14px;
  margin-top: 8px;
}

.help-icon {
  color: #ee7d31;
  font-size: 18px;
  cursor: pointer;
  margin-left: 8px;
  transition: color 0.3s;
}

.help-icon:hover {
  color: #ff4040;
}

.header-content {
  display: flex;
  align-items: center;
}

.help-content p {
  margin: 0;
  line-height: 1.8;
  font-size: 13px;
  color: #606266;
}

:deep(.export-confirm-dialog .el-button--default) {
  background: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266;
  transition: all 0.3s ease;
}

:deep(.export-confirm-dialog .el-button--default:hover) {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #409eff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.export-confirm-dialog) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 0 auto;
  }
  
  :deep(.export-confirm-dialog .el-message-box__header),
  :deep(.export-confirm-dialog .el-message-box__content),
  :deep(.export-confirm-dialog .el-message-box__btns) {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  :deep(.export-confirm-dialog .el-message-box__btns) {
    flex-direction: column-reverse;
  }
  
  :deep(.export-confirm-dialog .el-button) {
    width: 100%;
    margin: 0;
  }
}
</style>