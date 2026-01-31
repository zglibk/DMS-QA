<template>
  <div class="erp-api-doc-container">
    <!-- 权限验证加载中 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <span>正在验证权限...</span>
    </div>

    <!-- 无权限提示 -->
    <div v-else-if="!hasPermission" class="no-permission">
      <el-result icon="warning" title="无访问权限" sub-title="您没有访问ERP接口文档的权限，请联系管理员">
        <template #extra>
          <el-button type="primary" @click="goBack">返回上一页</el-button>
        </template>
      </el-result>
    </div>

    <!-- 主内容区 -->
    <div v-else class="doc-main">
      <!-- 顶部工具栏 -->
      <div class="doc-toolbar">
        <div class="toolbar-left">
          <div class="doc-title">
            <el-icon><Document /></el-icon>
            <span>{{ docConfig.DocTitle || 'ERP接口文档' }}</span>
            <el-tag size="small" type="info">{{ docConfig.DocVersion || 'V1.0' }}</el-tag>
          </div>
        </div>
        <div class="toolbar-center">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索接口名称、路径..."
            prefix-icon="Search"
            clearable
            style="width: 300px"
          />
        </div>
        <div class="toolbar-right">
          <el-button v-if="canEdit" :icon="Setting" @click="showConfigDialog = true">配置</el-button>
          <el-button v-if="canEdit" :icon="Download" @click="showExportDialog">导出</el-button>
          <el-button v-if="canEdit" :icon="Upload" @click="triggerImport">导入</el-button>
          <el-button v-if="canEdit" type="danger" :icon="Delete" @click="showClearAllDialog">清空数据</el-button>
          <input ref="importInput" type="file" accept=".json" style="display:none" @change="handleImport" />
        </div>
      </div>

      <div class="doc-content">
        <!-- 左侧目录 -->
        <div class="doc-sidebar">
          <div class="sidebar-header">
            <span>接口目录</span>
            <el-button v-if="canEdit" type="primary" link :icon="Plus" @click="showGroupDialog()">
              添加模块
            </el-button>
          </div>
          <el-scrollbar class="sidebar-scroll">
            <div class="nav-tree">
              <!-- 首页菜单项 -->
              <div 
                class="nav-home-item"
                :class="{ active: !currentItemId }"
                @click="goToHome"
              >
                <el-icon class="home-icon"><HomeFilled /></el-icon>
                <span>首页</span>
              </div>
              
              <div
                v-for="group in filteredGroups"
                :key="group.Id"
                class="nav-group"
              >
                <div 
                  class="nav-group-title"
                  :class="{ expanded: expandedGroups.includes(group.Id) }"
                  @click="toggleGroup(group.Id)"
                >
                  <el-icon class="expand-icon">
                    <ArrowRight />
                  </el-icon>
                  <el-icon><Folder /></el-icon>
                  <span class="group-name">{{ group.GroupName }}</span>
                  <el-badge :value="group.ApiCount" :max="99" type="danger" />
                  <div v-if="canEdit" class="group-actions" @click.stop>
                    <el-button type="primary" link size="small" :icon="Plus" @click="showItemDialog(group.Id)" />
                    <el-button type="primary" link size="small" :icon="Edit" @click="showGroupDialog(group)" />
                    <el-button type="danger" link size="small" :icon="Delete" @click="showDeleteGroupConfirm(group)" />
                  </div>
                </div>
                <transition name="collapse">
                  <div v-show="expandedGroups.includes(group.Id)" class="nav-group-items">
                    <div
                      v-for="item in getGroupItems(group.Id)"
                      :key="item.Id"
                      class="nav-item"
                      :class="{ active: currentItemId === item.Id }"
                      @click="selectItem(item)"
                    >
                      <el-tag 
                        :type="getMethodTagType(item.HttpMethod)" 
                        size="small" 
                        effect="dark"
                        class="method-tag"
                      >
                        {{ item.HttpMethod }}
                      </el-tag>
                      <span class="item-name" :title="item.ApiName">{{ item.ApiName }}</span>
                    </div>
                    <div v-if="getGroupItems(group.Id).length === 0" class="nav-empty">
                      暂无接口
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </el-scrollbar>
        </div>

        <!-- 右侧内容 -->
        <div class="doc-body">
          <!-- 欢迎页 -->
          <div v-if="!currentItem" class="welcome-page">
            <div class="welcome-content">
              <div class="welcome-icon">
                <el-icon :size="64"><Document /></el-icon>
              </div>
              <h1>{{ docConfig.DocTitle || '迅越ERP接口文档' }}</h1>
              <p class="subtitle">珠海腾佳印刷 · {{ docConfig.DocVersion || 'V2.0' }}</p>
              
              <el-divider />
              
              <div class="base-info-card">
                <h3>基础信息</h3>
                <div class="info-row">
                  <label>接口地址：</label>
                  <code class="url-code">{{ docConfig.BaseUrl || 'http://192.168.1.168:99' }}</code>
                  <el-button link type="primary" :icon="CopyDocument" @click="copyText(docConfig.BaseUrl)">
                    复制
                  </el-button>
                </div>
                <div class="info-row">
                  <label>认证方式：</label>
                  <span>access_token（URL参数或请求头）</span>
                </div>
              </div>

              <div class="auth-card">
                <h3>获取Token</h3>
                <div class="code-block">
                  <div class="code-header">
                    <span>HTTP</span>
                    <el-button link type="primary" :icon="CopyDocument" @click="copyText(tokenUrl)">
                      复制
                    </el-button>
                  </div>
                  <pre class="code-content"><code>GET {{ docConfig.BaseUrl }}/client/token?appid={{ docConfig.AuthAppId }}&amp;appsecret={{ docConfig.AuthAppSecret }}</code></pre>
                </div>
              </div>

              <p class="tip">
                <el-icon><InfoFilled /></el-icon>
                请从左侧目录选择接口查看详情
              </p>
            </div>
          </div>

          <!-- 接口详情 -->
          <el-scrollbar v-else class="detail-scroll">
            <div class="api-detail">
              <!-- 接口头部 -->
              <div class="api-header">
                <div class="api-title-row">
                  <el-tag 
                    :type="getMethodTagType(currentItem.HttpMethod)" 
                    size="large" 
                    effect="dark"
                  >
                    {{ currentItem.HttpMethod }}
                  </el-tag>
                  <h2>{{ currentItem.ApiName }}</h2>
                  <div v-if="canEdit" class="api-actions">
                    <el-button type="primary" :icon="Edit" @click="showItemDialog(currentItem.GroupId, currentItem)">
                      编辑
                    </el-button>
                    <el-button type="danger" :icon="Delete" @click="showDeleteItemConfirm(currentItem)">
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="api-meta">
                  <span>所属模块：{{ currentItem.GroupName }}</span>
                  <span>更新时间：{{ formatDate(currentItem.UpdatedAt) }}</span>
                </div>
              </div>

              <!-- 接口地址 -->
              <div class="api-section">
                <h3>接口地址</h3>
                <div class="url-box">
                  <code>{{ docConfig.BaseUrl }}{{ currentItem.ApiPath }}</code>
                  <el-button link type="primary" :icon="CopyDocument" @click="copyText(docConfig.BaseUrl + currentItem.ApiPath)">
                    复制完整地址
                  </el-button>
                </div>
              </div>

              <!-- 接口描述 -->
              <div v-if="currentItem.ApiDescription" class="api-section">
                <h3>接口描述</h3>
                <div class="rich-content" v-html="currentItem.ApiDescription"></div>
              </div>

              <!-- 请求参数 -->
              <div v-if="currentItem.RequestParams" class="api-section">
                <h3>请求参数</h3>
                <div class="rich-content" v-html="currentItem.RequestParams"></div>
              </div>

              <!-- 响应参数 -->
              <div v-if="currentItem.ResponseParams" class="api-section">
                <h3>响应参数</h3>
                <div class="rich-content" v-html="currentItem.ResponseParams"></div>
              </div>

              <!-- 响应示例 -->
              <div v-if="currentItem.ResponseExample" class="api-section">
                <h3>响应示例</h3>
                <div class="code-block">
                  <div class="code-header">
                    <span>JSON</span>
                    <el-button link type="primary" :icon="CopyDocument" @click="copyText(currentItem.ResponseExample)">
                      复制
                    </el-button>
                  </div>
                  <pre class="code-content"><code v-html="highlightJson(currentItem.ResponseExample)"></code></pre>
                </div>
              </div>

              <!-- 调用示例 -->
              <div v-if="currentItem.RequestExample" class="api-section">
                <h3>调用示例</h3>
                <div class="code-block">
                  <div class="code-header">
                    <span>cURL / JavaScript / Python / Java / Go / PHP</span>
                    <el-button link type="primary" :icon="CopyDocument" @click="copyText(currentItem.RequestExample)">
                      复制
                    </el-button>
                  </div>
                  <pre class="code-content code-shell"><code>{{ currentItem.RequestExample }}</code></pre>
                </div>
              </div>

              <!-- 备注 -->
              <div v-if="currentItem.Remark" class="api-section">
                <h3>备注</h3>
                <div class="rich-content" v-html="currentItem.Remark"></div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>

    <!-- 配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="文档配置" width="500px">
      <el-form :model="editingConfig" label-width="100px">
        <el-form-item label="文档标题">
          <el-input v-model="editingConfig.DocTitle" />
        </el-form-item>
        <el-form-item label="文档版本">
          <el-input v-model="editingConfig.DocVersion" />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-input v-model="editingConfig.BaseUrl" />
        </el-form-item>
        <el-form-item label="AppId">
          <el-input v-model="editingConfig.AuthAppId" />
        </el-form-item>
        <el-form-item label="AppSecret">
          <el-input v-model="editingConfig.AuthAppSecret" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分组编辑对话框 -->
    <el-dialog v-model="showGroupDialogVisible" :title="editingGroup.Id ? '编辑模块' : '添加模块'" width="450px">
      <el-form :model="editingGroup" label-width="80px">
        <el-form-item label="模块名称" required>
          <el-input v-model="editingGroup.GroupName" placeholder="如：工单、物料信息" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editingGroup.Description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editingGroup.SortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 接口编辑对话框 -->
    <ApiItemEditor
      v-model:visible="showItemDialogVisible"
      :item="editingItem"
      :groups="groups"
      @save="saveItem"
    />

    <!-- 删除模块确认对话框 -->
    <el-dialog 
      v-model="deleteGroupDialogVisible" 
      title="删除模块确认" 
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="delete-confirm-content">
        <el-icon class="warning-icon" :size="48" color="#E6A23C"><WarningFilled /></el-icon>
        <p>确定要删除模块 <strong>{{ deletingGroup?.GroupName }}</strong> 吗？</p>
        <p class="warning-text">该模块下的所有接口也将被删除</p>
      </div>
      <template #footer>
        <el-button @click="deleteGroupDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteGroup" :loading="deleteLoading">确定删除</el-button>
      </template>
    </el-dialog>

    <!-- 删除接口确认对话框 -->
    <el-dialog 
      v-model="deleteItemDialogVisible" 
      title="删除接口确认" 
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="delete-confirm-content">
        <el-icon class="warning-icon" :size="48" color="#E6A23C"><WarningFilled /></el-icon>
        <p>确定要删除接口 <strong>{{ deletingItem?.ApiName }}</strong> 吗？</p>
        <p class="warning-text">此操作不可恢复</p>
      </div>
      <template #footer>
        <el-button @click="deleteItemDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteItem" :loading="deleteLoading">确定删除</el-button>
      </template>
    </el-dialog>

    <!-- 导出格式选择对话框 -->
    <el-dialog 
      v-model="exportDialogVisible" 
      title="导出接口文档" 
      width="420px"
      :close-on-click-modal="false"
    >
      <div class="export-dialog-content">
        <p style="margin-bottom: 16px; color: #606266;">请选择导出格式：</p>
        <el-radio-group v-model="exportFormat" class="export-format-group">
          <el-radio label="json" border>
            <div class="format-option">
              <strong>JSON 格式</strong>
              <span>可用于数据备份和重新导入</span>
            </div>
          </el-radio>
          <el-radio label="html" border>
            <div class="format-option">
              <strong>HTML 页面</strong>
              <span>独立可运行的静态网页文档</span>
            </div>
          </el-radio>
          <el-radio label="docx" border disabled>
            <div class="format-option">
              <strong>Word 文档</strong>
              <span>（开发中...）</span>
            </div>
          </el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport" :loading="exportLoading">确定导出</el-button>
      </template>
    </el-dialog>

    <!-- 清空数据确认对话框 -->
    <el-dialog 
      v-model="clearAllDialogVisible" 
      title="⚠️ 危险操作 - 清空所有数据" 
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="clear-all-warning">
        <el-alert
          title="此操作将永久删除所有ERP接口文档数据！"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>包括：</p>
            <ul style="padding-left: 20px; margin: 8px 0;">
              <li>所有接口分组（{{ clearAllStats.totalGroupCount || 0 }} 个）</li>
              <li>所有接口文档（{{ clearAllStats.totalItemCount || 0 }} 个）</li>
            </ul>
            <p style="color: #f56c6c; font-weight: bold;">此操作不可恢复！建议先导出备份。</p>
          </template>
        </el-alert>
        
        <div class="confirm-input" style="margin-top: 20px; margin-bottom: 20px;">
          <p>请输入 <code style="background: #f5f7fa; padding: 2px 6px; border-radius: 4px; color: #f56c6c; font-weight: bold;">CONFIRM</code> 确认删除：</p>
          <el-input 
            v-model="clearAllConfirmText" 
            placeholder="请输入 CONFIRM"
            style="margin-top: 10px;"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="clearAllDialogVisible = false">取消</el-button>
        <el-button @click="showExportDialog" type="warning">先导出备份</el-button>
        <el-button 
          type="danger" 
          :disabled="clearAllConfirmText !== 'CONFIRM'"
          :loading="clearAllLoading"
          @click="handleClearAll"
        >
          确认清空
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Loading, Document, Folder, Search, Setting, Download, Upload,
  Plus, Edit, Delete, ArrowRight, CopyDocument, InfoFilled, WarningFilled, HomeFilled
} from '@element-plus/icons-vue'
import ApiItemEditor from './components/ApiItemEditor.vue'
import api from '@/utils/api'

