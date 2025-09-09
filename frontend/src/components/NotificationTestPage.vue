<template>
  <div class="notification-test-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>通知功能测试页面</span>
        </div>
      </template>
      
      <div class="test-section">
        <h3>当前未读通知数量测试</h3>
        <p>当前未读通知数量：<strong>{{ unreadCount }}</strong></p>
        
        <el-button type="primary" @click="refreshNotifications" :loading="refreshing">
          刷新通知数量
        </el-button>
        
        <el-button type="success" @click="createTestNotification" :loading="creating">
          创建测试通知
        </el-button>
      </div>
      
      <div class="test-section">
        <h3>版本更新通知测试</h3>
        <p>测试版本更新通知发送后是否自动刷新铃铛组件</p>
        
        <el-button type="warning" @click="sendVersionNotification" :loading="sending">
          发送版本更新通知
        </el-button>
      </div>
      
      <div class="test-section">
        <h3>测试日志</h3>
        <div class="log-container">
          <div v-for="(log, index) in testLogs" :key="index" class="log-item">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { versionUpdatesAPI } from '@/utils/api'
import api from '@/utils/api'

// 响应式数据
const unreadCount = ref(0)
const refreshing = ref(false)
const creating = ref(false)
const sending = ref(false)
const testLogs = ref([])

// 获取用户store
const userStore = useUserStore()

/**
 * 添加测试日志
 * @param {string} message - 日志消息
 */
const addLog = (message) => {
  testLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message
  })
  // 只保留最近20条日志
  if (testLogs.value.length > 20) {
    testLogs.value = testLogs.value.slice(0, 20)
  }
}

/**
 * 获取当前未读通知数量
 */
const getUnreadCount = async () => {
  try {
    await userStore.fetchUnreadNoticeCount()
    unreadCount.value = userStore.unreadNoticeCount
    addLog(`获取未读通知数量: ${unreadCount.value}`)
  } catch (error) {
    addLog(`获取未读通知数量失败: ${error.message}`)
  }
}

/**
 * 刷新通知数量
 */
const refreshNotifications = async () => {
  refreshing.value = true
  try {
    addLog('开始刷新通知数量...')
    await userStore.refreshNotifications()
    await getUnreadCount()
    addLog('通知数量刷新完成')
    ElMessage.success('通知数量已刷新')
  } catch (error) {
    addLog(`刷新通知数量失败: ${error.message}`)
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

/**
 * 创建测试通知
 */
const createTestNotification = async () => {
  creating.value = true
  try {
    addLog('开始创建测试通知...')
    
    const testNotice = {
      title: `测试通知 - ${new Date().toLocaleTimeString()}`,
      content: '这是一个测试通知，用于验证铃铛组件刷新功能',
      type: 'announcement',
      priority: 'normal'
    }
    
    const response = await api.post('/notice', testNotice)
    
    if (response.data.success) {
      addLog('测试通知创建成功')
      ElMessage.success('测试通知创建成功')
      
      // 刷新通知数量
      await refreshNotifications()
    } else {
      addLog(`创建测试通知失败: ${response.data.message}`)
      ElMessage.error('创建测试通知失败')
    }
  } catch (error) {
    addLog(`创建测试通知失败: ${error.message}`)
    ElMessage.error('创建测试通知失败')
  } finally {
    creating.value = false
  }
}

/**
 * 发送版本更新通知
 */
const sendVersionNotification = async () => {
  sending.value = true
  try {
    addLog('开始发送版本更新通知...')
    
    // 首先获取版本列表
    const versionsResponse = await versionUpdatesAPI.getVersionUpdates()
    
    if (versionsResponse.success && versionsResponse.data.length > 0) {
      const latestVersion = versionsResponse.data[0]
      addLog(`找到最新版本: ${latestVersion.Version}`)
      
      // 发送通知
      const notificationData = {
        customTitle: `测试版本更新通知 - v${latestVersion.Version}`,
        customContent: '这是一个测试版本更新通知，用于验证铃铛组件刷新功能'
      }
      
      const response = await versionUpdatesAPI.sendVersionNotification(latestVersion.ID, notificationData)
      
      if (response.success) {
        addLog('版本更新通知发送成功')
        ElMessage.success('版本更新通知发送成功')
        
        // 等待一下，然后刷新通知数量
        setTimeout(async () => {
          await getUnreadCount()
          addLog('通知数量已自动刷新')
        }, 1000)
      } else {
        addLog(`发送版本更新通知失败: ${response.message}`)
        ElMessage.error('发送版本更新通知失败')
      }
    } else {
      addLog('未找到可用的版本记录')
      ElMessage.warning('未找到可用的版本记录')
    }
  } catch (error) {
    addLog(`发送版本更新通知失败: ${error.message}`)
    ElMessage.error('发送版本更新通知失败')
  } finally {
    sending.value = false
  }
}

// 组件挂载时获取初始数据
onMounted(async () => {
  addLog('页面加载完成')
  await getUnreadCount()
})
</script>

<style scoped>
.notification-test-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.test-section h3 {
  margin-top: 0;
  color: #303133;
}

.test-section p {
  margin: 10px 0;
  color: #606266;
}

.test-section .el-button {
  margin-right: 10px;
  margin-bottom: 10px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f5f5f5;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
}

.log-item {
  display: flex;
  margin-bottom: 5px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-time {
  color: #909399;
  margin-right: 10px;
  min-width: 80px;
}

.log-message {
  color: #303133;
  flex: 1;
}
</style>