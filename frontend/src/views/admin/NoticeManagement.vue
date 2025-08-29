<template>
  <div class="notice-management">   
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="header-left">
        <h2>通知公告</h2>
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="unread-badge">
          <el-icon><Bell /></el-icon>
        </el-badge>
      </div>
      <div class="header-right">
        <el-button 
          v-if="permissions.canAdd" 
          type="primary" 
          @click="openCreateDialog"
        >
          <el-icon><Plus /></el-icon>
          发布通知
        </el-button>
        <el-button 
          v-if="permissions.canMarkAllRead" 
          @click="markAllAsRead" 
          :disabled="unreadCount === 0" 
          type="warning" 
          plain
        >
          <el-icon><Check /></el-icon>
          全部已读
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="阅读状态" class="filter-item">
          <el-select v-model="filterForm.readStatus" @change="getNoticeList" class="filter-select">
            <el-option label="全部" value=""></el-option>
            <el-option label="未读" value="unread"></el-option>
            <el-option label="已读" value="read"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="通知类型" class="filter-item">
          <el-select v-model="filterForm.type" @change="getNoticeList" class="filter-select">
            <el-option label="全部" value=""></el-option>
            <el-option label="系统通知" value="system"></el-option>
            <el-option label="重要公告" value="important"></el-option>
            <el-option label="一般通知" value="general"></el-option>
            <el-option label="公告通知" value="announcement"></el-option>
            <el-option label="紧急通知" value="urgent"></el-option>
            <el-option label="维护通知" value="maintenance"></el-option>
            <el-option label="普通通知" value="notice"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" class="filter-item">
          <el-select v-model="filterForm.priority" @change="getNoticeList" class="filter-select">
            <el-option label="全部" value=""></el-option>
            <el-option label="最高优先级（A级）" value="A"></el-option>
            <el-option label="高优先级（B级）" value="B"></el-option>
            <el-option label="中等优先级（C级）" value="C"></el-option>
            <el-option label="低优先级（D级）" value="D"></el-option>
            <el-option label="最低优先级（E级）" value="E"></el-option>
            <!-- 兼容旧的优先级值 -->
            <el-option label="高" value="high"></el-option>
            <el-option label="中" value="medium"></el-option>
            <el-option label="低" value="low"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item">
          <el-button type="primary" @click="getNoticeList">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 通知列表 -->
    <div class="notice-list">
      <el-table 
        :data="noticeList" 
        v-loading="loading" 
        stripe 
        border
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"

        class="enhanced-table"
      >
        <!-- 序号列 -->
        <el-table-column 
          type="index" 
          label="序号" 
          width="55" 
          align="center"
          :index="(index) => (pagination.page - 1) * pagination.size + index + 1"
        />
        
        <!-- 阅读状态指示器 -->
        <el-table-column label="状态" width="80" align="center" resizable>
          <template #default="{ row }">
            <div class="read-status-indicator">
              <el-badge :is-dot="!row.IsRead" :hidden="row.IsRead" type="danger">
                <el-icon :class="{ 'read': row.IsRead, 'unread': !row.IsRead }">
                  <Message v-if="!row.IsRead" />
                  <MessageBox v-else />
                </el-icon>
              </el-badge>
            </div>
          </template>
        </el-table-column>

        <!-- 标题 -->
        <el-table-column prop="Title" label="标题" min-width="250" resizable show-overflow-tooltip>
          <template #default="{ row }">
            <div class="notice-title" @click="viewNotice(row)">
              <div class="title-content">
                <div class="title-wrapper">
                  <span :class="{ 'unread-title': !row.IsRead, 'read-title': row.IsRead }">
                    {{ row.Title }}
                  </span>
                </div>
                <el-tag v-if="row.IsSticky" type="warning" size="small" class="sticky-tag">
                  置顶
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 类型 -->
        <el-table-column prop="Type" label="类型" width="120" resizable align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.Type)" size="small" class="type-tag">
              {{ getTypeLabel(row.Type) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 优先级 -->
        <el-table-column prop="Priority" label="优先级" width="150" min-width="130" resizable align="center">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.Priority)" size="small">
              {{ getPriorityLabel(row.Priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 发布时间 -->
        <el-table-column prop="PublishDate" label="发布时间" width="180" resizable align="center">
          <template #default="{ row }">
            <div class="date-cell">
              {{ formatDate(row.PublishDate) }}
            </div>
          </template>
        </el-table-column>

        <!-- 过期时间 -->
        <el-table-column prop="ExpiryDate" label="过期时间" width="180" resizable align="center">
          <template #default="{ row }">
            <div class="date-cell">
              <span :class="{ 'expired': isExpired(row.ExpiryDate) }">
                {{ row.ExpiryDate ? formatDate(row.ExpiryDate) : '永久有效' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 阅读时间 -->
        <el-table-column prop="ReadTime" label="阅读时间" width="180" resizable align="center">
          <template #default="{ row }">
            <div class="date-cell">
              <span :class="{ 'unread-status': !row.ReadTime }">
                {{ row.ReadTime ? formatDate(row.ReadTime) : '未读' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="240" fixed="right" align="center" header-align="center">
          <template #default="{ row }">
            <el-button 
              v-if="permissions.canEdit" 
              type="warning" 
              size="small" 
              @click="editNotice(row)"
              :icon="Edit"
            >
              编辑
            </el-button>
            <el-button 
              v-if="permissions.canDelete" 
              type="danger" 
              size="small" 
              @click="deleteNotice(row)"
              :icon="Delete"
            >
              删除
            </el-button>
            <el-button 
              v-if="!row.IsRead && permissions.canMarkRead" 
              type="success" 
              size="small" 
              @click="markAsRead(row.ID)"
              :icon="Check"
            >
              已读
            </el-button>
            <el-button 
              v-if="row.RequireConfirmation && row.IsRead && !row.IsConfirmed" 
              type="info" 
              size="small" 
              @click="confirmRead(row.ID)"
              :icon="Check"
            >
              确认阅读
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[5, 10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="getNoticeList"
          @current-change="getNoticeList"
        />
      </div>
    </div>

    <!-- 通知详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      :title="currentNotice?.Title" 
      width="60%"
      @close="handleDetailClose"
    >
      <div class="notice-detail" v-if="currentNotice">
        <div class="detail-header">
          <div class="detail-meta">
            <el-tag :type="getTypeTagType(currentNotice.Type)" size="small" class="type-tag">
              {{ getTypeLabel(currentNotice.Type) }}
            </el-tag>
            <el-tag :type="getPriorityTagType(currentNotice.Priority)" size="small">
              {{ getPriorityLabel(currentNotice.Priority) }}
            </el-tag>
            <span class="publish-date">发布时间：{{ formatDate(currentNotice.PublishDate) }}</span>
          </div>
        </div>
        <div class="detail-content" v-html="currentNotice.Content"></div>
        <div class="detail-footer" v-if="currentNotice.RequireConfirmation && currentNotice.IsRead && !currentNotice.IsConfirmed">
          <el-alert
            title="此通知需要确认阅读"
            type="warning"
            :closable="false"
            show-icon
          />
          <div class="confirm-actions">
            <el-button type="primary" @click="confirmRead(currentNotice.ID)">
              确认已阅读
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑通知对话框 -->
    <el-dialog v-model="showEditDialog" :title="isEditing ? '编辑通知' : '发布通知'" width="60%" @close="handleEditDialogClose">
      <el-form :model="noticeForm" :rules="noticeRules" ref="editFormRef" label-width="100px">
        <el-form-item label="标题" prop="Title">
          <el-input v-model="noticeForm.Title" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="类型" prop="Type">
          <el-select v-model="noticeForm.Type" placeholder="请选择通知类型">
            <el-option label="系统通知" value="system"></el-option>
            <el-option label="重要公告" value="important"></el-option>
            <el-option label="一般通知" value="general"></el-option>
            <el-option label="公告通知" value="announcement"></el-option>
            <el-option label="紧急通知" value="urgent"></el-option>
            <el-option label="维护通知" value="maintenance"></el-option>
            <el-option label="普通通知" value="notice"></el-option>
            <el-option label="安全通知" value="security"></el-option>
            <el-option label="更新通知" value="update"></el-option>
            <el-option label="活动通知" value="event"></el-option>
            <el-option label="政策通知" value="policy"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="Priority">
          <el-select v-model="noticeForm.Priority" placeholder="请选择优先级">
            <el-option label="最高优先级（A级）" value="A"></el-option>
            <el-option label="高优先级（B级）" value="B"></el-option>
            <el-option label="中等优先级（C级）" value="C"></el-option>
            <el-option label="低优先级（D级）" value="D"></el-option>
            <el-option label="最低优先级（E级）" value="E"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="Content">
          <textarea :id="editTinymceId" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="noticeForm.ExpiryDate"
            type="datetime"
            placeholder="选择过期时间（可选）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="noticeForm.IsSticky">置顶显示</el-checkbox>
          <el-checkbox v-model="noticeForm.RequireConfirmation">需要确认阅读</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveNotice" :loading="submitting">
          {{ isEditing ? '保存' : '发布' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建通知对话框 -->
    <el-dialog v-model="showCreateDialog" title="发布通知" width="60%" @close="handleCreateDialogClose">
      <el-form :model="noticeForm" :rules="noticeRules" ref="noticeFormRef" label-width="100px">
        <el-form-item label="标题" prop="Title">
          <el-input v-model="noticeForm.Title" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="类型" prop="Type">
          <el-select v-model="noticeForm.Type" placeholder="请选择通知类型">
            <el-option label="系统通知" value="system"></el-option>
            <el-option label="重要公告" value="important"></el-option>
            <el-option label="一般通知" value="general"></el-option>
            <el-option label="公告通知" value="announcement"></el-option>
            <el-option label="紧急通知" value="urgent"></el-option>
            <el-option label="维护通知" value="maintenance"></el-option>
            <el-option label="普通通知" value="notice"></el-option>
            <el-option label="安全通知" value="security"></el-option>
            <el-option label="更新通知" value="update"></el-option>
            <el-option label="活动通知" value="event"></el-option>
            <el-option label="政策通知" value="policy"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="Priority">
          <el-select v-model="noticeForm.Priority" placeholder="请选择优先级">
            <el-option label="最高优先级（A级）" value="A"></el-option>
            <el-option label="高优先级（B级）" value="B"></el-option>
            <el-option label="中等优先级（C级）" value="C"></el-option>
            <el-option label="低优先级（D级）" value="D"></el-option>
            <el-option label="最低优先级（E级）" value="E"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="Content">
          <textarea :id="createTinymceId" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="noticeForm.ExpiryDate"
            type="datetime"
            placeholder="选择过期时间（可选）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="noticeForm.IsSticky">置顶显示</el-checkbox>
          <el-checkbox v-model="noticeForm.RequireConfirmation">需要确认阅读</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createNotice" :loading="submitting">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick, unref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Bell, Plus, Check, Search, Refresh, 
  Message, MessageBox, Edit, Delete 
} from '@element-plus/icons-vue'
import api from '@/utils/api'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'
import tinymce from 'tinymce/tinymce'
import 'tinymce/themes/silver'
// 图标已包含在主题中，无需单独导入
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/help'
import 'tinymce/plugins/wordcount'

// 导入 TinyMCE 配置
import { defaultConfig, plugins, toolbar, fontFormats, fontSizeFormats, blockFormats } from '@/config/tinymce'

// 用户权限管理
const userStore = useUserStore()

// 权限检查
const permissions = reactive({
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canMarkRead: false,
  canMarkAllRead: false
})

/**
 * 检查用户权限
 */
const checkPermissions = async () => {
  try {
    // 检查是否为管理员角色
    const isAdmin = userStore.isAdmin
    
    if (isAdmin) {
      // 管理员拥有所有权限
      permissions.canAdd = true
      permissions.canEdit = true
      permissions.canDelete = true
      permissions.canMarkRead = true
      permissions.canMarkAllRead = true
    } else {
      // 使用异步权限检查方法，权限标识与数据库MenuCode保持一致
      permissions.canAdd = await userStore.hasActionPermissionAsync('notice-add')
      permissions.canEdit = await userStore.hasActionPermissionAsync('notice-edit')
      permissions.canDelete = await userStore.hasActionPermissionAsync('notice-delete')
      permissions.canMarkRead = await userStore.hasActionPermissionAsync('notice-mark-read')
      permissions.canMarkAllRead = await userStore.hasActionPermissionAsync('notice-mark-all-read')
    }
    
    console.log('权限检查结果:', permissions)
  } catch (error) {
    console.error('权限检查失败:', error)
    // 权限检查失败时，默认无权限
    permissions.canAdd = false
    permissions.canEdit = false
    permissions.canDelete = false
    permissions.canMarkRead = false
    permissions.canMarkAllRead = false
  }
}

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const noticeList = ref([])
const unreadCount = ref(0)
const showDetailDialog = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const currentNotice = ref(null)
const noticeFormRef = ref(null)
const editFormRef = ref(null)
const isEditing = ref(false)

// TinyMCE 编辑器相关
const createTinymceId = ref(`tinymce-create-${Date.now()}`)
const editTinymceId = ref(`tinymce-edit-${Date.now()}`)
const createEditorRef = ref(null)
const editEditorRef = ref(null)

// 筛选表单
const filterForm = reactive({
  readStatus: '',
  type: '',
  priority: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 5,
  total: 0
})

// 通知表单
const noticeForm = reactive({
  Title: '',
  Content: '',
  Type: 'general',
  Priority: 'C',
  ExpiryDate: null,
  IsSticky: false,
  RequireConfirmation: false
})



// 表单验证规则
const noticeRules = {
  Title: [{ required: true, message: '请输入通知标题', trigger: ['blur', 'change'] }],
  Content: [{ required: true, message: '请输入通知内容', trigger: ['blur', 'change'] }],
  Type: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  Priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

/**
 * TinyMCE 编辑器配置选项
 */
const getInitOptions = (editorRef, isCreate = true) => {
  return {
    ...defaultConfig,
    // 覆盖默认配置中的特定项
    height: 350,
    placeholder: isCreate ? '请输入通知内容...' : '请编辑通知内容...',
    
    // 性能优化配置
    lazy_loading: true, // 启用延迟加载
    promotion: false, // 禁用推广信息
    convert_urls: false, // 禁用URL转换以提升性能
    relative_urls: false, // 禁用相对URL
    remove_script_host: false, // 保持脚本主机
    
    // 减少初始化时的功能加载
    contextmenu: false, // 禁用右键菜单以提升性能
    elementpath: false, // 禁用元素路径显示
    resize: false, // 禁用调整大小功能
    // 图片预览配置 - 禁用自动上传，改为本地预览模式
    automatic_uploads: false, // 禁用自动上传
    images_reuse_filename: true, // 允许重用文件名
    paste_data_images: true, // 允许粘贴图片
    // 图片尺寸预设
    image_caption: true, // 启用图片标题
    image_title: true, // 启用图片标题属性
    // 粘贴图片时的默认处理
    paste_preprocess: function(plugin, args) {
      // 处理粘贴的图片，设置默认最大宽度
      if (args.content.indexOf('<img') !== -1) {
        args.content = args.content.replace(/<img([^>]*)>/gi, function(match, attrs) {
          // 如果图片没有设置宽度，添加默认最大宽度
          if (attrs.indexOf('width') === -1 && attrs.indexOf('style') === -1) {
            return '<img' + attrs + ' style="max-width: 600px; height: auto;">';
          }
          return match;
        });
      }
    },
    // 图片对话框配置
    image_dimensions: true, // 启用图片尺寸编辑
    image_class_list: [
      {title: '默认', value: ''},
      {title: '响应式', value: 'img-responsive'},
      {title: '圆角图片', value: 'img-rounded'},
      {title: '缩略图', value: 'img-thumbnail'}
    ],
    // 设置图片对话框默认选项卡和默认宽度
    file_picker_callback: function(callback, value, meta) {
      if (meta.filetype === 'image') {
        // 创建文件输入元素
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        
        input.onchange = function() {
          const file = this.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = function(e) {
              // 返回base64数据，不设置默认尺寸，让用户在对话框中自由设置
              callback(e.target.result, {
                alt: file.name
              })
            }
            reader.readAsDataURL(file)
          }
        }
        
        input.click()
      }
    },
    images_upload_handler: (blobInfo, success, failure) => {
      try {
        // 获取图片文件
        const file = blobInfo.blob()
        
        // 检查文件大小（5MB限制）
        if (file.size > 5 * 1024 * 1024) {
          failure('图片大小不能超过5MB')
          return
        }
        
        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          failure('只支持 JPEG、PNG、GIF、BMP、WebP 格式的图片')
          return
        }
        
        // 创建 FileReader 读取文件为 base64
        const reader = new FileReader()
        reader.onload = function(e) {
          // 返回 base64 格式的图片数据，用于本地预览
          const base64Data = e.target.result
          success(base64Data)
          
          // 使用更高的z-index显示成功消息
           setTimeout(() => {
             ElMessage({
               message: '图片已添加到编辑器，提交时将自动上传',
               type: 'success',
               duration: 3000,
               customClass: 'high-z-index-message',
               zIndex: 100100
             })
           }, 100)
        }
        reader.onerror = function() {
          failure('读取图片文件失败')
        }
        reader.readAsDataURL(file)
        
      } catch (error) {
        console.error('图片处理错误:', error)
        failure(error.message || '图片处理失败，请重试')
      }
    },
    setup: (editor) => {
      editorRef.value = editor
      editor.on('init', () => {
        initSetup(editor, isCreate)
      })
      // 监听编辑器内容变化，实现双向数据绑定
      editor.on('change keyup undo redo input paste blur focus', () => {
        const content = editor.getContent()
        noticeForm.Content = content
        // 手动触发表单验证
        nextTick(() => {
          // 根据当前打开的对话框和编辑器类型触发相应的表单验证
          if (isCreate && showCreateDialog.value && noticeFormRef.value) {
            noticeFormRef.value.validateField('Content')
          } else if (!isCreate && showEditDialog.value && editFormRef.value) {
            editFormRef.value.validateField('Content')
          }
        })
      })
    }
  }
}

/**
 * 获取通知列表
 */
const getNoticeList = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      readStatus: filterForm.readStatus,
      type: filterForm.type,
      priority: filterForm.priority
    }
    
    const response = await api.get('/notice', { params })
    
    if (response.data.success) {
      noticeList.value = response.data.data || []
      // 后端返回的分页信息在pagination对象中
      if (response.data.pagination) {
        pagination.total = response.data.pagination.total || 0
      } else {
        pagination.total = response.data.total || 0
      }
    }
  } catch (error) {
    console.error('获取通知列表失败:', error)
    ElMessage.error('获取通知列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取未读通知数量
 */
const getUnreadCount = async () => {
  await userStore.fetchUnreadNoticeCount()
  unreadCount.value = userStore.unreadNoticeCount
}

/**
 * 内部标记为已读函数（不显示确认对话框）
 * @param {number} noticeId - 通知ID
 */
const markAsReadInternal = async (noticeId) => {
  try {
    const response = await api.post(`/notice/${noticeId}/read`)
    if (response.data.success) {
      await getNoticeList()
      // 减少全局未读数量
      userStore.decreaseUnreadNoticeCount(1)
      await getUnreadCount()
    }
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

/**
 * 查看通知详情
 * @param {Object} notice - 通知对象
 */
const viewNotice = async (notice) => {
  try {
    const response = await api.get(`/notice/${notice.ID}`)
    if (response.data.success) {
      currentNotice.value = response.data.data
      showDetailDialog.value = true
      
      // 如果是未读通知，自动标记为已读（不显示确认对话框）
      if (!notice.IsRead) {
        await markAsReadInternal(notice.ID)
      }
    }
  } catch (error) {
    console.error('获取通知详情失败:', error)
    ElMessage.error('获取通知详情失败')
  }
}

/**
 * 标记通知为已读
 * @param {number} noticeId - 通知ID
 */
const markAsRead = async (noticeId) => {
  try {
    // 询问用户确认
    await ElMessageBox.confirm('确定要将此通知标记为已读吗？', '确认操作', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    const response = await api.post(`/notice/${noticeId}/read`)
    if (response.data.success) {
      ElMessage.success('已标记为已读')
      await getNoticeList()
      // 减少全局未读数量
      userStore.decreaseUnreadNoticeCount(1)
      await getUnreadCount()
    }
  } catch (error) {
    // 如果用户取消操作，不显示错误信息
    if (error === 'cancel') {
      return
    }
    console.error('标记已读失败:', error)
    ElMessage.error('标记已读失败')
  }
}

/**
 * 确认阅读通知
 * @param {number} noticeId - 通知ID
 */
const confirmRead = async (noticeId) => {
  try {
    const response = await api.post(`/notice/${noticeId}/confirm`)
    if (response.data.success) {
      ElMessage.success('已确认阅读')
      await getNoticeList()
      if (currentNotice.value && currentNotice.value.ID === noticeId) {
        currentNotice.value.IsConfirmed = true
      }
    }
  } catch (error) {
    console.error('确认阅读失败:', error)
    ElMessage.error('确认阅读失败')
  }
}

/**
 * 批量标记为已读
 */
const markAllAsRead = async () => {
  try {
    await ElMessageBox.confirm('确定要将所有未读通知标记为已读吗？', '确认操作', {
      type: 'warning'
    })
    
    const response = await api.post('/notice/batch/read')
    if (response.data.success) {
      ElMessage.success('已全部标记为已读')
      await getNoticeList()
      // 清零全局未读数量
      userStore.clearUnreadNoticeCount()
      await getUnreadCount()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量标记已读失败:', error)
      ElMessage.error('批量标记已读失败')
    }
  }
}

/**
 * 编辑通知
 * @param {Object} notice - 通知对象
 */
const editNotice = (notice) => {
  isEditing.value = true
  Object.assign(noticeForm, {
    ID: notice.ID,
    Title: notice.Title,
    Content: notice.Content,
    Type: notice.Type,
    Priority: notice.Priority,
    ExpiryDate: notice.ExpiryDate,
    IsSticky: notice.IsSticky,
    RequireConfirmation: notice.RequireConfirmation
  })
  showEditDialog.value = true
  
  // 等待对话框渲染完成后初始化编辑器
  nextTick(() => {
    setTimeout(() => {
      initEditEditor()
    }, 100)
  })
}

/**
 * 删除通知
 * @param {Object} notice - 通知对象
 */
const deleteNotice = async (notice) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除通知 "${notice.Title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await api.delete(`/notice/${notice.ID}`)
    if (response.data.success) {
      ElMessage.success('删除成功')
      await getNoticeList()
      // 如果删除的是未读通知，减少全局未读数量
      if (!notice.IsRead) {
        userStore.decreaseUnreadNoticeCount(1)
      }
      await getUnreadCount()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除通知失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 处理内容中的base64图片上传
 * @param {string} content - 富文本内容
 * @returns {string} 处理后的内容
 */
const processContentImages = async (content) => {
  if (!content) return content
  
  // 匹配所有base64格式的图片
  const base64ImageRegex = /<img[^>]+src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g
  const base64Images = content.match(base64ImageRegex)
  
  if (!base64Images || base64Images.length === 0) {
    return content // 没有base64图片，直接返回
  }
  
  let processedContent = content
  
  // 逐个上传base64图片
  for (const imgTag of base64Images) {
    try {
      // 提取base64数据
      const srcMatch = imgTag.match(/src="(data:image\/[^;]+;base64,[^"]+)"/)
      if (!srcMatch) continue
      
      const base64Data = srcMatch[1]
      
      // 将base64转换为Blob
      const response = await fetch(base64Data)
      const blob = await response.blob()
      
      // 创建FormData上传图片
      const formData = new FormData()
      formData.append('file', blob, `image_${Date.now()}.png`)
      
      // 确保apiService已初始化
      await apiService.initialize()
      
      // 上传图片到服务器
      const uploadUrl = `${apiService.baseURL}/upload/notice-image`
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`上传失败: ${uploadResponse.statusText}`)
      }
      
      const result = await uploadResponse.json()
      
      if (result.success) {
        // 替换base64图片为服务器URL
        const imageUrl = result.fileInfo?.fullUrl || result.url
        const newImgTag = imgTag.replace(/src="[^"]+"/, `src="${imageUrl}"`)
        processedContent = processedContent.replace(imgTag, newImgTag)
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      // 继续处理其他图片，不中断整个流程
    }
  }
  
  return processedContent
}

/**
 * 保存通知（编辑模式）
 */
const saveNotice = async () => {
  try {
    // 确保编辑器内容已同步到表单
    if (editEditorRef.value) {
      const editorContent = editEditorRef.value.getContent()
      noticeForm.Content = editorContent
    }
    
    await editFormRef.value.validate()
    submitting.value = true
    
    // 处理内容中的base64图片，上传并替换为服务器URL
    const processedContent = await processContentImages(noticeForm.Content)
    const submitData = {
      ...noticeForm,
      Content: processedContent
    }
    
    const url = isEditing.value ? `/notice/${noticeForm.ID}` : '/notice'
    const method = isEditing.value ? 'put' : 'post'
    
    const response = await api[method](url, submitData)
    if (response.data.success) {
      ElMessage.success(isEditing.value ? '修改成功' : '发布成功')
      showEditDialog.value = false
      resetNoticeForm()
      isEditing.value = false
      await getNoticeList()
      await getUnreadCount()
    }
  } catch (error) {
    if (error !== false) { // 表单验证失败时不显示错误
      console.error('保存通知失败:', error)
      ElMessage.error(isEditing.value ? '修改失败' : '发布失败')
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 创建通知
 */
const createNotice = async () => {
  try {
    // 确保编辑器内容已同步到表单
    if (createEditorRef.value) {
      const editorContent = createEditorRef.value.getContent()
      noticeForm.Content = editorContent
    }
    
    await noticeFormRef.value.validate()
    submitting.value = true
    
    // 处理内容中的base64图片，上传并替换为服务器URL
    const processedContent = await processContentImages(noticeForm.Content)
    
    // 转换字段名为后端期望的格式（小写）
    const submitData = {
      title: noticeForm.Title,
      content: processedContent,
      type: noticeForm.Type,
      priority: noticeForm.Priority,
      expiryDate: noticeForm.ExpiryDate,
      isSticky: noticeForm.IsSticky,
      requireConfirmation: noticeForm.RequireConfirmation
    }
    
    const response = await api.post('/notice', submitData)
    if (response.data.success) {
      ElMessage.success('通知发布成功')
      showCreateDialog.value = false
      resetNoticeForm()
      await getNoticeList()
      await getUnreadCount()
    }
  } catch (error) {
    if (error !== false) { // 表单验证失败时不显示错误
      console.error('创建通知失败:', error)
      ElMessage.error('创建通知失败')
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 重置筛选条件
 */
const resetFilter = () => {
  filterForm.readStatus = ''
  filterForm.type = ''
  filterForm.priority = ''
  pagination.page = 1
  getNoticeList()
}

/**
 * 打开创建通知对话框
 */
const openCreateDialog = () => {
  // 重置表单数据
  Object.assign(noticeForm, {
    Title: '',
    Content: '',
    Type: 'general',
    Priority: 'C',
    ExpiryDate: null,
    IsSticky: false,
    RequireConfirmation: false
  })
  isEditing.value = false
  
  // 打开对话框
  showCreateDialog.value = true
}

/**
 * 重置通知表单
 */
const resetNoticeForm = () => {
  Object.assign(noticeForm, {
    Title: '',
    Content: '',
    Type: 'general',
    Priority: 'C',
    ExpiryDate: null,
    IsSticky: false,
    RequireConfirmation: false
  })
  isEditing.value = false
  noticeFormRef.value?.resetFields()
  editFormRef.value?.resetFields()
}

/**
 * 处理详情对话框关闭
 */
const handleDetailClose = () => {
  currentNotice.value = null
}

/**
 * 处理编辑对话框关闭
 */
const handleEditDialogClose = () => {
  // 清空表单数据
  resetNoticeForm()
  // 清空富文本编辑器内容
  if (editEditorRef.value) {
    editEditorRef.value.setContent('')
  }
  isEditing.value = false
}

/**
 * 处理创建对话框关闭
 */
const handleCreateDialogClose = () => {
  // 清空表单数据
  resetNoticeForm()
  // 清空富文本编辑器内容
  if (createEditorRef.value) {
    createEditorRef.value.setContent('')
  }
}

/**
 * 获取类型标签样式
 * @param {string} type - 类型
 * @returns {string} 标签样式
 */
const getTypeTagType = (type) => {
  const typeMap = {
    'system': 'primary',
    'important': 'danger',
    'general': 'success',
    'announcement': 'warning',
    'urgent': 'danger',
    'maintenance': 'info',
    'notice': '',
    'security': 'danger',
    'update': 'primary',
    'event': 'success',
    'policy': 'warning'
  }
  return typeMap[type] || 'info'
}

/**
 * 获取类型标签文本
 * @param {string} type - 类型
 * @returns {string} 标签文本
 */
const getTypeLabel = (type) => {
  const typeMap = {
    'system': '系统通知',
    'important': '重要公告', 
    'general': '一般通知',
    'announcement': '公告通知',
    'urgent': '紧急通知',
    'maintenance': '维护通知',
    'notice': '普通通知',
    'security': '安全通知',
    'update': '更新通知',
    'event': '活动通知',
    'policy': '政策通知'
  }
  return typeMap[type] || '未知类型'
}

/**
 * 获取优先级标签样式
 * @param {string} priority - 优先级
 * @returns {string} 标签样式
 */
const getPriorityTagType = (priority) => {
  const priorityMap = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'info'
  }
  return priorityMap[priority] || 'info'
}

/**
 * 获取优先级标签文本
 * @param {string} priority - 优先级
 * @returns {string} 标签文本
 */
const getPriorityLabel = (priority) => {
  const priorityMap = {
    // 新的A-E级优先级分类
    'A': '最高优先级（A级）',
    'B': '高优先级（B级）',
    'C': '中等优先级（C级）',
    'D': '低优先级（D级）',
    'E': '最低优先级（E级）',
    // 兼容原有的英文优先级
    'high': '高优先级（B级）',
    'medium': '中等优先级（C级）',
    'low': '低优先级（D级）',
    'urgent': '最高优先级（A级）',
    'normal': '中等优先级（C级）',
    'critical': '最高优先级（A级）',
    // 兼容中文映射
    '最高': '最高优先级（A级）',
    '高': '高优先级（B级）',
    '中': '中等优先级（C级）',
    '低': '低优先级（D级）',
    '最低': '最低优先级（E级）',
    '紧急': '最高优先级（A级）',
    '普通': '中等优先级（C级）',
    '严重': '最高优先级（A级）',
    // 英文别名映射
    'important': '高优先级（B级）',
    'general': '中等优先级（C级）',
    'emergency': '最高优先级（A级）'
  }
  return priorityMap[priority] || priority
}

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 检查是否已过期
 * @param {string} expiryDate - 过期时间
 * @returns {boolean} 是否已过期
 */
const isExpired = (expiryDate) => {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

/**
 * 编辑器初始化设置
 * @param {Editor} editor - TinyMCE 编辑器实例
 * @param {boolean} isCreate - 是否为创建模式
 */
const initSetup = (editor, isCreate = true) => {
  if (!editor) {
    return
  }
  
  // 创建模式下确保编辑器内容为空，编辑模式下使用表单数据
  const value = isCreate ? '' : (noticeForm.Content || '')
  editor.setContent(value)
  bindModelHandlers(editor)
}

/**
 * 设置编辑器内容
 * @param {Editor} editor - TinyMCE 编辑器实例
 * @param {string} val - 新值
 * @param {string} prevVal - 旧值
 */
const setValue = (editor, val, prevVal) => {
  if (
    editor &&
    typeof val === 'string' &&
    val !== prevVal &&
    val !== editor.getContent()
  ) {
    editor.setContent(val)
  }
}

/**
 * 绑定数据模型处理器
 * @param {Editor} editor - TinyMCE 编辑器实例
 */
const bindModelHandlers = (editor) => {
  // 监听内容变化
  watch(
    () => noticeForm.Content,
    (val, prevVal) => setValue(editor, val, prevVal),
    { immediate: true }
  )
  
  // 监听编辑器内容变化，确保双向绑定
  editor.on('change keyup undo redo input paste blur focus', () => {
    const content = editor.getContent()
    if (content !== noticeForm.Content) {
      noticeForm.Content = content
      // 手动触发表单验证
      nextTick(() => {
        // 根据当前打开的对话框触发相应的表单验证
        if (showCreateDialog.value && noticeFormRef.value) {
          noticeFormRef.value.validateField('Content')
        }
        if (showEditDialog.value && editFormRef.value) {
          editFormRef.value.validateField('Content')
        }
      })
    }
  })
}

/**
 * 图片上传处理函数
 * @param {Object} blobInfo - 图片信息对象
 * @param {Function} success - 成功回调函数
 * @param {Function} failure - 失败回调函数
 * @param {Function} progress - 进度回调函数
 */
const handleImgUpload = (blobInfo, success, failure, progress) => {
  const xhr = new XMLHttpRequest()
  const formData = new FormData()
  const file = blobInfo.blob() // 转化为易于理解的file对象
  
  // 检查文件大小（5MB限制）
  if (file.size > 5 * 1024 * 1024) {
    failure('图片大小不能超过5MB')
    return
  }
  
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    failure('只支持 JPEG、PNG、GIF、BMP、WebP 格式的图片')
    return
  }
  
  xhr.withCredentials = false
  xhr.open('POST', '/api/upload')
  
  // 监听上传进度
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100
      progress(percentComplete)
    }
  }
  
  xhr.onload = function() {
    if (xhr.status !== 200) {
      failure('HTTP Error: ' + xhr.status)
      return
    }
    
    try {
      const json = JSON.parse(xhr.responseText)
      if (!json) {
        failure('服务器响应格式错误')
        return
      }
      
      if (!json.success) {
        failure(json.message || '图片上传失败')
        return
      }
      
      if (typeof json.data?.url !== 'string') {
        failure('服务器未返回有效的图片地址')
        return
      }
      
      success(json.data.url)
    } catch (error) {
      failure('解析响应失败: ' + xhr.responseText)
    }
  }
  
  xhr.onerror = function() {
    failure('网络错误，请检查网络连接')
  }
  
  formData.append('file', file, file.name)
  xhr.send(formData)
}

/**
 * 初始化创建通知的 TinyMCE 编辑器
 */
const initCreateEditor = () => {
  const options = {
    ...getInitOptions(createEditorRef, true),
    selector: `#${createTinymceId.value}`
  }
  tinymce.init(options)
}

/**
 * 初始化编辑通知的 TinyMCE 编辑器
 */
const initEditEditor = () => {
  const options = {
    ...getInitOptions(editEditorRef, false),
    selector: `#${editTinymceId.value}`
  }
  tinymce.init(options)
}

/**
 * 销毁 TinyMCE 编辑器
 */
const destroyEditors = () => {
  if (createEditorRef.value) {
    tinymce.remove(`#${createTinymceId.value}`)
    createEditorRef.value = null
  }
  if (editEditorRef.value) {
    tinymce.remove(`#${editTinymceId.value}`)
    editEditorRef.value = null
  }
}

// 监听创建对话框打开状态
watch(showCreateDialog, (newVal) => {
  if (newVal) {
    // 等待对话框渲染完成后初始化编辑器
    nextTick(() => {
      setTimeout(() => {
        initCreateEditor()
      }, 100)
    })
  } else {
    // 对话框关闭时销毁创建编辑器
    if (createEditorRef.value) {
      tinymce.remove(`#${createTinymceId.value}`)
      createEditorRef.value = null
    }
  }
})

// 监听编辑对话框打开状态
watch(showEditDialog, (newVal) => {
  if (!newVal) {
    // 对话框关闭时销毁编辑编辑器
    if (editEditorRef.value) {
      tinymce.remove(`#${editTinymceId.value}`)
      editEditorRef.value = null
    }
  }
})

// 组件挂载时获取数据
onMounted(async () => {
  await checkPermissions()
  await getNoticeList()
  await getUnreadCount()
})

// 组件卸载前销毁编辑器
onBeforeUnmount(() => {
  destroyEditors()
})
</script>

<style scoped>
.notice-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

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

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.unread-badge {
  font-size: 20px;
  color: #409eff;
  margin-bottom: 0 !important;
  /* 确保徽标有足够的显示空间 */
  padding: 2px;
  line-height: 1;
}

/* 修复徽标显示不完整的问题 */
:deep(.unread-badge .el-badge__content) {
  top: -8px !important;
  right: -8px !important;
  transform: scale(1) !important;
  min-width: 16px !important;
  height: 16px !important;
  line-height: 16px !important;
  font-size: 10px !important;
  padding: 0 4px !important;
  border-radius: 8px !important;
  border: 1px solid #fff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

/* 强制覆盖Element Plus徽标默认样式 */
:deep(.read-status-indicator .el-badge) {
  margin-bottom: 0 !important;
}

:deep(.read-status-indicator .el-badge__content) {
  margin-bottom: 0 !important;
  width: 12px !important;
  height: 12px !important;
  min-width: 10px !important;
  font-size: 0 !important;
  padding: 0 !important;
  border-radius: 50% !important;
  top: 2px !important;
  right: 2px !important;
}

.header-right {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 筛选表单样式优化 */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.filter-item {
  margin-right: 0 !important;
  margin-bottom: 0 !important;
  min-width: 200px;
}

.filter-item:last-child {
  min-width: auto;
}

.filter-select {
  width: 120px;
  min-width: 120px;
}

/* 确保选择框不会塌陷 */
:deep(.filter-select .el-input) {
  width: 160px;
  min-width: 160px;
}

:deep(.filter-select .el-input__wrapper) {
  width: 100%;
  min-width: 160px;
}

.notice-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.read-status-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 40px;
}

.read-status-indicator .el-badge {
  display: flex;
  align-items: center;
  justify-content: center;
}

.read-status-indicator .el-icon {
  font-size: 18px;
  transition: color 0.3s;
  vertical-align: middle;
}

.read-status-indicator .el-icon.unread {
  color: #f56c6c;
}

.read-status-indicator .el-icon.read {
  color: #67c23a;
}

.notice-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: color 0.3s;
  min-height: 40px;
  padding: 8px 0;
}

.notice-title:hover {
  color: #409eff;
}

.title-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 24px;
}

.title-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  line-height: 1.4;
}

.sticky-tag {
  margin-left: 8px;
  flex-shrink: 0;
}

.unread-title {
  font-weight: 600;
  color: #303133;
}

.read-title {
  color: #909399;
}

.expired {
  color: #f56c6c;
  text-decoration: line-through;
}

.pagination-wrapper {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.notice-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.publish-date {
  color: #909399;
  font-size: 14px;
}

.detail-content {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.detail-footer {
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 增强表格样式 */
.enhanced-table {
  border-radius: 8px;
  overflow: hidden;
}

.enhanced-table .el-table__header-wrapper {
  border-radius: 8px 8px 0 0;
}

.enhanced-table .el-table__body-wrapper {
  border-radius: 0 0 8px 8px;
}

/* 表格行悬停效果 */
:deep(.enhanced-table .el-table__row:hover) {
  background-color: #f8f9fa !important;
  transition: background-color 0.3s ease;
}

/* 表格边框优化 */
:deep(.enhanced-table .el-table__border-left-patch) {
  border-top: 1px solid #ebeef5;
}

/* 日期单元格样式 */
.date-cell {
  color: #606266;
  white-space: nowrap;
}

/* 未读状态样式 */
.unread-status {
  color: #f56c6c;
  font-weight: 500;
}

/* 表格头部样式优化 */
:deep(.enhanced-table .el-table__header th) {
  border-bottom: 2px solid #e4e7ed;
  font-weight: 600;
  text-align: center;
}

/* 操作列表头强制居中对齐 */
:deep(.enhanced-table .el-table__header th:last-child) {
  text-align: center !important;
}

:deep(.enhanced-table .el-table__header th:last-child .cell) {
  text-align: center !important;
  justify-content: center !important;
  display: flex !important;
  align-items: center !important;
}

/* 表格单元格样式优化 */
:deep(.enhanced-table .el-table__body td) {
  border-bottom: 1px solid #f0f2f5;
  vertical-align: middle;
}

/* 序号列样式 */
:deep(.enhanced-table .el-table__body td:first-child) {
  font-weight: 600;
  color: #909399;
  background-color: #fafbfc;
}

/* 操作按钮样式优化 */
:deep(.enhanced-table .el-button + .el-button) {
  margin-left: 4px;
}

/* 统一操作按钮样式 */
:deep(.enhanced-table .el-table__cell .el-button) {
  width: 60px;
  padding: 4px 2px;
  font-size: 12px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  vertical-align: middle;
}

/* 操作按钮间距优化 */
:deep(.enhanced-table .el-button + .el-button) {
  margin-left: 2px;
}

/* 按钮图标和文字垂直居中 */
:deep(.enhanced-table .el-table__cell .el-button .el-icon) {
  margin-right: 2px;
  vertical-align: middle;
}

:deep(.enhanced-table .el-table__cell .el-button span) {
  vertical-align: middle;
  line-height: 1;
}

/* 操作列按钮容器 */
:deep(.enhanced-table .el-table__cell:last-child) {
  white-space: nowrap;
  overflow: visible;
  min-width: 240px;
}

/* 操作列整体布局优化 */
:deep(.enhanced-table .el-table__cell:last-child .cell) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
}

/* 页面头部按钮统一样式 */
.header-right .el-button {
  width: 100px;
  margin-left: 5px;
  padding: 8px 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-right .el-button:first-child {
  margin-left: 0;
}

/* 页面头部按钮图标和文字垂直居中 */
.header-right .el-button .el-icon {
  margin-right: 4px;
  vertical-align: middle;
}

.header-right .el-button span {
  vertical-align: middle;
  line-height: 1;
}



/* FluentEditor编辑器样式 */
:deep(.fluent-editor) {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.fluent-editor .ql-toolbar) {
  border-bottom: 1px solid #dcdfe6;
  background-color: #fafafa;
}

:deep(.fluent-editor .ql-container) {
  font-size: 14px;
  line-height: 1.6;
}

:deep(.fluent-editor .ql-editor) {
  min-height: 200px;
  padding: 12px 15px;
}

:deep(.fluent-editor .ql-editor.ql-blank::before) {
  color: #c0c4cc;
  font-style: normal;
}

/* 筛选区域按钮统一样式 */
.filter-form .el-button {
  width: 80px;
  margin-left: 5px;
  padding: 8px 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filter-form .el-button:first-child {
  margin-left: 0;
}

/* 筛选区域按钮图标和文字垂直居中 */
.filter-form .el-button .el-icon {
  margin-right: 4px;
  vertical-align: middle;
}

.filter-form .el-button span {
  vertical-align: middle;
  line-height: 1;
}

/* 标签样式优化 */
:deep(.enhanced-table .el-tag) {
  border-radius: 12px;
  font-weight: 500;
}

/* 表格加载状态优化 */
:deep(.enhanced-table .el-loading-mask) {
  border-radius: 8px;
}

/* 类型标签个性化样式 */
:deep(.type-tag) {
  font-weight: 500;
  border-radius: 12px;
  padding: 2px 8px;
}

:deep(.type-tag.el-tag--primary) {
  background: linear-gradient(135deg, #409eff, #66b3ff);
  border-color: #409eff;
  color: white;
}

:deep(.type-tag.el-tag--success) {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  border-color: #67c23a;
  color: white;
}

:deep(.type-tag.el-tag--warning) {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  border-color: #e6a23c;
  color: white;
}

:deep(.type-tag.el-tag--danger) {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  border-color: #f56c6c;
  color: white;
}

:deep(.type-tag.el-tag--info) {
  background: linear-gradient(135deg, #909399, #a6a9ad);
  border-color: #909399;
  color: white;
}



/* 响应式优化 */
@media (max-width: 768px) {
  :deep(.enhanced-table .el-table__body td) {
    padding: 8px 4px;
  }
  
  :deep(.enhanced-table .el-button) {
    padding: 5px 8px;
  }
  
  :deep(.type-tag) {
    padding: 1px 6px;
  }
}

.confirm-actions {
  margin-top: 15px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-left {
    justify-content: center;
  }
  
  .header-right {
    justify-content: center;
  }
  
  .filter-form {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .filter-item {
    min-width: 100%;
    margin-right: 0;
    margin-bottom: 0;
  }
  
  .filter-select {
    width: 100%;
    min-width: 100%;
  }
  
  :deep(.filter-select .el-input) {
    width: 100%;
    min-width: 100%;
  }
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table .el-table__row:hover) {
  background-color: #f5f7fa;
}

/* 通用徽标样式 */
:deep(.el-badge__content) {
  border: 2px solid #fff;
  font-size: 12px;
  height: 18px;
  line-height: 14px;
  min-width: 18px;
  padding: 0 6px;
}







/* 字体大小下拉框宽度优化 - 多种选择器确保兼容性 */
:deep(.tox-tbtn--select[title*="字体大小"]),
:deep(.tox-tbtn--select[title*="Font sizes"]),
:deep(.tox-tbtn--select[aria-label*="字体大小"]),
:deep(.tox-tbtn--select[aria-label*="Font sizes"]) {
  width: 85px !important;
  min-width: 85px !important;
  max-width: 85px !important;
}

/* 通过工具栏位置定位字体大小按钮 */
:deep(.tox-toolbar__group .tox-tbtn--select:nth-of-type(2)) {
  width: 85px !important;
  min-width: 85px !important;
  max-width: 85px !important;
}

/* 字体大小选择框内部元素宽度调整 */
:deep(.tox-tbtn__select-label) {
  max-width: 65px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* TinyMCE 编辑器滚动条优化 */
:deep(.tox-edit-area) {
  overflow: visible !important;
}

:deep(.tox-edit-area__iframe) {
  height: auto !important;
  min-height: 300px !important;
  overflow: visible !important;
}

/* 编辑器内容区域优化 */
:deep(.tox .tox-edit-area__iframe) {
  border: none !important;
  overflow: visible !important;
}

/* 移除编辑器内容区域的固定高度和滚动条 */
:deep(.tox-tinymce) {
  border: 1px solid #dcdfe6 !important;
  border-radius: 4px !important;
}

:deep(.tox .tox-edit-area) {
  border: none !important;
  overflow: visible !important;
}

/* 确保编辑器内容自适应高度 */
:deep(.tox-edit-area iframe) {
  height: auto !important;
  min-height: 300px !important;
  overflow: visible !important;
}

/* Element Plus 下拉选项样式修复 */
:deep(.el-select .el-input) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-select .el-input__wrapper) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-select .el-input__inner) {
  pointer-events: auto !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  font-size: 12px !important;
}

/* 字体大小下拉菜单项优化 */
:deep(.tox-collection__item[title*="px"]) {
  padding: 4px 8px !important;
  font-size: 12px !important;
}

/* 字体大小下拉菜单容器宽度 */
:deep(.tox-menu[role="menu"]) {
  min-width: 100px !important;
}









:deep(.el-dialog .el-select .el-input__wrapper) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-dialog .el-select .el-input__suffix) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* Element Plus 2.x 版本特定修复 */
:deep(.el-select .el-select__wrapper) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-select .el-select__selection) {
  pointer-events: auto !important;
}

:deep(.el-select .el-select__caret) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-select .el-select__suffix) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* 强制启用下拉功能 */
:deep(.el-select:not(.is-disabled)) {
  pointer-events: auto !important;
}

:deep(.el-select:not(.is-disabled) .el-input) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

:deep(.el-select:not(.is-disabled) .el-input__inner) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* 确保下拉箭头可点击 */
:deep(.el-icon) {
  pointer-events: auto !important;
  cursor: pointer !important;
}

</style>