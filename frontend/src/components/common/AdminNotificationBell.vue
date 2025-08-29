<template>
  <el-dropdown ref="notificationDropdown" trigger="click" placement="bottom-end">
    <div class="notification-bell">
      <el-icon class="bell-icon"><BellFilled /></el-icon>
      <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </div>
    <template #dropdown>
      <div class="notify-dropdown-card">
        <!-- 固定标题栏 -->
        <div class="notify-header">
          <div class="notify-title">未读消息</div>
        </div>
        
        <!-- 可滚动消息区域 -->
        <div class="notify-content">
          <el-timeline v-if="notifyList.length > 0">
            <el-timeline-item v-for="(msg, idx) in notifyList" :key="msg.id" :timestamp="msg.time" :color="msg.color">
              <div class="notify-item" @click="handleNoticeClick(msg)" style="cursor: pointer;">
                <span class="notify-msg-title">{{ msg.title }}</span>
                <div class="notify-msg-content">{{ msg.content }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="no-notifications">
            <el-empty description="暂无未读通知" :image-size="80" />
          </div>
        </div>
        
        <!-- 固定底部栏 -->
        <div class="notify-footer">
          <el-divider style="margin: 8px 0;" />
          <el-button :link="true" style="width:100%;color:#409EFF;" @click="goToNotices">查看更多</el-button>
        </div>
      </div>
    </template>
  </el-dropdown>
  
  <!-- 消息详情对话框 -->
  <el-dialog 
    v-model="showNoticeDetail" 
    title="通知详情" 
    width="600px" 
    top="10vh" 
    destroy-on-close
    @close="handleNoticeDetailClose"
  >
    <div v-if="currentNotice" class="notice-detail">
      <div class="notice-header">
        <h3 class="notice-title">{{ currentNotice.title }}</h3>
        <div class="notice-meta">
          <el-tag 
            :type="currentNotice.priority === 'high' ? 'danger' : currentNotice.priority === 'medium' ? 'warning' : 'info'"
            size="small"
          >
            {{ currentNotice.priority === 'high' ? '高优先级' : currentNotice.priority === 'medium' ? '中优先级' : '普通' }}
          </el-tag>
          <span class="notice-time">发布时间：{{ formatTimeAgo(currentNotice.publishDate) }}</span>
        </div>
      </div>
      <el-divider />
      <div class="notice-content" v-html="currentNotice.fullContent"></div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleNoticeDetailClose" type="primary">我知道了</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BellFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { ElMessage } from 'element-plus'
import api from '../../api'

const router = useRouter()
const userStore = useUserStore()
const notificationDropdown = ref(null)

// 使用全局store中的未读通知数量
const unreadCount = computed(() => userStore.unreadNoticeCount)

const notifyList = ref([])

// 消息详情对话框相关状态
const showNoticeDetail = ref(false)
const currentNotice = ref(null)

/**
 * 获取未读通知数量
 * 功能：从后端API获取当前用户的未读通知数量
 */
const getUnreadCount = async () => {
  await userStore.fetchUnreadNoticeCount()
}

/**
 * 格式化时间为中文显示
 * 功能：将时间转换为中文的相对时间显示（如：3分钟前、2小时前、1天前等）
 */
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now - date
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else if (months < 12) {
    return `${months}个月前`
  } else {
    return `${years}年前`
  }
}

/**
 * 获取未读通知列表
 * 功能：从后端API获取当前用户的未读通知列表
 */
const getUnreadNotices = async () => {
  try {
    const response = await api.get('/api/notice', {
      params: {
        readStatus: 'unread',
        size: 10,
        page: 1
      }
    })
    if (response.data.success) {
      notifyList.value = response.data.data.map(notice => ({
        id: notice.ID,
        title: notice.Title,
        content: notice.Content?.substring(0, 50) + (notice.Content?.length > 50 ? '...' : ''),
        fullContent: notice.Content, // 保存完整内容用于详情显示
        time: formatTimeAgo(notice.PublishDate),
        publishDate: notice.PublishDate, // 保存原始发布时间
        type: notice.Type,
        priority: notice.Priority,
        color: getNoticeTypeColor(notice.Type, notice.Priority)
      }))
    }
  } catch (error) {
    console.error('获取未读通知列表失败:', error)
  }
}

/**
 * 根据通知类型和优先级获取颜色
 * 功能：为不同类型和优先级的通知分配不同的颜色
 */
const getNoticeTypeColor = (type, priority) => {
  // 优先级颜色映射
  if (priority === 'high') return '#F56C6C'
  if (priority === 'medium') return '#E6A23C'
  
  // 类型颜色映射
  const typeColorMap = {
    'system': '#409EFF',
    'announcement': '#67C23A',
    'urgent': '#F56C6C',
    'maintenance': '#E6A23C',
    'update': '#67C23A'
  }
  return typeColorMap[type] || '#409EFF'
}

/**
 * 标记通知为已读
 * 功能：将指定通知标记为已读状态
 */
