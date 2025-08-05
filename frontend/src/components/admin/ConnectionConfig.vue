<template>
  <div class="connection-config">
    <div class="config-header">
      <h3>数据库连接配置</h3>
      <p>配置数据库连接参数和相关设置</p>
    </div>

    <div class="config-layout">
      <!-- 左侧配置列表 -->
      <div class="config-list-panel">
        <div class="panel-header">
          <h4>配置列表</h4>
          <el-button
            type="primary"
            size="small"
            @click="createNewConfig"
            :icon="Plus"
          >
            新建配置
          </el-button>
        </div>

        <div class="config-list" v-loading="isLoadingConfigs">
          <div
            v-for="config in dbConfigs"
            :key="config.ID"
            class="config-item"
            :class="{ 'active': selectedConfigId === config.ID }"
            @click="selectConfig(config.ID)"
          >
            <div class="config-item-header">
              <span class="config-name">{{ config.ConfigName }}</span>
              <div class="config-badges">
                <el-tag v-if="config.IsCurrent" type="success" size="small">当前</el-tag>
                <el-tag v-if="!config.IsValid" type="danger" size="small">无效</el-tag>
              </div>
            </div>
            <div class="config-item-info">
              <span class="config-host">{{ config.Host }}</span>
              <span class="config-db">{{ config.DatabaseName }}</span>
            </div>
            <div class="config-item-time">
              {{ formatTime(config.UpdatedAt) }}
            </div>
          </div>

          <div v-if="dbConfigs.length === 0" class="empty-list">
            <el-empty description="暂无配置" :image-size="80" />
          </div>
        </div>
      </div>

      <!-- 右侧配置表单 -->
      <div class="config-form-panel">
        <el-form
          :model="dbConfig"
          :rules="dbRules"
          ref="dbFormRef"
          label-width="120px"
          class="config-form"
          @keydown.enter.prevent="saveConfig"
        >
        <!-- 基本配置 -->
        <div class="form-section">
          <div class="form-section-header">
            <h4>{{ selectedConfigId ? '编辑配置' : '新建配置' }}</h4>
            <div class="form-actions-inline" v-if="selectedConfigId">
              <el-button
                type="danger"
                size="small"
                @click="deleteConfig"
                :icon="Delete"
              >
                删除配置
              </el-button>
            </div>
          </div>

          <el-form-item label="配置名称" prop="ConfigName">
            <el-input v-model="dbConfig.ConfigName" placeholder="输入配置名称" />
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="dbConfig.Remark" placeholder="配置备注（可选）" />
          </el-form-item>
        </div>

      <!-- 数据库配置 -->
      <div class="form-section">
        <h4>数据库配置</h4>
        <el-form-item label="服务器地址" prop="Host">
          <el-input v-model="dbConfig.Host" placeholder="如：localhost" />
        </el-form-item>

        <el-form-item label="端口" prop="Port">
          <el-input v-model="dbConfig.Port" placeholder="默认：1433" />
        </el-form-item>

        <el-form-item label="数据库名" prop="DatabaseName">
          <el-input v-model="dbConfig.DatabaseName" placeholder="如：DMS-QA" />
        </el-form-item>

        <el-form-item label="用户名" prop="DbUser">
          <el-input v-model="dbConfig.DbUser" placeholder="数据库用户名" />
        </el-form-item>

        <el-form-item label="密码" prop="DbPassword">
          <el-input 
            v-model="dbConfig.DbPassword" 
            type="password" 
            placeholder="数据库密码" 
            show-password 
          />
        </el-form-item>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button 
          type="primary" 
          @click="saveConfig" 
          :loading="isSubmitting" 
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? (selectedConfigId ? '更新中...' : '保存中...') : (selectedConfigId ? '更新配置' : '新增配置') }}
        </el-button>
        
        <el-button @click="testConnection" :loading="isTesting">
          {{ isTesting ? '测试中...' : '测试连接' }}
        </el-button>
        
        <el-button 
          v-if="selectedConfigId" 
          type="danger" 
          @click="deleteConfig"
          :disabled="isSubmitting"
        >
          删除配置
        </el-button>
        </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const dbFormRef = ref()
const selectedConfigId = ref(null)
const isSubmitting = ref(false)
const isTesting = ref(false)
const isLoadingConfigs = ref(false)
const dbConfigs = ref([])

// 数据库配置表单
const dbConfig = reactive({
  ConfigName: '',
  Host: '',
  Port: '1433',
  DatabaseName: '',
  DbUser: '',
  DbPassword: '',
  Remark: ''
})

