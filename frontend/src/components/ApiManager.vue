<template>
  <div class="api-manager">
    <!-- API状态显示 -->
    <div class="api-status-card">
      <div class="status-header">
        <h3>API连接状态</h3>
        <el-button 
          type="primary" 
          size="small" 
          @click="refreshStatus"
          :loading="isRefreshing"
          icon="Refresh"
        >
          刷新状态
        </el-button>
      </div>

      <div class="status-content">
        <!-- 环境信息 -->
        <div class="env-info">
          <el-tag :type="envTagType" size="large">
            {{ environmentInfo.description }}
          </el-tag>
          <span class="env-details">
            {{ environmentInfo.location.hostname }}:{{ environmentInfo.location.port || '80' }}
          </span>
        </div>

        <!-- API连接状态 -->
        <div class="api-connection">
          <div class="connection-status">
            <el-icon :class="connectionStatusClass">
              <component :is="connectionIcon" />
            </el-icon>
            <span :class="connectionTextClass">
              {{ connectionStatusText }}
            </span>
          </div>
          
          <div v-if="currentApiUrl" class="current-api">
            <strong>当前API:</strong> {{ currentApiUrl }}
            <el-tag v-if="apiResponseTime" size="small" type="info">
              {{ apiResponseTime }}ms
            </el-tag>
          </div>
        </div>

        <!-- 自动检测开关 -->
        <div class="auto-detect-switch">
          <el-switch
            v-model="autoDetectEnabled"
            @change="toggleAutoDetect"
            active-text="自动检测"
            inactive-text="手动设置"
          />
        </div>
      </div>
    </div>

    <!-- 手动设置面板 -->
    <div v-if="!autoDetectEnabled" class="manual-config-card">
      <h4>手动API设置</h4>
      
      <!-- 快速选择 -->
      <div class="quick-select">
        <el-radio-group v-model="selectedApiUrl" @change="onApiUrlChange">
          <el-radio 
            v-for="url in availableUrls" 
            :key="url" 
            :label="url"
            class="api-radio"
          >
            {{ url }}
            <el-tag 
              v-if="urlTestResults[url]" 
              :type="urlTestResults[url].success ? 'success' : 'danger'"
              size="small"
            >
              {{ urlTestResults[url].success ? '可用' : '不可用' }}
            </el-tag>
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 自定义输入 -->
      <div class="custom-input">
        <el-input
          v-model="customApiUrl"
          placeholder="输入自定义API地址，如: http://192.168.1.57:3001"
          @keyup.enter="testCustomUrl"
        >
          <template #append>
            <el-button @click="testCustomUrl" :loading="isTestingCustom">
              测试
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 测试所有地址 -->
      <div class="test-all">
        <el-button 
          @click="testAllUrls" 
          :loading="isTestingAll"
          type="info"
          icon="Connection"
        >
          测试所有地址
        </el-button>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="advanced-settings">
      <el-collapse>
        <el-collapse-item title="高级设置" name="advanced">
          <div class="setting-item">
            <label>环境切换:</label>
            <el-select v-model="selectedEnvironment" @change="onEnvironmentChange">
              <el-option label="自动检测" value="auto" />
              <el-option label="开发环境" value="development" />
              <el-option label="生产环境" value="production" />
              <el-option label="测试环境" value="testing" />
            </el-select>
          </div>

          <div class="setting-item">
            <el-button @click="clearAllCache" type="warning" size="small">
              清除所有缓存
            </el-button>
            <el-button @click="exportConfig" type="info" size="small">
              导出配置
            </el-button>
          </div>

          <!-- 调试信息 -->
          <div v-if="environmentInfo.features.debug" class="debug-info">
            <h5>调试信息</h5>
            <pre>{{ debugInfo }}</pre>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, 
  Connection, 
  SuccessFilled, 
  WarningFilled, 
  CircleCloseFilled 
} from '@element-plus/icons-vue'
import environmentManager from '../config/environment.js'
import smartApiDetector from '../utils/smartApiDetector.js'

