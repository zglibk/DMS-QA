<template>
  <div class="work-logs">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><Document /></el-icon>
          工作日志
        </h2>
        <p class="page-subtitle">日常工作记录和总结</p>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filters">
      <el-card>
        <el-form :model="searchForm" inline>
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索日志内容"
              clearable
              style="width: 200px"
              @keyup.enter="searchLogs"
            />
          </el-form-item>
          <el-form-item label="关联计划">
            <el-select
              v-model="searchForm.planId"
              placeholder="选择关联计划"
              clearable
              filterable
              style="width: 200px"
            >
              <el-option
                v-for="plan in planOptions"
                :key="plan.ID"
                :label="plan.Title"
                :value="plan.ID"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchLogs">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 日志列表 -->
    <div class="log-list">
      <el-card>
        <div class="table-header">
          <div class="table-actions">
            <el-button 
              type="primary" 
              :disabled="!hasCreatePermission"
              @click="showCreateDialog"
            >
              <el-icon><Plus /></el-icon>
              新建日志
            </el-button>
            <el-button
              type="danger"
              :disabled="selectedLogs.length === 0 || !canBatchDelete || !hasDeletePermission"
              @click="batchDeleteLogs"
            >
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
            <el-button @click="exportLogs">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>



        <!-- 表格视图 -->
        <div v-loading="loading" class="table-container">
          <el-table
            :data="logList"
            style="width: 100%"
            border
            stripe
            :header-cell-style="{ textAlign: 'center', whiteSpace: 'nowrap' }"
            :cell-style="{ textAlign: 'center', whiteSpace: 'nowrap' }"
            @selection-change="handleSelectionChange"
            empty-text="暂无工作日志"
          >
            <!-- 选择列 -->
            <el-table-column
              type="selection"
              width="55"
              align="center"
            />
            
            <!-- 日志日期 -->
            <el-table-column
              prop="LogDate"
              label="日志日期"
              width="150"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <div class="date-cell">
                  <span class="date-main">{{ formatDate(row.LogDate) }}</span>
                  <el-tag size="small" :type="getWeekdayType(row.LogDate)">{{ getWeekday(row.LogDate) }}</el-tag>
                </div>
              </template>
            </el-table-column>
            
            <!-- 关联计划 -->
            <el-table-column
              prop="PlanTitle"
              label="关联计划"
              width="180"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <el-tag v-if="row.PlanTitle" type="primary" size="small" class="plan-tag">
                  <span class="plan-link" @click="viewPlanDetail(row.PlanID)">
                    {{ row.PlanTitle }}
                  </span>
                </el-tag>
                <el-tag v-else type="info" size="small">独立日志</el-tag>
              </template>
            </el-table-column>
            
            <!-- 工作内容 -->
            <el-table-column
              prop="Content"
              label="工作内容"
              min-width="200"
              align="left"
              resizable
              show-overflow-tooltip
              :header-cell-style="{ textAlign: 'center', whiteSpace: 'nowrap' }"
            >
              <template #default="{ row }">
                <div class="content-cell">{{ row.Content }}</div>
              </template>
            </el-table-column>
            
            <!-- 工作时长 -->
            <el-table-column
              prop="WorkHours"
              label="工作时长"
              width="100"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <el-tag size="small" class="work-hours-tag">
                  <el-icon><Clock /></el-icon>
                  {{ row.WorkHours || 0 }}h
                </el-tag>
              </template>
            </el-table-column>
            
            <!-- 完成进度 -->
            <el-table-column
              prop="Progress"
              label="完成进度"
              width="150"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <div v-if="row.Progress !== null" class="progress-cell">
                  <el-progress
                    :percentage="row.Progress"
                    :stroke-width="20"
                    :text-inside="true"
                    :status="getProgressStatus(row.Progress)"
                  />
                </div>
                <span v-else class="no-progress">-</span>
              </template>
            </el-table-column>
            
            <!-- 问题状态 -->
            <el-table-column
              label="状态"
              width="80"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.Issues ? 'danger' : (row.Progress >= 100 ? 'success' : 'primary')"
                  size="small"
                >
                  {{ row.Issues ? '有问题' : (row.Progress >= 100 ? '已完成' : '进行中') }}
                </el-tag>
              </template>
            </el-table-column>
            
            <!-- 创建时间 -->
            <el-table-column
              prop="CreatedAt"
              label="创建时间"
              width="160"
              align="center"
              resizable
            >
              <template #default="{ row }">
                <div class="create-time">{{ formatDateTime(row.CreatedAt) }}</div>
              </template>
            </el-table-column>
            
            <!-- 操作列 -->
            <el-table-column
              label="操作"
              width="200"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button type="primary" size="small" @click="viewLogDetail(row)">
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                  <el-button 
                    type="warning" 
                    size="small" 
                    :disabled="!canEditLog(row)"
                    @click="editLog(row)"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    :disabled="!canDeleteLog(row)"
                    @click="deleteLog(row)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @update:current-page="handleCurrentPageUpdate"
            @update:page-size="handlePageSizeUpdate"

          />
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑日志对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="logFormRef"
        :model="logForm"
        :rules="logFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日志日期" prop="LogDate">
              <el-date-picker
                v-model="logForm.LogDate"
                type="date"
                placeholder="选择日志日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联计划">
              <el-select
                v-model="logForm.PlanID"
                placeholder="选择关联计划（可选）"
                clearable
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="plan in planOptions"
                  :key="plan.ID"
                  :label="plan.Title"
                  :value="plan.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工作时长">
              <el-input-number
                v-model="logForm.WorkHours"
                :min="0"
                :max="24"
                :step="0.5"
                placeholder="工作时长（小时）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="完成进度">
              <el-slider
                v-model="logForm.Progress"
                :min="0"
                :max="100"
                :step="5"
                show-input
                :show-input-controls="false"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="工作内容" prop="Content">
          <el-input
            v-model="logForm.Content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述今天的工作内容..."
          />
        </el-form-item>
        <el-form-item label="遇到问题">
          <el-input
            v-model="logForm.Issues"
            type="textarea"
            :rows="3"
            placeholder="记录工作中遇到的问题或困难（可选）"
          />
        </el-form-item>
        <el-form-item label="解决方案">
          <el-input
            v-model="logForm.Solutions"
            type="textarea"
            :rows="3"
            placeholder="问题的解决方案或处理方式（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveLog" :loading="saving">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="700px"
    >
      <div v-if="currentLog" class="log-detail">
        <div class="detail-header">
          <div class="log-date-large">
            <div class="date-number">{{ formatDateNumber(currentLog.LogDate) }}</div>
            <div class="date-text">{{ formatDateText(currentLog.LogDate) }}</div>
          </div>
          <div class="log-meta">
            <div v-if="currentLog.PlanTitle" class="meta-item">
              <span class="meta-label">关联计划:</span>
              <span class="meta-value plan-link" @click="viewPlanDetail(currentLog.PlanID)">
                {{ currentLog.PlanTitle }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">工作时长:</span>
              <span class="meta-value">{{ currentLog.WorkHours || 0 }} 小时</span>
            </div>
            <div v-if="currentLog.Progress !== null" class="meta-item">
              <span class="meta-label">完成进度:</span>
              <span class="meta-value">{{ currentLog.Progress }}%</span>
            </div>
          </div>
        </div>
        
        <div class="detail-content">
          <div class="content-section">
            <h4 class="section-title">工作内容</h4>
            <div class="section-content">{{ currentLog.Content || '无' }}</div>
          </div>
          
          <div v-if="currentLog.Issues" class="content-section">
            <h4 class="section-title">遇到问题</h4>
            <div class="section-content issues">{{ currentLog.Issues }}</div>
          </div>
          
          <div v-if="currentLog.Solutions" class="content-section">
            <h4 class="section-title">解决方案</h4>
            <div class="section-content solutions">{{ currentLog.Solutions }}</div>
          </div>
        </div>
        
        <div class="detail-footer">
          <div class="create-time">
            创建时间: {{ formatDateTime(currentLog.CreatedAt) }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Plus,
  Search,
  Refresh,
  Delete,
  Download,
  Clock,
  View,
  Edit,
  WarningFilled,
  CircleCheckFilled
} from '@element-plus/icons-vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const logList = ref([])
const selectedLogs = ref([])
const planOptions = ref([])
const currentLog = ref(null)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  planId: '',
  dateRange: []
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 对话框相关
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const logFormRef = ref()

// 日志表单
const logForm = reactive({
  ID: null,
  LogDate: new Date(),
  PlanID: '',
  Content: '',
  Issues: '',
  Solutions: '',
  WorkHours: 8,
  Progress: null
})

// 表单验证规则
const logFormRules = {
  LogDate: [{ required: true, message: '请选择日志日期', trigger: 'change' }],
  Content: [{ required: true, message: '请输入工作内容', trigger: 'blur' }]
}

// 权限检查
const hasAdminRole = computed(() => userStore.hasRole('admin') || userStore.hasRole('系统管理员'))
const hasCreatePermission = computed(() => userStore.hasActionPermission('work-plan:log:create'))
const hasEditPermission = computed(() => userStore.hasActionPermission('work-plan:log:edit'))
const hasDeletePermission = computed(() => userStore.hasActionPermission('work-plan:log:delete'))
const currentUserId = computed(() => userStore.user?.ID)

/**
 * 检查是否可以编辑指定日志
 * @param {Object} log - 日志对象
 * @returns {boolean} 是否可以编辑
 */
const canEditLog = (log) => {
  if (!hasEditPermission.value) return false
  if (hasAdminRole.value) return true
  return log.CreatedBy === currentUserId.value
}

/**
 * 检查是否可以删除指定日志
 * @param {Object} log - 日志对象
 * @returns {boolean} 是否可以删除
 */
const canDeleteLog = (log) => {
  if (!hasDeletePermission.value) return false
  if (hasAdminRole.value) return true
  return log.CreatedBy === currentUserId.value
}

/**
 * 检查是否可以批量删除选中的日志
 * @returns {boolean} 是否可以批量删除
 */
const canBatchDelete = computed(() => {
  if (selectedLogs.value.length === 0) return false
  if (hasAdminRole.value) return true
  return selectedLogs.value.every(log => log.CreatedBy === currentUserId.value)
})

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑日志' : '新建日志')

/**
 * 获取日志列表
 */
const getLogList = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      planId: searchForm.planId
    }
    
    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0].toISOString().split('T')[0]
      params.endDate = searchForm.dateRange[1].toISOString().split('T')[0]
    }
    
    const response = await api.get('/work-plan/logs', { params })
    if (response.data.success) {
      logList.value = response.data.data.list
      pagination.total = response.data.data.total
    }
  } catch (error) {
    console.error('获取日志列表失败:', error)
    ElMessage.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取工作计划选项（用于关联计划选择）
 */
const getPlanOptions = async () => {
  try {
    const response = await api.get('/work-plan/plans', {
      params: {
        page: 1,
        pageSize: 1000 // 获取所有计划用于选择，不限制状态
        // 移除状态筛选，允许选择所有状态的计划
      }
    })
    if (response.data.success) {
      // 使用真正的工作计划数据
      planOptions.value = response.data.data.list.map(plan => ({
        ID: plan.ID,
        Title: plan.PlanName || plan.Title,
        Description: plan.Description
      })) || []
    } else {
      console.error('API返回失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取工作计划选项失败:', error)
  }
}

/**
 * 搜索日志
 */
const searchLogs = () => {
  pagination.page = 1
  getLogList()
}

/**
 * 重置搜索
 */
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    planId: '',
    dateRange: []
  })
  searchLogs()
}