const router = useRouter()

// ==================== 状态 ====================
const loading = ref(true)
const hasPermission = ref(false)
const canEdit = ref(false)

const docConfig = ref({})
const editingConfig = ref({})
const showConfigDialog = ref(false)

const groups = ref([])
const items = ref([])
const expandedGroups = ref([])
const currentItemId = ref(null)
const searchKeyword = ref('')

const showGroupDialogVisible = ref(false)
const editingGroup = ref({})

const showItemDialogVisible = ref(false)
const editingItem = ref(null)

const importInput = ref(null)

// 清空数据相关状态
const clearAllDialogVisible = ref(false)
const clearAllConfirmText = ref('')
const clearAllLoading = ref(false)
const clearAllStats = ref({})

// 删除确认相关状态
const deleteGroupDialogVisible = ref(false)
const deleteItemDialogVisible = ref(false)
const deletingGroup = ref(null)
const deletingItem = ref(null)
const deleteLoading = ref(false)

// 导出相关状态
const exportDialogVisible = ref(false)
const exportFormat = ref('json')
const exportLoading = ref(false)

// ==================== 计算属性 ====================
const currentItem = computed(() => {
  if (!currentItemId.value) return null
  return items.value.find(item => item.Id === currentItemId.value)
})

const filteredGroups = computed(() => {
  if (!searchKeyword.value) return groups.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return groups.value.filter(group => {
    const groupItems = items.value.filter(item => 
      item.GroupId === group.Id &&
      (item.ApiName.toLowerCase().includes(keyword) ||
       item.ApiPath.toLowerCase().includes(keyword))
    )
    return groupItems.length > 0 || group.GroupName.toLowerCase().includes(keyword)
  })
})

