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
          type="primary" 
          @click="openCreateDialog"
          :disabled="!permissions.canAdd"
        >
          <el-icon><Plus /></el-icon>
          发布通知
        </el-button>
        <el-button 
          @click="markAllAsRead" 
          :disabled="unreadCount === 0 || !permissions.canMarkAllRead" 
          type="warning" 
          plain
        >
          <el-icon><Check /></el-icon>
          全部已读
        </el-button>
        <!-- 测试按钮 -->

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
              type="warning" 
              size="small" 
              @click="editNotice(row)"
              :icon="Edit"
              :disabled="!permissions.canEdit"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="deleteNotice(row)"
              :icon="Delete"
              :disabled="!permissions.canDelete"
            >
              删除
            </el-button>
            <el-button 
              v-if="!row.IsRead" 
              type="success" 
              size="small" 
              @click="markAsRead(row.ID)"
              :icon="Check"
              :disabled="!permissions.canMarkRead"
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
      width="45%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="handleDetailClose"
      class="notice-detail-dialog"
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
    <el-dialog 
      v-model="showEditDialog" 
      :title="isEditing ? '编辑通知' : '发布通知'" 
      width="45%" 
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="handleEditDialogClose"
      class="notice-edit-dialog"
    >
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
    <el-dialog 
      v-model="showCreateDialog" 
      title="发布通知" 
      width="45%" 
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="handleCreateDialogClose"
      class="notice-create-dialog"
    >
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
      // 使用异步权限检查方法，权限标识与数据库Permission字段保持一致
      permissions.canAdd = await userStore.hasActionPermissionAsync('notice:add')
      permissions.canEdit = await userStore.hasActionPermissionAsync('notice:edit')
      permissions.canDelete = await userStore.hasActionPermissionAsync('notice:delete')
      permissions.canMarkRead = await userStore.hasActionPermissionAsync('notice:mark-read')
      permissions.canMarkAllRead = await userStore.hasActionPermissionAsync('notice:mark-all-read')
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
const originalImagePath = ref([]) // 编辑模式下的原始图片信息

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
      
      // 监听图片插入事件，防止自动换行
      editor.on('NodeChange', (e) => {
        // 查找所有图片元素并设置为inline-block
        const images = editor.getBody().querySelectorAll('img')
        images.forEach(img => {
          if (img.style.display === 'block' || !img.style.display) {
            img.style.display = 'inline-block'
            img.style.verticalAlign = 'middle'
          }
        })
        
        // 在编辑模式下，检查是否有新的base64图片被插入
        if (!isCreate && isEditing.value) {
          const content = editor.getContent()
          const base64Images = content.match(/<img[^>]+src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g) || []
          
          // 如果发现新的base64图片，说明用户可能替换了图片，需要清理对应的原始图片信息
          if (base64Images.length > 0) {
            console.log('🔄 [图片替换检测] 发现新的base64图片，可能存在图片替换')
            updateOriginalImagePathFromContent(content)
          }
        }
      })
      
      // 监听粘贴事件，处理粘贴的图片
      editor.on('paste', (e) => {
        setTimeout(() => {
          const images = editor.getBody().querySelectorAll('img')
          images.forEach(img => {
            img.style.display = 'inline-block'
            img.style.verticalAlign = 'middle'
          })
        }, 100)
      })
      
      // 监听编辑器内容变化，实现双向数据绑定
      editor.on('change keyup undo redo input paste blur focus', () => {
        const content = editor.getContent()
        noticeForm.Content = content
        
        // 在编辑模式下，实时更新原始图片信息
        if (!isCreate && isEditing.value) {
          updateOriginalImagePathFromContent(content)
        }
        
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
      
      // 监听图片删除事件
      editor.on('NodeChange', (e) => {
        if (!isCreate && isEditing.value) {
          // 检查是否有图片被删除
          checkForDeletedImages(editor)
        }
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
    
    // 检查数据结构，兼容不同的返回格式
    if (Array.isArray(response.data)) {
      // 如果直接返回数组，说明是代理转发的数据
      noticeList.value = response.data
      // 从数组中获取分页信息（如果有的话）
      pagination.total = response.data.length
    } else if (response.data.success) {
      // 标准的API响应格式
      noticeList.value = response.data.data || []
      // 后端返回的分页信息在pagination对象中
      if (response.data.pagination) {
        pagination.total = response.data.pagination.total || 0
      } else {
        pagination.total = response.data.total || 0
      }
    } else {
      noticeList.value = []
      pagination.total = 0
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
 * 根据当前环境动态生成图片URL
 * @param {string} imageUrl - 原始图片URL
 * @returns {string} 适配当前环境的图片URL
 */
const getAdaptedImageUrl = (imageUrl) => {
  console.log('🔍 [图片URL适配] 原始URL:', imageUrl)
  
  if (!imageUrl) {
    console.warn('⚠️ [图片URL适配] 原始URL为空')
    return ''
  }
  
  // 如果已经是相对路径或本地路径，直接返回
  if (imageUrl.startsWith('/files/') || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    console.log('📁 [图片URL适配] 相对路径，直接返回:', imageUrl)
    return imageUrl
  }
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  console.log('🌐 [图片URL适配] 当前环境:', { hostname, protocol })
  
  // 如果是完整URL，需要根据环境进行转换
  if (imageUrl.startsWith('http')) {
    // 提取文件名部分
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    console.log('📄 [图片URL适配] 提取的文件名:', filename)
    
    let adaptedUrl
    // 构建适配当前环境的URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 开发环境：使用本地文件服务器
      adaptedUrl = `/files/notice-images/${filename}`
      console.log('🔧 [图片URL适配] 开发环境URL:', adaptedUrl)
    } else {
      // 生产环境：使用Nginx文件服务器端口8080
      adaptedUrl = `${protocol}//${hostname}:8080/files/notice-images/${filename}`
      console.log('🏭 [图片URL适配] 生产环境URL:', adaptedUrl)
    }
    
    return adaptedUrl
  }
  
  // 其他情况直接返回原URL
  console.log('🔄 [图片URL适配] 其他情况，直接返回:', imageUrl)
  return imageUrl
}

/**
 * 将图片插入到通知内容中
 * @param {string} content - 原始内容
 * @param {Array} imagePath - 图片路径信息数组
 * @returns {string} 插入图片后的内容
 */
const insertImagesIntoContent = (content, imagePath) => {
  console.log('🖼️ [图片插入] 开始处理图片插入')
  console.log('📝 [图片插入] 原始内容长度:', content ? content.length : 0)
  console.log('📷 [图片插入] 图片数组:', imagePath)
  
  if (!imagePath || !Array.isArray(imagePath) || imagePath.length === 0) {
    console.log('❌ [图片插入] 没有图片需要插入')
    return content
  }
  
  let processedContent = content || ''
  
  // 首先，找到内容中所有现有的img标签
  const existingImgRegex = /<img[^>]*src="[^"]*"[^>]*>/gi
  const existingImages = processedContent.match(existingImgRegex) || []
  
  console.log('🔍 [图片插入] 发现现有图片标签数量:', existingImages.length)
  console.log('🔍 [图片插入] 现有图片标签:', existingImages)
  
  // 遍历图片信息，替换对应位置的图片
  imagePath.forEach((imageInfo, index) => {
    console.log(`🔍 [图片插入] 处理第${index + 1}张图片:`, imageInfo)
    
    if (imageInfo.url) {
      // 获取适配当前环境的图片URL
      const adaptedUrl = getAdaptedImageUrl(imageInfo.url)
      
      // 构建图片样式，优先使用保存的尺寸信息
      let imageStyle = 'display: inline-block; margin: 5px 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'
      
      // 如果有保存的原始样式，先使用原始样式作为基础
      if (imageInfo.originalStyle) {
        imageStyle = imageInfo.originalStyle
        console.log(`🎨 [图片样式] 使用原始样式作为基础: ${imageStyle}`)
        
        // 但是要更新其中的width和height值，使用ImagePath中保存的最新尺寸
        if (imageInfo.width || imageInfo.height) {
          // 移除原样式中的width和height
          imageStyle = imageStyle.replace(/width:\s*[^;]+;?/gi, '').replace(/height:\s*[^;]+;?/gi, '')
          
          // 添加最新的尺寸信息
          const widthStyle = imageInfo.width ? `width: ${imageInfo.width}${imageInfo.width.includes('px') || imageInfo.width.includes('%') ? '' : 'px'};` : ''
          const heightStyle = imageInfo.height ? `height: ${imageInfo.height}${imageInfo.height.includes('px') || imageInfo.height.includes('%') || imageInfo.height === 'auto' ? '' : 'px'};` : ''
          imageStyle = `${widthStyle} ${heightStyle} ${imageStyle}`.trim()
          console.log(`📏 [图片尺寸] 更新样式中的尺寸 - 宽度: ${imageInfo.width}, 高度: ${imageInfo.height}`)
        }
      } else {
        // 如果没有原始样式，构建新样式
        if (imageInfo.width || imageInfo.height) {
          const widthStyle = imageInfo.width ? `width: ${imageInfo.width}${imageInfo.width.includes('px') || imageInfo.width.includes('%') ? '' : 'px'};` : ''
          const heightStyle = imageInfo.height ? `height: ${imageInfo.height}${imageInfo.height.includes('px') || imageInfo.height.includes('%') || imageInfo.height === 'auto' ? '' : 'px'};` : ''
          imageStyle = `${widthStyle} ${heightStyle} ${imageStyle}`.trim()
          console.log(`📏 [图片尺寸] 使用保存的尺寸 - 宽度: ${imageInfo.width}, 高度: ${imageInfo.height}`)
        } else {
          // 默认样式：响应式图片
          imageStyle = `max-width: 100%; height: auto; ${imageStyle}`
          console.log(`📐 [图片尺寸] 使用默认响应式样式`)
        }
      }
      
      // 创建新的图片HTML标签，使用保存的尺寸信息
      const newImgTag = `<img src="${adaptedUrl}" alt="${imageInfo.alt || ''}" style="${imageStyle}" onerror="console.error('❌ [图片加载失败] URL: ${adaptedUrl}'); this.style.border='2px solid red'; this.alt='图片加载失败';" onload="console.log('✅ [图片加载成功] URL: ${adaptedUrl}');" />`
      
      // 如果有对应位置的现有图片，则替换它
      if (index < existingImages.length) {
        const oldImgTag = existingImages[index]
        processedContent = processedContent.replace(oldImgTag, newImgTag)
        console.log(`✅ [图片插入] 第${index + 1}张图片已替换现有图片，URL: ${adaptedUrl}`)
        console.log(`🔄 [图片插入] 替换前: ${oldImgTag.substring(0, 100)}...`)
        console.log(`🔄 [图片插入] 替换后: ${newImgTag.substring(0, 100)}...`)
      } else {
        // 如果没有对应的现有图片，则根据position插入
        if (imageInfo.position === 0 || !imageInfo.position) {
          // 插入到内容开头
          processedContent = newImgTag + ' ' + processedContent
          console.log(`✅ [图片插入] 第${index + 1}张图片已插入到开头，URL: ${adaptedUrl}`)
        } else {
          // 插入到内容末尾
          processedContent += ' ' + newImgTag
          console.log(`✅ [图片插入] 第${index + 1}张图片已插入到末尾，URL: ${adaptedUrl}`)
        }
      }
    } else {
      console.warn(`⚠️ [图片插入] 第${index + 1}张图片信息无效:`, imageInfo)
    }
  })
  
  console.log('🎯 [图片插入] 处理完成，最终内容长度:', processedContent.length)
  return processedContent
}

/**
 * 查看通知详情
 * @param {Object} notice - 通知对象
 */
const viewNotice = async (notice) => {
  try {
    console.log('=== 标题列点击事件触发 ===')
    console.log('点击的通知对象:', notice)
    console.log('通知ID:', notice.ID)
    console.log('通知标题:', notice.Title)
    
    const response = await api.get(`/notice/${notice.ID}`)
    console.log('API响应完成:', response.data)
        console.log('通知数据是否存在:', !!response.data)
        console.log('通知ID是否存在:', !!response.data.ID)
        
        // API返回的response.data直接就是通知数据，不需要检查success字段
        if (response.data && response.data.ID) {
          const noticeData = response.data
          console.log('获取到的通知数据:', noticeData)
      
      // 处理图片插入
      if (noticeData.imagePath && Array.isArray(noticeData.imagePath)) {
        noticeData.Content = insertImagesIntoContent(noticeData.Content, noticeData.imagePath)
      }
      
      currentNotice.value = noticeData
      console.log('设置currentNotice完成:', currentNotice.value)
      
      showDetailDialog.value = true
      console.log('详情对话框应该显示，showDetailDialog值:', showDetailDialog.value)
      
      // 使用nextTick检查DOM更新
      await nextTick()
      console.log('nextTick后showDetailDialog值:', showDetailDialog.value)
      
      // 检查DOM中的对话框元素
      const dialogElements = document.querySelectorAll('.el-dialog')
      const overlayElements = document.querySelectorAll('.el-overlay')
      console.log('DOM中对话框数量:', dialogElements.length)
      console.log('DOM中遮罩层数量:', overlayElements.length)
      
      if (dialogElements.length > 0) {
        const dialog = dialogElements[dialogElements.length - 1]
        const computedStyle = window.getComputedStyle(dialog)
        console.log('对话框样式:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex
        })
      }
      
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
const editNotice = async (notice) => {
  try {
    isEditing.value = true
    
    // 获取完整的通知详情，包括图片信息
    const response = await api.get(`/notice/${notice.ID}`)
    
    // API返回的response.data直接就是通知数据，不需要检查success字段
    if (response.data && response.data.ID) {
      const noticeData = response.data
      
      // 处理图片插入到内容中
      let contentWithImages = noticeData.Content
      if (noticeData.imagePath && Array.isArray(noticeData.imagePath)) {
        contentWithImages = insertImagesIntoContent(noticeData.Content, noticeData.imagePath)
      }
      
      // 保存原始图片信息，用于编辑时的图片数据处理
      originalImagePath.value = noticeData.imagePath || []
      
      // 设置表单数据
      Object.assign(noticeForm, {
        ID: noticeData.ID,
        Title: noticeData.Title,
        Content: contentWithImages,
        Type: noticeData.Type,
        Priority: noticeData.Priority,
        ExpiryDate: noticeData.ExpiryDate,
        IsSticky: noticeData.IsSticky,
        RequireConfirmation: noticeData.RequireConfirmation
      })
      
      showEditDialog.value = true
      
      // 等待对话框渲染完成后初始化编辑器
      setTimeout(() => {
        initEditEditor()
      }, 100)
    }
  } catch (error) {
    console.error('获取通知详情失败:', error)
    ElMessage.error('获取通知详情失败')
  }
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
    
    // API直接返回{success: true, message: '通知公告删除成功'}格式
    if (response && response.success) {
      ElMessage.success('删除成功')
      await getNoticeList()
      // 如果删除的是未读通知，减少全局未读数量
      if (!notice.IsRead) {
        userStore.decreaseUnreadNoticeCount(1)
      }
      await getUnreadCount()
      // 刷新通知铃铛数据
      await userStore.refreshNotifications()
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
 * @param {Array} existingImagePath - 已存在的图片信息数组（编辑模式下使用）
 * @returns {Object} 包含处理后的内容和图片信息数组的对象
 */
const processContentImages = async (content, existingImagePath = []) => {
  if (!content) return { content, imagePath: [] }
  
  // 匹配所有图片标签（包括base64和服务器图片）
  const allImageRegex = /<img[^>]+src="[^"]+"[^>]*>/g
  const allImages = content.match(allImageRegex) || []
  
  // 匹配所有base64格式的图片
  const base64ImageRegex = /<img[^>]+src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g
  const base64Images = content.match(base64ImageRegex) || []
  
  let processedContent = content
  const imagePath = [] // 存储图片信息数组
  
  // 首先处理已存在的服务器图片
  for (const imgTag of allImages) {
    const srcMatch = imgTag.match(/src="([^"]+)"/)
    if (!srcMatch) continue
    
    const src = srcMatch[1]
    
    // 如果不是base64图片，说明是已存在的服务器图片
    if (!src.startsWith('data:image/')) {
      // 查找对应的已存在图片信息，使用更精确的匹配逻辑
      const existingImage = existingImagePath.find(img => {
        // 精确匹配完整URL
        if (img.fullUrl === src || img.url === src) {
          return true
        }
        // 匹配文件名（但要确保是同一张图片）
        if (img.fileName && src.includes(img.fileName)) {
          // 额外检查：确保路径也匹配，避免同名文件的误匹配
          return src.includes('notice-images') || src.includes(img.fileName)
        }
        return false
      })
      
      // 提取当前图片标签的尺寸和样式信息
      const altMatch = imgTag.match(/alt="([^"]*)"/)  
      const altText = altMatch ? altMatch[1] : ''
      const widthMatch = imgTag.match(/width="([^"]*)"/)  
      const heightMatch = imgTag.match(/height="([^"]*)"/)  
      const styleMatch = imgTag.match(/style="([^"]*)"/)  
      
      let width = null
      let height = null
      
      // 从width/height属性中提取尺寸
      if (widthMatch) width = widthMatch[1]
      if (heightMatch) height = heightMatch[1]
      
      // 如果没有width/height属性，尝试从style中提取
      if (!width || !height) {
        if (styleMatch) {
          const style = styleMatch[1]
          const widthStyleMatch = style.match(/width:\s*([^;]+)/)
          const heightStyleMatch = style.match(/height:\s*([^;]+)/)
          
          if (widthStyleMatch && !width) width = widthStyleMatch[1].trim()
          if (heightStyleMatch && !height) height = heightStyleMatch[1].trim()
        }
      }
      
      if (existingImage) {
        // 更新已存在图片的尺寸信息（使用当前编辑器中的尺寸）
        const updatedImageInfo = {
          ...existingImage,
          alt: altText || existingImage.alt,
          width: width || existingImage.width, // 优先使用当前尺寸
          height: height || existingImage.height, // 优先使用当前尺寸
          originalStyle: styleMatch ? styleMatch[1] : existingImage.originalStyle, // 优先使用当前样式
          position: imagePath.length
        }
        imagePath.push(updatedImageInfo)
        console.log('📷 [图片处理] 更新已存在图片尺寸信息:', updatedImageInfo)
      } else {
        // 如果找不到对应的图片信息，创建基本信息
        const imageInfo = {
          id: `existing_${Date.now()}_${Math.random()}`,
          originalName: src.split('/').pop() || 'unknown.png',
          fileName: src.split('/').pop() || '',
          filePath: src,
          fullUrl: src,
          url: src,
          alt: altText,
          size: 0,
          mimeType: 'image/png',
          uploadTime: new Date().toISOString(),
          position: imagePath.length,
          width: width, // 保存当前尺寸
          height: height, // 保存当前尺寸
          originalStyle: styleMatch ? styleMatch[1] : null // 保存当前样式
        }
        
        imagePath.push(imageInfo)
        console.log('📷 [图片处理] 创建已存在图片信息:', imageInfo)
      }
    }
  }
  
  // 如果没有base64图片，直接返回
  if (base64Images.length === 0) {
    console.log('🎯 [图片处理] 没有新增base64图片，返回已存在图片信息')
    return { content: processedContent, imagePath }
  }
  
  // 逐个上传base64图片
  for (let i = 0; i < base64Images.length; i++) {
    const imgTag = base64Images[i]
    try {
      // 提取base64数据
      const srcMatch = imgTag.match(/src="(data:image\/[^;]+;base64,[^"]+)"/)
      if (!srcMatch) continue
      
      const base64Data = srcMatch[1]
      
      // 提取alt属性
      const altMatch = imgTag.match(/alt="([^"]*)"/)
      const altText = altMatch ? altMatch[1] : ''
      
      // 提取图片的width和height属性
      const widthMatch = imgTag.match(/width="([^"]*)"/)
      const heightMatch = imgTag.match(/height="([^"]*)"/)
      const styleMatch = imgTag.match(/style="([^"]*)"/)
      
      let width = null
      let height = null
      
      // 从width/height属性中提取尺寸
      if (widthMatch) width = widthMatch[1]
      if (heightMatch) height = heightMatch[1]
      
      // 如果没有width/height属性，尝试从style中提取
      if (!width || !height) {
        if (styleMatch) {
          const style = styleMatch[1]
          const widthStyleMatch = style.match(/width:\s*([^;]+)/)
          const heightStyleMatch = style.match(/height:\s*([^;]+)/)
          
          if (widthStyleMatch && !width) width = widthStyleMatch[1].trim()
          if (heightStyleMatch && !height) height = heightStyleMatch[1].trim()
        }
      }
      
      // 将base64转换为Blob
      const response = await fetch(base64Data)
      const blob = await response.blob()
      
      // 创建FormData上传图片
      const formData = new FormData()
      formData.append('file', blob, `image_${Date.now()}_${i}.png`)
      
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
        
        // 收集图片信息到imagePath数组
        const imageInfo = {
          id: `image_${Date.now()}_${i}`,
          originalName: result.fileInfo?.originalName || `image_${i}.png`,
          fileName: result.fileInfo?.filename || '',
          filePath: result.fileInfo?.relativePath || '',
          fullUrl: imageUrl,
          url: imageUrl, // 兼容字段
          alt: altText,
          size: result.fileInfo?.fileSize || blob.size,
          mimeType: result.fileInfo?.mimeType || blob.type,
          uploadTime: new Date().toISOString(),
          position: i, // 图片在内容中的位置
          width: width, // 图片宽度
          height: height, // 图片高度
          originalStyle: styleMatch ? styleMatch[1] : null // 原始样式
        }
        
        imagePath.push(imageInfo)
        console.log('📷 [图片处理] 收集图片信息:', imageInfo)
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      // 继续处理其他图片，不中断整个流程
    }
  }
  
  console.log('🎯 [图片处理] 最终收集到的图片信息数组:', imagePath)
  console.log('📊 [图片处理] 统计: 已存在图片', imagePath.filter(img => !img.id.startsWith('image_')).length, '张，新增图片', imagePath.filter(img => img.id.startsWith('image_')).length, '张')
  return { content: processedContent, imagePath }
}