// 表单验证规则
const dbRules = {
  ConfigName: [
    { required: true, message: '请输入配置名称', trigger: 'blur' }
  ],
  Host: [
    { required: true, message: '请输入服务器地址', trigger: 'blur' }
  ],
  DatabaseName: [
    { required: true, message: '请输入数据库名', trigger: 'blur' }
  ],
  DbUser: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  DbPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

// 加载配置列表
const loadConfigs = async () => {
  isLoadingConfigs.value = true
  try {
    const response = await axios.get('/config/db-list')
    if (response.data.success) {
      dbConfigs.value = response.data.data
    }
  } catch (error) {
    ElMessage.error('加载配置失败')
  } finally {
    isLoadingConfigs.value = false
  }
}

// 配置选择变化
const onConfigChange = (configId) => {
  if (configId) {
    const config = dbConfigs.value.find(c => c.ID === configId)
    if (config) {
      Object.assign(dbConfig, {
        ConfigName: config.ConfigName,
        Host: config.Host,
        Port: config.Port || '1433',
        DatabaseName: config.DatabaseName,
        DbUser: config.DbUser,
        DbPassword: config.DbPassword || '',
        Remark: config.Remark || ''
      })
    }
  } else {
    // 新建配置，清空表单
    Object.assign(dbConfig, {
      ConfigName: '',
      Host: '',
      Port: '1433',
      DatabaseName: '',
      DbUser: '',
      DbPassword: '',
      Remark: ''
    })
  }
}

// 选择配置
const selectConfig = (configId) => {
  selectedConfigId.value = configId
  onConfigChange(configId)
}

// 创建新配置
const createNewConfig = () => {
  selectedConfigId.value = null
  onConfigChange(null)
}

// 格式化时间
const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 保存配置
const saveConfig = async () => {
  if (isSubmitting.value) return

  await dbFormRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true
      try {
        const url = selectedConfigId.value 
          ? `/config/db-config/${selectedConfigId.value}`
          : '/config/db-config'
        
        const method = selectedConfigId.value ? 'put' : 'post'
        
        const response = await axios[method](url, dbConfig)
        
        if (response.data.success) {
          ElMessage.success(selectedConfigId.value ? '配置更新成功' : '配置保存成功')
          await loadConfigs()
          
          if (!selectedConfigId.value && response.data.data?.ID) {
            selectedConfigId.value = response.data.data.ID
          }
        } else {
          ElMessage.error(response.data.message || '保存失败')
        }
      } catch (error) {
        ElMessage.error('保存配置失败')
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

// 测试连接
const testConnection = async () => {
  await dbFormRef.value.validate(async (valid) => {
    if (valid) {
      isTesting.value = true
      try {
        const response = await axios.post('/config/test-connection', dbConfig)
        if (response.data.success) {
          ElMessage.success('连接测试成功')
        } else {
          ElMessage.error(response.data.message || '连接测试失败')
        }
      } catch (error) {
        ElMessage.error('连接测试失败')
      } finally {
        isTesting.value = false
      }
    }
  })
}

// 删除配置
const deleteConfig = async () => {
  if (!selectedConfigId.value) return

  try {
    await ElMessageBox.confirm('确定要删除这个配置吗？', '确认删除', {
      type: 'warning'
    })

    const response = await axios.delete(`/config/db/${selectedConfigId.value}`)
    if (response.data.success) {
      ElMessage.success('配置删除成功')
      selectedConfigId.value = null
      onConfigChange(null)
      await loadConfigs()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除配置失败')
    }
  }
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.connection-config {
  max-width: 1200px;
}

.config-layout {
  display: flex;
  gap: 20px;
  height: 600px;
}

.config-list-panel {
  width: 350px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.panel-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.config-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.config-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.config-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.config-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.config-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.config-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.config-badges {
  display: flex;
  gap: 4px;
}

.config-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.config-host, .config-db {
  font-size: 12px;
  color: #606266;
}

.config-item-time {
  font-size: 11px;
  color: #909399;
  text-align: right;
}

.empty-list {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.config-form-panel {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  padding: 20px;
  overflow-y: auto;
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

.form-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-section-header h4 {
  margin: 0;
}

.form-actions-inline {
  display: flex;
  gap: 8px;
}

.form-actions {
  padding: 20px 0;
  text-align: left;
}

.form-actions .el-button {
  margin-right: 12px;
}
</style>
