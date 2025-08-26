<template>
  <div class="erp-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>ERP 对接管理</h2>
      <p class="page-description">管理ERP系统配置和同步日志</p>
    </div>

    <!-- 功能切换按钮 -->
    <div class="function-tabs">
      <el-button-group>
        <el-button 
          :type="activeTab === 'config' ? 'primary' : 'default'"
          @click="activeTab = 'config'"
        >
          <el-icon><Setting /></el-icon>
          对接管理
        </el-button>
        <el-button 
          :type="activeTab === 'logs' ? 'primary' : 'default'"
          @click="activeTab = 'logs'"
        >
          <el-icon><Document /></el-icon>
          同步日志
        </el-button>
      </el-button-group>
    </div>

    <!-- 配置管理模块 -->
    <div v-show="activeTab === 'config'" class="config-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>ERP 对接参数</span>
            <div class="header-actions">
              <el-button v-if="canAdd" type="primary" @click="handleAddConfig">
                <el-icon><Plus /></el-icon>
                <span style="margin-left: 4px;">新增配置</span>
              </el-button>
              <el-button @click="loadConfigs">
                <el-icon><Refresh /></el-icon>
                <span style="margin-left: 4px;">刷新</span>
              </el-button>
            </div>
          </div>
        </template>

        <!-- 配置列表 -->
        <el-table 
          :data="configList" 
          v-loading="configLoading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="config_key" label="配置键" width="200" align="left" header-align="center" />
          <el-table-column prop="config_value" label="配置值" min-width="200" align="left" header-align="center">
            <template #default="{ row }">
              {{ formatConfigValue(row.config_key, row.config_value) }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="250" align="left" header-align="center" />
          <el-table-column prop="created_at" label="创建时间" width="180" align="center" header-align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180" align="center" header-align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="center" header-align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button v-if="canEdit" type="primary" size="small" @click="handleEditConfig(row)">
                  <el-icon><Edit /></el-icon>
                  <span style="margin-left: 4px;">编辑</span>
                </el-button>
                <el-button v-if="canDelete" type="danger" size="small" @click="handleDeleteConfig(row)">
                  <el-icon><Delete /></el-icon>
                  <span style="margin-left: 4px;">删除</span>
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="configPagination.page"
            v-model:page-size="configPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="configPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadConfigs"
            @current-change="loadConfigs"
          />
        </div>
      </el-card>
    </div>

    <!-- 同步日志模块 -->
    <div v-show="activeTab === 'logs'" class="logs-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>ERP同步日志</span>
            <div class="header-actions">
              <el-button v-if="canSync" type="primary" @click="handleManualSync" :loading="syncLoading">
                <el-icon><Refresh /></el-icon>
                <span style="margin-left: 4px;">手动同步</span>
              </el-button>
              <el-button @click="loadSyncLogs">
                <el-icon><Refresh /></el-icon>
                <span style="margin-left: 4px;">刷新日志</span>
              </el-button>
              <el-button v-if="canClearLogs" type="warning" @click="handleClearLogs">
                <el-icon><Delete /></el-icon>
                <span style="margin-left: 4px;">清理日志</span>
              </el-button>
            </div>
          </div>
        </template>

        <!-- 搜索筛选 -->
        <div class="search-section">
          <el-form :model="logSearchForm" inline>
            <el-form-item label="同步类型">
              <el-select v-model="logSearchForm.sync_type" placeholder="请选择同步类型" clearable style="width: 120px;">
                <el-option label="生产数据" value="production" />
                <el-option label="交付数据" value="delivery" />
                <el-option label="质量指标" value="quality" />
              </el-select>
            </el-form-item>
            <el-form-item label="同步状态">
              <el-select v-model="logSearchForm.status" placeholder="请选择状态" clearable style="width: 110px;">
                <el-option label="成功" value="success" />
                <el-option label="失败" value="failed" />
                <el-option label="进行中" value="running" />
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="logSearchForm.dateRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadSyncLogs">
                <el-icon><Search /></el-icon>
                <span style="margin-left: 4px;">搜索</span>
              </el-button>
              <el-button @click="resetLogSearch">
                <el-icon><Refresh /></el-icon>
                <span style="margin-left: 4px;">重置</span>
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 日志列表 -->
        <el-table 
          :data="logList" 
          v-loading="logLoading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="sync_type" label="同步类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getSyncTypeTagType(row.sync_type)">{{ getSyncTypeText(row.sync_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="records_count" label="记录数" width="100" />
          <el-table-column prop="start_time" label="开始时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="end_time" label="结束时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.end_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="耗时(秒)" width="100" />
          <el-table-column prop="error_message" label="错误信息" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleViewLogDetail(row)">
                <el-icon><View /></el-icon>
                <span style="margin-left: 4px;">详情</span>
              </el-button>
              <el-button 
                v-if="row.status === 'failed'"
                type="warning" 
                size="small" 
                @click="handleRetrySync(row)"
              >
                <el-icon><Refresh /></el-icon>
                <span style="margin-left: 4px;">重试</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="logPagination.page"
            v-model:page-size="logPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="logPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadSyncLogs"
            @current-change="loadSyncLogs"
          />
        </div>
      </el-card>
    </div>

    <!-- 配置编辑对话框 -->
    <el-dialog 
      v-model="configDialogVisible" 
      :title="configDialogTitle" 
      width="600px"
      @close="resetConfigForm"
    >
      <el-form 
        ref="configFormRef" 
        :model="configForm" 
        :rules="configFormRules" 
        label-width="100px"
      >
        <el-form-item label="配置键" prop="config_key">
          <el-input v-model="configForm.config_key" placeholder="请输入配置键" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item label="配置值" prop="config_value">
          <el-input v-model="configForm.config_value" placeholder="请输入配置值" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="configForm.description" placeholder="请输入配置描述" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig" :loading="configSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog 
      v-model="logDetailDialogVisible" 
      title="同步日志详情" 
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="同步类型">{{ getSyncTypeText(logDetail.sync_type) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ getStatusText(logDetail.status) }}</el-descriptions-item>
        <el-descriptions-item label="记录数">{{ logDetail.records_count }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ logDetail.duration }}秒</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDateTime(logDetail.start_time) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(logDetail.end_time) }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="logDetail.error_message" style="margin-top: 20px;">
        <h4>错误信息：</h4>
        <el-input 
          v-model="logDetail.error_message" 
          type="textarea" 
          :rows="6" 
          readonly
        />
      </div>
      <template #footer>
        <el-button @click="logDetailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Document, Plus, Refresh, Edit, Delete, Search, View } from '@element-plus/icons-vue'