/**
 * 根据编辑器内容实时更新原始图片信息
 * @param {string} content - 编辑器当前内容
 */
const updateOriginalImagePathFromContent = (content) => {
  if (!content || !originalImagePath.value || originalImagePath.value.length === 0) {
    return
  }
  
  // 提取当前内容中的所有图片URL
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g
  const currentImageUrls = []
  let match
  
  while ((match = imgRegex.exec(content)) !== null) {
    currentImageUrls.push(match[1])
  }
  
  // 过滤出仍然存在于内容中的图片信息
  const remainingImages = originalImagePath.value.filter(imageInfo => {
    return currentImageUrls.some(url => {
      // 精确匹配完整URL
      if (url === imageInfo.fullUrl || url === imageInfo.url) {
        return true
      }
      // 匹配文件名，但要确保不是base64图片
      if (!url.startsWith('data:image/') && imageInfo.fileName && url.includes(imageInfo.fileName)) {
        // 额外检查：确保路径也匹配，避免误匹配
        return url.includes('notice-images')
      }
      return false
    })
  })
  
  // 如果图片数量发生变化，更新原始图片信息
  if (remainingImages.length !== originalImagePath.value.length) {
    originalImagePath.value = remainingImages
    console.log('📷 [实时更新] 原始图片信息已更新，剩余图片数量:', remainingImages.length)
  }
}