const tokenUrl = computed(() => {
  return `${docConfig.value.BaseUrl}/client/token?appid=${docConfig.value.AuthAppId}&appsecret=${docConfig.value.AuthAppSecret}`
})

// ==================== 方法 ====================
const goBack = () => {
  router.back()
}

// 检查权限
const checkPermission = async () => {
  try {
    const res = await api.get('/erp-api-doc/check-permission')
    if (res.success) {
      hasPermission.value = res.data.hasAccess
      canEdit.value = res.data.canEdit
    }
  } catch (error) {
    console.error('权限检查失败:', error)
    hasPermission.value = false
  } finally {
    loading.value = false
  }
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await api.get('/erp-api-doc/config')
    if (res.success) {
      docConfig.value = res.data
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 加载分组
const loadGroups = async () => {
  try {
    const res = await api.get('/erp-api-doc/groups')
    if (res.success) {
      groups.value = res.data
      // 默认展开第一个分组
      if (res.data.length > 0 && expandedGroups.value.length === 0) {
        expandedGroups.value = [res.data[0].Id]
      }
    }
  } catch (error) {
    console.error('加载分组失败:', error)
  }
}

// 加载接口列表
const loadItems = async () => {
  try {
    const res = await api.get('/erp-api-doc/items')
    if (res.success) {
      items.value = res.data
    }
  } catch (error) {
    console.error('加载接口列表失败:', error)
  }
}

// 获取分组下的接口
const getGroupItems = (groupId) => {
  let result = items.value.filter(item => item.GroupId === groupId)
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.ApiName.toLowerCase().includes(keyword) ||
      item.ApiPath.toLowerCase().includes(keyword)
    )
  }
  
  return result
}