import api from '@/api'
import { useUserStore } from '@/store/user'

export default {
  name: 'ErpManagement',
  components: {
    Setting,
    Document,
    Plus,
    Refresh,
    Edit,
    Delete,
    Search,
    View
  },
  setup() {
    // 用户store
    const userStore = useUserStore()
    
    // 权限状态管理
    const permissions = reactive({
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canSync: false,
      canClearLogs: false
    })
    
    // 检查权限的方法
    const checkPermissions = async () => {
      try {
        // 检查是否有管理员角色
        const hasAdminRole = userStore.hasRole && (userStore.hasRole('admin') || userStore.hasRole('系统管理员'))
        
        if (hasAdminRole) {
          // 管理员拥有所有权限
          permissions.canAdd = true
          permissions.canEdit = true
          permissions.canDelete = true
          permissions.canSync = true
          permissions.canClearLogs = true
        } else {
          // 使用异步权限检查
          const [addPerm, editPerm, deletePerm, syncPerm, clearLogsPerm] = await Promise.all([
            userStore.hasActionPermissionAsync('erp:config:add'),
            userStore.hasActionPermissionAsync('erp:config:edit'),
            userStore.hasActionPermissionAsync('erp:config:delete'),
            userStore.hasActionPermissionAsync('erp:sync:manual'),
            userStore.hasActionPermissionAsync('erp:logs:clear')
          ])
          
          permissions.canAdd = addPerm
          permissions.canEdit = editPerm
          permissions.canDelete = deletePerm
          permissions.canSync = syncPerm
          permissions.canClearLogs = clearLogsPerm
        }
      } catch (error) {
        console.error('权限检查失败:', error)
        // 权限检查失败时，回退到角色权限
        const hasAdminRole = userStore.hasRole && (userStore.hasRole('admin') || userStore.hasRole('系统管理员'))
        permissions.canAdd = hasAdminRole
        permissions.canEdit = hasAdminRole
        permissions.canDelete = hasAdminRole
        permissions.canSync = hasAdminRole
        permissions.canClearLogs = hasAdminRole
      }
    }
    
    // 兼容性computed属性
    const canAdd = computed(() => permissions.canAdd)
    const canEdit = computed(() => permissions.canEdit)
    const canDelete = computed(() => permissions.canDelete)
    const canSync = computed(() => permissions.canSync)
    const canClearLogs = computed(() => permissions.canClearLogs)
    
    // 响应式数据
    const activeTab = ref('config')
    const configLoading = ref(false)
    const logLoading = ref(false)
    const syncLoading = ref(false)
    const configSaving = ref(false)
    
    // 配置管理相关数据
    const configList = ref([])
    const configPagination = reactive({
      page: 1,
      size: 20,
      total: 0
    })
    
    // 配置表单相关
    const configDialogVisible = ref(false)
    const configDialogTitle = ref('')
    const isEditMode = ref(false)
    const configFormRef = ref()
    const configForm = reactive({
      id: null,
      config_key: '',
      config_value: '',
      description: ''
    })
    
    const configFormRules = {
      config_key: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
      config_value: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
      description: [{ required: true, message: '请输入配置描述', trigger: 'blur' }]
    }
    
    // 同步日志相关数据
    const logList = ref([])
    const logPagination = reactive({
      page: 1,
      size: 20,
      total: 0
    })
    
    const logSearchForm = reactive({
      sync_type: '',
      status: '',
      dateRange: []
    })
    
    // 日志详情
    const logDetailDialogVisible = ref(false)
    const logDetail = ref({})
    
    /**
     * 格式化日期时间
     * @param {string} dateTime - 日期时间字符串
     * @returns {string} 格式化后的日期时间
     */
    const formatDateTime = (dateTime) => {
      if (!dateTime) return '-'
      const date = new Date(dateTime)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    
    /**
     * 获取同步类型标签类型
     * @param {string} type - 同步类型
     * @returns {string} 标签类型
     */
    const getSyncTypeTagType = (type) => {
      const typeMap = {
        production: 'primary',
        delivery: 'success',
        quality: 'warning'
      }
      return typeMap[type] || 'info'
    }
    
    /**
     * 获取同步类型文本
     * @param {string} type - 同步类型
     * @returns {string} 同步类型文本
     */
    const getSyncTypeText = (type) => {
      const typeMap = {
        production: '生产数据',
        delivery: '交付数据',
        quality: '质量指标'
      }
      return typeMap[type] || type
    }
    
    /**
     * 获取状态标签类型
     * @param {string} status - 状态
     * @returns {string} 标签类型
     */
    const getStatusTagType = (status) => {
      const statusMap = {
        success: 'success',
        failed: 'danger',
        running: 'warning'
      }
      return statusMap[status] || 'info'
    }
    
    /**
     * 获取状态文本
     * @param {string} status - 状态
     * @returns {string} 状态文本
     */
    const getStatusText = (status) => {
      const statusMap = {
        success: '成功',
        failed: '失败',
        running: '进行中'
      }
      return statusMap[status] || status
    }
    
    /**
     * 加载ERP配置列表
     */
    const loadConfigs = async () => {
      try {
        configLoading.value = true
        const response = await api.get('/api/erp-config/config', {
          params: {
            page: configPagination.page,
            size: configPagination.size
          }
        })
        
        if (response.data.success) {
          configList.value = response.data.data.list
          configPagination.total = response.data.data.total
        } else {
          ElMessage.error(response.data.message || '加载配置失败')
        }
      } catch (error) {
        console.error('加载配置失败:', error)
        ElMessage.error('加载配置失败')
      } finally {
        configLoading.value = false
      }
    }
    
    /**
     * 加载同步日志列表
     */
    const loadSyncLogs = async () => {
      try {
        logLoading.value = true
        const params = {
          page: logPagination.page,
          size: logPagination.size
        }
        
        if (logSearchForm.sync_type) {
          params.sync_type = logSearchForm.sync_type
        }
        if (logSearchForm.status) {
          params.status = logSearchForm.status
        }
        if (logSearchForm.dateRange && logSearchForm.dateRange.length === 2) {
          params.start_time = logSearchForm.dateRange[0]
          params.end_time = logSearchForm.dateRange[1]
        }
        
        const response = await api.get('/api/erp-config/sync-logs', { params })
        
        if (response.data.success) {
          logList.value = response.data.data.list
          logPagination.total = response.data.data.total
        } else {
          ElMessage.error(response.data.message || '加载日志失败')
        }
      } catch (error) {
        console.error('加载日志失败:', error)
        ElMessage.error('加载日志失败')
      } finally {
        logLoading.value = false
      }
    }
    
    /**
     * 重置日志搜索表单
     */
    const resetLogSearch = () => {
      logSearchForm.sync_type = ''
      logSearchForm.status = ''
      logSearchForm.dateRange = []
      loadSyncLogs()
    }
    
    /**
     * 处理新增配置
     */
    const handleAddConfig = () => {
      isEditMode.value = false
      configDialogTitle.value = '新增配置'
      resetConfigForm()
      configDialogVisible.value = true
    }
    
    /**
     * 处理编辑配置
     * @param {Object} row - 配置行数据
     */
    const handleEditConfig = (row) => {
      isEditMode.value = true
      configDialogTitle.value = '编辑配置'
      Object.assign(configForm, row)
      configDialogVisible.value = true
    }
    
    /**
     * 处理删除配置
     * @param {Object} row - 配置行数据
     */
    const handleDeleteConfig = async (row) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除配置 "${row.config_key}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete(`/api/erp-config/config/${row.id}`)
        
        if (response.data.success) {
          ElMessage.success('删除成功')
          loadConfigs()
        } else {
          ElMessage.error(response.data.message || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除配置失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }
    
    /**
     * 处理保存配置
     */
    const handleSaveConfig = async () => {
      try {
        await configFormRef.value.validate()
        configSaving.value = true
        
        const url = isEditMode.value ? `/api/erp-config/config/${configForm.id}` : '/api/erp-config/config'
        const method = isEditMode.value ? 'put' : 'post'
        
        const response = await api[method](url, configForm)
        
        if (response.data.success) {
          ElMessage.success(isEditMode.value ? '更新成功' : '创建成功')
          configDialogVisible.value = false
          loadConfigs()
        } else {
          ElMessage.error(response.data.message || '保存失败')
        }
      } catch (error) {
        console.error('保存配置失败:', error)
        ElMessage.error('保存失败')
      } finally {
        configSaving.value = false
      }
    }
    
    /**
     * 重置配置表单
     */
    const resetConfigForm = () => {
      configForm.id = null
      configForm.config_key = ''
      configForm.config_value = ''
      configForm.description = ''
      if (configFormRef.value) {
        configFormRef.value.clearValidate()
      }
    }
    
    /**
     * 处理手动同步
     */
    const handleManualSync = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要执行手动同步吗？这可能需要一些时间。',
          '确认同步',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        syncLoading.value = true
        const response = await api.post('/api/erp-config/manual-sync')
        
        if (response.data.success) {
          ElMessage.success('同步任务已启动，请查看日志了解进度')
          loadSyncLogs()
        } else {
          ElMessage.error(response.data.message || '启动同步失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('手动同步失败:', error)
          ElMessage.error('启动同步失败')
        }
      } finally {
        syncLoading.value = false
      }
    }
    
    /**
     * 处理清理日志
     */
    const handleClearLogs = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清理所有同步日志吗？此操作不可恢复。',
          '确认清理',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.delete('/api/erp-config/sync-logs')
        
        if (response.data.success) {
          ElMessage.success('日志清理成功')
          loadSyncLogs()
        } else {
          ElMessage.error(response.data.message || '清理失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清理日志失败:', error)
          ElMessage.error('清理失败')
        }
      }
    }
    
    /**
     * 处理查看日志详情
     * @param {Object} row - 日志行数据
     */
    const handleViewLogDetail = (row) => {
      logDetail.value = { ...row }
      logDetailDialogVisible.value = true
    }
    
    /**
     * 处理重试同步
     * @param {Object} row - 日志行数据
     */
    const handleRetrySync = async (row) => {
      try {
        await ElMessageBox.confirm(
          `确定要重试 "${getSyncTypeText(row.sync_type)}" 的同步吗？`,
          '确认重试',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await api.post(`/api/erp-config/retry-sync/${row.id}`)
        
        if (response.data.success) {
          ElMessage.success('重试任务已启动')
          loadSyncLogs()
        } else {
          ElMessage.error(response.data.message || '重试失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('重试同步失败:', error)
          ElMessage.error('重试失败')
        }
      }
    }
    
    /**
     * 格式化配置值显示
     * 对敏感配置（erp_app_id和erp_app_secret）使用星号显示
     * @param {string} configKey - 配置键
     * @param {string} configValue - 配置值
     * @returns {string} 格式化后的配置值
     */
    const formatConfigValue = (configKey, configValue) => {
      // 如果是敏感配置，用星号显示
      if (configKey === 'erp_app_id' || configKey === 'erp_app_secret') {
        return configValue ? '***' + configValue.slice(-4) : ''
      }
      // 其他配置正常显示
      return configValue || ''
    }
    
    // 组件挂载时加载数据
    onMounted(async () => {
      await checkPermissions()
      loadConfigs()
      loadSyncLogs()
    })
    
    return {
      // 响应式数据
      activeTab,
      configLoading,
      logLoading,
      syncLoading,
      configSaving,
      
      // 配置管理
      configList,
      configPagination,
      configDialogVisible,
      configDialogTitle,
      isEditMode,
      configFormRef,
      configForm,
      configFormRules,
      
      // 同步日志
      logList,
      logPagination,
      logSearchForm,
      logDetailDialogVisible,
      logDetail,
      
      // 权限相关
      canAdd,
      canEdit,
      canDelete,
      canSync,
      canClearLogs,
      
      // 方法
      formatDateTime,
      formatConfigValue,
      getSyncTypeTagType,
      getSyncTypeText,
      getStatusTagType,
      getStatusText,
      loadConfigs,
      loadSyncLogs,
      resetLogSearch,
      handleAddConfig,
      handleEditConfig,
      handleDeleteConfig,
      handleSaveConfig,
      resetConfigForm,
      handleManualSync,
      handleClearLogs,
      handleViewLogDetail,
      handleRetrySync
    }
  }
}
</script>

<style scoped>
.erp-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.function-tabs {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.config-section,
.logs-section {
  margin-top: 20px;
}

/* 表格样式 */
:deep(.el-table .el-table__header-wrapper .el-table__header th) {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 600 !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 600 !important;
}

/* 表格内容禁止换行 */
.el-table .el-table__cell {
  white-space: nowrap;
}

.el-table .el-table__cell .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .erp-management {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .search-section .el-form {
    flex-direction: column;
  }
  
  .search-section .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}
</style>