/**
 * 检查并处理被删除的图片
 * @param {Editor} editor - TinyMCE 编辑器实例
 */
const checkForDeletedImages = async (editor) => {
  if (!originalImagePath.value || originalImagePath.value.length === 0) {
    return
  }
  
  const content = editor.getContent()
  
  // 提取当前内容中的所有图片URL
  const currentImages = []
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g
  let match
  
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1]
    // 只处理服务器图片，忽略base64图片
    if (!src.startsWith('data:image/')) {
      currentImages.push(src)
    }
  }
  
  // 找出被删除的图片
  const deletedImages = originalImagePath.value.filter(img => {
    // 检查图片是否还存在于当前内容中
    const stillExists = currentImages.some(currentSrc => {
      return currentSrc.includes(img.fileName) || 
             currentSrc === img.fullUrl || 
             currentSrc === img.url
    })
    return !stillExists
  })
  
  // 如果有图片被删除，调用后端API删除
  if (deletedImages.length > 0) {
    console.log('🗑️ [图片删除] 检测到被删除的图片:', deletedImages)
    
    for (const deletedImage of deletedImages) {
      try {
        await deleteImageFromServer(deletedImage)
      } catch (error) {
        console.error('删除图片失败:', error)
        // 继续删除其他图片，不中断流程
      }
    }
  }
}