// 切换分组展开
const toggleGroup = (groupId) => {
  const index = expandedGroups.value.indexOf(groupId)
  if (index > -1) {
    // 已展开，则折叠
    expandedGroups.value.splice(index, 1)
  } else {
    // 手风琴效果：先收起所有，再展开当前
    expandedGroups.value = [groupId]
  }
}

// 选择接口
const selectItem = (item) => {
  currentItemId.value = item.Id
}

// 返回首页（基础信息页）
const goToHome = () => {
  currentItemId.value = null
}

// HTTP方法标签颜色
const getMethodTagType = (method) => {
  const types = { GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger' }
  return types[method] || 'info'
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

// JSON语法高亮
const highlightJson = (json) => {
  if (!json) return ''
  try {
    // 先尝试解析并格式化JSON，确保有缩进
    let formatted = json
    if (typeof json === 'string') {
      try {
        const parsed = JSON.parse(json)
        formatted = JSON.stringify(parsed, null, 2)
      } catch {
        // 如果解析失败，保持原样
        formatted = json
      }
    } else {
      formatted = JSON.stringify(json, null, 2)
    }
    
    return formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
        let cls = 'json-string'
        if (/:$/.test(match)) {
          cls = 'json-key'
        }
        return `<span class="${cls}">${match}</span>`
      })
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>')
  } catch {
    return json
  }
}

// 复制文本
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

// ==================== 配置管理 ====================
watch(showConfigDialog, (val) => {
  if (val) {
    editingConfig.value = { ...docConfig.value }
  }
})

const saveConfig = async () => {
  try {
    for (const [key, value] of Object.entries(editingConfig.value)) {
      await api.put('/erp-api-doc/config', { key, value })
    }
    docConfig.value = { ...editingConfig.value }
    showConfigDialog.value = false
    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('配置保存失败')
  }
}

// ==================== 分组管理 ====================
const showGroupDialog = (group = null) => {
  if (group) {
    editingGroup.value = { ...group }
  } else {
    editingGroup.value = { GroupName: '', Description: '', SortOrder: 0 }
  }
  showGroupDialogVisible.value = true
}

