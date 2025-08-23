<template>
  <div class="user-permissions-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户权限管理</h2>
      <p class="page-description">管理用户的个人权限配置，支持权限授予和撤销</p>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-card shadow="never">
        <el-form :model="searchForm" inline>
          <el-form-item label="用户">
            <el-select
              v-model="searchForm.userId"
              placeholder="请选择用户"
              filterable
              remote
              :remote-method="searchUsers"
              :loading="userLoading"
              clearable
              style="width: 200px"
              @change="loadPermissions"
            >
              <el-option
                v-for="user in userOptions"
                :key="user.id"
                :label="`${user.realName} (${user.username})`"
                :value="user.id"
              />
            </el-select>

          </el-form-item>
          
          <el-form-item label="菜单">
            <el-tree-select
              v-model="searchForm.menuId"
              :data="menuOptions"
              :props="{ value: 'id', label: 'menuName', children: 'children' }"
              placeholder="请选择菜单"
              check-strictly
              clearable
              filterable
              style="width: 200px"
            />
          </el-form-item>
          
          <el-form-item label="权限类型">
            <el-select
              v-model="searchForm.permissionType"
              placeholder="请选择权限类型"
              clearable
              style="width: 150px"
            >
              <el-option label="授予" value="grant" />
              <el-option label="拒绝" value="deny" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 120px"
            >
              <el-option label="有效" value="1" />
              <el-option label="无效" value="0" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="loadPermissions" :loading="loading">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
            <el-button type="success" @click="showGrantDialog" v-if="hasPermission('user-permission:grant')">
              <el-icon><Plus /></el-icon>
              授予权限
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 权限列表 -->
    <div class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>权限列表</span>
            <div class="header-actions">
              <el-button
                type="warning"
                size="small"
                @click="cleanupExpiredPermissions"
                v-if="hasPermission('user-permission:manage')"
              >
                <el-icon><Delete /></el-icon>
                清理过期权限
              </el-button>
            </div>
          </div>
        </template>
        
        <el-table
          :data="permissions"
          v-loading="loading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="UserRealName" label="用户" width="120" />
          <el-table-column prop="MenuName" label="菜单" width="150" />
          <el-table-column prop="PermissionType" label="权限类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.PermissionType === 'grant' ? 'success' : 'danger'">
                {{ row.PermissionType === 'grant' ? '授予' : '拒绝' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="PermissionLevel" label="权限级别" width="100">
            <template #default="{ row }">
              <el-tag :type="row.PermissionLevel === 'menu' ? 'primary' : 'info'">
                {{ row.PermissionLevel === 'menu' ? '菜单' : '操作' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ActionCode" label="操作代码" width="120" />
          <el-table-column prop="GrantedByName" label="授权人" width="100" />
          <el-table-column prop="GrantedAt" label="授权时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.GrantedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="ExpiresAt" label="过期时间" width="160">
            <template #default="{ row }">
              <span v-if="row.ExpiresAt">
                {{ formatDateTime(row.ExpiresAt) }}
              </span>
              <el-tag v-else type="success" size="small">永久有效</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="PermissionStatus" label="状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.PermissionStatus)"
                size="small"
              >
                {{ row.PermissionStatus }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="Reason" label="授权原因" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="viewHistory(row)"
                v-if="hasPermission('user-permission:view')"
              >
                历史
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="revokePermission(row)"
                v-if="hasPermission('user-permission:revoke') && row.Status"
              >
                撤销
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadPermissions"
            @current-change="loadPermissions"
          />
        </div>
      </el-card>
    </div>

    <!-- 授予权限对话框 -->
    <el-dialog
      v-model="grantDialog.visible"
      title="授予用户权限"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="grantFormRef"
        :model="grantForm"
        :rules="grantRules"
        label-width="100px"
      >
        <el-form-item label="用户" prop="userId">
          <el-select
            v-model="grantForm.userId"
            placeholder="请选择用户"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="userLoading"
            style="width: 100%"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="`${user.realName} (${user.username})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="菜单" prop="menuId">
          <el-tree-select
            v-model="grantForm.menuId"
            :data="menuOptions"
            :props="{ value: 'id', label: 'menuName', children: 'children' }"
            placeholder="请选择菜单"
            check-strictly
            clearable
            filterable
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="权限类型" prop="permissionType">
          <el-radio-group v-model="grantForm.permissionType">
            <el-radio label="grant">授予</el-radio>
            <el-radio label="deny">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="权限级别" prop="permissionLevel">
          <el-radio-group v-model="grantForm.permissionLevel">
            <el-radio label="menu">菜单权限</el-radio>
            <el-radio label="action">操作权限</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item
          label="操作代码"
          prop="actionCode"
          v-if="grantForm.permissionLevel === 'action'"
        >
          <el-select
            v-model="grantForm.actionCode"
            placeholder="请选择操作"
            style="width: 100%"
          >
            <el-option label="查看" value="view" />
            <el-option label="新增" value="add" />
            <el-option label="编辑" value="edit" />
            <el-option label="删除" value="delete" />
            <el-option label="导出" value="export" />
            <el-option label="导入" value="import" />
            <el-option label="审核" value="audit" />
            <el-option label="管理" value="manage" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="grantForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间（可选）"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>
        
        <el-form-item label="授权原因">
          <el-input
            v-model="grantForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入授权原因（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="grantDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitGrant" :loading="grantDialog.loading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 权限历史页面 -->
    <el-drawer
      v-model="historyDialog.visible"
      title="权限变更历史"
      direction="rtl"
      size="80%"
      :before-close="handleHistoryClose"
    >
      <template #header>
        <div class="history-header">
          <el-icon class="history-icon"><Clock /></el-icon>
          <span class="history-title">权限变更历史</span>
          <div class="history-user-info" v-if="currentHistoryUser">
            <el-tag type="info" size="large">
              <el-icon><User /></el-icon>
              {{ currentHistoryUser.Username }} ({{ currentHistoryUser.RealName }})
            </el-tag>
          </div>
        </div>
      </template>
      
      <div class="history-content">
        <!-- 历史记录统计信息 -->
        <div class="history-stats">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ historyPagination.total }}</div>
              <div class="stat-label">总记录数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ getActionCount('create') }}</div>
              <div class="stat-label">创建记录</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ getActionCount('update') }}</div>
              <div class="stat-label">更新记录</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ getActionCount('delete') }}</div>
              <div class="stat-label">删除记录</div>
            </div>
          </div>
        </div>

        <!-- 历史记录表格 -->
        <el-card class="history-table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">变更记录详情</span>
              <div class="header-actions">
                <el-button
                  type="primary"
                  :icon="Refresh"
                  @click="loadHistory"
                  :loading="historyDialog.loading"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table
            :data="historyData"
            v-loading="historyDialog.loading"
            stripe
            border
            style="width: 100%"
            :row-class-name="getRowClassName"
          >
            <el-table-column prop="Action" label="操作类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="getActionType(row.Action)"
                  size="large"
                  effect="dark"
                >
                  <el-icon style="margin-right: 4px;">
                    <component :is="getActionIcon(row.Action)" />
                  </el-icon>
                  {{ getActionText(row.Action) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="PermissionType" label="权限类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag 
                  :type="row.PermissionType === 'grant' ? 'success' : 'danger'" 
                  size="large"
                  effect="dark"
                >
                  <el-icon style="margin-right: 4px;">
                    <component :is="row.PermissionType === 'grant' ? Check : Close" />
                  </el-icon>
                  {{ row.PermissionType === 'grant' ? '授予' : '拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="MenuName" label="菜单名称" width="150" show-overflow-tooltip />
            <el-table-column prop="ActionCode" label="操作代码" width="120" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.ActionCode" type="info" size="small">
                  {{ row.ActionCode }}
                </el-tag>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="OperatorName" label="操作人" width="120" align="center">
              <template #default="{ row }">
                <div class="operator-info">
                  <el-avatar :size="24" style="margin-right: 8px;">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  {{ row.OperatorName }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="OperatedAt" label="操作时间" width="180" align="center">
              <template #default="{ row }">
                <div class="time-info">
                  <el-icon style="margin-right: 4px; color: #909399;"><Clock /></el-icon>
                  {{ formatDateTime(row.OperatedAt) }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="Reason" label="操作原因" min-width="200">
              <template #default="{ row }">
                <div class="reason-content">
                  <el-text v-if="row.Reason" type="primary">{{ row.Reason }}</el-text>
                  <el-text v-else type="info">未填写原因</el-text>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="PermissionLevel" label="权限级别" width="120" align="center">
              <template #default="{ row }">
                <div class="permission-type">
                  <el-tag v-if="row.PermissionLevel === 'menu'" type="primary" size="small">
                    <el-icon style="margin-right: 4px;"><Menu /></el-icon>
                    菜单权限
                  </el-tag>
                  <el-tag v-else-if="row.PermissionLevel === 'action'" type="success" size="small">
                    <el-icon style="margin-right: 4px;"><Operation /></el-icon>
                    按钮权限
                  </el-tag>
                  <el-tag v-else type="info" size="small">
                    {{ row.PermissionLevel || '未知' }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <div class="operation-buttons">
                  <el-button
                    v-if="row.Action === 'delete'"
                    type="primary"
                    size="small"
                    @click="restorePermission(row)"
                    :loading="restoreLoading"
                  >
                    <el-icon><RefreshRight /></el-icon>
                    恢复
                  </el-button>
                  <el-text v-else type="info" size="small">-</el-text>
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 历史记录分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="historyPagination.page"
              v-model:page-size="historyPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="historyPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadHistory"
              @current-change="loadHistory"
              background
            />
          </div>
        </el-card>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Clock, User, Check, Close, Edit, CirclePlus, Remove, RefreshRight, Menu, Operation } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import api from '@/services/api'

// 用户权限store
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const userLoading = ref(false)
const restoreLoading = ref(false)
const permissions = ref([])
const userOptions = ref([])
const menuOptions = ref([])

// 搜索表单
const searchForm = reactive({
  userId: null,
  menuId: null,
  permissionType: '',
  status: '1'
})

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 授予权限对话框
const grantDialog = reactive({
  visible: false,
  loading: false
})

// 授予权限表单
const grantForm = reactive({
  userId: null,
  menuId: null,
  permissionType: 'grant',
  permissionLevel: 'menu',
  actionCode: '',
  expiresAt: null,
  reason: ''
})

// 表单引用
const grantFormRef = ref()

// 表单验证规则
const grantRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  menuId: [{ required: true, message: '请选择菜单', trigger: 'change' }],
  permissionType: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
  permissionLevel: [{ required: true, message: '请选择权限级别', trigger: 'change' }],
  actionCode: [
    {
      validator: (rule, value, callback) => {
        if (grantForm.permissionLevel === 'action' && !value) {
          callback(new Error('操作权限必须选择操作代码'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 历史记录对话框
const historyDialog = reactive({
  visible: false,
  loading: false
})

const historyData = ref([])
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const currentHistoryUserId = ref(null)
const currentHistoryUser = ref(null)

/**
 * 权限检查函数
 * @param {string} permission - 权限代码
 * @returns {boolean} 是否有权限
 */
const hasPermission = (permission) => {
  return userStore.hasPermission(permission)
}

/**
 * 格式化日期时间
 * @param {string} dateTime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  return new Date(dateTime).toLocaleString('zh-CN')
}

/**
 * 获取状态类型
 * @param {string} status - 状态
 * @returns {string} Element Plus tag类型
 */
const getStatusType = (status) => {
  switch (status) {
    case '有效': return 'success'
    case '已过期': return 'warning'
    case '永久有效': return 'success'
    default: return 'info'
  }
}

/**
 * 获取操作类型
 * @param {string} action - 操作
 * @returns {string} Element Plus tag类型
 */
const getActionType = (action) => {
  switch (action) {
    case 'create': return 'success'
    case 'update': return 'warning'
    case 'delete': return 'danger'
    default: return 'info'
  }
}

/**
 * 获取操作文本
 * @param {string} action - 操作
 * @returns {string} 操作文本
 */
const getActionText = (action) => {
  switch (action) {
    case 'create': return '创建'
    case 'update': return '更新'
    case 'delete': return '删除'
    default: return action
  }
}

/**
 * 禁用过去的日期
 * @param {Date} time - 日期
 * @returns {boolean} 是否禁用
 */
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7 // 禁用昨天之前的日期
}

/**
 * 加载初始用户列表
 */
const loadInitialUsers = async () => {
  try {
    userLoading.value = true
    const response = await api.get('/auth/user-list', {
      params: {
        pageSize: 50 // 加载前50个用户
      }
    })
    
    if (response.data.success) {
      const mappedUsers = response.data.data.map(user => ({
        id: user.ID,
        username: user.Username,
        realName: user.RealName
      }))
      userOptions.value = mappedUsers
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    userLoading.value = false
  }
}

/**
 * 搜索用户
 * @param {string} query - 搜索关键词
 */
const searchUsers = async (query) => {
  if (!query) {
    // 如果没有搜索关键词，重新加载初始用户列表
    await loadInitialUsers()
    return
  }
  
  try {
    userLoading.value = true
    const response = await api.get('/auth/user-list', {
      params: {
        search: query,
        pageSize: 20
      }
    })
    
    if (response.data.success) {
      userOptions.value = response.data.data.map(user => ({
        id: user.ID,
        username: user.Username,
        realName: user.RealName
      }))
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('搜索用户失败')
  } finally {
    userLoading.value = false
  }
}

/**
 * 加载菜单选项（树形结构）
 */
const loadMenuOptions = async () => {
  try {
    const response = await api.get('/menus/tree')
    if (response.data.success) {
      // 递归转换菜单数据格式以适配树形选择器
      const convertMenuData = (menus) => {
        return menus.map(menu => ({
          id: menu.ID,
          menuName: menu.Name || menu.MenuName,
          menuCode: menu.Code || menu.MenuCode,
          children: menu.children && menu.children.length > 0 ? convertMenuData(menu.children) : undefined
        }))
      }
      
      menuOptions.value = convertMenuData(response.data.data || [])
    }
  } catch (error) {
    console.error('加载菜单失败:', error)
    ElMessage.error('加载菜单失败')
  }
}

/**
 * 加载权限列表
 */
const loadPermissions = async () => {
  // 如果没有选择用户，清空权限列表但不显示错误
  if (!searchForm.userId) {
    permissions.value = []
    pagination.total = 0
    return
  }
  
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null) {
        delete params[key]
      }
    })
    
    const response = await api.get(`/user-permissions/${searchForm.userId}`, { params })
    
    if (response.data.success) {
      permissions.value = response.data.data
      pagination.total = response.data.total || response.data.data.length
    }
  } catch (error) {
    console.error('加载权限列表失败:', error)
    ElMessage.error('加载权限列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 重置搜索
 */
const resetSearch = () => {
  Object.assign(searchForm, {
    userId: null,
    menuId: null,
    permissionType: '',
    status: '1'
  })
  permissions.value = []
  pagination.page = 1
}

/**
 * 显示授予权限对话框
 */
const showGrantDialog = () => {
  // 重置表单
  Object.assign(grantForm, {
    userId: searchForm.userId,
    menuId: null,
    permissionType: 'grant',
    permissionLevel: 'menu',
    actionCode: '',
    expiresAt: null,
    reason: ''
  })
  
  grantDialog.visible = true
  
  // 清除表单验证
  if (grantFormRef.value) {
    grantFormRef.value.clearValidate()
  }
}

/**
 * 提交授予权限
 */
const submitGrant = async () => {
  try {
    // 表单验证
    await grantFormRef.value.validate()
    
    grantDialog.loading = true
    
    const data = { ...grantForm }
    
    // 如果是菜单权限，清空操作代码
    if (data.permissionLevel === 'menu') {
      data.actionCode = null
    }
    
    const response = await api.post('/user-permissions', data)
    
    if (response.data.success) {
      ElMessage.success('权限授予成功')
      grantDialog.visible = false
      loadPermissions()
      
      // 如果修改的是当前登录用户的权限，刷新用户信息以更新权限缓存
      const currentUser = userStore.user
      if (currentUser && currentUser.id === data.userId) {
        await userStore.fetchProfile(true) // 强制刷新用户信息
        console.log('已刷新当前用户权限信息')
      }
    } else {
      ElMessage.error(response.data.message || '权限授予失败')
    }
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('授予权限失败')
    }
  } finally {
    grantDialog.loading = false
  }
}

/**
 * 撤销权限
 * @param {Object} row - 权限行数据
 */
const revokePermission = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤销用户 "${row.UserRealName}" 对菜单 "${row.MenuName}" 的权限吗？`,
      '撤销权限',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/user-permissions/${row.ID}`)
    
    if (response.data.success) {
      ElMessage.success('权限撤销成功')
      loadPermissions()
      
      // 如果修改的是当前登录用户的权限，刷新用户信息以更新权限缓存
      const currentUser = userStore.user
      if (currentUser && currentUser.id === row.UserId) {
        await userStore.fetchProfile(true) // 强制刷新用户信息
        console.log('已刷新当前用户权限信息')
      }
    } else {
      ElMessage.error(response.data.message || '权限撤销失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤销权限失败')
    }
  }
}

/**
 * 恢复权限
 * @param {Object} row - 历史记录行数据
 */
const restorePermission = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复用户 "${row.UserRealName}" 对菜单 "${row.MenuName}" 的权限吗？`,
      '恢复权限',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    restoreLoading.value = true
    
    // 调用恢复权限API
    const response = await api.post('/user-permissions/restore', {
      userId: row.UserID,
      menuId: row.MenuID,
      permissionType: row.PermissionType,
      permissionLevel: row.PermissionLevel || 'menu',
      reason: '从历史记录恢复权限'
    })
    
    if (response.data.success) {
      ElMessage.success('权限恢复成功')
      // 刷新权限历史和权限列表
      loadHistory()
      loadPermissions()
      
      // 如果修改的是当前登录用户的权限，刷新用户信息以更新权限缓存
      const currentUser = userStore.user
      if (currentUser && currentUser.id === row.UserID) {
        await userStore.fetchProfile(true) // 强制刷新用户信息
        console.log('已刷新当前用户权限信息')
      }
    } else {
      ElMessage.error(response.data.message || '权限恢复失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复权限失败:', error)
      ElMessage.error('恢复权限失败')
    }
  } finally {
    restoreLoading.value = false
  }
}

/**
 * 查看权限历史
 * @param {Object} row - 权限行数据
 */
const viewHistory = (row) => {
  currentHistoryUserId.value = row.UserID
  currentHistoryUser.value = {
    Username: row.Username,
    RealName: row.RealName
  }
  historyPagination.page = 1
  historyDialog.visible = true
  loadHistory()
}

/**
 * 加载权限历史
 */
const loadHistory = async () => {
  if (!currentHistoryUserId.value) return
  
  try {
    historyDialog.loading = true
    const params = {
      page: historyPagination.page,
      pageSize: historyPagination.pageSize
    }
    
    const response = await api.get(`/user-permissions/${currentHistoryUserId.value}/history`, { params })
    
    if (response.data.success) {
      historyData.value = response.data.data
      historyPagination.total = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载权限历史失败:', error)
    ElMessage.error('加载权限历史失败')
  } finally {
    historyDialog.loading = false
  }
}

/**
 * 处理历史抽屉关闭
 * @param {Function} done - 关闭回调函数
 */
const handleHistoryClose = (done) => {
  currentHistoryUserId.value = null
  currentHistoryUser.value = null
  historyData.value = []
  done()
}

/**
 * 获取操作统计数量
 * @param {string} action - 操作类型
 * @returns {number} 统计数量
 */
const getActionCount = (action) => {
  return historyData.value.filter(item => item.Action === action).length
}

/**
 * 获取操作图标
 * @param {string} action - 操作类型
 * @returns {Component} 图标组件
 */
const getActionIcon = (action) => {
  const iconMap = {
    'create': CirclePlus,
    'update': Edit,
    'delete': Remove
  }
  return iconMap[action] || Edit
}

/**
 * 获取表格行样式类名
 * @param {Object} param - 行数据参数
 * @returns {string} 样式类名
 */
const getRowClassName = ({ row }) => {
  if (row.Action === 'delete') {
    return 'danger-row'
  } else if (row.Action === 'create') {
    return 'success-row'
  } else if (row.Action === 'update') {
    return 'warning-row'
  }
  return ''
}

/**
 * 清理过期权限
 */
const cleanupExpiredPermissions = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理所有过期的用户权限吗？此操作不可撤销。',
      '清理过期权限',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.post('/user-permissions/cleanup-expired')
    
    if (response.data.success) {
      ElMessage.success(response.data.message)
      loadPermissions()
    } else {
      ElMessage.error(response.data.message || '清理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理过期权限失败:', error)
      ElMessage.error('清理过期权限失败')
    }
  }
}

// 组件挂载时执行
onMounted(() => {
  loadMenuOptions()
  loadInitialUsers()
  // 初始化时加载权限列表（如果没有选择用户会显示空列表）
  loadPermissions()
})
</script>

<style scoped>
.user-permissions-container {
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
  color: #606266;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
}

.table-section {
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

.pagination-wrapper {
  /* margin-top: 20px; */
  display: flex;
  justify-content: center;
}

.el-form--inline .el-form-item {
  margin-right: 16px;
}

.el-table {
  font-size: 14px;
}

/* 权限列表表格样式 - 垂直和水平居中，禁止换行 */
.el-table :deep(.el-table__cell) {
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.el-table :deep(.cell) {
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 表头背景色设置为浅灰色 */
.el-table :deep(.el-table__header-wrapper) {
  background-color: #f5f7fa;
}

.el-table :deep(.el-table__header) {
  background-color: #f5f7fa;
}

.el-table :deep(.el-table__header th) {
  background-color: #f5f7fa !important;
}

.el-dialog__body {
  padding: 20px;
}

.el-form-item__label {
  font-weight: 500;
}

.el-tag {
  font-weight: 500;
}

/* 权限历史抽屉样式 */
.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 40px;
  margin: 0 !important;
}

/* 覆盖抽屉头部的默认样式 */
:deep(.el-drawer__header) {
  margin: 0 !important;
  padding: 0 !important;
}

.history-icon {
  font-size: 16px;
  color: #409eff;
}

.history-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.history-user-info {
  margin-left: auto;
}

.history-content {
  padding: 10px 20px 20px 20px;
  height: 100%;
  overflow-y: auto;
}

.history-stats {
  margin-bottom: 20px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.history-table-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.operator-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.reason-content {
  padding: 8px;
  line-height: 1.5;
}

.text-muted {
  color: #909399;
  font-style: italic;
}

/* 表格行样式 */
.el-table :deep(.success-row) {
  background-color: #f0f9ff;
}

.el-table :deep(.warning-row) {
  background-color: #fefce8;
}

.el-table :deep(.danger-row) {
  background-color: #fef2f2;
}

.el-table :deep(.success-row:hover > td) {
  background-color: #e0f2fe !important;
}

.el-table :deep(.warning-row:hover > td) {
  background-color: #fef3c7 !important;
}

.el-table :deep(.danger-row:hover > td) {
  background-color: #fee2e2 !important;
}

/* 权限历史表格标签样式修复 */
.el-table :deep(.el-tag) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1;
  min-height: 28px;
  padding: 6px 12px;
  box-sizing: border-box;
}

/* 操作原因列左对齐 */
.reason-content {
  text-align: left;
  width: 100%;
}

.el-table :deep(.el-tag .el-icon) {
  margin-right: 4px;
  flex-shrink: 0;
  display: inline-block;
}

.el-table :deep(.el-tag span) {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-permissions-container {
    padding: 10px;
  }
  
  .el-form--inline .el-form-item {
    display: block;
    margin-right: 0;
    margin-bottom: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
  }
  
  .stat-item {
    padding: 12px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .history-content {
    padding: 16px;
  }
  
  .history-header {
    padding: 0 16px;
    flex-wrap: wrap;
  }
  
  .history-user-info {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>