/**
 * 调用后端API删除图片
 * @param {Object} imageInfo - 图片信息对象
 */
const deleteImageFromServer = async (imageInfo) => {
  try {
    const noticeId = noticeForm.ID
    const fileName = imageInfo.fileName
    
    if (!noticeId || !fileName) {
      console.warn('删除图片失败：缺少必要参数', { noticeId, fileName })
      return
    }
    
    const response = await fetch(`/api/notice/${noticeId}/image/${fileName}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ [图片删除] 成功删除图片:', fileName)
      // 从原始图片信息中移除已删除的图片
      originalImagePath.value = originalImagePath.value.filter(img => img.fileName !== fileName)
    } else {
      console.error('❌ [图片删除] 删除图片失败:', result.message)
    }
  } catch (error) {
    console.error('❌ [图片删除] 删除图片时发生错误:', error)
  }
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
    // 在编辑模式下，传递原有的图片信息
    const existingImages = isEditing.value ? originalImagePath.value : []

    const { content: processedContent, imagePath } = await processContentImages(noticeForm.Content, existingImages)
    const submitData = {
      ...noticeForm,
      Content: processedContent,
      imagePath: imagePath // 添加图片信息数组
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
      // 刷新通知铃铛数据
      await userStore.refreshNotifications()
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
    const { content: processedContent, imagePath } = await processContentImages(noticeForm.Content)
    
    // 转换字段名为后端期望的格式（小写）
    const submitData = {
      title: noticeForm.Title,
      content: processedContent,
      type: noticeForm.Type,
      priority: noticeForm.Priority,
      expiryDate: noticeForm.ExpiryDate,
      isSticky: noticeForm.IsSticky,
      requireConfirmation: noticeForm.RequireConfirmation,
      imagePath: imagePath // 添加图片信息数组
    }
    

    
    const response = await api.post('/notice', submitData)
    if (response.data.success) {
      ElMessage.success('通知发布成功')
      showCreateDialog.value = false
      resetNoticeForm()
      await getNoticeList()
      await getUnreadCount()
      // 刷新通知铃铛数据
      await userStore.refreshNotifications()
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
  originalImagePath.value = [] // 清空原始图片信息
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

/* 对话框样式优化 - 防止滚动时移动和高度问题 */
.notice-detail-dialog :deep(.el-dialog),
.notice-edit-dialog :deep(.el-dialog),
.notice-create-dialog :deep(.el-dialog) {
  position: fixed !important;
  top: 5vh !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  margin: 0 !important;
  max-height: 90vh !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.notice-detail-dialog :deep(.el-dialog__body),
.notice-edit-dialog :deep(.el-dialog__body),
.notice-create-dialog :deep(.el-dialog__body) {
  flex: 1 !important;
  overflow-y: auto !important;
  max-height: calc(90vh - 120px) !important;
  padding: 20px 24px !important;
}

.notice-detail-dialog :deep(.el-dialog__header),
.notice-edit-dialog :deep(.el-dialog__header),
.notice-create-dialog :deep(.el-dialog__header) {
  flex-shrink: 0 !important;
  padding: 20px 24px 16px 24px !important;
}

.notice-detail-dialog :deep(.el-dialog__footer),
.notice-edit-dialog :deep(.el-dialog__footer),
.notice-create-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  padding: 16px 24px 20px 24px !important;
}

/* 防止body滚动 */
body.el-popup-parent--hidden {
  overflow: hidden !important;
  padding-right: 0 !important;
}

/* 遮罩层固定定位 */
:deep(.el-overlay) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden !important;
}

</style>