const saveGroup = async () => {
  if (!editingGroup.value.GroupName) {
    ElMessage.warning('请输入模块名称')
    return
  }
  
  try {
    if (editingGroup.value.Id) {
      await api.put(`/erp-api-doc/groups/${editingGroup.value.Id}`, editingGroup.value)
      ElMessage.success('模块更新成功')
    } else {
      await api.post('/erp-api-doc/groups', editingGroup.value)
      ElMessage.success('模块创建成功')
    }
    showGroupDialogVisible.value = false
    loadGroups()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 显示删除模块确认对话框
const showDeleteGroupConfirm = (group) => {
  deletingGroup.value = group
  deleteGroupDialogVisible.value = true
}

// 确认删除模块
const confirmDeleteGroup = async () => {
  if (!deletingGroup.value) return
  deleteLoading.value = true
  try {
    await api.delete(`/erp-api-doc/groups/${deletingGroup.value.Id}`)
    ElMessage.success('模块删除成功')
    deleteGroupDialogVisible.value = false
    deletingGroup.value = null
    loadGroups()
    loadItems()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

const deleteGroup = async (id) => {
  try {
    await api.delete(`/erp-api-doc/groups/${id}`)
    ElMessage.success('删除成功')
    loadGroups()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败')
  }
}

// ==================== 接口管理 ====================
const showItemDialog = (groupId, item = null) => {
  if (item) {
    editingItem.value = { ...item }
  } else {
    editingItem.value = {
      GroupId: groupId,
      ApiName: '',
      HttpMethod: 'GET',
      ApiPath: '',
      ApiDescription: '',
      RequestParams: '',
      ResponseParams: '',
      RequestExample: '',
      ResponseExample: '',
      Remark: '',
      SortOrder: 0
    }
  }
  showItemDialogVisible.value = true
}

const saveItem = async (itemData) => {
  try {
    if (itemData.Id) {
      await api.put(`/erp-api-doc/items/${itemData.Id}`, itemData)
      ElMessage.success('接口更新成功')
    } else {
      await api.post('/erp-api-doc/items', itemData)
      ElMessage.success('接口创建成功')
    }
    showItemDialogVisible.value = false
    loadGroups()
    loadItems()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const deleteItem = async (id) => {
  try {
    await api.delete(`/erp-api-doc/items/${id}`)
    ElMessage.success('删除成功')
    currentItemId.value = null
    loadGroups()
    loadItems()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 显示删除接口确认对话框
const showDeleteItemConfirm = (item) => {
  deletingItem.value = item
  deleteItemDialogVisible.value = true
}

// 确认删除接口
const confirmDeleteItem = async () => {
  if (!deletingItem.value) return
  deleteLoading.value = true
  try {
    await api.delete(`/erp-api-doc/items/${deletingItem.value.Id}`)
    ElMessage.success('接口删除成功')
    deleteItemDialogVisible.value = false
    deletingItem.value = null
    currentItemId.value = null
    loadGroups()
    loadItems()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

// ==================== 导入导出 ====================
const showExportDialog = () => {
  exportFormat.value = 'json'
  exportDialogVisible.value = true
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const res = await api.get('/erp-api-doc/export')
    if (res.success) {
      const data = res.data
      const dateStr = new Date().toISOString().slice(0, 10)
      
      if (exportFormat.value === 'json') {
        // JSON格式导出
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        downloadFile(blob, `erp-api-doc-${dateStr}.json`)
      } else if (exportFormat.value === 'html') {
        // HTML格式导出
        const htmlContent = generateHtmlDocument(data)
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
        downloadFile(blob, `erp-api-doc-${dateStr}.html`)
      }
      
      ElMessage.success('导出成功')
      exportDialogVisible.value = false
    }
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const generateHtmlDocument = (data) => {
  const { config, groups, items } = data
  
  const groupsHtml = groups.map(group => {
    const groupItems = items.filter(item => item.GroupId === group.Id)
    const itemsHtml = groupItems.map(item => `
      <div class="api-item" id="api-${item.Id}">
        <div class="api-header">
          <span class="method-tag method-${item.HttpMethod.toLowerCase()}">${item.HttpMethod}</span>
          <h3 class="api-name">${item.ApiName}</h3>
        </div>
        <div class="api-url">
          <span class="label">接口地址</span>
          <code>${config.BaseUrl}${item.ApiPath}</code>
        </div>
        ${item.ApiDescription && item.ApiDescription !== item.ApiName ? `<div class="api-desc"><span class="label">接口描述</span><p>${item.ApiDescription}</p></div>` : ''}
        ${item.RequestParams ? `<div class="params-section"><h4><span class="section-icon">📥</span> 请求参数</h4><div class="table-wrapper">${item.RequestParams}</div></div>` : ''}
        ${item.ResponseParams ? `<div class="params-section"><h4><span class="section-icon">📤</span> 响应参数</h4><div class="table-wrapper">${item.ResponseParams}</div></div>` : ''}
        ${item.ResponseExample ? `<div class="example-section"><h4><span class="section-icon">📋</span> 响应示例</h4><pre><code>${escapeHtml(formatJsonString(item.ResponseExample))}</code></pre></div>` : ''}
        ${item.RequestExample ? `<div class="example-section"><h4><span class="section-icon">💻</span> 调用示例</h4><pre class="code-shell"><code>${escapeHtml(item.RequestExample)}</code></pre></div>` : ''}
      </div>
    `).join('')
    
    return `
      <section class="group-section" id="group-${group.Id}">
        <div class="group-header">
          <h2>${group.GroupName}</h2>
          <span class="api-count">${groupItems.length} 个接口</span>
        </div>
        ${itemsHtml}
      </section>
    `
  }).join('')

  // 生成左侧导航树
  const navHtml = groups.map(group => {
    const groupItems = items.filter(item => item.GroupId === group.Id)
    return `
      <div class="nav-group">
        <div class="nav-group-title" onclick="toggleNav(this)">
          <span class="arrow">▶</span>
          <span class="folder-icon">📁</span>
          <span class="group-name">${group.GroupName}</span>
          <span class="badge">${groupItems.length}</span>
        </div>
        <div class="nav-items">
          ${groupItems.map(item => `
            <a href="#api-${item.Id}" class="nav-item" onclick="selectApi(this, event)">
              <span class="method method-${item.HttpMethod.toLowerCase()}">${item.HttpMethod}</span>
              <span class="item-name">${item.ApiName}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `
  }).join('')
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.DocTitle || 'ERP接口文档'}</title>
  <style>
    :root {
      --primary: #409eff;
      --primary-light: #ecf5ff;
      --success: #67c23a;
      --warning: #e6a23c;
      --danger: #f56c6c;
      --info: #909399;
      --text-primary: #303133;
      --text-regular: #606266;
      --text-secondary: #909399;
      --border-color: #e4e7ed;
      --bg-color: #f5f7fa;
      --sidebar-width: 280px;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: var(--bg-color);
      color: var(--text-primary);
      line-height: 1.6;
    }
    
    /* 顶部标题栏 */
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      padding: 0 24px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    
    .header .version {
      margin-left: 12px;
      padding: 2px 10px;
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      font-size: 12px;
    }
    
    .header .base-url {
      margin-left: auto;
      font-size: 13px;
      opacity: 0.9;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    
    /* 左侧导航 */
    .sidebar {
      position: fixed;
      left: 0;
      top: 60px;
      bottom: 0;
      width: var(--sidebar-width);
      background: white;
      border-right: 1px solid var(--border-color);
      overflow-y: auto;
      z-index: 50;
    }
    
    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      color: var(--text-primary);
      background: #fafbfc;
    }
    
    // 首页菜单项样式
    .nav-home-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer !important;
      transition: all 0.25s ease;
      border-bottom: 1px solid #f0f0f0;
      color: var(--text-primary);
      font-weight: 500;
      user-select: none;
      
      .home-icon {
        margin-right: 8px;
        color: #409eff;
        font-size: 16px;
        transition: transform 0.25s ease;
      }
      
      &:hover {
        background: var(--primary-light);
        color: var(--primary);
        padding-left: 20px;
        
        .home-icon {
          color: var(--primary);
          transform: scale(1.15);
        }
      }
      
      &.active {
        background: var(--primary-light);
        color: var(--primary);
        border-left: 3px solid var(--primary);
        padding-left: 13px;
        
        .home-icon {
          color: var(--primary);
        }
      }
    }
    
    .nav-group {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .nav-group-title {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      user-select: none;
    }
    
    .nav-group-title:hover {
      background: var(--primary-light);
    }
    
    .nav-group-title .arrow {
      font-size: 10px;
      margin-right: 8px;
      transition: transform 0.2s;
      color: var(--text-secondary);
    }
    
    .nav-group-title.expanded .arrow {
      transform: rotate(90deg);
    }
    
    .nav-group-title .folder-icon {
      margin-right: 8px;
      filter: saturate(1.5);
    }
    
    .nav-group-title .group-name {
      flex: 1;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .nav-group-title .badge {
      background: var(--danger);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    
    .nav-items {
      display: none;
      background: #fafbfc;
    }
    
    .nav-items.show {
      display: block;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 10px 16px 10px 44px;
      text-decoration: none;
      color: var(--text-regular);
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }
    
    .nav-item:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    
    .nav-item.active {
      background: var(--primary-light);
      border-left-color: var(--primary);
      color: var(--primary);
    }
    
    .nav-item .method {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      color: white;
      margin-right: 10px;
      font-family: monospace;
    }
    
    .method-get { background: var(--success); }
    .method-post { background: var(--primary); }
    .method-put { background: var(--warning); }
    .method-delete { background: var(--danger); }
    
    .nav-item .item-name {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* 右侧内容区 */
    .main {
      margin-left: var(--sidebar-width);
      margin-top: 60px;
      padding: 24px;
      min-height: calc(100vh - 60px);
    }
    
    .group-section {
      margin-bottom: 32px;
    }
    
    .group-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--primary);
    }
    
    .group-header h2 {
      font-size: 20px;
      color: var(--text-primary);
    }
    
    .group-header .api-count {
      margin-left: 12px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .api-item {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: box-shadow 0.3s;
    }
    
    .api-item:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    
    .api-item:target {
      animation: highlight 2s ease;
    }
    
    @keyframes highlight {
      0%, 30% { box-shadow: 0 0 0 3px var(--primary); }
      100% { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    }
    
    .api-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .api-header .method-tag {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      color: white;
      font-family: monospace;
    }
    
    .api-header .api-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .api-url {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #1e1e1e;
      border-radius: 8px;
    }
    
    .api-url .label {
      color: #888;
      font-size: 12px;
      white-space: nowrap;
    }
    
    .api-url code {
      color: #4ec9b0;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      word-break: break-all;
    }
    
    .api-desc {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid var(--primary);
    }
    
    .api-desc .label {
      display: block;
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    
    .api-desc p {
      color: var(--text-regular);
    }
    
    .params-section, .example-section {
      margin-top: 24px;
    }
    
    .params-section h4, .example-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-size: 15px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .section-icon {
      font-size: 16px;
    }
    
    .table-wrapper {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border: 1px solid var(--border-color);
    }
    
    th {
      background: #f5f7fa;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    td:first-child {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      color: var(--danger);
    }
    
    td code {
      background: #fef0f0;
      color: var(--danger);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    }
    
    tr:hover td {
      background: #fafbfc;
    }
    
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    
    /* 滚动条美化 */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c0c4cc;
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #909399;
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; }
      .header .base-url { display: none; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>📄 ${config.DocTitle || 'ERP接口文档'}</h1>
    <span class="version">${config.DocVersion || 'V1.0'}</span>
    <span class="base-url">${config.BaseUrl || ''}</span>
  </header>
  
  <aside class="sidebar">
    <div class="sidebar-header">📚 接口目录</div>
    ${navHtml}
  </aside>
  
  <main class="main">
    ${groupsHtml}
  </main>
  
  <script>
    // 展开/收起导航
    function toggleNav(el) {
      el.classList.toggle('expanded');
      const items = el.nextElementSibling;
      items.classList.toggle('show');
    }
    
    // 选中接口
    function selectApi(el, e) {
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      el.classList.add('active');
    }
    
    // 默认展开第一个分组
    document.addEventListener('DOMContentLoaded', function() {
      const firstGroup = document.querySelector('.nav-group-title');
      if (firstGroup) {
        firstGroup.classList.add('expanded');
        firstGroup.nextElementSibling.classList.add('show');
      }
    });
    
    // 滚动时高亮当前接口
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.3 });
    
    document.querySelectorAll('.api-item').forEach(item => observer.observe(item));
  <\/script>
</body>
</html>`
}

const escapeHtml = (str) => {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const formatJsonString = (json) => {
  if (!json) return ''
  try {
    const parsed = JSON.parse(json)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return json
  }
}

const triggerImport = () => {
  importInput.value?.click()
}

const handleImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    await api.post('/erp-api-doc/import', data)
    ElMessage.success('导入成功')
    
    loadConfig()
    loadGroups()
    loadItems()
  } catch (error) {
    ElMessage.error('导入失败，请检查文件格式')
  } finally {
    event.target.value = ''
  }
}

// ==================== 清空数据 ====================
const showClearAllDialog = async () => {
  // 先获取统计信息
  try {
    const res = await api.get('/erp-api-doc/stats')
    // api返回的数据直接就是后端的response，不需要再取.data
    if (res.success) {
      clearAllStats.value = res.data
    } else if (res.data?.success) {
      // 兼容不同的返回格式
      clearAllStats.value = res.data.data
    } else {
      // 如果API失败，使用本地数据
      clearAllStats.value = { 
        totalGroupCount: groups.value.length, 
        totalItemCount: items.value.length 
      }
    }
  } catch (error) {
    console.error('获取统计信息失败:', error)
    // 使用本地数据作为备选
    clearAllStats.value = { 
      totalGroupCount: groups.value.length, 
      totalItemCount: items.value.length 
    }
  }
  
  clearAllConfirmText.value = ''
  clearAllDialogVisible.value = true
}

const handleClearAll = async () => {
  if (clearAllConfirmText.value !== 'CONFIRM') {
    ElMessage.warning('请输入正确的确认码')
    return
  }
  
  clearAllLoading.value = true
  try {
    const res = await api.delete('/erp-api-doc/clear-all?confirmCode=CONFIRM_DELETE_ALL')
    // 兼容不同的返回格式
    const success = res.success || res.data?.success
    const data = res.data || res.data?.data || {}
    
    if (success) {
      const deletedGroups = data.deletedGroups || 0
      const deletedItems = data.deletedItems || 0
      ElMessage.success(`清空成功！已删除 ${deletedGroups} 个分组和 ${deletedItems} 个接口`)
      clearAllDialogVisible.value = false
      
      // 重新加载数据
      groups.value = []
      items.value = []
      currentItemId.value = null
      expandedGroups.value = []
      
      loadGroups()
      loadItems()
    } else {
      ElMessage.error(res.message || res.data?.message || '清空失败')
    }
  } catch (error) {
    console.error('清空数据失败:', error)
    ElMessage.error('清空失败: ' + (error.response?.data?.message || error.message))
  } finally {
    clearAllLoading.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await checkPermission()
  if (hasPermission.value) {
    await Promise.all([loadConfig(), loadGroups(), loadItems()])
  }
})
</script>

<style lang="scss" scoped>
.erp-api-doc-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #909399;
}

.no-permission {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.doc-main {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.doc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  
  .toolbar-left {
    .doc-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      
      .el-icon {
        color: #409eff;
      }
    }
  }
  
  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.doc-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 左侧目录
.doc-sidebar {
  width: 320px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .sidebar-scroll {
    flex: 1;
  }
}

.nav-tree {
  padding: 8px 0;
}

// 首页菜单项样式（外层）
.nav-home-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer !important;
  transition: all 0.25s ease;
  border-bottom: 1px solid #f0f0f0;
  color: #303133;
  font-weight: 500;
  user-select: none;
  
  .home-icon {
    margin-right: 8px;
    color: #409eff;
    font-size: 16px;
    transition: transform 0.25s ease;
  }
  
  &:hover {
    background: #ecf5ff;
    color: #409eff;
    padding-left: 20px;
    
    .home-icon {
      color: #409eff;
      transform: scale(1.15);
    }
  }
  
  &.active {
    background: #ecf5ff;
    color: #409eff;
    border-left: 3px solid #409eff;
    padding-left: 13px;
    
    .home-icon {
      color: #409eff;
    }
  }
}

.nav-group {
  .nav-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #f5f7fa;
      
      .group-actions {
        opacity: 1;
      }
    }
    
    .expand-icon {
      transition: transform 0.2s;
      color: #909399;
    }
    
    // 文件夹图标使用黄色
    > .el-icon:nth-child(2) {
      color: #eecb4a;
    }
    
    &.expanded .expand-icon {
      transform: rotate(90deg);
    }
    
    .group-name {
      flex: 1;
      font-weight: 500;
    }
    
    .group-actions {
      opacity: 0;
      display: flex;
      gap: 4px;
    }
  }
}

.nav-group-items {
  background: #fafafa;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 8px 44px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #ecf5ff;
  }
  
  &.active {
    background: #ecf5ff;
    border-right: 3px solid #409eff;
    
    .item-name {
      color: #409eff;
      font-weight: 500;
    }
  }
  
  .method-tag {
    flex-shrink: 0;
    font-size: 10px;
    padding: 0 6px;
  }
  
  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: #606266;
  }
}

.nav-empty {
  padding: 12px 16px 12px 44px;
  color: #909399;
  font-size: 13px;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

// 右侧内容区
.doc-body {
  flex: 1;
  overflow: hidden;
}

.detail-scroll {
  height: 100%;
}

// 欢迎页
.welcome-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.welcome-content {
  max-width: 700px;
  text-align: center;
  
  .welcome-icon {
    color: #409eff;
    margin-bottom: 20px;
  }
  
  h1 {
    font-size: 32px;
    color: #303133;
    margin: 0 0 8px;
  }
  
  .subtitle {
    color: #909399;
    font-size: 16px;
    margin: 0 0 24px;
  }
  
  .base-info-card,
  .auth-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 16px;
    text-align: left;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    h3 {
      margin: 0 0 16px;
      font-size: 15px;
      color: #303133;
    }
  }
  
  .info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    label {
      color: #606266;
      flex-shrink: 0;
    }
    
    .url-code {
      background: #f5f7fa;
      padding: 4px 12px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: #409eff;
    }
  }
  
  .tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #909399;
    margin-top: 24px;
  }
}

// 接口详情
.api-detail {
  padding: 24px 32px;
}

.api-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
  
  .api-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    
    h2 {
      margin: 0;
      font-size: 22px;
      color: #303133;
      flex: 1;
    }
    
    .api-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .api-meta {
    display: flex;
    gap: 24px;
    color: #909399;
    font-size: 13px;
  }
}

.api-section {
  margin-bottom: 28px;
  
  h3 {
    font-size: 16px;
    color: #303133;
    margin: 0 0 12px;
    padding-left: 12px;
    border-left: 3px solid #409eff;
  }
}

.url-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  
  code {
    flex: 1;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 14px;
    color: #409eff;
    word-break: break-all;
  }
}

.rich-content {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  line-height: 1.8;
  
  :deep(table.param-table) {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      border: 1px solid #e4e7ed;
      padding: 10px 12px;
      text-align: left;
    }
    
    th {
      background: #f5f7fa;
      font-weight: 600;
      color: #303133;
    }
    
    td {
      color: #606266;
    }
    
    // 参数名列使用代码字体和红色
    td:first-child {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      color: #f56c6c;
    }
    
    tr:hover td {
      background: #fafafa;
    }
  }
  
  :deep(code) {
    background: #fef0f0;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    color: #f56c6c;
  }
  
  :deep(ul), :deep(ol) {
    padding-left: 20px;
    margin: 8px 0;
  }
}

.code-block {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  
  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #2d2d2d;
    
    span {
      color: #909399;
      font-size: 12px;
    }
  }
  
  .code-content {
    padding: 16px;
    margin: 0;
    overflow-x: auto;
    
    code {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d4;
      
      :deep(.json-key) {
        color: #9cdcfe;
      }
      
      :deep(.json-string) {
        color: #ce9178;
      }
      
      :deep(.json-number) {
        color: #b5cea8;
      }
      
      :deep(.json-boolean) {
        color: #569cd6;
      }
      
      :deep(.json-null) {
        color: #569cd6;
      }
    }
    
    // Shell代码样式
    &.code-shell code {
      color: #98c379;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}

// 删除确认对话框样式
.delete-confirm-content {
  text-align: center;
  padding: 20px 0;
  
  .warning-icon {
    margin-bottom: 16px;
  }
  
  p {
    margin: 8px 0;
    font-size: 15px;
    color: #303133;
    
    strong {
      color: #409eff;
    }
  }
  
  .warning-text {
    color: #909399;
    font-size: 13px;
  }
}

// 导出对话框样式
.export-dialog-content {
  .export-format-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    .el-radio {
      margin-right: 0;
      height: auto;
      padding: 12px 16px;
      
      &.is-bordered {
        width: 100%;
      }
    }
    
    .format-option {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
      
      strong {
        font-size: 14px;
        color: #303133;
      }
      
      span {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }
}

// 代码字体样式 - 应用于接口地址、参数名等
.api-path code,
.url-box code,
.param-table td code,
:deep(.param-table) td:first-child {
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Liberation Mono', 'Courier New', monospace !important;
}

// 参数表格代码样式
:deep(.param-table) {
  td:first-child {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    color: #f56c6c;
  }
  
  code {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    background: #fef0f0;
    color: #f56c6c;
    padding: 2px 6px;
    border-radius: 3px;
  }
}
</style>
