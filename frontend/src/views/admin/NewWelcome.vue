<template>
  <div class="dashboard-container">
    <!-- 顶部欢迎区域 -->
    <el-card class="welcome-header">
      <div class="welcome-content">
        <div class="welcome-text">
          <h4 class="welcome-title">
            <span class="greeting-text">欢迎回来 ~</span>
            <span class="username-highlight">{{ userStore.user?.realName || userStore.user?.RealName || userStore.user?.username || '用户' }}</span>
          </h4>
          <div class="welcome-subtitle">            
            <Icon icon="mdi:clock-outline" class="calendar-icon" :style="{ fontSize: '22px', color: '#409eff' }" />
            <span class="datetime-text">现在是 {{ currentDateTime }}</span>
            <el-tag size="small" type="success" style="margin-left: 8px;">
              {{ getCurrentWeekday() }}
            </el-tag>            
          </div>
        </div>
        <div class="welcome-stats">
          <div class="stat-item stat-login">
            <div class="stat-icon">
              <Icon icon="mdi:login" :style="{ fontSize: '24px', color: 'white' }" />
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ todayStats.loginCount }}</div>
              <div class="stat-label">今日登录</div>
            </div>
          </div>
          <div class="stat-item stat-task clickable" @click="navigateToTasks">
            <div class="stat-icon">
              <Icon icon="mdi:clipboard-list" :style="{ fontSize: '24px', color: 'white' }" />
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ todayStats.taskCount }}</div>
              <div class="stat-label">待处理任务</div>
            </div>
          </div>
          <div class="stat-item stat-alert clickable" @click="navigateToAlerts">
            <div class="stat-icon">
              <Icon icon="mdi:alert-circle" :style="{ fontSize: '24px', color: 'white' }" />
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ todayStats.alertCount }}</div>
              <div class="stat-label">质量预警</div>
            </div>
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
            年度数据概览
          </h2>
          <div class="overview-grid">
            <div class="overview-card" v-for="item in overviewData" :key="item.key">
              <div class="card-icon">
                <Icon :icon="item.icon" :style="{ color: item.color, fontSize: '40px' }" />
              </div>
              <div class="card-content">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-value">{{ item.value }}</div>
                <div class="card-trend" :class="item.trend">
                  相比去年同期
                  <Icon :icon="item.trendIcon" :style="{ fontSize: '14px', color: item.trendColor }" />
                  <span :style="{ color: item.trendColor }">{{ item.trendText }}</span>
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
              class="action-item" 
              v-for="action in quickActions" 
              :key="action.key"
              :class="{ 'action-disabled': !action.enabled }"
              @click="handleQuickAction(action)"
              @keydown.enter="handleQuickAction(action)"
              @keydown.space="handleQuickAction(action)"
              :tabindex="action.enabled ? 0 : -1"
            >
              <div 
                class="action-button" 
                :style="{ 
                  backgroundColor: action.color,
                  cursor: action.enabled ? 'pointer' : 'not-allowed'
                }"
              >
                <Icon 
                  :icon="action.icon" 
                  :style="{ 
                    color: action.iconColor
                  }"
                />
                <!-- 禁用状态遮罩层 -->
                <div v-if="!action.enabled" class="disabled-overlay">
                  <Icon icon="mdi:lock" class="disabled-icon" />
                </div>
              </div>
              <div class="action-name">
                {{ action.title }}
              </div>
            </div>
          </div>
        </div>

        <!-- 系统介绍卡片 -->
        <div class="system-intro-section">
          <el-card class="system-intro-card">
            <template #header>
              <div class="card-header">
                <el-icon><InfoFilled /></el-icon>
                <span>系统介绍</span>
              </div>
            </template>
            <!-- 切换按钮组 -->
            <div class="intro-tabs">
              <el-button
                :type="introActiveTab === 'tech' ? 'primary' : 'default'"
                @click="introActiveTab = 'tech'"
                size="default"
                :plain="introActiveTab !== 'tech'"
                class="intro-tab-btn"
              >
                <el-icon><Monitor /></el-icon>
                技术栈
              </el-button>
              <el-button
                :type="introActiveTab === 'features' ? 'success' : 'default'"
                @click="introActiveTab = 'features'"
                size="default"
                :plain="introActiveTab !== 'features'"
                class="intro-tab-btn"
              >
                <el-icon><List /></el-icon>
                主要功能
              </el-button>
              <el-button
                :type="introActiveTab === 'developer' ? 'warning' : 'default'"
                @click="introActiveTab = 'developer'"
                size="default"
                :plain="introActiveTab !== 'developer'"
                class="intro-tab-btn"
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
                    <div class="tech-category-header">
                      <Icon icon="mdi:monitor" class="tech-category-icon" :style="{ color: '#409eff' }" />
                      <span class="tech-category-title">前端技术</span>
                    </div>
                    <div class="tech-tags">
                      <el-tag type="primary" class="tech-tag">Vue 3.0.0</el-tag>
                      <el-tag type="success" class="tech-tag">Element Plus 2.0.0</el-tag>
                      <el-tag type="info" class="tech-tag">Vite 4.5.1</el-tag>
                      <el-tag type="warning" class="tech-tag">Pinia 3.0.3</el-tag>
                      <el-tag class="tech-tag">Vue Router 4.0.0</el-tag>
                      <el-tag class="tech-tag">ECharts 5.4.3</el-tag>
                    </div>
                  </div>
                  
                  <!-- 后端技术栈 -->
                  <div class="tech-category">
                    <div class="tech-category-header">
                      <Icon icon="mdi:server" class="tech-category-icon" :style="{ color: '#67c23a' }" />
                      <span class="tech-category-title">后端技术</span>
                    </div>
                    <div class="tech-tags">
                      <el-tag type="primary" class="tech-tag">Node.js 16.0.0+</el-tag>
                      <el-tag type="success" class="tech-tag">Express 4.18.2</el-tag>
                      <el-tag type="danger" class="tech-tag">SQL Server</el-tag>
                      <el-tag type="warning" class="tech-tag">JWT</el-tag>
                      <el-tag class="tech-tag">Multer 1.4.5</el-tag>
                      <el-tag class="tech-tag">Node-Cron 4.2.1</el-tag>
                    </div>
                  </div>
                  
                  <!-- 工具库 -->
                  <div class="tech-category">
                    <div class="tech-category-header">
                      <Icon icon="mdi:tools" class="tech-category-icon" :style="{ color: '#e6a23c' }" />
                      <span class="tech-category-title">工具库</span>
                    </div>
                    <div class="tech-tags">
                      <el-tag type="info" class="tech-tag">Axios 1.11.0</el-tag>
                      <el-tag class="tech-tag">ExcelJS 4.4.0</el-tag>
                      <el-tag class="tech-tag">Moment 2.30.1</el-tag>
                      <el-tag class="tech-tag">UUID 11.1.0</el-tag>
                      <el-tag class="tech-tag">BCryptJS 2.4.3</el-tag>
                      <el-tag class="tech-tag">Sharp 0.34.3</el-tag>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 主要功能内容 -->
              <div v-show="introActiveTab === 'features'" class="intro-item">
                <div class="features-grid">
                  <div class="feature-item">
                    <Icon icon="mdi:shield-check" class="feature-icon" :style="{ color: '#67c23a' }" />
                    <span class="feature-text">质量管理与投诉处理</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:calendar-check" class="feature-icon" :style="{ color: '#e6a23c' }" />
                    <span class="feature-text">工作计划管理</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:account-group" class="feature-icon" :style="{ color: '#f56c6c' }" />
                    <span class="feature-text">供应商管理</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:chart-line" class="feature-icon" :style="{ color: '#409eff' }" />
                    <span class="feature-text">质量成本分析</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:account-key" class="feature-icon" :style="{ color: '#67c23a' }" />
                    <span class="feature-text">系统权限管理</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:chart-bar" class="feature-icon" :style="{ color: '#e6a23c' }" />
                    <span class="feature-text">数据统计与报表</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:folder-multiple" class="feature-icon" :style="{ color: '#f56c6c' }" />
                    <span class="feature-text">文件管理与共享</span>
                  </div>
                  <div class="feature-item">
                    <Icon icon="mdi:file-document-outline" class="feature-icon" :style="{ color: '#409eff' }" />
                    <span class="feature-text">系统日志管理</span>
                  </div>
                </div>
              </div>
              
              <!-- 开发者信息内容 -->
              <div v-show="introActiveTab === 'developer'" class="intro-item">
                <div class="developer-info">
                  <div class="system-version">
                    <div class="version-header">
                      <Icon icon="mdi:application-cog" class="version-icon" :style="{ color: '#409eff', fontSize: '32px' }" />
                      <div class="version-text">
                        <h4>DMS-QA 质量管理系统</h4>
                        <el-tag type="success" size="large" class="version-tag">v2.2.0</el-tag>
                      </div>
                    </div>
                    <p class="system-description">专为质量管理和数据分析设计的企业级解决方案</p>
                    <p class="system-subtitle">基于现代化技术栈构建的高性能Web应用</p>
                  </div>
                  <div class="developer-details">
                    <div class="detail-item">
                      <Icon icon="mdi:account-circle" class="detail-icon" :style="{ color: '#409eff' }" />
                      <span class="detail-label">开发者：</span>
                      <span class="detail-value">David Lee (zglibk)</span>
                    </div>
                    <div class="detail-item">
                      <Icon icon="mdi:email" class="detail-icon" :style="{ color: '#67c23a' }" />
                      <span class="detail-label">邮箱：</span>
                      <span class="detail-value">1039297691@qq.com</span>
                    </div>
                    <div class="detail-item">
                      <Icon icon="mdi:license" class="detail-icon" :style="{ color: '#e6a23c' }" />
                      <span class="detail-label">许可证：</span>
                      <span class="detail-value">Apache-2.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 登录日志/在线用户卡片 -->
        <div class="user-activity-section">
          <el-card class="user-activity-card">
            <template #header>
              <div class="card-header">
                <el-icon><Monitor /></el-icon>
                <span>用户活动</span>
              </div>
            </template>
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
              :class="{ 'module-disabled': !module.enabled }"
              @click="navigateToModule(module)"
              :style="{ cursor: module.enabled ? 'pointer' : 'not-allowed' }"
            >
              <div class="module-icon">
                <Icon :icon="module.icon" :style="{ color: module.color, fontSize: '40px' }" />
                <!-- 禁用状态遮罩层 -->
                <div v-if="!module.enabled" class="module-disabled-overlay">
                  <Icon icon="mdi:lock" class="module-disabled-icon" />
                </div>
              </div>
              <div class="module-content">
                <div class="module-title">{{ module.title }}</div>
                <div class="module-desc">{{ module.description }}</div>
                <div class="module-count"><span class="module-count-number">{{ module.count }}</span> 个功能</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统通知 -->
        <div class="notifications-section">
          <h2 class="section-title section-title-with-more">
            <el-icon><Bell /></el-icon>
            系统通知
            <el-button 
              link 
              size="small" 
              class="more-button"
              @click="router.push('/admin/system/notices')"
            >
              更多>>
            </el-button>
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
            <Icon icon="mdi:monitor" style="font-size: 20px; color: #409eff;" />
            系统信息
          </h2>
          <div class="system-info-simple">
            <!-- 系统版本 -->
            <div class="info-item-simple">
              <Icon icon="mdi:package-variant" class="info-icon-simple" style="font-size: 20px; color: #409eff;" />
              <div class="info-content">
                <span class="info-label">系统版本</span>
                <span class="info-text">DMS-QA {{ systemInfo.version }}</span>
              </div>
            </div>
            
            <!-- 服务器状态 -->
            <div class="info-item-simple">
              <Icon icon="mdi:server" class="info-icon-simple" :style="{ fontSize: '20px', color: systemInfo.serverStatus === '正常运行' ? '#67c23a' : '#f56c6c' }" />
              <div class="info-content">
                <span class="info-label">服务器状态</span>
                <span class="info-text" :class="systemInfo.serverStatus === '正常运行' ? 'status-online' : 'status-offline'">
                  {{ systemInfo.serverStatus }} ({{ systemInfo.serverIP || 'localhost' }})
                </span>
              </div>
            </div>
            
            <!-- 数据库状态 -->
            <div class="info-item-simple">
              <Icon icon="mdi:database" class="info-icon-simple" :style="{ fontSize: '20px', color: systemInfo.dbConnected ? '#67c23a' : '#f56c6c' }" />
              <div class="info-content">
                <span class="info-label">数据库状态</span>
                <span class="info-text" :class="systemInfo.dbConnected ? 'status-online' : 'status-offline'">
                  {{ systemInfo.dbStatus }} ({{ systemInfo.dbIP || '192.168.1.57' }})
                </span>
              </div>
            </div>
            
            <!-- 最后更新 -->
            <div class="info-item-simple">
              <Icon icon="mdi:refresh" class="info-icon-simple" style="font-size: 20px; color: #409eff;" />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'
