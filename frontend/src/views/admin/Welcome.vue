<template>
  <div class="welcome-container">
    <!-- 紧凑型欢迎横幅 -->
    <div class="welcome-banner">
      <div class="banner-content">
        <!-- 胿佳公司LOGO替换原来的房屋图标 -->
         <div class="welcome-icon">
            <svg width="45" height="45" viewBox="0 0 50 75" xmlns="http://www.w3.org/2000/svg">
              <!-- 顶部3个正方形 - 轮流使用4种颜色 -->
              <!-- 左上正方形 - 颜色1 -->
              <rect x="5" y="5" width="14" height="14" rx="2" fill="#2982B6"/>
              <!-- 中上正方形 - 颜色2 -->
              <rect x="23" y="5" width="14" height="14" rx="2" fill="#B61E6A"/>
              <!-- 右上正方形 - 颜色3 -->
              <rect x="41" y="5" width="14" height="14" rx="2" fill="#F3E727"/>
              
              <!-- 中部长方形（高度是正方形的3倍：42px） - 颜色4 -->
              <rect x="23" y="22" width="14" height="42" rx="2" fill="#0A0305"/>
              
              <!-- 底部左侧正方形 - 颜色1（循环回到第一个颜色） -->
              <rect x="5" y="50" width="14" height="14" rx="2" fill="#2982B6"/>
            </svg>
          </div>
        <div class="welcome-text">
          <h1 class="welcome-title">质量数据管理系统</h1>
          <p class="welcome-subtitle">Quality Data Management System</p>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧区域 -->
      <div class="left-section">
        <!-- 功能模块卡片 -->
        <div class="feature-cards">
          <h3 class="section-title">快速导航</h3>
          <div class="cards-grid">
            <el-card class="feature-card" shadow="hover" @click="navigateTo('/admin/dashboard')">
              <div class="card-content">
                <el-icon class="card-icon" size="24" color="#409EFF">
                  <DataAnalysis />
                </el-icon>
                <span class="card-title">数据仪表盘</span>
              </div>
            </el-card>

            <el-card class="feature-card" shadow="hover" @click="navigateTo('/admin/quality/complaint')">
              <div class="card-content">
                <el-icon class="card-icon" size="24" color="#67C23A">
                  <Medal />
                </el-icon>
                <span class="card-title">质量管理</span>
              </div>
            </el-card>

            <el-card class="feature-card" shadow="hover" @click="navigateTo('/admin/copq/material-price')">
              <div class="card-content">
                <el-icon class="card-icon" size="24" color="#E6A23C">
                  <Money />
                </el-icon>
                <span class="card-title">成本管理</span>
              </div>
            </el-card>

            <el-card class="feature-card" shadow="hover" @click="navigateTo('/admin/system/user')">
              <div class="card-content">
                <el-icon class="card-icon" size="24" color="#F56C6C">
                  <Setting />
                </el-icon>
                <span class="card-title">系统管理</span>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 用户登录记录表格 -->
        <div class="monitoring-section">
          <h3 class="section-title">登录日志</h3>
          <el-card class="monitoring-card">
            <el-table 
              ref="tableRef"
              :data="systemStats" 
              style="width: 100%"
              size="small"
              stripe
              border
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
              :height="250"
              @mouseenter="handleMouseEnter"
              @mouseleave="handleMouseLeave"
            >
              <el-table-column prop="userId" label="用户ID" width="80" align="center" />
              <el-table-column prop="username" label="用户名" width="100" show-overflow-tooltip />
              <el-table-column prop="realName" label="真实姓名" width="100" show-overflow-tooltip />
              <el-table-column prop="loginIp" label="登录IP" width="120" align="center" />
              <el-table-column prop="loginTime" label="登入时间" width="140" show-overflow-tooltip />
              <el-table-column prop="logoutTime" label="登出时间" width="140" show-overflow-tooltip />
              <el-table-column prop="loginDevice" label="登录设备" width="150" show-overflow-tooltip />
              <el-table-column prop="sessionDuration" label="会话时长" width="100" align="center" />
              <el-table-column prop="status" label="状态" width="80" align="center">
                <template #default="scope">
                  <el-tag 
                    :type="getLoginStatusType(scope.row.status)" 
                    size="small"
                  >
                    {{ getLoginStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="location" label="登录位置" width="120" show-overflow-tooltip />
            </el-table>
          </el-card>
        </div>
      </div>

      <!-- 右侧区域 -->
      <div class="right-section">
        <!-- 版本信息 -->
        <div class="version-section">
          <h3 class="section-title">版本信息</h3>
          <el-card class="version-card">
            <div class="version-header">
              <span class="version-number">v{{ versionInfo.version }}</span>
              <el-tag type="success" size="small">{{ versionInfo.status }}</el-tag>
            </div>
            <div class="version-content">
              <h4>更新内容：</h4>
              <ul class="update-list">
                <li v-for="item in versionInfo.updates" :key="item">{{ item }}</li>
              </ul>
              <div class="version-meta">
                <p><strong>发布日期：</strong>{{ versionInfo.releaseDate }}</p>
                <p><strong>更新大小：</strong>{{ versionInfo.size }}</p>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 通知公告 -->
        <div class="notice-section">
          <h3 class="section-title">通知公告</h3>
          <el-card class="notice-card">
            <div class="notice-list">
              <div 
                v-for="notice in notices" 
                :key="notice.id" 
                class="notice-item"
                @click="viewNotice(notice)"
              >
                <div class="notice-header">
                  <span class="notice-title">{{ notice.title }}</span>
                  <el-tag 
                    :type="notice.type === 'urgent' ? 'danger' : notice.type === 'important' ? 'warning' : 'info'" 
                    size="small"
                  >
                    {{ notice.typeLabel }}
                  </el-tag>
                </div>
                <div class="notice-content">{{ notice.content }}</div>
                <div class="notice-time">{{ notice.time }}</div>
              </div>
            </div>
            <div class="notice-more">
              <el-button type="text" @click="navigateTo('/admin/system/notices')">查看更多</el-button>
            </div>
          </el-card>
        </div>

        <!-- 系统信息 -->
        <div class="system-info">
          <h3 class="section-title">系统信息</h3>
          <el-card class="info-card">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">当前用户：</span>
                <span class="info-value">{{ user.realName || user.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">用户角色：</span>
                <span class="info-value">{{ userRoles }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">登录时间：</span>
                <span class="info-value">{{ loginTime }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">服务器状态：</span>
                <span class="info-value server-status">正常运行</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 管理后台欢迎页面组件
 * 
 * 功能说明：
 * 1. 显示紧凑型欢迎横幅
 * 2. 提供快速导航到各个功能模块
 * 3. 展示系统监控数据
 * 4. 显示版本信息和更新内容
 * 5. 展示通知公告列表
 * 6. 显示系统基本信息和用户信息
 * 7. 响应式设计，适配不同屏幕尺寸
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { 
  HomeFilled, 
  DataAnalysis, 
  Medal, 
  Money, 
  Setting 
} from '@element-plus/icons-vue'

// 路由和用户状态
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

// 登录时间
const loginTime = ref(new Date().toLocaleString('zh-CN'))

// 表格滚动控制
const tableRef = ref(null)
const isScrolling = ref(true)
const scrollTimer = ref(null)
const scrollPosition = ref(0)

// 用户角色信息
const userRoles = computed(() => {
  return userStore.userRoleNames.join(', ') || '普通用户'
})

// 版本信息
const versionInfo = ref({
  version: '2.3.0',
  status: '最新版本',
  releaseDate: '2024-01-15',
  size: '12.5MB',
  updates: [
    '优化用户界面体验',
    '增强系统安全性',
    '修复已知问题',
    '新增数据导出功能',
    '改进性能表现'
  ]
})

// 用户登录记录数据
const systemStats = ref([
  {
    id: 1,
    userId: 'U001',
    username: 'admin',
    realName: '系统管理员',
    loginIp: '192.168.1.100',
    loginTime: '2024-01-15 08:30:15',
    logoutTime: '2024-01-15 17:45:20',
    loginDevice: 'Windows 10 Chrome',
    sessionDuration: '9小时15分钟',
    status: 'offline',
    location: '办公室-A座'
  },
  {
    id: 2,
    userId: 'U002',
    username: 'zhangsan',
    realName: '张三',
    loginIp: '192.168.1.101',
    loginTime: '2024-01-15 09:15:30',
    logoutTime: '-',
    loginDevice: 'Windows 11 Edge',
    sessionDuration: '5小时15分钟',
    status: 'online',
    location: '办公室-B座'
  },
  {
    id: 3,
    userId: 'U003',
    username: 'lisi',
    realName: '李四',
    loginIp: '192.168.1.102',
    loginTime: '2024-01-15 10:20:45',
    logoutTime: '2024-01-15 12:30:10',
    loginDevice: 'MacOS Safari',
    sessionDuration: '2小时9分钟',
    status: 'offline',
    location: '办公室-C座'
  },
  {
    id: 4,
    userId: 'U004',
    username: 'wangwu',
    realName: '王五',
    loginIp: '192.168.1.103',
    loginTime: '2024-01-15 11:45:20',
    logoutTime: '-',
    loginDevice: 'Android Chrome',
    sessionDuration: '2小时45分钟',
    status: 'online',
    location: '移动办公'
  },
  {
    id: 5,
    userId: 'U005',
    username: 'zhaoliu',
    realName: '赵六',
    loginIp: '192.168.1.104',
    loginTime: '2024-01-15 13:10:35',
    logoutTime: '2024-01-15 16:20:15',
    loginDevice: 'iOS Safari',
    sessionDuration: '3小时9分钟',
    status: 'offline',
    location: '移动办公'
  },
  {
    id: 6,
    userId: 'U006',
    username: 'sunqi',
    realName: '孙七',
    loginIp: '192.168.1.105',
    loginTime: '2024-01-15 14:25:10',
    logoutTime: '-',
    loginDevice: 'Windows 10 Firefox',
    sessionDuration: '5分钟',
    status: 'online',
    location: '办公室-D座'
  },
  {
    id: 7,
    userId: 'U007',
    username: 'zhouba',
    realName: '周八',
    loginIp: '192.168.1.106',
    loginTime: '2024-01-15 07:45:00',
    logoutTime: '2024-01-15 18:30:45',
    loginDevice: 'Linux Chrome',
    sessionDuration: '10小时45分钟',
    status: 'offline',
    location: '办公室-E座'
  },
  {
    id: 8,
    userId: 'U008',
    username: 'wujiu',
    realName: '吴九',
    loginIp: '192.168.1.107',
    loginTime: '2024-01-15 12:15:25',
    logoutTime: '-',
    loginDevice: 'Windows 11 Chrome',
    sessionDuration: '2小时15分钟',
    status: 'online',
    location: '办公室-F座'
  },
  {
    id: 9,
    userId: 'U009',
    username: 'chengshi',
    realName: '程十',
    loginIp: '192.168.1.108',
    loginTime: '2024-01-15 08:45:10',
    logoutTime: '2024-01-15 17:20:30',
    loginDevice: 'Windows 10 Chrome',
    sessionDuration: '8小时35分钟',
    status: 'offline',
    location: '办公室-G座'
  },
  {
    id: 10,
    userId: 'U010',
    username: 'yangyi',
    realName: '杨一',
    loginIp: '192.168.1.109',
    loginTime: '2024-01-15 09:30:45',
    logoutTime: '-',
    loginDevice: 'MacOS Chrome',
    sessionDuration: '5小时0分钟',
    status: 'online',
    location: '办公室-H座'
  },
  {
    id: 11,
    userId: 'U011',
    username: 'liuer',
    realName: '刘二',
    loginIp: '192.168.1.110',
    loginTime: '2024-01-15 10:15:20',
    logoutTime: '2024-01-15 15:45:10',
    loginDevice: 'Android Chrome',
    sessionDuration: '5小时29分钟',
    status: 'offline',
    location: '移动办公'
  },
  {
    id: 12,
    userId: 'U012',
    username: 'chensan',
    realName: '陈三',
    loginIp: '192.168.1.111',
    loginTime: '2024-01-15 11:20:15',
    logoutTime: '-',
    loginDevice: 'iOS Safari',
    sessionDuration: '3小时10分钟',
    status: 'online',
    location: '移动办公'
  },
  {
    id: 13,
    userId: 'U013',
    username: 'huangsi',
    realName: '黄四',
    loginIp: '192.168.1.112',
    loginTime: '2024-01-15 07:30:00',
    logoutTime: '2024-01-15 18:45:30',
    loginDevice: 'Windows 11 Edge',
    sessionDuration: '11小时15分钟',
    status: 'offline',
    location: '办公室-I座'
  },
  {
    id: 14,
    userId: 'U014',
    username: 'xuwu',
    realName: '徐五',
    loginIp: '192.168.1.113',
    loginTime: '2024-01-15 13:45:25',
    logoutTime: '-',
    loginDevice: 'Linux Firefox',
    sessionDuration: '45分钟',
    status: 'online',
    location: '办公室-J座'
  },
  {
    id: 15,
    userId: 'U015',
    username: 'zhengliu',
    realName: '郑六',
    loginIp: '192.168.1.114',
    loginTime: '2024-01-15 14:10:40',
    logoutTime: '2024-01-15 16:55:20',
    loginDevice: 'Windows 10 Firefox',
    sessionDuration: '2小时44分钟',
    status: 'offline',
    location: '办公室-K座'
  },
  {
    id: 16,
    userId: 'U016',
    username: 'wangqi',
    realName: '王七',
    loginIp: '192.168.1.115',
    loginTime: '2024-01-15 08:15:30',
    logoutTime: '-',
    loginDevice: 'MacOS Safari',
    sessionDuration: '6小时15分钟',
    status: 'online',
    location: '办公室-L座'
  },
  {
    id: 17,
    userId: 'U017',
    username: 'liba',
    realName: '李八',
    loginIp: '192.168.1.116',
    loginTime: '2024-01-15 09:45:15',
    logoutTime: '2024-01-15 17:30:45',
    loginDevice: 'Android Chrome',
    sessionDuration: '7小时45分钟',
    status: 'offline',
    location: '移动办公'
  },
  {
    id: 18,
    userId: 'U018',
    username: 'zhaojiu',
    realName: '赵九',
    loginIp: '192.168.1.117',
    loginTime: '2024-01-15 12:30:50',
    logoutTime: '-',
    loginDevice: 'iOS Chrome',
    sessionDuration: '2小时0分钟',
    status: 'online',
    location: '移动办公'
  }
])

// 通知公告数据
const notices = ref([
  {
    id: 1,
    title: '系统维护通知',
    content: '系统将于本周六凌晨2:00-4:00进行例行维护，请提前保存数据。',
    type: 'important',
    typeLabel: '重要',
    time: '2024-01-15 09:30'
  },
  {
    id: 2,
    title: '新功能上线',
    content: '质量数据批量导入功能已上线，支持Excel格式文件导入。',
    type: 'info',
    typeLabel: '通知',
    time: '2024-01-14 14:20'
  },
  {
    id: 3,
    title: '安全提醒',
    content: '请定期更换密码，确保账户安全。建议使用强密码组合。',
    type: 'urgent',
    typeLabel: '紧急',
    time: '2024-01-13 16:45'
  },
  {
    id: 4,
    title: '培训通知',
    content: '质量管理系统操作培训将于下周三下午2点在会议室举行。',
    type: 'info',
    typeLabel: '通知',
    time: '2024-01-12 11:15'
  }
])

/**
 * 导航到指定路径
 * @param {string} path - 目标路径
 */
const navigateTo = (path) => {
  router.push(path)
}

/**
 * 查看通知详情
 * @param {Object} notice - 通知对象
 */
const viewNotice = (notice) => {
  ElMessage({
    message: `查看通知：${notice.title}`,
    type: 'info',
    duration: 2000
  })
  // 这里可以添加打开通知详情的逻辑
}

/**
 * 获取登录状态对应的Element Plus标签类型
 * @param {string} status - 登录状态值
 * @returns {string} Element Plus标签类型
 */
const getLoginStatusType = (status) => {
  const statusMap = {
    'online': 'success',
    'offline': 'info',
    'timeout': 'warning',
    'locked': 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取登录状态对应的中文文本
 * @param {string} status - 登录状态值
 * @returns {string} 状态中文文本
 */
const getLoginStatusText = (status) => {
  const statusMap = {
    'online': '在线',
    'offline': '离线',
    'timeout': '超时',
    'locked': '锁定'
  }
  return statusMap[status] || '未知'
}

/**
 * 模拟实时更新用户登录记录数据
 */
const updateSystemStats = () => {
  // 模拟用户状态变化
  systemStats.value.forEach(item => {
    const currentTime = new Date().toLocaleString('zh-CN')
    
    // 随机模拟用户状态变化
    if (Math.random() < 0.1) { // 10%概率状态发生变化
      if (item.status === 'online') {
        // 在线用户可能下线
        if (Math.random() < 0.3) {
          item.status = 'offline'
          item.logoutTime = currentTime
        }
      } else if (item.status === 'offline') {
        // 离线用户可能重新登录
        if (Math.random() < 0.2) {
          item.status = 'online'
          item.loginTime = currentTime
          item.logoutTime = '-'
        }
      }
    }
    
    // 更新在线用户的会话时长
    if (item.status === 'online' && item.logoutTime === '-') {
      const loginTime = new Date(item.loginTime)
      const now = new Date()
      const diffMs = now - loginTime
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      item.sessionDuration = `${hours}小时${minutes}分钟`
    }
  })
}

/**
 * 开始表格自动滚动
 */
const startTableScroll = () => {
  if (!isScrolling.value || !tableRef.value) return
  
  scrollTimer.value = setInterval(() => {
    if (!isScrolling.value || !tableRef.value) return
    
    const tableBody = tableRef.value.$el.querySelector('.el-table__body-wrapper')
    if (tableBody) {
      const maxScroll = tableBody.scrollHeight - tableBody.clientHeight
      
      // 如果内容高度不足以滚动，则不执行滚动
      if (maxScroll <= 0) return
      
      scrollPosition.value += 1
      tableBody.scrollTop = scrollPosition.value
      
      // 如果滚动到底部，等待2秒后重新开始
      if (scrollPosition.value >= maxScroll) {
        setTimeout(() => {
          if (isScrolling.value) {
            scrollPosition.value = 0
            if (tableBody) {
              tableBody.scrollTop = 0
            }
          }
        }, 2000)
      }
    }
  }, 50) // 每50毫秒滚动1像素，速度适中
}

/**
 * 停止表格自动滚动
 */
const stopTableScroll = () => {
  if (scrollTimer.value) {
    clearInterval(scrollTimer.value)
    scrollTimer.value = null
  }
}

/**
 * 鼠标进入表格时停止滚动
 */
const handleMouseEnter = () => {
  isScrolling.value = false
  stopTableScroll()
}

/**
 * 鼠标离开表格时恢复滚动
 */
const handleMouseLeave = () => {
  isScrolling.value = true
  startTableScroll()
}

// 组件挂载时的初始化
onMounted(() => {
  // 每30秒更新一次用户登录记录数据
  setInterval(updateSystemStats, 30000)
  
  // 延迟启动滚动，确保表格已渲染
  setTimeout(() => {
    startTableScroll()
  }, 1000)
})

// 组件卸载时清理定时器
onBeforeUnmount(() => {
  stopTableScroll()
})
</script>

<style scoped>
.welcome-container {
  padding: 0 50px;
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

/* 紧凑型欢迎横幅样式 - Element Plus 经典蓝色 */
.welcome-banner {
  background: #409EFF;
  border-radius: 12px;
  padding: 16px 24px;
  text-align: center;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.welcome-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 0.9rem;
  margin: 4px 0 0 0;
  opacity: 0.9;
  font-weight: 300;
  line-height: 1.2;
}

/* 主要内容区域 */
.main-content {
  display: grid;
  grid-template-columns: 1.2fr 0.53fr;
  gap: 32px;
  align-items: start;
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 区域标题 */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #303133;
  padding-left: 12px;
  border-left: 4px solid #409EFF;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 12px;
  width: 30px;
  height: 2px;
  background: linear-gradient(90deg, #409EFF, transparent);
}

/* 功能卡片样式 */
.feature-cards .cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.feature-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e4e7ed;
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}

.card-icon {
  flex-shrink: 0;
  padding: 8px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

/* 系统监控表格样式 */
.monitoring-card {
  border-radius: 8px;
  border: none;
}

.monitoring-card .el-table {
  border-radius: 6px;
  overflow: hidden;
}

.monitoring-card .el-table th {
  font-weight: 600;
  font-size: 0.9rem;
}

.monitoring-card .el-table td {
  font-size: 0.85rem;
}

.metric-value {
  font-weight: 600;
  color: #409EFF;
  font-size: 0.9rem;
}

.monitoring-card .el-tag {
  font-weight: 500;
}

/* 版本信息样式 */
.version-card {
  border-radius: 8px;
  border: none;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 16px 16px 0;
}

.version-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #409EFF;
}

.version-content {
  padding: 0 16px 16px;
}

.version-content h4 {
  font-size: 0.95rem;
  margin: 0 0 6px 0;
  color: #303133;
}

.update-list {
  margin: 0 0 12px 0;
  padding-left: 18px;
  max-height: 120px;
  overflow-y: auto;
}

.update-list li {
  font-size: 0.85rem;
  color: #606266;
  margin-bottom: 3px;
  line-height: 1.3;
}

.version-meta p {
  font-size: 0.8rem;
  color: #909399;
  margin: 2px 0;
}

/* 通知公告样式 */
.notice-card {
  border-radius: 8px;
  border: none;
}

.notice-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 12px;
}

.notice-item {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-radius: 6px;
  margin-bottom: 4px;
}

.notice-item:hover {
  background-color: #f8f9fa;
}

.notice-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notice-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #303133;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-content {
  font-size: 0.8rem;
  color: #606266;
  line-height: 1.3;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notice-time {
  font-size: 0.7rem;
  color: #909399;
}

.notice-more {
  text-align: center;
  padding: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 系统信息样式 */
.system-info .info-card {
  border-radius: 8px;
  border: none;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 6px;
  border-left: 3px solid #409EFF;
  transition: all 0.3s ease;
}

.info-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-label {
  font-weight: 500;
  color: #606266;
  font-size: 0.85rem;
}

.info-value {
  font-weight: 600;
  color: #303133;
  font-size: 0.85rem;
}

.server-status {
  color: #67C23A;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .left-section {
    gap: 24px;
  }
  
  .right-section {
    gap: 20px;
  }
  
  .monitoring-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .welcome-container {
    padding: 16px;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .welcome-title {
    font-size: 1.3rem;
  }
  
  .feature-cards .cards-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .monitoring-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .monitor-item {
    padding: 12px;
  }
  
  .monitor-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .monitoring-grid {
    grid-template-columns: 1fr;
  }
}
</style>