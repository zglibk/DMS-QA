<template>
  <div class="storage-config">
    <div class="config-header">
      <h3>文件存储配置</h3>
      <p>配置文件存储路径和访问方式</p>
    </div>

    <el-form 
      :model="storageConfig" 
      :rules="storageRules" 
      ref="storageFormRef" 
      label-width="140px" 
      class="config-form"
    >
      <!-- 存储路径配置 -->
      <div class="form-section">
        <h4>存储路径配置</h4>
        
        <el-form-item label="文件存储路径" prop="FileStoragePath">
          <el-input 
            v-model="storageConfig.FileStoragePath" 
            placeholder="如：D:\DMSData\IMG-VIDEO"
          >
            <template #append>
              <el-button @click="selectPath" icon="Folder">选择</el-button>
            </template>
          </el-input>
          <div class="form-item-tip">
            服务器上用于存储上传文件的目录路径
          </div>
        </el-form-item>

        <el-form-item label="临时文件路径" prop="ExcelTempPath">
          <el-input 
            v-model="storageConfig.ExcelTempPath" 
            placeholder="如：file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel"
          />
          <div class="form-item-tip">
            Excel临时文件的本地路径前缀
          </div>
        </el-form-item>

        <el-form-item label="网络共享路径" prop="NetworkSharePath">
          <el-input 
            v-model="storageConfig.NetworkSharePath" 
            placeholder="如：\\tj_server\工作\品质部\生产异常周报考核统计"
          />
          <div class="form-item-tip">
            网络共享目录的UNC路径
          </div>
        </el-form-item>
      </div>

      <!-- 文件服务配置 -->
      <div class="form-section">
        <h4>文件服务配置</h4>
        
        <el-form-item label="文件服务端口" prop="FileServerPort">
          <el-input-number 
            v-model="storageConfig.FileServerPort" 
            :min="1" 
            :max="65535" 
            placeholder="8080"
            style="width: 200px"
          />
          <div class="form-item-tip">
            文件访问服务的端口号
          </div>
        </el-form-item>

        <el-form-item label="URL前缀" prop="FileUrlPrefix">
          <el-input 
            v-model="storageConfig.FileUrlPrefix" 
            placeholder="/files"
            style="width: 200px"
          />
          <div class="form-item-tip">
            文件访问URL的前缀路径
          </div>
        </el-form-item>
      </div>

      <!-- 存储限制配置 -->
      <div class="form-section">
        <h4>存储限制配置</h4>
        
        <el-form-item label="最大文件大小">
          <el-input-number 
            v-model="storageConfig.MaxFileSize" 
            :min="1" 
            :max="1024" 
            placeholder="50"
            style="width: 150px"
          />
          <span style="margin-left: 8px;">MB</span>
          <div class="form-item-tip">
            单个文件的最大允许大小
          </div>
        </el-form-item>

        <el-form-item label="允许的文件类型">
          <el-select 
            v-model="storageConfig.AllowedExtensions" 
            multiple 
            placeholder="选择允许的文件扩展名"
            style="width: 100%"
          >
            <el-option label=".jpg" value=".jpg" />
            <el-option label=".jpeg" value=".jpeg" />
            <el-option label=".png" value=".png" />
            <el-option label=".gif" value=".gif" />
            <el-option label=".bmp" value=".bmp" />
            <el-option label=".webp" value=".webp" />
            <el-option label=".pdf" value=".pdf" />
            <el-option label=".doc" value=".doc" />
            <el-option label=".docx" value=".docx" />
            <el-option label=".xls" value=".xls" />
            <el-option label=".xlsx" value=".xlsx" />
            <el-option label=".ppt" value=".ppt" />
            <el-option label=".pptx" value=".pptx" />
            <el-option label=".mp4" value=".mp4" />
            <el-option label=".avi" value=".avi" />
            <el-option label=".mov" value=".mov" />
          </el-select>
          <div class="form-item-tip">
            允许上传的文件类型扩展名
          </div>
        </el-form-item>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button 
          type="primary" 
          @click="saveConfig" 
          :loading="isSubmitting"
        >
          {{ isSubmitting ? '保存中...' : '保存配置' }}
        </el-button>
        
        <el-button @click="testStorage" :loading="isTesting">
          {{ isTesting ? '测试中...' : '测试存储' }}
        </el-button>
        
        <el-button @click="() => loadConfig(true)" :loading="isLoading">
          {{ isLoading ? '刷新中...' : '刷新配置' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 响应式数据
const storageFormRef = ref()
const isSubmitting = ref(false)
const isTesting = ref(false)
const isLoading = ref(false)
const currentConfigId = ref(null)
const currentConfig = ref(null)

// 存储配置表单
const storageConfig = reactive({
  FileStoragePath: 'D:\\DMSData\\IMG-VIDEO',
  ExcelTempPath: 'file:///C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel',
  NetworkSharePath: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计',
  FileServerPort: 8080,
  FileUrlPrefix: '/files',
  MaxFileSize: 50,
  AllowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp4', '.avi', '.mov']
})

// 表单验证规则
const storageRules = {
  FileStoragePath: [
    { required: true, message: '请输入文件存储路径', trigger: 'blur' }
  ],
  FileServerPort: [
    { required: true, message: '请输入文件服务端口', trigger: 'blur' }
  ],
  FileUrlPrefix: [
    { required: true, message: '请输入URL前缀', trigger: 'blur' }
  ]
}

// 加载配置
const loadConfig = async (showMessage = false) => {
  isLoading.value = true
  try {
    const response = await axios.get('/api/config/db-list')
    if (response.data.success && response.data.data.length > 0) {
      const config = response.data.data[0] // 获取当前配置
      currentConfigId.value = config.ID
      currentConfig.value = config // 保存完整配置
      if (config.FileStoragePath) storageConfig.FileStoragePath = config.FileStoragePath
      if (config.ExcelTempPath) storageConfig.ExcelTempPath = config.ExcelTempPath
      if (config.NetworkSharePath) storageConfig.NetworkSharePath = config.NetworkSharePath
      if (config.FileServerPort) storageConfig.FileServerPort = config.FileServerPort
      if (config.FileUrlPrefix) storageConfig.FileUrlPrefix = config.FileUrlPrefix

      if (showMessage) {
        ElMessage.success('配置刷新成功')
      }
    } else {
      if (showMessage) {
        ElMessage.warning('未找到配置数据')
      }
    }
  } catch (error) {
    ElMessage.error('加载存储配置失败')
  } finally {
    isLoading.value = false
  }
}

// 选择路径
const selectPath = () => {
  ElMessage.info('路径选择功能需要在服务器端实现')
}

// 保存配置
const saveConfig = async () => {
  if (!currentConfigId.value || !currentConfig.value) {
    ElMessage.error('未找到配置信息，请先刷新配置')
    return
  }

  await storageFormRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true
      try {
        // 调用更新配置的API，使用当前配置的完整信息
        const response = await axios.put(`/api/config/db/${currentConfigId.value}`, {
          Host: currentConfig.value.Host,
          DatabaseName: currentConfig.value.DatabaseName,
          DbUser: currentConfig.value.DbUser,
          DbPassword: currentConfig.value.DbPassword,
          ConfigName: currentConfig.value.ConfigName,
          Remark: currentConfig.value.Remark || '存储配置已更新',
          FileStoragePath: storageConfig.FileStoragePath,
          FileServerPort: storageConfig.FileServerPort,
          FileUrlPrefix: storageConfig.FileUrlPrefix,
          ExcelTempPath: storageConfig.ExcelTempPath,
          NetworkSharePath: storageConfig.NetworkSharePath
        })

        if (response.data.success) {
          ElMessage.success('存储配置保存成功')
          // 重新加载配置以确保数据同步
          await loadConfig()
        } else {
          ElMessage.error(response.data.message || '保存失败')
        }
      } catch (error) {
        ElMessage.error('保存存储配置失败')
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

// 测试存储
const testStorage = async () => {
  isTesting.value = true
  try {
    const response = await axios.post('/api/config/test-storage', {
      path: storageConfig.FileStoragePath
    })
    
    if (response.data.success) {
      ElMessage.success('存储路径测试成功')
    } else {
      ElMessage.error(response.data.message || '存储路径测试失败')
    }
  } catch (error) {
    ElMessage.error('测试存储失败')
  } finally {
    isTesting.value = false
  }
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.storage-config {
  max-width: 800px;
}

.config-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.config-header h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.config-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #fafafa;
  border-radius: 6px;
}

.form-section h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.form-actions {
  padding: 20px 0;
  text-align: left;
}

.form-actions .el-button {
  margin-right: 12px;
}
</style>