/**
 * 显示创建对话框
 */
const showCreateDialog = async () => {
  isEdit.value = false
  resetLogForm()
  // 刷新计划选项以获取最新的计划数据
  await getPlanOptions()
  dialogVisible.value = true
}

/**
 * 编辑日志
 */
const editLog = async (log) => {
  isEdit.value = true
  Object.assign(logForm, {
    ID: log.ID,
    LogDate: log.LogDate ? new Date(log.LogDate) : new Date(),
    PlanID: log.PlanID || '',
    Content: log.WorkContent || log.Content || '', // 优先使用WorkContent字段
    Issues: log.Issues || '',
    Solutions: log.NextPlan || log.Solutions || '', // 优先使用NextPlan字段
    WorkHours: log.WorkHours || 8,
    Progress: log.Progress
  })
  // 刷新计划选项以获取最新的计划数据
  await getPlanOptions()
  dialogVisible.value = true
}

/**
 * 查看日志详情
 */
const viewLogDetail = (log) => {
  currentLog.value = log
  detailDialogVisible.value = true
}

/**
 * 保存日志
 */
const saveLog = async () => {
  try {
    // 表单验证
    const valid = await logFormRef.value.validate().catch(() => false)
    if (!valid) {
      ElMessage.error('请填写必填项')
      return
    }
    
    saving.value = true
    
    // 映射前端字段到后端期望的字段名
    const logData = {
      PlanID: logForm.PlanID || null, // 如果PlanID为空，设置为null而不是空字符串
      LogDate: logForm.LogDate ? new Date(logForm.LogDate).toISOString().split('T')[0] : '',
      WorkHours: logForm.WorkHours,
      WorkContent: logForm.Content, // 前端Content字段映射到后端WorkContent字段
      Progress: logForm.Progress,
      Issues: logForm.Issues,
      NextPlan: logForm.Solutions, // 前端Solutions字段映射到后端NextPlan字段
      Attachments: logForm.Attachments || null
    }
    
    let response
    if (isEdit.value) {
      response = await api.put(`/work-plan/logs/${logForm.ID}`, logData)
    } else {
      response = await api.post('/work-plan/logs', logData)
    }
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '日志更新成功' : '日志创建成功')
      dialogVisible.value = false
      getLogList()
    }
  } catch (error) {
    console.error('保存日志失败:', error)
    ElMessage.error('保存日志失败')
  } finally {
    saving.value = false
  }
}