import { Icon } from '@iconify/vue'
import {
  DataBoard,
  Operation,
  Grid,
  Bell,
  InfoFilled,
  User,
  Document,
  Setting,
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
  Plus,
  ArrowRight,
  Calendar,
  Check,
  List
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
 * 获取模块子菜单数量
 * 从后台数据库Menus表中根据ID和ParentID获取各模块子菜单个数
 */
const fetchModuleCounts = async () => {
  try {
    const response = await api.get('/menus/module-counts')
    if (response.data.success) {
      moduleCounts.value = response.data.data
    } else {
      console.error('获取模块计数失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取模块计数失败:', error)
  }
}

// 模块子菜单数量
const moduleCounts = ref({})

/**
 * 计算模块的功能数量
 * @param {string} moduleKey - 模块键名
 * @returns {number} 功能数量
 */
const calculateModuleCount = (moduleKey) => {
  // 模块键名到数据库模块代码的映射
  const moduleCodeMap = {
    'quality': 'quality',
    'system': 'system',
    'work-plan': 'work-plan',
    'supplier': 'supplier-management',
    'copq': 'copq',
    'sample': 'sample-management'
  }
  
  const moduleCode = moduleCodeMap[moduleKey]
  return moduleCounts.value[moduleCode] || 0
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

// 数据概览 - 改为响应式数据，通过API获取
const overviewData = ref([
  {
    key: 'quality',
    title: '质量指标',
    value: '0%',
    color: '#409EFF',
    icon: 'mdi:chart-pie',
    trend: 'up',
    trendIcon: 'mdi:arrow-up',
    trendText: '0%'
  },
  {
    key: 'complaints',
    title: '客户投诉',
    value: '0',
    color: '#F56C6C',
    icon: 'mdi:message-alert',
    trend: 'down',
    trendIcon: 'mdi:arrow-down',
    trendText: '0%'
  },
  {
    key: 'firstpass',
    title: '一次交检合格率',
    value: '0%',
    color: '#E6A23C',
    icon: 'mdi:check-circle',
    trend: 'up',
    trendIcon: 'mdi:arrow-up',
    trendText: '0%'
  },
  {
    key: 'delivery',
    title: '交付合格率（批次）',
    value: '0%',
    color: '#67C23A',
    icon: 'mdi:truck-delivery',
    trend: 'up',
    trendIcon: 'mdi:arrow-up',
    trendText: '0%'
  }
])

// 快捷操作基础配置
const quickActionsConfig = [
  {
    key: 'new-complaint',
    title: '新建客诉',
    description: '快速创建客户投诉记录',
    icon: 'mdi:message-alert-outline',
    path: '/admin/quality/complaint/customer',
    color: '#F56C6C', // 红色 - 投诉相关
    iconColor: '#FFFFFF',
    // 权限检查：需要客户投诉管理权限
    requiredPermissions: ['quality:complaint:add'],
    requiredMenus: ['/admin/quality/complaint/customer']
  },
  {
    key: 'new-internal-complaint',
    title: '新建内诉',
    description: '创建内部投诉记录',
    icon: 'mdi:message-text-outline',
    path: '/admin/quality/complaint/internal',
    color: '#FF9800', // 橙色 - 内部投诉
    iconColor: '#FFFFFF',
    // 权限检查：需要内部投诉管理权限
    requiredPermissions: ['quality:complaint:add'],
    requiredMenus: ['/admin/quality/complaint/internal']
  },
  {
    key: 'customer-sample',
    title: '客户签样',
    description: '管理客户样品签收',
    icon: 'mdi:clipboard-check-outline',
    path: '/admin/sample/approval',
    color: '#3F51B5', // 靛蓝色 - 客户签样
    iconColor: '#FFFFFF',
    // 权限检查：需要样品管理权限
    requiredPermissions: ['sample:approval:view'],
    requiredMenus: ['/admin/sample/approval']
  },
  {
    key: 'quality-check',
    title: '质量目标',
    description: '执行质量检查流程',
    icon: 'mdi:target',
    path: '/admin/quality/targets',
    color: '#67C23A', // 绿色 - 质量目标
    iconColor: '#FFFFFF',
    // 权限检查：需要质量目标管理权限
    requiredPermissions: ['quality:targets:view'],
    requiredMenus: ['/admin/quality/targets']
  },
  {
    key: 'user-management',
    title: '用户管理',
    description: '管理系统用户权限',
    icon: 'mdi:account-group-outline',
    path: '/admin/system/user',
    color: '#409EFF', // 蓝色 - 用户管理
    iconColor: '#FFFFFF',
    // 权限检查：需要用户管理权限或管理员角色
    requiredPermissions: ['system:user:view'],
    requiredMenus: ['/admin/system/user'],
    requiredRoles: ['admin', '系统管理员']
  },
  {
    key: 'system-config',
    title: '系统配置',
    description: '调整系统参数设置',
    icon: 'mdi:cog-outline',
    path: '/admin/system/config',
    color: '#E6A23C', // 橙色 - 系统配置
    iconColor: '#FFFFFF',
    // 权限检查：需要系统配置权限或管理员角色
    requiredPermissions: ['system:config:view'],
    requiredMenus: ['/admin/system/config'],
    requiredRoles: ['admin', '系统管理员']
  },
  {
    key: 'notice-announcement',
    title: '通知公告',
    description: '查看和管理系统公告',
    icon: 'mdi:bullhorn-outline',
    path: '/admin/system/notices',
    color: '#909399', // 灰色 - 通知公告
    iconColor: '#FFFFFF',
    // 权限检查：需要通知管理权限
    requiredPermissions: ['system:notice:view'],
    requiredMenus: ['/admin/system/notices']
  },
  {
    key: 'personal-center',
    title: '个人中心',
    description: '管理个人信息和设置',
    icon: 'mdi:account-circle-outline',
    path: '/admin/profile',
    color: '#9C27B0', // 紫色 - 个人中心
    iconColor: '#FFFFFF',
    // 权限检查：所有用户都可以访问个人中心
    alwaysEnabled: true
  },
  {
    key: 'back-to-frontend',
    title: '回到前台',
    description: '返回前台用户界面',
    icon: 'mdi:home-outline',
    path: '/',
    color: '#00BCD4', // 青色 - 回到前台
    iconColor: '#FFFFFF',
    // 权限检查：所有用户都可以回到前台
    alwaysEnabled: true
  },
  {
    key: 'logout',
    title: '退出登录',
    description: '安全退出系统',
    icon: 'mdi:logout',
    path: '/logout',
    color: '#FF5722', // 深橙色 - 退出登录
    iconColor: '#FFFFFF',
    // 权限检查：所有用户都可以退出登录
    alwaysEnabled: true
  }
]

/**
 * 检查用户是否有权限访问快捷操作（支持用户权限优先级）
 * @param {Object} action - 快捷操作配置
 * @returns {Promise<boolean>} - 是否有权限
 */
const checkQuickActionPermission = async (action) => {
  // 如果设置为始终启用，直接返回true
  if (action.alwaysEnabled) {
    return true
  }
  
  // 检查角色权限
  if (action.requiredRoles && action.requiredRoles.length > 0) {
    const hasRequiredRole = action.requiredRoles.some(role => userStore.hasRole(role))
    if (hasRequiredRole) {
      return true
    }
  }
  
  // 检查菜单权限
  if (action.requiredMenus && action.requiredMenus.length > 0) {
    const hasMenuPermission = action.requiredMenus.some(menu => userStore.hasMenuPermission(menu))
    if (hasMenuPermission) {
      return true
    }
  }
  
  // 检查操作权限（支持用户级权限优先级）
  if (action.requiredPermissions && action.requiredPermissions.length > 0) {
    try {
      // 使用异步权限检查方法，支持用户权限覆盖角色权限
      const permissionChecks = await Promise.all(
        action.requiredPermissions.map(permission => 
          userStore.hasActionPermissionAsync(permission)
        )
      )
      
      // 如果任一权限检查通过，则返回true
      if (permissionChecks.some(hasPermission => hasPermission)) {
        return true
      }
    } catch (error) {
      console.warn('异步权限检查失败，回退到同步检查:', error)
      // 回退到同步权限检查
      const hasActionPermission = action.requiredPermissions.some(permission => 
        userStore.hasActionPermission(permission)
      )
      if (hasActionPermission) {
        return true
      }
    }
  }
  
  return false
}

// 快捷操作权限状态
const quickActionPermissions = ref(new Map())

// 根据权限过滤快捷操作
const quickActions = computed(() => {
  return quickActionsConfig.map(action => ({
    ...action,
    enabled: quickActionPermissions.value.get(action.key) ?? false
  }))
})

/**
 * 初始化快捷操作权限
 */
const initQuickActionPermissions = async () => {
  try {
    const permissionMap = new Map()
    
    // 并行检查所有快捷操作的权限
    const permissionChecks = await Promise.all(
      quickActionsConfig.map(async (action) => {
        const hasPermission = await checkQuickActionPermission(action)
        return { key: action.key, hasPermission }
      })
    )
    
    // 更新权限状态
    permissionChecks.forEach(({ key, hasPermission }) => {
      permissionMap.set(key, hasPermission)
    })
    
    quickActionPermissions.value = permissionMap
    console.log('快捷操作权限初始化完成:', Object.fromEntries(permissionMap))
  } catch (error) {
    console.error('快捷操作权限初始化失败:', error)
    // 失败时设置默认权限（alwaysEnabled的为true，其他为false）
    const defaultMap = new Map()
    quickActionsConfig.forEach(action => {
      defaultMap.set(action.key, action.alwaysEnabled || false)
    })
    quickActionPermissions.value = defaultMap
  }
}

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
// 功能模块基础配置
const systemModulesConfig = [
  {
    key: 'quality',
    title: '质量管理',
    description: '投诉处理、返工管理、质量目标等',
    icon: 'mdi:quality-high',
    color: '#409EFF',
    count: calculateModuleCount('quality'),
    path: '/admin/quality/targets',
    // 权限检查：需要质量管理相关权限
    requiredPermissions: ['quality:targets:view', 'quality:complaint:view'],
    requiredMenus: ['/admin/quality/targets', '/admin/quality/complaint'],
    requiredRoles: ['质量经理']
  },
  {
    key: 'system',
    title: '系统管理',
    description: '用户、角色、菜单、日志管理等',
    icon: 'mdi:cog',
    color: '#909399',
    count: calculateModuleCount('system'),
    path: '/admin/system/logs',
    // 权限检查：需要系统管理权限或管理员角色
    requiredPermissions: ['system:user:view', 'system:role:view', 'system:menu:view'],
    requiredMenus: ['/admin/system/user', '/admin/system/role', '/admin/system/menu'],
    requiredRoles: ['admin', '系统管理员']
  },
  {
    key: 'work-plan',
    title: '工作计划',
    description: '计划管理、进度跟踪、统计分析等',
    icon: 'mdi:calendar-check',
    color: '#67C23A',
    count: calculateModuleCount('work-plan'),
    path: '/admin/work-plan',
    // 权限检查：需要工作计划管理权限
    requiredPermissions: ['work-plan:dashboard:view', 'work-plan:plans:view'],
    requiredMenus: ['/admin/work-plan', '/admin/work-plan/dashboard']
  },
  {
    key: 'supplier',
    title: '供应商管理',
    description: '供应商信息维护和管理等',
    icon: 'mdi:store',
    color: '#E6A23C',
    count: calculateModuleCount('supplier'),
    path: '/admin/supplier/basic-info',
    // 权限检查：需要供应商管理权限
    requiredPermissions: ['supplier:basic:view', 'supplier:complaints:view'],
    requiredMenus: ['/admin/supplier/basic-info', '/admin/supplier/complaints']
  },
  {
    key: 'copq',
    title: '质量成本',
    description: '物料单价、成本统计分析等',
    icon: 'mdi:currency-usd',
    color: '#F56C6C',
    count: calculateModuleCount('copq'),
    path: '/admin/copq',
    // 权限检查：需要质量成本管理权限
    requiredPermissions: ['copq:material:view', 'copq:statistics:view'],
    requiredMenus: ['/admin/copq', '/admin/copq/material-price']
  },
  {
    key: 'sample',
    title: '样版管理',
    description: '样品承认书、内部色卡管理等',
    icon: 'mdi:palette',
    color: '#9C27B0',
    count: calculateModuleCount('sample'),
    path: '/admin/sample',
    // 权限检查：需要样版管理权限
    requiredPermissions: ['sample:approval:view', 'sample:color:view'],
    requiredMenus: ['/admin/sample/approval', '/admin/sample/color-card']
  }
]

/**
 * 检查用户是否有权限访问功能模块（支持用户权限优先级）
 * @param {Object} module - 功能模块配置
 * @returns {Promise<boolean>} - 是否有权限
 */
const checkModulePermission = async (module) => {
  // 检查角色权限
  if (module.requiredRoles && module.requiredRoles.length > 0) {
    const hasRequiredRole = module.requiredRoles.some(role => userStore.hasRole(role))
    if (hasRequiredRole) {
      return true
    }
  }
  
  // 检查菜单权限
  if (module.requiredMenus && module.requiredMenus.length > 0) {
    const hasMenuPermission = module.requiredMenus.some(menu => userStore.hasMenuPermission(menu))
    if (hasMenuPermission) {
      return true
    }
  }
  
  // 检查操作权限（支持用户级权限优先级）
  if (module.requiredPermissions && module.requiredPermissions.length > 0) {
    try {
      // 使用异步权限检查方法，支持用户权限覆盖角色权限
      const permissionChecks = await Promise.all(
        module.requiredPermissions.map(permission => 
          userStore.hasActionPermissionAsync(permission)
        )
      )
      
      // 如果任一权限检查通过，则返回true
      if (permissionChecks.some(hasPermission => hasPermission)) {
        return true
      }
    } catch (error) {
      console.warn('异步权限检查失败，回退到同步检查:', error)
      // 回退到同步权限检查
      const hasActionPermission = module.requiredPermissions.some(permission => 
        userStore.hasActionPermission(permission)
      )
      if (hasActionPermission) {
        return true
      }
    }
  }
  
  return false
}

// 系统模块权限状态
const systemModulePermissions = ref(new Map())

// 根据权限过滤功能模块
const systemModules = computed(() => {
  return systemModulesConfig.map(module => ({
    ...module,
    enabled: systemModulePermissions.value.get(module.key) ?? false,
    count: calculateModuleCount(module.key) // 动态计算模块数量
  }))
})

/**
 * 初始化系统模块权限
 */
const initSystemModulePermissions = async () => {
  try {
    const permissionMap = new Map()
    
    // 并行检查所有系统模块的权限
    const permissionChecks = await Promise.all(
      systemModulesConfig.map(async (module) => {
        const hasPermission = await checkModulePermission(module)
        return { key: module.key, hasPermission }
      })
    )
    
    // 更新权限状态
    permissionChecks.forEach(({ key, hasPermission }) => {
      permissionMap.set(key, hasPermission)
    })
    
    systemModulePermissions.value = permissionMap
    console.log('系统模块权限初始化完成:', Object.fromEntries(permissionMap))
  } catch (error) {
    console.error('系统模块权限初始化失败:', error)
    // 失败时设置默认权限（所有模块都为false）
    const defaultMap = new Map()
    systemModulesConfig.forEach(module => {
      defaultMap.set(module.key, false)
    })
    systemModulePermissions.value = defaultMap
  }
}

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
 * 处理快捷操作点击事件
 * @param {Object} action - 快捷操作配置
 */
const handleQuickAction = (action) => {
  // 检查权限，如果没有权限则提示用户
  if (!action.enabled) {
    ElMessage.warning(`您没有权限访问「${action.title}」功能，请联系管理员授权`)
    return
  }
  
  // 特殊处理退出登录
  if (action.key === 'logout') {
    ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      // 清除本地存储的用户信息
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      // 跳转到登录页
      router.push('/login')
      ElMessage.success('已安全退出登录')
    }).catch(() => {
      // 用户取消退出
    })
    return
  }
  
  // 处理回到前台
  if (action.key === 'back-to-frontend') {
    // 在新窗口打开前台页面
    window.open(action.path, '_blank')
    return
  }
  
  // 其他操作使用路由跳转
  if (action.path) {
    router.push(action.path)
  } else {
    ElMessage.info(`功能开发中：${action.title}`)
  }
}

/**
 * 导航到功能模块
 * @param {Object} module - 功能模块配置
 */
const navigateToModule = (module) => {
  // 检查权限，如果没有权限则提示用户
  if (!module.enabled) {
    ElMessage.warning(`您没有权限访问「${module.title}」模块，请联系管理员授权`)
    return
  }
  
  if (module.path) {
    router.push(module.path)
  } else {
    ElMessage.info(`模块开发中：${module.title}`)
  }
}

/**
 * 导航到待处理任务页面
 */
const navigateToTasks = () => {
  router.push('/admin/work-plan/dashboard')
}

/**
 * 导航到质量预警页面
 */
const navigateToAlerts = () => {
  router.push('/admin/quality/complaint')
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
 * 获取数据概览信息
 */
const fetchOverviewData = async () => {
  try {
    // 获取质量指标汇总数据
    const qualityResponse = await api.get('/quality-metrics/summary')
    
    // 获取质量成本统计数据
    const costResponse = await api.get('/customer-complaints/cost-statistics')
    
    // 获取客诉数据
    const complaintResponse = await api.get('/dashboard/stats')
    
    if (qualityResponse.data.success) {
      const qualityData = qualityResponse.data.data
      
      // 计算趋势（这里简化处理，实际可以通过对比历史数据计算）
      const qualityTrend = qualityData.YearlyFirstPassRate >= 95 ? 'up' : 'down'
      const complaintTrend = qualityData.TotalCustomerComplaints <= 10 ? 'down' : 'up'
      
      // 获取质量成本数据
      let costData = { totalCost: 0, totalTrend: 0 }
      if (costResponse.data.success && costResponse.data.data.overview) {
        costData = costResponse.data.data.overview
      }
      
      // 更新概览数据
      overviewData.value = [
        {
          key: 'cost',
          title: '质量成本损失',
          value: `¥ ${(costData.totalCost || 0).toLocaleString()}`,
          // 左侧图标固定颜色，趋势颜色单独控制
          color: '#F56C6C', // 质量成本损失用红色图标
          icon: 'mdi:currency-cny',
          trend: costData.totalTrend >= 0 ? 'up' : 'down',
          trendIcon: costData.totalTrend >= 0 ? 'mdi:arrow-up' : 'mdi:arrow-down',
          trendText: `${costData.totalTrend >= 0 ? '+' : ''}${(costData.totalTrend || 0).toFixed(1)}%`,
          // 趋势颜色：质量成本降低是好事(绿色)，上升是坏事(红色)
          trendColor: costData.totalTrend <= 0 ? '#67C23A' : '#F56C6C'
        },
        {
          key: 'complaints',
          title: '客户投诉',
          value: `${qualityData.TotalCustomerComplaints || 0}`,
          // 左侧图标固定颜色
          color: '#E6A23C', // 客户投诉用橙色图标
          icon: 'mdi:message-alert',
          trend: 'neutral',
          trendIcon: 'mdi:minus',
          trendText: '暂无对比数据',
          // 趋势颜色：暂无对比数据时为中性色
          trendColor: '#909399'
        },
        {
          key: 'firstpass',
          title: '一次交检合格率',
          value: `${qualityData.YearlyFirstPassRate || 0}%`,
          // 左侧图标固定颜色
          color: '#67C23A', // 一次交检合格率用绿色图标
          icon: 'mdi:check-circle',
          trend: 'neutral',
          trendIcon: 'mdi:minus',
          trendText: '暂无对比数据',
          // 趋势颜色：暂无对比数据时为中性色
          trendColor: '#909399'
        },
        {
          key: 'delivery',
          title: '交付合格率（批次）',
          value: `${qualityData.YearlyDeliveryPassRate || 0}%`,
          // 左侧图标固定颜色
          color: '#409EFF', // 交付合格率用蓝色图标
          icon: 'mdi:truck-delivery',
          trend: 'neutral',
          trendIcon: 'mdi:minus',
          trendText: '暂无对比数据',
          // 趋势颜色：暂无对比数据时为中性色
          trendColor: '#909399'
        }
      ]
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
    ElMessage.error('获取概览数据失败')
    
    // 保持默认数据结构，避免页面崩溃
    overviewData.value = [
      {
        key: 'quality',
        title: '质量指标',
        value: '暂无数据',
        color: '#409EFF',
        icon: 'mdi:chart-pie',
        trend: 'up',
        trendIcon: 'mdi:arrow-up',
        trendText: '--'
      },
      {
        key: 'complaints',
        title: '客户投诉',
        value: '暂无数据',
        color: '#F56C6C',
        icon: 'mdi:message-alert',
        trend: 'down',
        trendIcon: 'mdi:arrow-down',
        trendText: '--'
      },
      {
        key: 'rework',
        title: '返工率',
        value: '暂无数据',
        color: '#E6A23C',
        icon: 'mdi:refresh',
        trend: 'down',
        trendIcon: 'mdi:arrow-down',
        trendText: '--'
      },
      {
        key: 'efficiency',
        title: '生产效率',
        value: '暂无数据',
        color: '#67C23A',
        icon: 'mdi:trending-up',
        trend: 'up',
        trendIcon: 'mdi:arrow-up',
        trendText: '--'
      }
    ]
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
onMounted(async () => {
  fetchSystemStats()
  fetchLoginLogs()
  fetchOnlineUsers()
  fetchNotifications()
  fetchSystemInfo()
  fetchOverviewData() // 获取数据概览信息
  fetchModuleCounts() // 获取模块子菜单数量
  
  // 初始化权限检查（支持用户权限优先级）
  try {
    await Promise.all([
      initQuickActionPermissions(), // 初始化快捷操作权限
      initSystemModulePermissions() // 初始化系统模块权限
    ])
  } catch (error) {
    console.error('权限系统初始化失败:', error)
  }
  
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
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
  font-family: 'Bahnschrift';
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
  width: 550px;
  min-width: 550px;
}

.calendar-icon {
  color: #667eea;
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.calendar-icon:hover {
  transform: scale(1.1);
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 欢迎标题样式 */
.welcome-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}

.greeting-text {
  font-size: 14px;
  color: #67C23A;
  font-weight: 500;
  animation: fadeInLeft 0.8s ease-out;
}

.username-highlight {
  color: #409EFF;
  font-weight: 700;
  position: relative;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

/* 时间信息容器 */
.welcome-subtitle {
  margin: 0;
  animation: fadeInRight 0.8s ease-out 0.4s both;
}

.datetime-text {
  font-size: 16px;
  color: #4a5568;
  letter-spacing: 0.5px;
  /* 西文数字字体样式 */
  font-family: 'Bahnschrift';
  font-variant-numeric: tabular-nums lining-nums;
}

.welcome-stats {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  min-width: 140px;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item.clickable:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.stat-item.clickable:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-login .stat-icon {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.stat-task .stat-icon {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
}

.stat-alert .stat-icon {
  background: linear-gradient(135deg, #F56C6C, #F78989);
}

.stat-login .stat-icon,
.stat-task .stat-icon,
.stat-alert .stat-icon {
  color: white !important;
}

.stat-content {
  text-align: center;
  flex: 1;
}

.stat-number {
  font-weight: 700;
  font-size: 28px;
  margin-bottom: 2px;
  color: #2c3e50;
  line-height: 1;
  /* 西文数字字体样式 */
  font-family: 'Bahnschrift';
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.03em;
}

.stat-login .stat-number {
  color: #67C23A;
}

.stat-task .stat-number {
  color: #E6A23C;
}

.stat-alert .stat-number {
  color: #F56C6C;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* 动画关键帧 */
@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes expandWidth {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

/* 主要内容区域 */
.dashboard-main {
  display: grid;
  grid-template-columns: 3fr 1fr;
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

/* 卡片标题样式 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.section-title-with-more {
  justify-content: space-between;
}

.more-button {
  margin-left: auto;
  color: #409eff;
  font-size: 14px;
  padding: 0;
}

.more-button:hover {
  color: #66b1ff;
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
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
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
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  /* 西文数字字体样式 */
  font-family: 'Bahnschrift';
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.02em;
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
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  row-gap: 24px;
  justify-items: center;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 90px; /* 固定最小高度，防止文字挤压 */
  justify-content: flex-start;
}

.action-item:hover {
  /* 移除向上移动，避免文字挤压 */
}

.action-button {
  width: 65px;
  height: 65px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
}

.action-item:hover .action-button {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  filter: brightness(1.1) saturate(1.2);
}

.action-item:hover .action-name {
  color: #1f2937;
  font-weight: 600;
}

/* 焦点状态样式 */
.action-item:focus .action-button,
.action-item:focus-visible .action-button {
  outline: none;
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  filter: brightness(0.9);
}

.action-item:focus .action-name,
.action-item:focus-visible .action-name {
  color: #1f2937;
  font-weight: 600;
}

.action-button .iconify {
  font-size: 28px;
  width: 28px;
  height: 28px;
}

.action-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  line-height: 1.2;
  transition: all 0.3s;
}

/* 禁用状态样式 */
.action-disabled {
  cursor: not-allowed !important;
}

.action-disabled:hover {
  transform: none !important;
}

.action-disabled .action-button {
  cursor: not-allowed !important;
  position: relative;
}

.action-disabled:hover .action-button {
  transform: none !important;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15) !important;
  filter: none !important;
}

.action-disabled:hover .action-name {
  color: #303133 !important;
  font-weight: 500 !important;
}

/* 禁用状态遮罩层 */
.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-disabled:hover .disabled-overlay {
  opacity: 1;
}

.disabled-icon {
  color: white;
  font-size: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
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
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;
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

.module-count-number {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
}

/* 功能模块禁用状态样式 */
.module-disabled {
  cursor: not-allowed !important;
}

.module-disabled:hover {
  border-color: #e4e7ed !important;
  background-color: #ffffff !important;
  transform: none !important;
}

.module-disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.module-disabled:hover .module-disabled-overlay {
  opacity: 1;
}

.module-disabled-icon {
  color: white;
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
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
  transition: all 0.3s ease;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.info-icon-simple:hover {
  transform: scale(1.2);
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
  /* margin-bottom已由dashboard-left的gap统一控制 */
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
  margin-bottom: 20px;
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.tech-category:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.tech-category:last-child {
  margin-bottom: 0;
}

.tech-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tech-category-icon {
  font-size: 18px;
}

.tech-category-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0;
}

.tech-tag {
  font-size: 12px;
  height: 28px;
  line-height: 26px;
  border-radius: 14px;
  padding: 0 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: default;
}

.tech-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: default;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.feature-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.feature-text {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
}

.developer-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.system-version {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.version-icon {
  flex-shrink: 0;
}

.version-text {
  flex: 1;
}

.version-text h4 {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.version-tag {
  font-weight: 600;
}

.system-description {
  font-size: 15px;
  color: #606266;
  margin: 8px 0;
  line-height: 1.5;
}

.system-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.developer-details {
  display: grid;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.detail-item:hover {
  background: #f0f9ff;
  border-color: #409eff;
}

.detail-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.detail-label {
  color: #606266;
  font-weight: 500;
  font-size: 13px;
  min-width: 60px;
}

.detail-value {
  color: #303133;
  font-size: 13px;
  font-weight: 500;
}

/* 用户活动卡片 */
.user-activity-section {
  /* margin-bottom已由dashboard-left的gap统一控制 */
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
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .action-button {
    width: 60px;
    height: 60px;
  }
  
  .action-button .iconify {
    font-size: 24px;
    width: 24px;
    height: 24px;
  }
  
  .action-name {
    font-size: 12px;
  }
  
  .welcome-stats {
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .action-button {
    width: 50px;
    height: 50px;
  }
  
  .action-button .iconify {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
  
  .action-name {
    font-size: 11px;
  }
}
</style>