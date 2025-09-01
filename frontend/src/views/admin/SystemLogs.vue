<template>
  <div class="system-logs">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>系统日志管理</h2>
      <p>查看和管理系统操作日志，监控系统运行状态</p>
    </div>

    <!-- 搜索和过滤区域 -->
    <div class="search-section">
      <el-card>
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索操作或详情"
              clearable
              style="min-width: 100px"
            />
          </el-form-item>
          
          <el-form-item label="日志分类">
            <el-select v-model="searchForm.category" placeholder="选择分类" clearable style="min-width: 120px">
              <el-option
                v-for="category in categories"
                :key="category"
                :label="getCategoryLabel(category)"
                :value="category"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="模块">
            <el-select v-model="searchForm.module" placeholder="选择模块" clearable style="min-width: 120px">
              <el-option
                v-for="module in modules"
                :key="module"
                :label="getModuleLabel(module)"
                :value="module"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="严重级别">
            <el-select v-model="searchForm.severity" placeholder="选择级别" clearable style="min-width: 120px">
              <el-option
                v-for="level in severityLevels"
                :key="level"
                :label="level"
                :value="level"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="用户">
            <el-input
              v-model="searchForm.userID"
              placeholder="用户ID"
              clearable
              style="width: 80px"
            />
          </el-form-item>
          
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width:300px;min-width: 250px"
              @change="handleDateRangeChange"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              <span class="button-text">重置</span>
            </el-button>
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>
              <span class="button-text">搜索</span>
            </el-button>

          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ totalLogs }}</div>
              <div class="stats-label">总日志数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value error">{{ errorCount }}</div>
              <div class="stats-label">错误日志</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value warning">{{ warningCount }}</div>
              <div class="stats-label">警告日志</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ uniqueUsers }}</div>
              <div class="stats-label">活跃用户</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <el-button type="success" @click="showExportDialog" :loading="exportLoading">
        <el-icon><Download /></el-icon>
        <span class="button-text">导出日志</span>
      </el-button>
      <el-button type="warning" @click="showCleanupDialog">
        <el-icon><Delete /></el-icon>
        <span class="button-text">清理日志</span>
      </el-button>
      <el-button type="info" @click="showStatsDialog">
        <el-icon><DataAnalysis /></el-icon>
        <span class="button-text">统计分析</span>
      </el-button>
      <el-button @click="handleRefresh" :loading="loading">
        <el-icon><Refresh /></el-icon>
        <span class="button-text">刷新</span>
      </el-button>
    </div>

    <!-- 日志列表 -->
    <div class="table-section">
      <el-table
        :data="logList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @row-click="handleRowClick"
        row-class-name="log-row"
      >
        <el-table-column prop="ID" label="ID" width="80" />
        
        <el-table-column prop="CreatedAt" label="时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.CreatedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="Username" label="用户" width="120">
          <template #default="{ row }">
            <span v-if="row.Username">{{ row.Username }}</span>
            <span v-else class="text-muted">系统</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="Category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.Category)" size="small">
              {{ getCategoryLabel(row.Category) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="Module" label="模块" width="100">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ getModuleLabel(row.Module) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="Severity" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.Severity)" size="small">
              {{ row.Severity }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="Action" label="操作内容" width="200" show-overflow-tooltip class-name="text-left-column" />
        
        <el-table-column prop="Details" label="详情" min-width="300" show-overflow-tooltip class-name="text-left-column" />
        
        <el-table-column prop="Duration" label="耗时" width="80">
          <template #default="{ row }">
            <span v-if="row.Duration">{{ row.Duration }}ms</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="Status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.Status === 'SUCCESS' ? 'success' : 'danger'" size="small">
              {{ row.Status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="viewLogDetail(row)">
              <el-icon><View /></el-icon>
              <span class="button-text">详情</span>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[5, 20, 50, 100, 200]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="50%"
      :before-close="handleDetailDialogClose"
    >
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">{{ currentLog.ID }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatDateTime(currentLog.CreatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ currentLog.Username || '系统' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentLog.UserID || '-' }}</el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag :type="getCategoryTagType(currentLog.Category)">
              {{ getCategoryLabel(currentLog.Category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模块">
            <el-tag type="info">{{ getModuleLabel(currentLog.Module) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="严重级别">
            <el-tag :type="getSeverityTagType(currentLog.Severity)">
              {{ currentLog.Severity }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentLog.Status === 'SUCCESS' ? 'success' : 'danger'">
              {{ currentLog.Status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作" :span="2">{{ currentLog.Action }}</el-descriptions-item>
          <el-descriptions-item label="详情" :span="2">{{ currentLog.Details }}</el-descriptions-item>
          <el-descriptions-item label="资源类型">{{ currentLog.ResourceType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="资源ID">{{ currentLog.ResourceID || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">{{ currentLog.OperationType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ currentLog.Duration ? currentLog.Duration + 'ms' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentLog.IPAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户代理" :span="2">
            <div class="user-agent">{{ currentLog.UserAgent || '-' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="会话ID">{{ currentLog.SessionID || '-' }}</el-descriptions-item>
          <el-descriptions-item label="追踪ID">{{ currentLog.TraceID || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 请求数据 -->
        <div v-if="currentLog.RequestData" class="data-section">
          <h4>请求数据</h4>
          <el-input
            type="textarea"
            :rows="6"
            :value="formatJsonData(currentLog.RequestData)"
            readonly
          />
        </div>
        
        <!-- 响应数据 -->
        <div v-if="currentLog.ResponseData" class="data-section">
          <h4>响应数据</h4>
          <el-input
            type="textarea"
            :rows="6"
            :value="formatJsonData(currentLog.ResponseData)"
            readonly
          />
        </div>
        
        <!-- 错误信息 -->
        <div v-if="currentLog.ErrorMessage" class="data-section">
          <h4>错误信息</h4>
          <el-input
            type="textarea"
            :rows="4"
            :value="currentLog.ErrorMessage"
            readonly
          />
        </div>
      </div>
    </el-dialog>

    <!-- 清理日志对话框 -->
    <el-dialog
      v-model="cleanupDialogVisible"
      title="清理日志"
      width="500px"
    >
      <el-form :model="cleanupForm" label-width="100px">
        <el-form-item label="清理方式">
          <el-radio-group v-model="cleanupForm.type">
            <el-radio label="date">按日期清理</el-radio>
            <el-radio label="count">按数量清理</el-radio>
            <el-radio label="severity">按级别清理</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item v-if="cleanupForm.type === 'date'" label="清理日期">
          <el-date-picker
            v-model="cleanupForm.beforeDate"
            type="datetime"
            placeholder="选择日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
          <div class="form-tip">将删除此日期之前的所有日志</div>
        </el-form-item>
        
        <el-form-item v-if="cleanupForm.type === 'count'" label="保留数量">
          <el-input-number
            v-model="cleanupForm.maxCount"
            :min="1000"
            :max="100000"
            :step="1000"
          />
          <div class="form-tip">保留最新的指定数量日志</div>
        </el-form-item>
        
        <el-form-item v-if="cleanupForm.type === 'severity'" label="清理级别">
          <el-select v-model="cleanupForm.severity" placeholder="选择要清理的级别">
            <el-option label="DEBUG" value="DEBUG" />
            <el-option label="INFO" value="INFO" />
          </el-select>
          <div class="form-tip">只清理指定级别的日志</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="cleanupDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleCleanup" :loading="cleanupLoading">
          确认清理
        </el-button>
      </template>
    </el-dialog>

    <!-- 统计分析对话框 -->
    <el-dialog
      v-model="statsDialogVisible"
      title="统计分析"
      width="80%"
    >
      <div class="stats-content">
        <!-- 这里可以添加图表组件 -->
        <p>统计分析功能开发中...</p>
      </div>
    </el-dialog>

    <!-- 导出对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出日志"
      width="600px"
    >
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio
              v-for="format in exportFormats"
              :key="format.value"
              :label="format.value"
            >
              {{ format.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="导出字段">
          <el-checkbox-group v-model="exportForm.columns">
            <div class="checkbox-grid">
              <el-checkbox
                v-for="(label, key) in availableColumns"
                :key="key"
                :label="key"
                class="checkbox-item"
              >
                {{ label }}
              </el-checkbox>
            </div>
          </el-checkbox-group>
          <div class="form-tip">
            <el-button size="small" type="text" @click="selectAllColumns">全选</el-button>
            <el-button size="small" type="text" @click="clearAllColumns">清空</el-button>
            <el-button size="small" type="text" @click="selectDefaultColumns">默认</el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="最大行数">
          <el-input-number
            v-model="exportForm.maxRows"
            :min="100"
            :max="50000"
            :step="1000"
            style="width: 200px"
          />
          <div class="form-tip">建议不超过50000行，避免文件过大</div>
        </el-form-item>
        
        <el-form-item label="当前筛选">
          <div class="current-filters">
            <el-tag v-if="searchForm.keyword" size="small" type="info">
              关键词: {{ searchForm.keyword }}
            </el-tag>
            <el-tag v-if="searchForm.category" size="small" type="info">
              分类: {{ getCategoryLabel(searchForm.category) }}
            </el-tag>
            <el-tag v-if="searchForm.module" size="small" type="info">
              模块: {{ getModuleLabel(searchForm.module) }}
            </el-tag>
            <el-tag v-if="searchForm.severity" size="small" type="info">
              级别: {{ searchForm.severity }}
            </el-tag>
            <el-tag v-if="searchForm.userID" size="small" type="info">
              用户: {{ searchForm.userID }}
            </el-tag>
            <el-tag v-if="searchForm.startDate" size="small" type="info">
              开始: {{ searchForm.startDate }}
            </el-tag>
            <el-tag v-if="searchForm.endDate" size="small" type="info">
              结束: {{ searchForm.endDate }}
            </el-tag>
            <span v-if="!hasActiveFilters" class="no-filters">无筛选条件</span>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport" :loading="exportLoading">
          确认导出
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Download, Delete, DataAnalysis, View } from '@element-plus/icons-vue'
import axios from 'axios'

export default {
  name: 'SystemLogs',
  components: {
    Search,
    Refresh,
    Download,
    Delete,
    DataAnalysis,
    View
  },
  setup() {
    // 响应式数据
    const loading = ref(false)
    const exportLoading = ref(false)
    const cleanupLoading = ref(false)
    const logList = ref([])
    const categories = ref([])
    const modules = ref([])
    const severityLevels = ref([])
    const dateRange = ref([])
    const detailDialogVisible = ref(false)
    const cleanupDialogVisible = ref(false)
    const statsDialogVisible = ref(false)
    const currentLog = ref(null)
    
    // 统计数据
    const totalLogs = ref(0)
    const errorCount = ref(0)
    const warningCount = ref(0)
    const uniqueUsers = ref(0)
    
    // 搜索表单
    const searchForm = reactive({
      keyword: '',
      category: '',
      module: '',
      severity: '',
      userID: '',
      startDate: '',
      endDate: ''
    })
    
    // 分页
    const pagination = reactive({
      page: 1,
      pageSize: 5,
      total: 0
    })
    
    // 清理表单
    const cleanupForm = reactive({
      type: 'date',
      beforeDate: '',
      maxCount: 10000,
      severity: ''
    })
    
    // 分类标签映射
    const categoryLabels = {
      'AUTH': '认证授权',
      'USER_MGMT': '用户管理',
      'DATA_OP': '数据操作',
      'FILE_OP': '文件操作',
      'SYSTEM_CONFIG': '系统配置',
      'IMPORT_EXPORT': '导入导出',
      'QUERY_STATS': '查询统计',
      'SYSTEM_ERROR': '系统异常',
      'SECURITY': '安全相关',
      'PERFORMANCE': '性能监控'
    }
    
    // 模块标签映射
    const moduleLabels = {
      'AUTH': '认证',
      'USER': '用户',
      'ROLE': '角色',
      'PERMISSION': '权限',
      'DEPARTMENT': '部门',
      'POSITION': '岗位',
      'WORK_PLAN': '工作计划',
      'COMPLAINT': '投诉',
      'NOTICE': '通知',
      'CONFIG': '配置',
      'FILE': '文件',
      'ERP': 'ERP',
      'MATERIAL': '材料',
      'SAMPLE': '样品',
      'MENU': '菜单'
    }
    
    // 方法
    const getCategoryLabel = (category) => {
      return categoryLabels[category] || category
    }
    
    const getModuleLabel = (module) => {
      return moduleLabels[module] || module
    }
    
    const getCategoryTagType = (category) => {
      const typeMap = {
        'AUTH': 'primary',
        'USER_MGMT': 'success',
        'DATA_OP': 'info',
        'FILE_OP': 'warning',
        'SYSTEM_ERROR': 'danger',
        'SECURITY': 'danger'
      }
      return typeMap[category] || 'info'
    }
    
    const getSeverityTagType = (severity) => {
      const typeMap = {
        'DEBUG': 'info',
        'INFO': 'success',
        'WARN': 'warning',
        'ERROR': 'danger',
        'FATAL': 'danger'
      }
      return typeMap[severity] || 'info'
    }
    
    const formatDateTime = (dateTime) => {
      if (!dateTime) return '-'
      return new Date(dateTime).toLocaleString('zh-CN')
    }
    
    const formatJsonData = (data) => {
      if (!data) return ''
      try {
        if (typeof data === 'string') {
          return JSON.stringify(JSON.parse(data), null, 2)
        }
        return JSON.stringify(data, null, 2)
      } catch (e) {
        return data
      }
    }
    
    // 获取配置选项
    const fetchConfigOptions = async () => {
      try {
        const response = await axios.get('/system-logs/config/options')
        if (response.data.success) {
          categories.value = response.data.data.categories
          modules.value = response.data.data.modules
          severityLevels.value = response.data.data.severityLevels
        }
      } catch (error) {
        console.error('获取配置选项失败:', error)
      }
    }
    
    // 获取日志列表
    const fetchLogList = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          ...searchForm
        }
        
        const response = await axios.get('/system-logs/list', { params })
        if (response.data.success) {
          logList.value = response.data.data.list
          pagination.total = response.data.data.pagination.total
        }
      } catch (error) {
        console.error('获取日志列表失败:', error)
        ElMessage.error('获取日志列表失败')
      } finally {
        loading.value = false
      }
    }
    
    // 获取统计信息
    const fetchStatistics = async () => {
      try {
        const response = await axios.get('/system-logs/statistics')
        if (response.data.success) {
          const stats = response.data.data.totalStats
          totalLogs.value = stats.totalLogs || 0
          errorCount.value = stats.totalErrors || 0
          warningCount.value = stats.totalWarnings || 0
          uniqueUsers.value = stats.uniqueUsers || 0
        }
      } catch (error) {
        console.error('获取统计信息失败:', error)
      }
    }
    
    // 处理搜索
    const handleSearch = () => {
      pagination.page = 1
      fetchLogList()
    }
    
    // 处理重置
    const handleReset = () => {
      Object.keys(searchForm).forEach(key => {
        searchForm[key] = ''
      })
      dateRange.value = []
      pagination.page = 1
      fetchLogList()
    }
    
    // 处理日期范围变化
    const handleDateRangeChange = (dates) => {
      if (dates && dates.length === 2) {
        searchForm.startDate = dates[0]
        searchForm.endDate = dates[1]
      } else {
        searchForm.startDate = ''
        searchForm.endDate = ''
      }
    }
    
    // 处理分页大小变化
    const handleSizeChange = (size) => {
      pagination.pageSize = size
      pagination.page = 1
      fetchLogList()
    }
    
    // 处理当前页变化
    const handleCurrentChange = (page) => {
      pagination.page = page
      fetchLogList()
    }
    
    // 处理行点击
    const handleRowClick = (row) => {
      viewLogDetail(row)
    }
    
    // 查看日志详情
    const viewLogDetail = async (row) => {
      try {
        const response = await axios.get(`/system-logs/${row.ID}`)
        if (response.data.success) {
          currentLog.value = response.data.data
          detailDialogVisible.value = true
        }
      } catch (error) {
        console.error('获取日志详情失败:', error)
        ElMessage.error('获取日志详情失败')
      }
    }
    
    // 处理详情对话框关闭
    const handleDetailDialogClose = () => {
      detailDialogVisible.value = false
      currentLog.value = null
    }
    
    // 显示清理对话框
    const showCleanupDialog = () => {
      cleanupDialogVisible.value = true
    }
    
    // 显示统计对话框
    const showStatsDialog = () => {
      statsDialogVisible.value = true
    }
    
    // 处理清理
    const handleCleanup = async () => {
      try {
        await ElMessageBox.confirm(
          '此操作将永久删除选中的日志记录，是否继续？',
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        cleanupLoading.value = true
        
        const data = {}
        if (cleanupForm.type === 'date') {
          data.beforeDate = cleanupForm.beforeDate
        } else if (cleanupForm.type === 'count') {
          data.maxCount = cleanupForm.maxCount
        } else if (cleanupForm.type === 'severity') {
          data.severity = cleanupForm.severity
        }
        
        const response = await axios.post('/system-logs/cleanup', data)
        if (response.data.success) {
          ElMessage.success(response.data.message)
          cleanupDialogVisible.value = false
          fetchLogList()
          fetchStatistics()
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清理日志失败:', error)
          ElMessage.error('清理日志失败')
        }
      } finally {
        cleanupLoading.value = false
      }
    }
    
    // 导出相关
    const exportDialogVisible = ref(false)
    const exportForm = reactive({
      format: 'excel',
      columns: [],
      maxRows: 10000
    })
    const availableColumns = ref({})
    const exportFormats = ref([])
    
    // 获取导出模板
    const fetchExportTemplate = async () => {
      try {
        const response = await axios.get('/api/log-export/template')
        if (response.data.success) {
          availableColumns.value = response.data.data.availableColumns
          exportFormats.value = response.data.data.formats
          exportForm.columns = response.data.data.defaultColumns
        }
      } catch (error) {
        console.error('获取导出模板失败:', error)
      }
    }
    
    // 显示导出对话框
    const showExportDialog = async () => {
      await fetchExportTemplate()
      exportDialogVisible.value = true
    }
    
    // 处理导出
    const handleExport = async () => {
      if (exportForm.columns.length === 0) {
        ElMessage.warning('请选择要导出的字段')
        return
      }
      
      exportLoading.value = true
      try {
        const exportData = {
          format: exportForm.format,
          filters: {
            ...searchForm
          },
          columns: exportForm.columns,
          maxRows: exportForm.maxRows
        }
        
        const response = await axios.post('/api/log-export/export', exportData, {
          responseType: 'blob'
        })
        
        // 创建下载链接
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // 从响应头获取文件名
        const contentDisposition = response.headers['content-disposition']
        let fileName = '系统日志.xlsx'
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/)
          if (fileNameMatch && fileNameMatch[2]) {
            fileName = decodeURIComponent(fileNameMatch[2])
          }
        }
        
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        ElMessage.success('导出成功')
        exportDialogVisible.value = false
        
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败')
      } finally {
        exportLoading.value = false
      }
    }
    
    // 处理刷新
    const handleRefresh = () => {
      fetchLogList()
      fetchStatistics()
    }
    
    // 导出字段选择方法
    const selectAllColumns = () => {
      exportForm.columns = Object.keys(availableColumns.value)
    }
    
    const clearAllColumns = () => {
      exportForm.columns = []
    }
    
    const selectDefaultColumns = () => {
      exportForm.columns = ['ID', 'CreatedAt', 'Username', 'Action', 'Details', 'Category', 'Module', 'Severity', 'Status']
    }
    
    // 计算属性：是否有活跃的筛选条件
    const hasActiveFilters = computed(() => {
      return searchForm.keyword || searchForm.category || searchForm.module || 
             searchForm.severity || searchForm.userID || searchForm.startDate || searchForm.endDate
    })
    
    // 生命周期
    onMounted(() => {
      fetchConfigOptions()
      fetchLogList()
      fetchStatistics()
    })
    
    return {
      // 响应式数据
      loading,
      exportLoading,
      cleanupLoading,
      logList,
      categories,
      modules,
      severityLevels,
      dateRange,
      detailDialogVisible,
      cleanupDialogVisible,
      statsDialogVisible,
      exportDialogVisible,
      currentLog,
      totalLogs,
      errorCount,
      warningCount,
      uniqueUsers,
      searchForm,
      pagination,
      cleanupForm,
      exportForm,
      availableColumns,
      exportFormats,
      
      // 方法
      getCategoryLabel,
      getModuleLabel,
      getCategoryTagType,
      getSeverityTagType,
      formatDateTime,
      formatJsonData,
      handleSearch,
      handleReset,
      handleDateRangeChange,
      handleSizeChange,
      handleCurrentChange,
      handleRowClick,
      viewLogDetail,
      handleDetailDialogClose,
      showCleanupDialog,
      showStatsDialog,
      showExportDialog,
      handleCleanup,
      handleExport,
      handleRefresh,
      selectAllColumns,
      clearAllColumns,
      selectDefaultColumns,
      hasActiveFilters
    }
  }
}
</script>

<style scoped>
.system-logs {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
}

.stats-item {
  padding: 10px;
}

.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stats-value.error {
  color: #F56C6C;
}

.stats-value.warning {
  color: #E6A23C;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.action-section {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.table-section {
  margin-bottom: 20px;
}

.log-row {
  cursor: pointer;
}

.log-row:hover {
  background-color: #f5f7fa;
}

.pagination-section {
  display: flex;
  justify-content: center;
}

.log-detail {
  max-height: 600px;
  overflow-y: auto;
}

.data-section {
  margin-top: 20px;
}

.data-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.user-agent {
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
}

.text-muted {
  color: #909399;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.stats-content {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.checkbox-item {
  margin: 0;
}

.current-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.no-filters {
  color: #909399;
  font-style: italic;
}

/* 表格居中对齐样式 */
:deep(.el-table th) {
  text-align: center !important;
}

:deep(.el-table td) {
  text-align: center !important;
}

:deep(.el-table th .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.el-table td .cell) {
  text-align: center !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 确保表格内容垂直居中 */
:deep(.el-table .el-table__cell) {
  text-align: center !important;
}

:deep(.el-table .el-table__header th) {
  text-align: center !important;
}

:deep(.el-table .el-table__body td) {
  text-align: center !important;
}

/* 针对Element Plus表格的特定样式 */
:deep(.el-table__header-wrapper .el-table__header .el-table__cell) {
  text-align: center !important;
}

:deep(.el-table__body-wrapper .el-table__body .el-table__cell) {
  text-align: center !important;
}

/* 特定列左对齐样式 */
:deep(.el-table .text-left-column) {
  text-align: left !important;
}

:deep(.el-table .text-left-column .cell) {
  text-align: left !important;
  display: block !important;
  justify-content: flex-start !important;
}

/* 确保操作列和详情列的表头仍然居中对齐 */
:deep(.el-table__header .text-left-column) {
  text-align: center !important;
}

:deep(.el-table__header .text-left-column .cell) {
  text-align: center !important;
  justify-content: center !important;
}

/* 禁止表格记录行内容换行 */
:deep(.el-table .el-table__body td) {
  white-space: nowrap !important;
}

:deep(.el-table .el-table__body .cell) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* 按钮图标与文字间距样式 */
.button-text {
  margin-left: 6px;
}

/* 确保按钮内容对齐 */
.el-button .el-icon + .button-text {
  margin-left: 6px;
}
</style>