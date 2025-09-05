<template>
  <div class="system-logs">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>系统日志</h2>
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
              @blur="handleAutoSearch"
              @clear="handleAutoSearch"
            />
          </el-form-item>
          
          <el-form-item label="日志分类">
            <el-select v-model="searchForm.category" placeholder="选择分类" clearable style="min-width: 120px" @change="handleAutoSearch" @clear="handleAutoSearch">
              <el-option
                v-for="category in categories"
                :key="category"
                :label="getCategoryLabel(category)"
                :value="category"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="模块">
            <el-select v-model="searchForm.module" placeholder="选择模块" clearable style="min-width: 120px" @change="handleAutoSearch" @clear="handleAutoSearch">
              <el-option
                v-for="module in modules"
                :key="module"
                :label="getModuleLabel(module)"
                :value="module"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="严重级别">
            <el-select v-model="searchForm.severity" placeholder="选择级别" clearable style="min-width: 120px" @change="handleAutoSearch" @clear="handleAutoSearch">
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
              @blur="handleAutoSearch"
              @clear="handleAutoSearch"
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
              @change="handleDateRangeChangeWithAutoSearch"
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
            <el-button type="success" @click="goToAnalytics">
              <el-icon><TrendCharts /></el-icon>
              <span class="button-text">统计分析</span>
            </el-button>

          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="30">
        <el-col :span="6">
          <el-card class="stats-card stats-card-primary">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ totalLogs }}</div>
                <div class="stats-label">总日志数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-danger">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ errorCount }}</div>
                <div class="stats-label">错误日志</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-warning">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ warningCount }}</div>
                <div class="stats-label">警告日志</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-success">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ uniqueUsers }}</div>
                <div class="stats-label">活跃用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <el-button type="success" @click="showExportDialog" :loading="exportLoading"><el-icon style="margin-right: 3px;"><Download /></el-icon>导出日志</el-button>
      <el-button type="danger" @click="showCleanupDialog"><el-icon style="margin-right: 3px;"><Delete /></el-icon>清理日志</el-button>
      <el-button type="primary" plain @click="handleRefresh" :loading="loading"><el-icon style="margin-right: 3px;"><Refresh /></el-icon>刷新</el-button>
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
            <el-radio value="date">按日期清理</el-radio>
              <el-radio value="count">按数量清理</el-radio>
              <el-radio value="severity">按级别清理</el-radio>
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

    <!-- 导出对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出日志"
      width="720px"
      class="export-dialog"
    >
      <el-form :model="exportForm" label-width="80px">
        <!-- 导出格式选择 -->
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format" class="format-radio-group">
            <el-radio
              v-for="format in exportFormats"
              :key="format.value"
              :label="format.value"
              class="format-radio"
            >
              {{ format.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 导出字段选择 -->
        <el-form-item label="导出字段" class="export-fields-item">
          <div class="fields-selection-container">
            <!-- 快捷操作按钮和统计信息 -->
            <div class="field-header">
              <div class="field-actions">
                <el-button size="small" type="primary" plain @click="selectAllColumns">
                  <el-icon><Check /></el-icon>
                  全选
                </el-button>
                <el-button size="small" type="info" plain @click="clearAllColumns">
                  <el-icon><Close /></el-icon>
                  清空
                </el-button>
                <el-button size="small" type="success" plain @click="selectDefaultColumns">
                  <el-icon><Star /></el-icon>
                  默认
                </el-button>
              </div>
              <div class="selected-count">
                <el-tag type="info" size="small">
                  已选择 {{ exportForm.columns.length }} / {{ Object.keys(availableColumns).length }} 个字段
                </el-tag>
              </div>
            </div>
            
            <!-- 字段选择区域 -->
            <el-checkbox-group v-model="exportForm.columns" class="fields-checkbox-group">
              <div class="fields-grid">
                <el-checkbox
                  v-for="(label, key) in availableColumns"
                  :key="key"
                  :label="key"
                  class="field-checkbox"
                >
                  <span class="field-label" :title="label">{{ label }}</span>
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
        
        <el-form-item label="最大行数">
          <el-input-number
            v-model="exportForm.maxRows"
            :min="100"
            :max="50000"
            :step="1000"
            style="max-width: 130px"
          />
          <el-tag type="danger" size="small" class="form-tip">建议不超过 50,000 行，避免文件过大</el-tag>
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
      
      <!-- 导出状态提示 -->
      <div v-if="exportLoading" class="export-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span class="loading-text">正在生成Excel文件，请稍候...</span>
      </div>
      
      <template #footer>
        <el-button @click="exportDialogVisible = false" :disabled="exportLoading">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleExport" 
          :loading="exportLoading"
          :disabled="exportLoading"
        >
          {{ exportLoading ? '导出中...' : '确认导出' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Download, Delete, View, TrendCharts, Check, Close, Star, Document, Warning, InfoFilled, User, Loading } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'SystemLogs',
  components: {
    Search,
    Refresh,
    Download,
    Delete,
    View,
    TrendCharts,
    Check,
    Close,
    Star,
    Document,
    Warning,
    InfoFilled,
    User,
    Loading
  },
  setup() {
    // 路由
    const router = useRouter()
    
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
      return new Date(dateTime).toLocaleString('zh-CN').replace(/\//g, '-')
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
        // 构建统计查询参数，使用当前的筛选条件
        const params = {
          startDate: searchForm.startDate,
          endDate: searchForm.endDate,
          category: searchForm.category,
          module: searchForm.module,
          severity: searchForm.severity,
          userID: searchForm.userID,
          keyword: searchForm.keyword
        }
        
        // 过滤掉空值参数
        Object.keys(params).forEach(key => {
          if (!params[key]) {
            delete params[key]
          }
        })
        
        const response = await axios.get('/system-logs/statistics', { params })
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
      fetchStatistics() // 根据筛选条件更新统计数据
    }
    
    // 处理重置
    const handleReset = () => {
      Object.keys(searchForm).forEach(key => {
        searchForm[key] = ''
      })
      dateRange.value = []
      pagination.page = 1
      fetchLogList()
      fetchStatistics() // 重置后更新统计数据
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
      // 时间范围变化时自动更新统计数据
      fetchStatistics()
    }
    
    // 处理日期范围变化并自动搜索
    const handleDateRangeChangeWithAutoSearch = (dates) => {
      handleDateRangeChange(dates)
      // 延迟执行查询，避免频繁触发
      setTimeout(() => {
        handleSearch()
      }, 100)
    }
    
    /**
     * 自动搜索处理函数
     * 当输入框失去焦点、清空内容或下拉选择时自动执行查询
     */
    const handleAutoSearch = () => {
      // 延迟执行查询，避免频繁触发
      setTimeout(() => {
        handleSearch()
      }, 100)
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
        const response = await axios.get('/log-export/template')
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

    

    
    /**
     * 直接导出系统日志到Excel文件
     * 参考样品承认书管理页面的实现方式
     */
    const handleExport = async () => {
      console.log('🚀 [前端调试] handleExport 函数被调用')
      console.log('📋 [前端调试] 选中的字段:', exportForm.columns)
      
      if (exportForm.columns.length === 0) {
        console.warn('⚠️ [前端调试] 未选择导出字段')
        ElMessage.warning('请选择要导出的字段')
        return
      }
      
      try {
        console.log('🔄 [前端调试] 开始导出流程')
        exportLoading.value = true
        ElMessage.info('正在导出数据，请稍候...')
        
        // 构建查询参数，严格遵循对话框设置
        const params = {
          page: 1,
          pageSize: exportForm.maxRows, // 严格使用用户设置的最大行数
          keyword: searchForm.keyword,
          category: searchForm.category,
          module: searchForm.module,
          severity: searchForm.severity,
          userID: searchForm.userID,
          startDate: searchForm.startDate,
          endDate: searchForm.endDate
        }
        
        console.log('⚙️ [前端调试] 导出设置:', {
          format: exportForm.format,
          maxRows: exportForm.maxRows,
          selectedColumns: exportForm.columns.length,
          columns: exportForm.columns
        })
        
        console.log('📤 [前端调试] 准备发送导出请求:', params)
        
        // 获取数据
        const response = await axios.get('/system-logs/list', { params })
        console.log('✅ [前端调试] 数据获取响应:', response.data)
        
        if (response.data.success && response.data.data) {
          const allData = response.data.data.list
          
          if (allData.length === 0) {
            ElMessage.warning('没有符合条件的数据可导出')
            return
          }
          
          // 验证数据行数是否超过设置的最大行数
          if (allData.length > exportForm.maxRows) {
            console.warn('⚠️ [前端调试] 数据行数超过最大限制:', allData.length, '>', exportForm.maxRows)
            ElMessage.warning(`数据行数(${allData.length})超过设置的最大行数(${exportForm.maxRows})，将只导出前${exportForm.maxRows}行`)
          }
          
          // 严格按照最大行数限制数据
          const limitedData = allData.slice(0, exportForm.maxRows)
          console.log('📊 [前端调试] 实际导出数据条数:', limitedData.length, '/ 获取到:', allData.length)
          
          // 动态导入XLSX库和样式库
          const XLSX = await import('xlsx-js-style')
          const { saveAs } = await import('file-saver')
          
          console.log('📚 [前端调试] XLSX库加载完成')
          
          // 准备导出数据，使用限制后的数据
          const exportData = limitedData.map((item, index) => {
            const row = { '序号': index + 1 }
            
            // 根据选中的字段添加数据
            exportForm.columns.forEach(column => {
              switch (column) {
                case 'ID':
                  row['日志ID'] = item.ID
                  break
                case 'CreatedAt':
                  row['创建时间'] = formatDateTime(item.CreatedAt)
                  break
                case 'Username':
                  row['用户'] = item.Username || '系统'
                  break
                case 'Action':
                  row['操作'] = item.Action
                  break
                case 'Details':
                  row['详情'] = item.Details
                  break
                case 'Category':
                  row['分类'] = getCategoryLabel(item.Category)
                  break
                case 'Module':
                  row['模块'] = getModuleLabel(item.Module)
                  break
                case 'Severity':
                  row['级别'] = item.Severity
                  break
                case 'Status':
                  row['状态'] = item.Status === 'SUCCESS' ? '成功' : '失败'
                  break
                case 'Duration':
                  row['耗时'] = item.Duration ? item.Duration + 'ms' : '-'
                  break
                case 'IPAddress':
                  row['IP地址'] = item.IPAddress || '-'
                  break
                case 'UserAgent':
                  row['用户代理'] = item.UserAgent || '-'
                  break
              }
            })
            
            return row
          })
          
          console.log('📋 [前端调试] 导出数据准备完成，行数:', exportData.length)
          console.log('📋 [前端调试] 导出格式:', exportForm.format)
          
          // 创建工作簿和工作表
          const workbook = XLSX.utils.book_new()
          const worksheet = XLSX.utils.json_to_sheet(exportData)
          
          // 设置列宽
          const columnWidths = []
          const headers = Object.keys(exportData[0] || {})
          headers.forEach(header => {
            switch (header) {
              case '序号':
              case '日志ID':
                columnWidths.push({ wch: 8 })
                break
              case '创建时间':
                columnWidths.push({ wch: 20 })
                break
              case '用户':
              case '操作':
              case '分类':
              case '模块':
              case '级别':
              case '状态':
                columnWidths.push({ wch: 12 })
                break
              case '详情':
                columnWidths.push({ wch: 40 })
                break
              case 'IP地址':
                columnWidths.push({ wch: 15 })
                break
              case '用户代理':
                columnWidths.push({ wch: 30 })
                break
              default:
                columnWidths.push({ wch: 15 })
            }
          })
          worksheet['!cols'] = columnWidths
          
          // 设置表格样式
          const range = XLSX.utils.decode_range(worksheet['!ref'])
          
          // 定义样式
          const headerStyle = {
            font: { bold: true, sz: 11, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'D9D9D9' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '808080' } },
              bottom: { style: 'thin', color: { rgb: '808080' } },
              left: { style: 'thin', color: { rgb: '808080' } },
              right: { style: 'thin', color: { rgb: '808080' } }
            }
          }
          
          const dataStyle = {
            font: { sz: 10, color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '808080' } },
              bottom: { style: 'thin', color: { rgb: '808080' } },
              left: { style: 'thin', color: { rgb: '808080' } },
              right: { style: 'thin', color: { rgb: '808080' } }
            }
          }
          
          const dataStyleLeft = {
            ...dataStyle,
            alignment: { horizontal: 'left', vertical: 'center' }
          }
          
          // 应用样式到单元格
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
              if (!worksheet[cellAddress]) continue
              
              if (R === 0) {
                // 表头行样式
                worksheet[cellAddress].s = headerStyle
              } else {
                // 数据行样式
                const header = headers[C]
                if (header === '详情' || header === '用户代理') {
                  worksheet[cellAddress].s = dataStyleLeft
                } else {
                  worksheet[cellAddress].s = dataStyle
                }
                
                // 交替行背景色
                if (R % 2 === 0) {
                  worksheet[cellAddress].s = {
                    ...worksheet[cellAddress].s,
                    fill: { fgColor: { rgb: 'F8F9FA' } }
                  }
                }
              }
            }
          }
          
          // 添加工作表到工作簿
          XLSX.utils.book_append_sheet(workbook, worksheet, '系统日志')
          
          // 生成文件名
          const now = new Date()
          const year = now.getFullYear().toString().slice(-2)
          const month = (now.getMonth() + 1).toString().padStart(2, '0')
          const day = now.getDate().toString().padStart(2, '0')
          const hours = now.getHours().toString().padStart(2, '0')
          const minutes = now.getMinutes().toString().padStart(2, '0')
          const seconds = now.getSeconds().toString().padStart(2, '0')
          
          const dateStr = `${year}${month}${day}`
          const timeStr = `${hours}${minutes}${seconds}`
          const fileName = `系统日志_${dateStr}_${timeStr}.xlsx`
          
          console.log('💾 [前端调试] 准备生成文件:', fileName)
          
          // 使用浏览器下载方式（直接下载到默认目录）
          console.log('📥 [前端调试] 使用浏览器下载方式')
          const wbout = XLSX.write(workbook, { bookType: exportForm.format === 'excel' ? 'xlsx' : 'xlsx', type: 'array' })
          const blob = new Blob([wbout], { type: 'application/octet-stream' })
          saveAs(blob, fileName)
          
          ElMessage.success(`导出成功！共导出 ${limitedData.length} 条记录`)
          exportDialogVisible.value = false
          
        } else {
          console.error('❌ [前端调试] 后端返回数据格式异常:', response.data)
          ElMessage.error('后端返回数据格式异常')
        }
        
      } catch (error) {
        console.error('❌ [前端调试] 导出失败:', error)
        console.error('❌ [前端调试] 错误详情:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        })
        ElMessage.error(`导出失败: ${error.message || '未知错误'}`)
      } finally {
        console.log('🏁 [前端调试] 导出流程结束，设置loading为false')
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
    
    /**
      * 跳转到统计分析页面
      */// 跳转到统计分析页面
    const goToAnalytics = () => {
      router.push('/admin/system/logs/analytics')
    }
    
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
      handleDateRangeChangeWithAutoSearch,
      handleAutoSearch,
      handleSizeChange,
      handleCurrentChange,
      handleRowClick,
      viewLogDetail,
      handleDetailDialogClose,
      showCleanupDialog,
      showExportDialog,
      handleCleanup,
      handleExport,
      handleRefresh,
      selectAllColumns,
      clearAllColumns,
      selectDefaultColumns,
      hasActiveFilters,
      goToAnalytics
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

/* 统计卡片样式 */
.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  position: relative;
  overflow: hidden;
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  max-height: 140px;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
}

/* 不同类型卡片的渐变背景 */
.stats-card-primary {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.stats-card-primary::before {
  background: linear-gradient(90deg, #409EFF, #2196F3);
}

.stats-card-danger {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}

.stats-card-danger::before {
  background: linear-gradient(90deg, #F56C6C, #e53935);
}

.stats-card-warning {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
}

.stats-card-warning::before {
  background: linear-gradient(90deg, #E6A23C, #ff9800);
}

.stats-card-success {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
}

.stats-card-success::before {
  background: linear-gradient(90deg, #67C23A, #4caf50);
}

.stats-item {
  display: flex;
  align-items: center;
  padding: 2px 20px;
  gap: 12px;
  min-height: 60px;
}

.stats-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.stats-card-primary .stats-icon {
  background: linear-gradient(135deg, #409EFF, #2196F3);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.stats-card-danger .stats-icon {
  background: linear-gradient(135deg, #F56C6C, #e53935);
  box-shadow: 0 4px 15px rgba(245, 108, 108, 0.3);
}

.stats-card-warning .stats-icon {
  background: linear-gradient(135deg, #E6A23C, #ff9800);
  box-shadow: 0 4px 15px rgba(230, 162, 60, 0.3);
}

.stats-card-success .stats-icon {
  background: linear-gradient(135deg, #67C23A, #4caf50);
  box-shadow: 0 4px 15px rgba(103, 194, 58, 0.3);
}

.stats-content {
  flex: 1;
  text-align: left;
}

.stats-value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 5px;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  margin-top: 8px;
  margin-bottom: 12px;
  margin-left: 8px;
}

.stats-content {
  text-align: center;
  padding: 40px;
  color: #909399;
}

/* 导出对话框样式优化 */
.export-dialog {
  .el-dialog__body {
    padding: 20px 25px;
  }
}

/* 导出格式选择样式 */
.format-radio-group {
  display: flex;
  gap: 20px;
  
  .format-radio {
    margin-right: 0;
    
    :deep(.el-radio__label) {
      font-weight: 500;
    }
  }
}

/* 导出字段选择容器 */
.export-fields-item {
  :deep(.el-form-item__content) {
    line-height: normal;
  }
}

.fields-selection-container {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
  background-color: #fafafa;
  width: 100%;
  max-width: 720px;
}

/* 字段选择头部区域 */
.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

/* 快捷操作按钮 */
.field-actions {
  display: flex;
  gap: 8px;
  
  .el-button {
    height: 28px;
    padding: 0 12px;
    font-size: 12px;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

/* 字段选择网格 */
.fields-checkbox-group {
  margin-bottom: 12px;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.field-checkbox {
  margin: 0;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f0f9ff;
  }
  
  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #409eff;
    font-weight: 500;
  }
  
  :deep(.el-checkbox__input) {
    margin-right: 6px;
  }
  
  .field-label {
    font-size: 12px;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 已选字段统计 */
.selected-count {
  .el-tag {
    font-size: 12px;
  }
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

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-section .el-row {
    --el-row-gutter: 12px;
  }
  
  .stats-card {
    height: 72px;
  }
  
  .stats-item {
    padding: 10px 12px;
    gap: 10px;
    min-height: 52px;
  }
}

@media (max-width: 576px) {
  .stats-section .el-row {
    --el-row-gutter: 8px;
  }
  
  .stats-card {
    height: 68px;
  }
  
  .stats-item {
    padding: 8px 10px;
    gap: 8px;
    min-height: 48px;
  }
}

/* 导出加载样式 */
.export-loading {
  margin: 20px 0;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 导出对话框中的加载图标动画 */
.export-loading .el-icon.is-loading {
  animation: rotating 2s linear infinite;
  color: #409eff;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>