<template>
  <div class="dashboard-container">
    <!-- 顶部欢迎区域 -->
    <el-card class="welcome-header">
      <div class="welcome-content">
        <div class="welcome-text">
          <h2>欢迎回来，{{ userStore.user?.username || '用户' }}！</h2>
          <p class="welcome-subtitle">
            <el-icon class="calendar-icon"><Calendar /></el-icon>
            现在是 {{ currentDateTime }}
            <el-tag size="small" type="primary" class="weekday-tag">
              {{ getCurrentWeekday() }}
            </el-tag>
          </p>
        </div>
        <div class="welcome-stats">
          <div class="stat-item">
            <div class="stat-number">{{ todayStats.loginCount }}</div>
            <div class="stat-label">今日登录</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ todayStats.taskCount }}</div>
            <div class="stat-label">待处理任务</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ todayStats.alertCount }}</div>
            <div class="stat-label">质量预警</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <div class="dashboard-main">
      <!-- 左侧区域 -->
      <div class="dashboard-left">
        <!-- 数据概览卡片 -->
        <div class="overview-section">
          <h2 class="section-title">
            <el-icon><DataBoard /></el-icon>
            数据概览
          </h2>
          <div class="overview-grid">
            <div class="overview-card" v-for="item in overviewData" :key="item.key">
              <div class="card-icon" :style="{ backgroundColor: item.color }">
                <el-icon><component :is="item.icon" /></el-icon>
              </div>
              <div class="card-content">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-value">{{ item.value }}</div>
                <div class="card-trend" :class="item.trend">
                  <el-icon><component :is="item.trendIcon" /></el-icon>
                  {{ item.trendText }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷操作区域 -->
        <div class="quick-actions-section">
          <h2 class="section-title">
            <el-icon><Operation /></el-icon>
            快捷操作
          </h2>
          <div class="quick-actions-grid">
            <div 
              class="action-card" 
              v-for="action in quickActions" 
              :key="action.key"
              @click="handleQuickAction(action)"
            >
              <div class="action-icon">
                <el-icon><component :is="action.icon" /></el-icon>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
            </div>
          </div>
        </div>

        <!-- 系统介绍卡片 -->
        <div class="system-intro-section">
          <h2 class="section-title">
            <el-icon><InfoFilled /></el-icon>
            系统介绍
          </h2>
          <el-card class="system-intro-card">
            <!-- 切换按钮组 -->
            <div class="intro-tabs">
              <el-button
                :type="introActiveTab === 'tech' ? 'primary' : 'default'"
                @click="introActiveTab = 'tech'"
                size="default"
                plain
              >
                <el-icon><Monitor /></el-icon>
                技术栈
              </el-button>
              <el-button
                :type="introActiveTab === 'features' ? 'success' : 'default'"
                @click="introActiveTab = 'features'"
                size="default"
                plain
              >
                <el-icon><List /></el-icon>
                主要功能
              </el-button>
              <el-button
                :type="introActiveTab === 'developer' ? 'warning' : 'default'"
                @click="introActiveTab = 'developer'"
                size="default"
                plain
              >
                <el-icon><User /></el-icon>
                开发者信息
              </el-button>
            </div>
            
            <!-- 内容区域 -->
            <div class="intro-content">
              <!-- 技术栈内容 -->
              <div v-show="introActiveTab === 'tech'" class="intro-item">
                <div class="tech-stack">
                  <!-- 前端技术栈 -->
                  <div class="tech-category">
                    <span class="tech-category-title">前端</span>
                    <div class="tech-tags">
                      <el-tag type="primary">Vue 3.0.0</el-tag>
                      <el-tag type="success">Element Plus 2.0.0</el-tag>
                      <el-tag type="info">Vite 4.5.1</el-tag>
                      <el-tag type="warning">Pinia 3.0.3</el-tag>
                      <el-tag>Vue Router 4.0.0</el-tag>
                      <el-tag>ECharts 5.4.3</el-tag>
                    </div>
                  </div>
                  
                  <!-- 后端技术栈 -->
                  <div class="tech-category">
                    <span class="tech-category-title">后端</span>
                    <div class="tech-tags">
                      <el-tag type="primary">Node.js 16.0.0+</el-tag>
                      <el-tag type="success">Express 4.18.2</el-tag>
                      <el-tag type="danger">SQL Server</el-tag>
                      <el-tag type="warning">JWT</el-tag>
                      <el-tag>Multer 1.4.5</el-tag>
                      <el-tag>Node-Cron 4.2.1</el-tag>
                    </div>
                  </div>
                  
                  <!-- 工具库 -->
                  <div class="tech-category">
                    <span class="tech-category-title">工具库</span>
                    <div class="tech-tags">
                      <el-tag type="info">Axios 1.11.0</el-tag>
                      <el-tag>ExcelJS 4.4.0</el-tag>
                      <el-tag>Moment 2.30.1</el-tag>
                      <el-tag>UUID 11.1.0</el-tag>
                      <el-tag>BCryptJS 2.4.3</el-tag>
                      <el-tag>Sharp 0.34.3</el-tag>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 主要功能内容 -->
              <div v-show="introActiveTab === 'features'" class="intro-item">
                <div class="feature-tags">
                  <el-tag class="feature-tag" type="success">质量管理与投诉处理</el-tag>
                  <el-tag class="feature-tag" type="warning">工作计划管理</el-tag>
                  <el-tag class="feature-tag" type="danger">供应商管理</el-tag>
                  <el-tag class="feature-tag" type="info">质量成本分析</el-tag>
                  <el-tag class="feature-tag" type="success">系统权限管理</el-tag>
                  <el-tag class="feature-tag" type="warning">数据统计与报表</el-tag>
                  <el-tag class="feature-tag" type="danger">文件管理与共享</el-tag>
                  <el-tag class="feature-tag" type="info">系统日志管理</el-tag>
                </div>
              </div>
              
              <!-- 开发者信息内容 -->
              <div v-show="introActiveTab === 'developer'" class="intro-item">
                <div class="developer-info">
                  <div class="system-version">
                    <h4>DMS-QA 质量管理系统 v2.2.0</h4>
                    <p>专为质量管理和数据分析设计的企业级解决方案</p>
                    <p><small>基于现代化技术栈构建的高性能Web应用</small></p>
                  </div>
                  <div class="developer-details">
                    <p><strong>开发者：</strong>David Lee (zglibk)</p>
                    <p><strong>邮箱：</strong>1039297691@qq.com</p>
                    <p><strong>许可证：</strong>Apache-2.0</p>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 登录日志/在线用户卡片 -->
        <div class="user-activity-section">
          <h2 class="section-title">
            <el-icon><Monitor /></el-icon>
            用户活动
          </h2>
          <el-card class="user-activity-card">
            <el-tabs v-model="activeTab" class="activity-tabs">
              <el-tab-pane label="登录日志" name="login-logs">
                <div class="login-logs">
                  <div class="log-item" v-for="log in loginLogs" :key="log.id">
                    <div class="log-avatar">
                      <el-avatar 
                        :size="32" 
                        :style="{ backgroundColor: getAvatarColor(log.username) }"
                      >
                        {{ log.username.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="log-content">
                      <div class="log-user">{{ log.username }}</div>
                      <div class="log-time">{{ log.loginTime }}</div>
                      <div class="log-ip" v-if="log.ipAddress">IP: {{ log.ipAddress }}</div>
                    </div>
                    <div class="log-status">
                      <el-tag :type="log.status === '成功' ? 'success' : 'danger'" size="small">
                        {{ log.status === '成功' ? '成功' : '失败' }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
              <el-tab-pane label="在线用户" name="online-users">
                <div class="online-users">
                  <div class="user-item" v-for="user in onlineUsers" :key="user.id">
                    <div class="user-avatar">
                      <el-avatar 
                        :size="32" 
                        :style="{ backgroundColor: getAvatarColor(user.username) }"
                      >
                        {{ user.username.charAt(0).toUpperCase() }}
                      </el-avatar>
                    </div>
                    <div class="user-content">
                      <div class="user-name">{{ user.username }}</div>
                      <div class="user-role">{{ user.role }}</div>
                      <div class="user-last-login" v-if="user.lastLoginTime">最后登录: {{ user.lastLoginTime }}</div>
                    </div>
                    <div class="user-status">
                      <el-tag type="success" size="small">
                        <el-icon><Success /></el-icon>
                        活跃
                      </el-tag>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </div>
      </div>

      <!-- 右侧区域 -->
      <div class="dashboard-right">
        <!-- 功能模块导航 -->
        <div class="modules-section">
          <h2 class="section-title">
            <el-icon><Grid /></el-icon>
            功能模块
          </h2>
          <div class="modules-grid">
            <div 
              class="module-card" 
              v-for="module in systemModules" 
              :key="module.key"
              @click="navigateToModule(module)"
            >
              <div class="module-icon" :style="{ backgroundColor: module.color }">
                <el-icon><component :is="module.icon" /></el-icon>
              </div>
              <div class="module-content">
                <div class="module-title">{{ module.title }}</div>
                <div class="module-desc">{{ module.description }}</div>
                <div class="module-count">{{ module.count }} 个功能</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统通知 -->
        <div class="notifications-section">
          <h2 class="section-title">
            <el-icon><Bell /></el-icon>
            系统通知
          </h2>
          <div class="notifications-list">
            <div 
              class="notification-item" 
              v-for="notification in notifications" 
              :key="notification.id"
              @click="viewNotification(notification)"
            >
              <div class="notification-icon" :class="notification.type">
                <el-icon><component :is="notification.icon" /></el-icon>
              </div>
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-time">{{ notification.time }}</div>
              </div>
            </div>
            <div v-if="notifications.length === 0" class="no-notifications">
              <el-empty description="暂无系统通知" :image-size="80" />
            </div>
          </div>
        </div>

        <!-- 系统信息 -->
        <div class="system-info-section">
          <h2 class="section-title">
            <el-icon><Monitor /></el-icon>
            系统信息
          </h2>
          <div class="system-info-simple">
            <!-- 系统版本 -->
            <div class="info-item-simple">
              <el-icon class="info-icon-simple"><Box /></el-icon>
              <div class="info-content">
                <span class="info-label">系统版本</span>
                <span class="info-text">DMS-QA {{ systemInfo.version }}</span>
              </div>
            </div>
            
            <!-- 服务器状态 -->
            <div class="info-item-simple">
              <el-icon class="info-icon-simple" :class="systemInfo.serverStatus === '正常运行' ? 'status-online' : 'status-offline'"><Monitor /></el-icon>
              <div class="info-content">
                <span class="info-label">服务器状态</span>
                <span class="info-text" :class="systemInfo.serverStatus === '正常运行' ? 'status-online' : 'status-offline'">
                  {{ systemInfo.serverStatus }} ({{ systemInfo.serverIP || 'localhost' }})
                </span>
              </div>
            </div>
            
            <!-- 数据库状态 -->
            <div class="info-item-simple">
              <el-icon class="info-icon-simple" :class="systemInfo.dbConnected ? 'status-online' : 'status-offline'"><Collection /></el-icon>
              <div class="info-content">
                <span class="info-label">数据库状态</span>
                <span class="info-text" :class="systemInfo.dbConnected ? 'status-online' : 'status-offline'">
                  {{ systemInfo.dbStatus }} ({{ systemInfo.dbIP || '192.168.1.57' }})
                </span>
              </div>
            </div>
            
            <!-- 最后更新 -->
            <div class="info-item-simple">
              <el-icon class="info-icon-simple"><RefreshRight /></el-icon>
              <div class="info-content">
                <span class="info-label">最后更新</span>
                <span class="info-text">{{ systemInfo.lastUpdateTime || lastUpdateTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 新版后台主页组件
 * 
 * 功能说明：
 * 1. 现代化的仪表板布局设计
 * 2. 数据概览和统计信息展示
 * 3. 快捷操作和功能模块导航
 * 4. 系统通知和状态信息
 * 5. 响应式设计，适配不同屏幕尺寸
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'
import {
  DataBoard,
  Operation,
  Grid,
  Bell,
  InfoFilled,
  User,
  Document,
  Setting,
  ChatLineSquare,
  RefreshRight,
  PieChart,
  TrendCharts,
  ArrowUp,
  ArrowDown,
  Warning,
  SuccessFilled as Success,
  InfoFilled as Info,
  Monitor,
  Files,
  Message,
  ChatRound,
  Box,
  Link,
  Search,
  Van,
  Collection,
  Tools,
  Management,
  Shop,
  Briefcase,
  Plus,
  ArrowRight,
  Calendar,
  Check
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 当前日期
// 当前日期时间
const currentDateTime = ref('')

/**
 * 更新当前日期时间
 */
const updateCurrentDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  currentDateTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 获取当前星期几
 */
const getCurrentWeekday = () => {
  const today = new Date()
  const options = { 
    weekday: 'long'
  }
  return today.toLocaleDateString('zh-CN', options)
}

/**
 * 根据用户名生成头像背景颜色
 * @param {string} username - 用户名
 * @returns {string} 背景颜色
 */
const getAvatarColor = (username) => {
  const colors = [
    '#409EFF', // 蓝色
    '#67C23A', // 绿色
    '#E6A23C', // 橙色
    '#F56C6C', // 红色
    '#909399', // 灰色
    '#9C27B0', // 紫色
    '#FF9800', // 深橙色
    '#4CAF50', // 深绿色
    '#2196F3', // 深蓝色
    '#FF5722', // 深红色
    '#795548', // 棕色
    '#607D8B'  // 蓝灰色
  ]
  
  // 根据用户名的字符码生成颜色索引
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// 今日统计数据
const todayStats = ref({
  loginCount: 156,
  taskCount: 23,
  alertCount: 5
})

// 数据概览
const overviewData = ref([
  {
    key: 'quality',
    title: '质量指标',
    value: '98.5%',
    color: '#409EFF',
    icon: 'PieChart',
    trend: 'up',
    trendIcon: 'ArrowUp',
    trendText: '+2.3%'
  },
  {
    key: 'complaints',
    title: '客户投诉',
    value: '12',
    color: '#F56C6C',
    icon: 'ChatLineSquare',
    trend: 'down',
    trendIcon: 'ArrowDown',
    trendText: '-15.2%'
  },
  {
    key: 'rework',
    title: '返工率',
    value: '1.2%',
    color: '#E6A23C',
    icon: 'RefreshRight',
    trend: 'down',
    trendIcon: 'ArrowDown',
    trendText: '-0.5%'
  },
  {
    key: 'efficiency',
    title: '生产效率',
    value: '95.8%',
    color: '#67C23A',
    icon: 'TrendCharts',
    trend: 'up',
    trendIcon: 'ArrowUp',
    trendText: '+3.1%'
  }
])

// 快捷操作
const quickActions = ref([
  {
    key: 'new-complaint',
    title: '新建客诉',
    description: '快速创建客户投诉记录',
    icon: 'ChatLineSquare',
    path: '/admin/quality/complaint/customer'
  },
  {
    key: 'quality-check',
    title: '质量目标',
    description: '执行质量检查流程',
    icon: 'Document',
    path: '/admin/quality/targets'
  },
  {
    key: 'user-management',
    title: '用户管理',
    description: '管理系统用户权限',
    icon: 'User',
    path: '/admin/system/user'
  },
  {
    key: 'system-config',
    title: '系统配置',
    description: '调整系统参数设置',
    icon: 'Setting',
    path: '/admin/system/config'
  }
])

// 用户活动选项卡
const activeTab = ref('login-logs')

// 登录日志数据
const loginLogs = ref([
  {
    id: 1,
    username: 'admin',
    loginTime: '2024-01-15 09:30:25',
    status: '成功'
  },
  {
    id: 2,
    username: 'zhangsan',
    loginTime: '2024-01-15 09:15:12',
    status: '成功'
  },
  {
    id: 3,
    username: 'lisi',
    loginTime: '2024-01-15 08:45:33',
    status: '成功'
  },
  {
    id: 4,
    username: 'wangwu',
    loginTime: '2024-01-15 08:30:18',
    status: '失败'
  },
  {
    id: 5,
    username: 'zhaoliu',
    loginTime: '2024-01-15 08:20:45',
    status: '成功'
  }
])

// 在线用户数据
const onlineUsers = ref([
  {
    id: 1,
    username: 'admin',
    role: '系统管理员'
  },
  {
    id: 2,
    username: 'zhangsan',
    role: '质量工程师'
  },
  {
    id: 3,
    username: 'lisi',
    role: '普通用户'
  },
  {
    id: 4,
    username: 'zhaoliu',
    role: '质量主管'
  }
])

// 系统功能模块
const systemModules = ref([
  {
    key: 'quality',
    title: '质量管理',
    description: '投诉处理、返工管理、质量目标',
    icon: 'PieChart',
    color: '#409EFF',
    count: 6,
    path: '/admin/quality'
  },
  {
    key: 'system',
    title: '系统管理',
    description: '用户、角色、菜单、部门管理',
    icon: 'Setting',
    color: '#909399',
    count: 8,
    path: '/admin/system'
  },
  {
    key: 'work-plan',
    title: '工作计划',
    description: '计划管理、进度跟踪、统计分析',
    icon: 'Management',
    color: '#67C23A',
    count: 6,
    path: '/admin/work-plan'
  },
  {
    key: 'supplier',
    title: '供应商管理',
    description: '供应商信息维护和管理',
    icon: 'Shop',
    color: '#E6A23C',
    count: 2,
    path: '/admin/supplier'
  },
  {
    key: 'copq',
    title: '质量成本',
    description: '物料单价、成本统计分析',
    icon: 'Briefcase',
    color: '#F56C6C',
    count: 3,
    path: '/admin/copq'
  },
  {
    key: 'development',
    title: '二次开发',
    description: '系统扩展和定制开发',
    icon: 'Tools',
    color: '#9C27B0',
    count: 2,
    path: '/admin/development'
  }
])

// 系统通知
const notifications = ref([])

// 最后更新时间
const lastUpdateTime = ref('')

// 系统信息
const systemInfo = ref({
  version: 'v2.2.0',
  serverStatus: '正常运行',
  dbStatus: '连接正常',
  dbConnected: true,
  lastUpdateTime: ''
})

// 系统介绍切换标签
const introActiveTab = ref('tech')

/**
 * 处理快捷操作点击
 */
const handleQuickAction = (action) => {
  if (action.path) {
    router.push(action.path)
  } else {
    ElMessage.info(`功能开发中：${action.title}`)
  }
}

/**
 * 导航到功能模块
 */
const navigateToModule = (module) => {
  if (module.path) {
    router.push(module.path)
  } else {
    ElMessage.info(`模块开发中：${module.title}`)
  }
}

/**
 * 获取系统统计数据
 */
const fetchSystemStats = async () => {
  try {
    const response = await api.get('/dashboard/stats')
    
    if (response.data.success) {
      todayStats.value = {
        loginCount: response.data.data.todayLoginCount,
        taskCount: response.data.data.taskCount,
        alertCount: response.data.data.alertCount
      }
    }
    
    // 更新最后更新时间
    lastUpdateTime.value = new Date().toLocaleString('zh-CN')
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  }
}

/**
 * 获取登录日志数据
 */
const fetchLoginLogs = async () => {
  try {
    const response = await api.get('/dashboard/login-logs', {
      params: {
        page: 1,
        pageSize: 10
      }
    })
    
    if (response.data.success) {
      // 转换数据格式
      loginLogs.value = response.data.data.list.map(log => ({
        id: log.id,
        username: log.username || '未知用户',
        loginTime: new Date(log.loginTime).toLocaleString('zh-CN'),
        status: log.loginStatus,
        ipAddress: log.ipAddress || '未知IP'
      }))
    }
  } catch (error) {
    console.error('获取登录日志失败:', error)
    ElMessage.error('获取登录日志失败')
  }
}

/**
 * 获取在线用户数据
 */
const fetchOnlineUsers = async () => {
  try {
    const response = await api.get('/dashboard/online-users', {
      params: {
        page: 1,
        pageSize: 10
      }
    })
    
    if (response.data.success) {
      // 转换数据格式
      onlineUsers.value = response.data.data.list.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role || '用户',
        lastLoginTime: new Date(user.loginTime).toLocaleString('zh-CN')
      }))
    }
  } catch (error) {
    console.error('获取在线用户失败:', error)
    ElMessage.error('获取在线用户失败')
  }
}

/**
 * 获取系统通知数据
 */
const fetchNotifications = async () => {
  try {
    const response = await api.get('/notice', {
      params: {
        page: 1,
        size: 4, // 主页只显示4条最新通知
        readStatus: '' // 显示所有通知
      }
    })
    
    if (response.data.success) {
      // 转换数据格式
      notifications.value = response.data.data.map(notice => ({
        id: notice.ID,
        title: notice.Title,
        time: formatNoticeTime(notice.PublishDate),
        type: getNoticeTypeClass(notice.Type, notice.Priority),
        icon: getNoticeIcon(notice.Type, notice.Priority),
        originalData: notice // 保存原始数据用于后续操作
      }))
    }
  } catch (error) {
    console.error('获取系统通知失败:', error)
    ElMessage.error('获取系统通知失败')
  }
}

/**
 * 获取系统信息数据
 */
const fetchSystemInfo = async () => {
  try {
    const response = await api.get('/system-info')
    
    if (response.data && response.data.success) {
      systemInfo.value = {
        ...systemInfo.value,
        ...response.data.data
      }
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
    // 如果获取失败，使用默认值
    systemInfo.value.serverStatus = '连接异常'
    systemInfo.value.dbStatus = '连接异常'
    systemInfo.value.dbConnected = false
  }
}

/**
 * 格式化通知时间
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的时间
 */
const formatNoticeTime = (dateStr) => {
  if (!dateStr) return ''
  
  const now = new Date()
  const publishDate = new Date(dateStr)
  const diffMs = now - publishDate
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 30) {
    return `${diffDays}天前`
  } else {
    return publishDate.toLocaleDateString('zh-CN')
  }
}

/**
 * 根据通知类型和优先级获取样式类
 * @param {string} type - 通知类型
 * @param {string} priority - 优先级
 * @returns {string} 样式类名
 */
const getNoticeTypeClass = (type, priority) => {
  // 优先级优先
  if (priority === 'high' || priority === 'A') return 'danger'
  if (priority === 'urgent') return 'danger'
  
  // 类型映射
  const typeMap = {
    'system': 'info',
    'important': 'danger',
    'urgent': 'danger',
    'maintenance': 'warning',
    'announcement': 'success',
    'general': 'info',
    'security': 'danger',
    'update': 'success'
  }
  
  return typeMap[type] || 'info'
}

/**
 * 根据通知类型和优先级获取图标
 * @param {string} type - 通知类型
 * @param {string} priority - 优先级
 * @returns {string} 图标名称
 */
const getNoticeIcon = (type, priority) => {
  // 优先级优先
  if (priority === 'high' || priority === 'A' || priority === 'urgent') return 'Warning'
  
  // 类型映射
  const iconMap = {
    'system': 'Monitor',
    'important': 'Warning',
    'urgent': 'Warning',
    'maintenance': 'Tools',
    'announcement': 'Bell',
    'general': 'Info',
    'security': 'Warning',
    'update': 'Success'
  }
  
  return iconMap[type] || 'Info'
}

/**
 * 查看通知详情
 * @param {Object} notification - 通知对象
 */
const viewNotification = async (notification) => {
  try {
    // 如果是未读通知，先标记为已读
    if (notification.originalData && !notification.originalData.IsRead) {
      await api.post(`/notice/${notification.originalData.ID}/read`)
    }
    
    // 跳转到通知管理页面
    router.push('/admin/notice-management')
  } catch (error) {
    console.error('查看通知失败:', error)
    ElMessage.error('查看通知失败')
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchSystemStats()
  fetchLoginLogs()
  fetchOnlineUsers()
  fetchNotifications()
  fetchSystemInfo()
  // 初始化时间显示
  updateCurrentDateTime()
  // 每秒更新时间
  setInterval(updateCurrentDateTime, 1000)
})

// 导出响应式变量供模板使用
defineExpose({
  systemInfo
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
  font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
}

/* 顶部欢迎区域 */
.welcome-header {
  margin-bottom: 24px;
}

.welcome-subtitle {
  color: #666;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
  margin: 8px 0 0 0;
}

.calendar-icon {
  color: #909399;
  font-size: 14px;
}

.weekday-tag {
  margin-left: 8px;
  font-weight: 500;
  border-radius: 12px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.welcome-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.welcome-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

/* 主要内容区域 */
.dashboard-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* 左侧区域 */
.dashboard-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 右侧区域 */
.dashboard-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 通用卡片样式 */
.overview-section,
.quick-actions-section,
.modules-section,
.notifications-section,
.system-info-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 数据概览 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: transform 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.card-trend.up {
  color: #67c23a;
}

.card-trend.down {
  color: #f56c6c;
}

/* 快捷操作 */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.action-card {
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.action-icon {
  font-size: 32px;
  color: #409eff;
  margin-bottom: 12px;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.action-desc {
  font-size: 12px;
  color: #909399;
}

/* 功能模块 */
.modules-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.module-card:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.module-content {
  flex: 1;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.module-desc {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.module-count {
  font-size: 11px;
  color: #909399;
}

/* 系统通知 */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.notification-item:hover {
  background: #e9ecef;
  border-color: #409EFF;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.notification-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  flex-shrink: 0;
}

.notification-icon.warning {
  background-color: #e6a23c;
}

.notification-icon.success {
  background-color: #67c23a;
}

.notification-icon.info {
  background-color: #409eff;
}

.notification-icon.danger {
  background-color: #f56c6c;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-size: 13px;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  color: #909399;
}

.no-notifications {
  padding: 20px;
  text-align: center;
}

/* 系统信息 */
.system-info-section {
  margin-bottom: 24px;
}

.system-info-simple {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.info-item-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.info-item-simple:hover {
  transform: translateY(-1px);
}

.info-icon-simple {
  font-size: 16px;
  color: #409eff;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.info-icon-simple:hover {
  transform: scale(1.2);
}

.info-icon-simple.status-online {
  color: #67c23a;
}

.info-icon-simple.status-offline {
  color: #f56c6c;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-text {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
}

.info-text.status-online {
  color: #67c23a;
}

.info-text.status-offline {
  color: #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .system-info-simple {
    flex-direction: column;
    gap: 12px;
  }
  
  .info-text {
    white-space: normal;
    word-break: break-all;
  }
}

/* 系统介绍卡片 */
.system-intro-section {
  margin-bottom: 24px;
}

.system-intro-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.intro-tabs {
  margin-bottom: 20px;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.intro-tab-btn {
  min-width: 120px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.intro-tab-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.intro-tab-btn .el-icon {
  margin-right: 6px;
}

.intro-content {
  padding: 0;
  min-height: 200px;
}

.intro-item {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.intro-item h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.tech-stack {
  margin-top: 12px;
}

.tech-category {
  margin-bottom: 16px;
}

.tech-category:last-child {
  margin-bottom: 0;
}

.tech-category-title {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
  padding: 2px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tech-tags .el-tag {
  font-size: 12px;
  height: 24px;
  line-height: 22px;
  border-radius: 12px;
  padding: 0 10px;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.feature-tag {
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
  cursor: default;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.developer-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.system-version {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.system-version h4 {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.system-version p {
  margin: 4px 0;
  color: #606266;
}

.developer-details {
  display: grid;
  gap: 8px;
}

.developer-details p {
  margin: 0;
  padding: 6px 0;
  font-size: 14px;
}

.developer-details strong {
  color: #303133;
  font-weight: 600;
  min-width: 80px;
  display: inline-block;
}

/* 用户活动卡片 */
.user-activity-section {
  margin-bottom: 24px;
}

.user-activity-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.activity-tabs {
  margin-top: -8px;
}

.login-logs,
.online-users {
  max-height: 300px;
  overflow-y: auto;
}

.log-item,
.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child,
.user-item:last-child {
  border-bottom: none;
}

.log-avatar,
.user-avatar {
  flex-shrink: 0;
}

/* 头像样式优化 */
.log-avatar .el-avatar,
.user-avatar .el-avatar {
  font-weight: 600;
  font-size: 14px;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.log-avatar .el-avatar:hover,
.user-avatar .el-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.log-content,
.user-content {
  flex: 1;
  min-width: 0;
}

.log-user,
.user-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 2px;
}

.log-time,
.user-role {
  font-size: 12px;
  color: #909399;
}

.log-ip,
.user-last-login {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 2px;
}

.log-status,
.user-status {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-main {
    grid-template-columns: 1fr;
  }
  
  .welcome-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .welcome-stats {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }
  
  .overview-grid,
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .welcome-stats {
    gap: 20px;
  }
}
</style>