export default {
  name: 'ApiManager',
  components: {
    Refresh,
    Connection,
    SuccessFilled,
    WarningFilled,
    CircleCloseFilled
  },
  setup() {
    // 响应式数据
    const isRefreshing = ref(false)
    const isTestingAll = ref(false)
    const isTestingCustom = ref(false)
    const autoDetectEnabled = ref(true)
    const selectedApiUrl = ref('')
    const customApiUrl = ref('')
    const selectedEnvironment = ref('auto')
    const currentApiUrl = ref('')
    const apiResponseTime = ref(null)
    const connectionStatus = ref('unknown')
    
    const environmentInfo = reactive({
      environment: '',
      description: '',
      isManual: false,
      apiUrls: [],
      features: {},
      location: {}
    })
    
    const urlTestResults = reactive({})

    // 计算属性
    const envTagType = computed(() => {
      switch (environmentInfo.environment) {
        case 'development': return 'warning'
        case 'production': return 'success'
        case 'testing': return 'info'
        default: return 'info'
      }
    })

    const connectionStatusClass = computed(() => {
      return `connection-icon ${connectionStatus.value}`
    })

    const connectionTextClass = computed(() => {
      return `connection-text ${connectionStatus.value}`
    })

    const connectionIcon = computed(() => {
      switch (connectionStatus.value) {
        case 'connected': return 'SuccessFilled'
        case 'disconnected': return 'CircleCloseFilled'
        case 'warning': return 'WarningFilled'
        default: return 'Connection'
      }
    })

    const connectionStatusText = computed(() => {
      switch (connectionStatus.value) {
        case 'connected': return 'API连接正常'
        case 'disconnected': return 'API连接失败'
        case 'warning': return 'API连接不稳定'
        default: return '检测中...'
      }
    })

    const availableUrls = computed(() => {
      return environmentInfo.apiUrls || []
    })

    const debugInfo = computed(() => {
      return JSON.stringify({
        environment: environmentInfo,
        currentApiUrl: currentApiUrl.value,
        autoDetectEnabled: autoDetectEnabled.value,
        urlTestResults: urlTestResults,
        cacheInfo: smartApiDetector.getCacheInfo()
      }, null, 2)
    })

    // 方法
    const updateEnvironmentInfo = () => {
      const envSummary = environmentManager.getEnvironmentSummary()
      Object.assign(environmentInfo, envSummary)
    }

    const refreshStatus = async () => {
      isRefreshing.value = true
      try {
        updateEnvironmentInfo()
        
        if (autoDetectEnabled.value) {
          // 自动检测模式
          const apiUrl = await smartApiDetector.getApiUrl({ forceDetect: true })
          currentApiUrl.value = apiUrl
          selectedApiUrl.value = apiUrl
        }
        
        // 测试当前API连接
        await testCurrentConnection()
        
        ElMessage.success('状态刷新成功')
      } catch (error) {
        console.error('刷新状态失败:', error)
        ElMessage.error('状态刷新失败')
      } finally {
        isRefreshing.value = false
      }
    }

    const testCurrentConnection = async () => {
      if (!currentApiUrl.value) return
      
      try {
        const result = await smartApiDetector.testApiConnection(currentApiUrl.value)
        if (result.success) {
          connectionStatus.value = 'connected'
          apiResponseTime.value = result.responseTime
        } else {
          connectionStatus.value = 'disconnected'
          apiResponseTime.value = null
        }
      } catch (error) {
        connectionStatus.value = 'disconnected'
        apiResponseTime.value = null
      }
    }

    const toggleAutoDetect = async (enabled) => {
      if (enabled) {
        // 启用自动检测
        try {
          const apiUrl = await smartApiDetector.getApiUrl({ forceDetect: true })
          currentApiUrl.value = apiUrl
          selectedApiUrl.value = apiUrl
          ElMessage.success('已启用自动检测')
        } catch (error) {
          ElMessage.error('自动检测失败')
        }
      } else {
        // 切换到手动模式
        ElMessage.info('已切换到手动设置模式')
      }
    }

    const onApiUrlChange = (url) => {
      currentApiUrl.value = url
      smartApiDetector.setApiUrl(url)
      testCurrentConnection()
    }

    const testCustomUrl = async () => {
      if (!customApiUrl.value.trim()) {
        ElMessage.warning('请输入API地址')
        return
      }

      isTestingCustom.value = true
      try {
        const result = await smartApiDetector.testApiConnection(customApiUrl.value)
        if (result.success) {
          ElMessage.success('自定义API地址可用')
          selectedApiUrl.value = customApiUrl.value
          onApiUrlChange(customApiUrl.value)
        } else {
          ElMessage.error(`API地址不可用: ${result.error}`)
        }
      } catch (error) {
        ElMessage.error('测试失败')
      } finally {
        isTestingCustom.value = false
      }
    }

    const testAllUrls = async () => {
      isTestingAll.value = true
      try {
        // 清空之前的测试结果
        Object.keys(urlTestResults).forEach(key => {
          delete urlTestResults[key]
        })

        const results = await smartApiDetector.testMultipleApis(availableUrls.value, true)
        
        results.forEach(({ url, result }) => {
          urlTestResults[url] = result
        })

        ElMessage.success('所有地址测试完成')
      } catch (error) {
        ElMessage.error('测试失败')
      } finally {
        isTestingAll.value = false
      }
    }

    const onEnvironmentChange = (env) => {
      if (env === 'auto') {
        environmentManager.clearManualEnvironment()
      } else {
        environmentManager.setEnvironment(env)
      }
      updateEnvironmentInfo()
      refreshStatus()
    }

    const clearAllCache = async () => {
      try {
        await ElMessageBox.confirm('确定要清除所有缓存吗？', '确认操作', {
          type: 'warning'
        })
        
        smartApiDetector.clearApiCache()
        environmentManager.clearManualEnvironment()
        
        ElMessage.success('缓存已清除')
        refreshStatus()
      } catch {
        // 用户取消
      }
    }

    const exportConfig = () => {
      const config = {
        environment: environmentInfo,
        currentApiUrl: currentApiUrl.value,
        autoDetectEnabled: autoDetectEnabled.value,
        timestamp: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-config-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      ElMessage.success('配置已导出')
    }

    // 生命周期
    onMounted(async () => {
      updateEnvironmentInfo()
      
      // 初始化API检测
      if (autoDetectEnabled.value) {
        const apiUrl = await smartApiDetector.getApiUrl()
        currentApiUrl.value = apiUrl
        selectedApiUrl.value = apiUrl
      }
      
      await testCurrentConnection()
    })

    // 监听器
    watch(() => environmentInfo.environment, () => {
      selectedEnvironment.value = environmentInfo.isManual ? 
        environmentInfo.environment : 'auto'
    })

    return {
      // 响应式数据
      isRefreshing,
      isTestingAll,
      isTestingCustom,
      autoDetectEnabled,
      selectedApiUrl,
      customApiUrl,
      selectedEnvironment,
      currentApiUrl,
      apiResponseTime,
      environmentInfo,
      urlTestResults,
      
      // 计算属性
      envTagType,
      connectionStatusClass,
      connectionTextClass,
      connectionIcon,
      connectionStatusText,
      availableUrls,
      debugInfo,
      
      // 方法
      refreshStatus,
      toggleAutoDetect,
      onApiUrlChange,
      testCustomUrl,
      testAllUrls,
      onEnvironmentChange,
      clearAllCache,
      exportConfig
    }
  }
}
</script>

<style scoped>
.api-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.api-status-card,
.manual-config-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-header h3 {
  margin: 0;
  color: #333;
}

.env-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.env-details {
  color: #666;
  font-size: 14px;
}

.api-connection {
  margin-bottom: 15px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.connection-icon {
  font-size: 18px;
}

.connection-icon.connected {
  color: #67c23a;
}

.connection-icon.disconnected {
  color: #f56c6c;
}

.connection-icon.warning {
  color: #e6a23c;
}

.connection-text.connected {
  color: #67c23a;
}

.connection-text.disconnected {
  color: #f56c6c;
}

.connection-text.warning {
  color: #e6a23c;
}

.current-api {
  font-size: 14px;
  color: #666;
}

.auto-detect-switch {
  margin-top: 15px;
}

.quick-select {
  margin-bottom: 15px;
}

.api-radio {
  display: block;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s;
}

.api-radio:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.custom-input {
  margin-bottom: 15px;
}

.test-all {
  text-align: center;
}

.advanced-settings {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.setting-item label {
  min-width: 80px;
  font-weight: 500;
}

.debug-info {
  margin-top: 15px;
}

.debug-info h5 {
  margin: 0 0 10px 0;
  color: #666;
}

.debug-info pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