const markNoticeAsRead = async (noticeId) => {
  try {
    const response = await api.post(`/api/notice/${noticeId}/read`)
    if (response.data.success) {
      // 减少全局未读数量
      userStore.decreaseUnreadNoticeCount(1)
      // 重新获取未读通知列表
      await getUnreadNotices()
    }
  } catch (error) {
    console.error('标记通知已读失败:', error)
    ElMessage.error('标记通知已读失败')
  }
}

/**
 * 处理通知点击事件
 * 功能：点击通知时显示详情对话框
 */
const handleNoticeClick = (notice) => {
  currentNotice.value = notice
  showNoticeDetail.value = true
  // 关闭通知下拉菜单
  if (notificationDropdown.value) {
    notificationDropdown.value.handleClose()
  }
}

/**
 * 处理消息详情对话框关闭事件
 * 功能：用户关闭详情对话框后，将该消息标记为已读
 */
const handleNoticeDetailClose = async () => {
  if (currentNotice.value) {
    await markNoticeAsRead(currentNotice.value.id)
    currentNotice.value = null
  }
  showNoticeDetail.value = false
}

/**
 * 跳转到通知管理页面
 * 功能：点击查看更多按钮时跳转到系统通知管理页面，并手动关闭下拉菜单
 */
const goToNotices = () => {
  // 手动关闭下拉菜单
  if (notificationDropdown.value) {
    notificationDropdown.value.handleClose()
  }
  // 跳转到通知管理页面
  router.push('/admin/system/notices')
}

// 组件挂载时初始化数据
onMounted(async () => {
  try {
    // 获取未读通知数量和列表
    await getUnreadCount()
    await getUnreadNotices()
  } catch (error) {
    console.error('初始化通知数据失败:', error)
  }
})
</script>

<style scoped>
/* 通知铃铛样式 */
.notification-bell {
  position: relative;
  display: inline-block;
  margin-right: 15px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.notification-bell:hover {
  background-color: #f5f7fa;
}

.bell-icon {
  font-size: 20px;
  color: #409EFF;
  transition: color 0.3s ease;
}

.notification-bell:hover .bell-icon {
  color: #67C23A;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #F56C6C;
  color: white;
  font-size: 10px;
  font-weight: 500;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  padding: 0 4px;
  box-sizing: border-box;
  transform: scale(0.9);
  animation: badge-pulse 2s infinite;
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 通知下拉卡片样式 */
.notify-dropdown-card {
  min-width: 320px;
  max-width: 400px;
  height: 450px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

/* 固定标题栏 */
.notify-header {
  flex-shrink: 0;
  padding: 16px 16px 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}

.notify-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

/* 可滚动消息区域 */
.notify-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
}

/* 固定底部栏 */
.notify-footer {
  flex-shrink: 0;
  padding: 0 16px 16px 16px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.notify-item {
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.notify-item:hover {
  background-color: #f5f7fa;
}

.notify-msg-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.notify-msg-content {
  font-size: 0.875rem;
  color: #606266;
  line-height: 1.4;
}

.no-notifications {
  padding: 20px;
  text-align: center;
}

/* 消息详情对话框样式 */
.notice-detail {
  padding: 0;
  background: #ffffff;
  border-radius: 8px;
}

.notice-header {
  margin-bottom: 20px;
  padding: 20px 24px 0 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8eaed;
}

.notice-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.notice-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
}

.notice-time {
  font-size: 13px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.notice-content {
  font-size: 15px;
  line-height: 1.7;
  color: #374151;
  max-height: 450px;
  overflow-y: auto;
  padding: 0 24px 24px 24px;
  background: #ffffff;
}

.notice-content::-webkit-scrollbar {
  width: 6px;
}

.notice-content::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 3px;
}

.notice-content::-webkit-scrollbar-thumb {
  background: #c1c8cd;
  border-radius: 3px;
  transition: background 0.2s ease;
}

.notice-content::-webkit-scrollbar-thumb:hover {
  background: #9aa0a6;
}

.notice-content :deep(p) {
  margin: 0 0 16px 0;
  text-align: justify;
}

.notice-content :deep(p:last-child) {
  margin-bottom: 0;
}

.notice-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 12px 0;
}

.notice-content :deep(h1),
.notice-content :deep(h2),
.notice-content :deep(h3),
.notice-content :deep(h4),
.notice-content :deep(h5),
.notice-content :deep(h6) {
  color: #1f2937;
  font-weight: 600;
  margin: 20px 0 12px 0;
}

.notice-content :deep(ul),
.notice-content :deep(ol) {
  padding-left: 20px;
  margin: 12px 0;
}

.notice-content :deep(li) {
  margin: 6px 0;
}

.notice-content :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 16px;
  margin: 16px 0;
  color: #6b7280;
  font-style: italic;
}

.notice-content :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.notice-content :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #e9ecef;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px 24px 24px;
  background: #fafbfc;
  border-radius: 0 0 8px 8px;
}

.dialog-footer .el-button {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.dialog-footer .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.3);
}

/* 对话框动画效果 */
:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  border-bottom: none;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

:deep(.el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-dialog__footer) {
  padding: 0;
}

/* 隐藏下拉箭头 */
:deep(.el-popper__arrow) {
  display: none !important;
}
</style>