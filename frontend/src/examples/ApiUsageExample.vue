<template>
  <div class="api-usage-example">
    <h2>API自动检测使用示例</h2>
    
    <!-- API管理组件 -->
    <ApiManager />
    
    <!-- 使用示例 -->
    <div class="usage-examples">
      <h3>使用示例</h3>
      
      <!-- 基础API调用 -->
      <div class="example-section">
        <h4>1. 基础API调用</h4>
        <el-button @click="testBasicApi" :loading="loading.basic">
          测试基础API
        </el-button>
        <pre v-if="results.basic">{{ results.basic }}</pre>
      </div>

      <!-- 用户登录示例 -->
      <div class="example-section">
        <h4>2. 用户登录</h4>
        <el-form inline>
          <el-form-item label="用户名">
            <el-input v-model="loginForm.username" placeholder="输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="loginForm.password" type="password" placeholder="输入密码" />
          </el-form-item>
          <el-form-item>
            <el-button @click="testLogin" :loading="loading.login" type="primary">
              登录测试
            </el-button>
          </el-form-item>
        </el-form>
        <pre v-if="results.login">{{ results.login }}</pre>
      </div>

      <!-- 文件上传示例 -->
      <div class="example-section">
        <h4>3. 文件上传</h4>
        <el-upload
          :before-upload="handleFileUpload"
          :show-file-list="false"
          action="#"
        >
          <el-button :loading="loading.upload">选择文件上传</el-button>
        </el-upload>
        <div v-if="uploadProgress > 0" class="upload-progress">
          <el-progress :percentage="uploadProgress" />
        </div>
        <pre v-if="results.upload">{{ results.upload }}</pre>
      </div>

      <!-- 数据查询示例 -->
      <div class="example-section">
        <h4>4. 数据查询</h4>
        <el-button @click="testDataQuery" :loading="loading.query">
          查询数据
        </el-button>
        <pre v-if="results.query">{{ results.query }}</pre>
      </div>
    </div>

    <!-- 环境信息显示 -->
    <div class="environment-info">
      <h3>当前环境信息</h3>
      <el-descriptions border>
        <el-descriptions-item label="环境">
          {{ envInfo.description }}
        </el-descriptions-item>
        <el-descriptions-item label="API地址">
          {{ currentApiUrl }}
        </el-descriptions-item>
        <el-descriptions-item label="访问地址">
          {{ envInfo.location.hostname }}:{{ envInfo.location.port || '80' }}
        </el-descriptions-item>
        <el-descriptions-item label="调试模式">
          {{ envInfo.features.debug ? '开启' : '关闭' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import ApiManager from '../components/ApiManager.vue'
import apiService from '../services/apiService.js'
import environmentManager from '../config/environment.js'

export default {
  name: 'ApiUsageExample',
  components: {
    ApiManager
  },
  setup() {
    // 响应式数据
    const loading = reactive({
      basic: false,
      login: false,
      upload: false,
      query: false
    })

    const results = reactive({
      basic: null,
      login: null,
      upload: null,
      query: null
    })

    const loginForm = reactive({
      username: 'admin',
      password: '123456'
    })

    const uploadProgress = ref(0)
    const currentApiUrl = ref('')
    const envInfo = reactive({})

    // 方法
    const updateEnvironmentInfo = () => {
      const summary = environmentManager.getEnvironmentSummary()
      Object.assign(envInfo, summary)
      currentApiUrl.value = apiService.getCurrentApiUrl()
    }

    const testBasicApi = async () => {
      loading.basic = true
      try {
        const response = await apiService.get('/test-connection')
        results.basic = JSON.stringify({
          success: true,
          data: response.data,
          status: response.status,
          timestamp: new Date().toISOString()
        }, null, 2)
        ElMessage.success('基础API测试成功')
      } catch (error) {
        results.basic = JSON.stringify({
          success: false,
          error: error.message,
          response: error.response?.data,
          timestamp: new Date().toISOString()
        }, null, 2)
        ElMessage.error('基础API测试失败')
      } finally {
        loading.basic = false
      }
    }

    const testLogin = async () => {
      if (!loginForm.username || !loginForm.password) {
        ElMessage.warning('请输入用户名和密码')
        return
      }

      loading.login = true
      try {
        const response = await apiService.post('/auth/login', {
          username: loginForm.username,
          password: loginForm.password
        })
        
        results.login = JSON.stringify({
          success: true,
          data: response.data,
          timestamp: new Date().toISOString()
        }, null, 2)
        
        // 保存token（如果返回了）
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token)
        }
        
        ElMessage.success('登录测试成功')
      } catch (error) {
        results.login = JSON.stringify({
          success: false,
          error: error.message,
          response: error.response?.data,
          timestamp: new Date().toISOString()
        }, null, 2)
        ElMessage.error('登录测试失败')
      } finally {
        loading.login = false
      }
    }

    const handleFileUpload = async (file) => {
      loading.upload = true
      uploadProgress.value = 0

      try {
        const response = await apiService.upload('/upload', file, (progress) => {
          uploadProgress.value = progress
        })

        results.upload = JSON.stringify({
          success: true,
          data: response.data,
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString()
        }, null, 2)

        ElMessage.success('文件上传成功')
      } catch (error) {
        results.upload = JSON.stringify({
          success: false,
          error: error.message,
          fileName: file.name,
          timestamp: new Date().toISOString()
        }, null, 2)
        ElMessage.error('文件上传失败')
      } finally {
        loading.upload = false
        uploadProgress.value = 0
      }

      return false // 阻止element-plus的默认上传行为
    }

    const testDataQuery = async () => {
      loading.query = true
      try {
        // 示例：查询用户列表
        const response = await apiService.get('/users', {
          params: {
            page: 1,
            limit: 10
          }
        })

        results.query = JSON.stringify({
          success: true,
          data: response.data,
          count: response.data?.length || 0,
          timestamp: new Date().toISOString()
        }, null, 2)

        ElMessage.success('数据查询成功')
      } catch (error) {
        results.query = JSON.stringify({
          success: false,
          error: error.message,
          response: error.response?.data,
          timestamp: new Date().toISOString()
        }, null, 2)
        ElMessage.error('数据查询失败')
      } finally {
        loading.query = false
      }
    }

    // 生命周期
    onMounted(() => {
      updateEnvironmentInfo()
      
      // 监听API地址变化
      setInterval(updateEnvironmentInfo, 5000)
    })

    return {
      loading,
      results,
      loginForm,
      uploadProgress,
      currentApiUrl,
      envInfo,
      testBasicApi,
      testLogin,
      handleFileUpload,
      testDataQuery
    }
  }
}
</script>

<style scoped>
.api-usage-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.usage-examples {
  margin: 30px 0;
}

.example-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.example-section h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.example-section pre {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  margin-top: 15px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.upload-progress {
  margin-top: 10px;
  width: 300px;
}

.environment-info {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.environment-info h3 {
  margin: 0 0 20px 0;
  color: #333;
}
</style>