/**
 * 删除日志
 */
const deleteLog = async (log) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${formatDate(log.LogDate)} 的工作日志吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/work-plan/logs/${log.ID}`)
    if (response.data.success) {
      ElMessage.success('日志删除成功')
      getLogList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除日志失败:', error)
      ElMessage.error('删除日志失败')
    }
  }
}

/**
 * 批量删除日志
 */
const batchDeleteLogs = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedLogs.value.length} 条日志吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const logIds = selectedLogs.value.map(log => log.ID)
    const response = await api.delete('/work-plan/logs/batch', { data: { logIds } })
    if (response.data.success) {
      ElMessage.success('批量删除成功')
      getLogList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出日志 - 使用前端Excel库生成文件
 */
const exportLogs = async () => {
  try {
    // 调试：检查 XLSX 对象
    // console.log('XLSX object:', XLSX)
    if (!XLSX || !XLSX.utils) {
      ElMessage.error('Excel库加载失败，请刷新页面重试')
      return
    }
    
    // 用户确认导出
    const exportType = selectedLogs.value && selectedLogs.value.length > 0 ? '选中' : '全部'
    const confirmResult = await ElMessageBox.confirm(
      `确定要导出${exportType}的工作日志吗？`,
      '确认导出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    if (confirmResult !== 'confirm') return
    
    ElMessage.info(`正在导出${exportType}日志...`)
    
    // 构建查询参数获取数据
    const params = {
      page: 1,
      pageSize: 10000, // 获取所有数据
      keyword: searchForm.keyword,
      planId: searchForm.planId
    }
    
    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0].toISOString().split('T')[0]
      params.endDate = searchForm.dateRange[1].toISOString().split('T')[0]
    }
    
    // 获取数据
    const response = await api.get('/work-plan/logs', { params })
    
    if (!response.data.success || !response.data.data.list) {
      ElMessage.warning('没有数据可导出')
      return
    }
    
    let exportData = response.data.data.list
    
    // 如果有选中的日志，则只导出选中的
    if (selectedLogs.value && selectedLogs.value.length > 0) {
      const selectedIds = selectedLogs.value.map(log => log.ID)
      exportData = exportData.filter(log => selectedIds.includes(log.ID))
    }
    
    if (exportData.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }
    
    // 使用静态导入的Excel库
    
    // 准备Excel数据
    const excelData = exportData.map((item, index) => ({
      '序号': index + 1,
      '日志日期': formatDate(item.LogDate),
      '关联计划': item.PlanTitle || '无关联计划',
      '记录人': item.UserName || '未知用户',
      '工作时长': `${item.WorkHours || 0}小时`,
      '工作内容': item.WorkContent || item.Content || '',
      '进度': `${item.Progress || 0}%`,
      '遇到问题': item.Issues || '',
      '下一步计划': item.NextPlan || item.Solutions || '',
      '创建时间': formatDateTime(item.CreatedAt)
    }))
    
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // 设置自动列宽
    const autoFitColumns = () => {
      const colWidths = []
      const headers = ['序号', '日志日期', '关联计划', '记录人', '工作时长', '工作内容', '进度', '遇到问题', '下一步计划', '创建时间']
      
      // 计算字符串的显示宽度（考虑中文字符）
      const getStringWidth = (str) => {
        if (!str) return 0
        let width = 0
        for (let i = 0; i < str.length; i++) {
          const char = str.charAt(i)
          // 中文字符、全角字符占2个单位宽度
          if (/[\u4e00-\u9fa5\uff00-\uffef]/.test(char)) {
            width += 2
          } else {
            width += 1
          }
        }
        return width
      }
      
      // 为每列计算最适合的宽度
      headers.forEach((header, colIndex) => {
        let maxWidth = getStringWidth(header) // 表头宽度
        
        // 遍历所有数据行，找出该列的最大内容宽度
        excelData.forEach(row => {
          const cellValue = Object.values(row)[colIndex]
          const cellWidth = getStringWidth(cellValue ? cellValue.toString() : '')
          maxWidth = Math.max(maxWidth, cellWidth)
        })
        
        // 设置列宽，最小10个字符，最大60个字符，并添加适当的边距
        const width = Math.min(Math.max(maxWidth + 4, 10), 60)
        colWidths.push({ wch: width })
      })
      
      return colWidths
    }
    
    ws['!cols'] = autoFitColumns()
    
    // 设置行高（统一设置为14.25）
    const rowHeights = []
    rowHeights[0] = { hpt: 14.25 } // 表头行高
    for (let i = 1; i <= excelData.length; i++) {
      rowHeights[i] = { hpt: 14.25 } // 数据行高
    }
    ws['!rows'] = rowHeights
    
    // 定义样式（字体：Tahoma，大小：9）
    const headerStyle = {
      font: { name: 'Tahoma', sz: 9, bold: false, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'F0F0F0' } }, // excel表格标题行背景填充色
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    }
    
    const dataStyle = {
      font: { name: 'Tahoma', sz: 9 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'D0D0D0' } },
        bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
        left: { style: 'thin', color: { rgb: 'D0D0D0' } },
        right: { style: 'thin', color: { rgb: 'D0D0D0' } }
      }
    }
    
    const dataStyleLeft = {
      ...dataStyle,
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
    }
    
    // 应用样式
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[cellAddress]) continue
        
        if (R === 0) {
          // 表头样式
          ws[cellAddress].s = headerStyle
        } else {
          // 数据行样式
          let cellStyle = { ...dataStyle }
          
          // 工作内容、遇到问题、下一步计划列左对齐
          if (C === 5 || C === 7 || C === 8) {
            cellStyle = { ...dataStyleLeft }
          }
          
          // 交替行背景色
          if (R % 2 === 0) {
            cellStyle.fill = { fgColor: { rgb: 'F8F9FA' } }
          }
          
          // 进度列特殊样式
          if (C === 6 && ws[cellAddress].v) {
            const progressValue = parseInt(ws[cellAddress].v.toString().replace('%', ''))
            if (progressValue >= 100) {
              cellStyle.font = { ...cellStyle.font, color: { rgb: '198754' }, bold: true }
            } else if (progressValue >= 80) {
              cellStyle.font = { ...cellStyle.font, color: { rgb: '0D6EFD' }, bold: true }
            } else if (progressValue >= 50) {
              cellStyle.font = { ...cellStyle.font, color: { rgb: 'FFC107' }, bold: true }
            } else {
              cellStyle.font = { ...cellStyle.font, color: { rgb: 'DC3545' }, bold: true }
            }
          }
          
          // 日期列样式
          if (C === 1 || C === 9) {
            cellStyle.font = { ...cellStyle.font, color: { rgb: '6C757D' } }
          }
          
          ws[cellAddress].s = cellStyle
        }
      }
    }
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '工作日志')
    
    // 生成文件名
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const seconds = now.getSeconds().toString().padStart(2, '0')
    
    const dateStr = `${year}${month}${day}`
    const timeStamp = `${hours}${minutes}${seconds}`
    const fileName = `工作日志_${exportType}_${dateStr}${timeStamp}.xlsx`
    
    // 导出文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, fileName)
    
    ElMessage.success(`成功导出 ${exportData.length} 条记录`)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出失败:', error)
      ElMessage.error('导出失败: ' + (error.message || '未知错误'))
    }
  }
}

/**
 * 查看计划详情
 */
const viewPlanDetail = (planId) => {
  if (planId) {
    router.push(`/admin/work-plan/plans/${planId}`)
  }
}

/**
 * 重置日志表单
 */
const resetLogForm = () => {
  Object.assign(logForm, {
    ID: null,
    LogDate: new Date(),
    PlanID: '',
    Content: '',
    Issues: '',
    Solutions: '',
    WorkHours: 8,
    Progress: null
  })
  logFormRef.value?.clearValidate()
}

/**
 * 处理选择变化（保留兼容性）
 */
const handleSelectionChange = (selection) => {
  selectedLogs.value = selection
}

/**
 * 切换日志选择状态
 */
const toggleLogSelection = (log) => {
  const index = selectedLogs.value.findIndex(item => item.ID === log.ID)
  if (index > -1) {
    selectedLogs.value.splice(index, 1)
  } else {
    selectedLogs.value.push(log)
  }
}

/**
 * 清除所有选择
 */
const clearSelection = () => {
  selectedLogs.value = []
}

/**
 * 获取时间线颜色
 */
const getTimelineColor = (log) => {
  if (log.Progress >= 100) {
    return '#67c23a' // 绿色 - 已完成
  } else if (log.Issues) {
    return '#f56c6c' // 红色 - 有问题
  } else if (log.Progress >= 50) {
    return '#409eff' // 蓝色 - 进行中
  } else {
    return '#e6a23c' // 橙色 - 刚开始
  }
}

/**
 * 获取时间线类型
 */
const getTimelineType = (log) => {
  if (log.Progress >= 100) {
    return 'success'
  } else if (log.Issues) {
    return 'danger'
  } else if (log.Progress >= 50) {
    return 'primary'
  } else {
    return 'warning'
  }
}

/**
 * 处理当前页更新事件
 */
const handleCurrentPageUpdate = (page) => {
  pagination.page = page
  getLogList()
}

/**
 * 处理页面大小更新事件
 */
const handlePageSizeUpdate = (size) => {
  pagination.pageSize = size
  pagination.page = 1 // 重置到第一页
  getLogList()
}

/**
 * 截断文本
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 获取进度颜色
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  if (percentage >= 40) return '#f56c6c'
  return '#909399'
}

/**
 * 获取进度条状态
 */
const getProgressStatus = (percentage) => {
  if (percentage >= 100) return 'success'    // 已完成 - 绿色
  if (percentage >= 80) return undefined     // 正常进度 - 默认蓝色
  if (percentage >= 50) return 'warning'     // 进度一般 - 橙色
  return 'exception'                         // 进度较低 - 红色
}

/**
 * 格式化日期为yyyy-mm-dd格式
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

/**
 * 获取星期几
 */
const getWeekday = (dateStr) => {
  if (!dateStr) return ''
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const date = new Date(dateStr)
  return `周${weekdays[date.getDay()]}`
}

/**
 * 获取星期几对应的标签类型
 */
const getWeekdayType = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  
  // 根据星期几返回不同的颜色类型
  const typeMap = {
    0: 'danger',    // 周日 - 红色
    1: '',          // 周一 - 默认蓝色
    2: 'success',   // 周二 - 绿色
    3: 'warning',   // 周三 - 橙色
    4: 'info',      // 周四 - 灰色
    5: 'success',   // 周五 - 绿色
    6: 'danger'     // 周六 - 红色
  }
  
  return typeMap[dayOfWeek] || ''
}

/**
 * 格式化日期数字（详情页用）
 */
const formatDateNumber = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).getDate().toString().padStart(2, '0')
}

/**
 * 格式化日期文本（详情页用）
 */
const formatDateText = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const weekday = getWeekday(dateStr)
  return `${year}年${month}月 ${weekday}`
}

// 组件挂载时获取数据
onMounted(() => {
  getLogList()
  getPlanOptions()
})
</script>

<style scoped>
.work-logs {
  padding: 20px;
  background-color: #f5f7fa;
  /* 参考用户管理页面的滚动条处理方式 */
  height: auto;
  overflow-x: hidden;
}

/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

/* 搜索筛选样式 */
.search-filters {
  margin-bottom: 20px;
}

/* 日志列表样式 */
.log-list {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 8px;
}



/* 表格容器样式 */
.table-container {
  /* 取消固定高度，让表格内容自适应 */
  /* min-height: 400px; */
}

/* 表格单元格样式 */
.date-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 14px;
  color: #303133;
}

.date-main {
  font-weight: 500;
  color: #303133;
}

.plan-tag .plan-link {
  color: inherit;
  cursor: pointer;
  text-decoration: none;
}

.plan-tag .plan-link:hover {
  text-decoration: underline;
}

.content-cell {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-hours-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  background: #f0f2f5;
  padding: 4px 8px;
  border-radius: 12px;
}

.progress-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.progress-cell .el-progress {
  width: 100%;
  max-width: 120px;
}

.no-progress {
  color: #c0c4cc;
  font-size: 14px;
}

.create-time {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 表格响应式样式 */
@media (max-width: 768px) {
  .action-buttons {
    gap: 2px;
    flex-wrap: nowrap;
  }
  
  .action-buttons .el-button {
    font-size: 12px;
    padding: 4px 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 日志详情样式 */
.log-detail {
  padding: 10px 0;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.log-date-large {
  text-align: center;
  min-width: 80px;
}

.date-number {
  font-size: 36px;
  font-weight: 600;
  color: #409eff;
  line-height: 1;
}

.date-text {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

.log-meta {
  flex: 1;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.meta-label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.meta-value {
  color: #303133;
}

.detail-content {
  margin-bottom: 20px;
}

.content-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f2f5;
}

.section-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #e4e7ed;
}

.section-content.issues {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.section-content.solutions {
  border-left-color: #67c23a;
  background: #f0f9ff;
}

.detail-footer {
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  text-align: right;
}

.create-time {
  font-size: 12px;
  color: #909399;
}
</style>