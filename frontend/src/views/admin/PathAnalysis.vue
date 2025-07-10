<template>
  <div class="path-analysis-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>数据库路径格式分析</span>
          <el-button type="primary" @click="fetchPathAnalysis" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新分析
          </el-button>
        </div>
      </template>
      
      <el-row :gutter="20" v-if="statistics">
        <el-col :span="8">
          <el-statistic title="总记录数" :value="statistics.total" />
        </el-col>
        <el-col :span="16">
          <div class="type-distribution">
            <h4>路径类型分布：</h4>
            <el-tag 
              v-for="(count, type) in statistics.typeDistribution" 
              :key="type" 
              :type="getTagType(type)"
              style="margin: 4px;"
            >
              {{ getTypeLabel(type) }}: {{ count }}
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card" v-loading="loading">
      <template #header>
        <span>路径详细分析</span>
      </template>
      
      <el-table :data="pathRecords" style="width: 100%" max-height="600">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="customer" label="客户" width="100" />
        <el-table-column prop="orderNo" label="工单号" width="120" />
        
        <el-table-column label="路径类型" width="120">
          <template #default="scope">
            <el-tag :type="getTagType(scope.row.pathType)" size="small">
              {{ getTypeLabel(scope.row.pathType) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="原始路径" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.originalPath" placement="top">
              <div class="path-text">{{ scope.row.originalPath }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column label="标准化路径" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.normalizedPath" placement="top">
              <div class="path-text">{{ scope.row.displayPath }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column label="可访问性" width="100">
          <template #default="scope">
            <el-icon v-if="scope.row.isAccessible" color="green"><Check /></el-icon>
            <el-icon v-else color="red"><Close /></el-icon>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button 
              type="text" 
              size="small" 
              @click="testPathAccess(scope.row)"
              :disabled="!scope.row.isAccessible"
            >
              测试访问
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 路径访问测试对话框 -->
    <el-dialog v-model="testDialogVisible" title="路径访问测试" width="600px">
      <div v-if="testResult">
        <el-alert
          :title="testResult.success ? '访问成功' : '访问失败'"
          :type="testResult.success ? 'success' : 'error'"
          :closable="false"
          show-icon
        >
          <template #default>
            <p><strong>测试路径:</strong> {{ testResult.path }}</p>
            <p v-if="testResult.success"><strong>文件信息:</strong> {{ testResult.info }}</p>
            <p v-if="!testResult.success"><strong>错误信息:</strong> {{ testResult.error }}</p>
          </template>
        </el-alert>
      </div>
      
      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Refresh, Check, Close } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const pathRecords = ref([])
const statistics = ref(null)
const testDialogVisible = ref(false)
const testResult = ref(null)

// 获取路径分析数据
const fetchPathAnalysis = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/import/analyze-paths', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (response.data.success) {
      pathRecords.value = response.data.data.records
      statistics.value = response.data.data.statistics
      ElMessage.success('路径分析完成')
    } else {
      ElMessage.error('分析失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('获取数据失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 获取路径类型标签样式
const getTagType = (pathType) => {
  const typeMap = {
    'network_path': 'success',
    'relative_path': 'warning', 
    'other': 'danger'
  }
  return typeMap[pathType] || 'info'
}

// 获取路径类型标签文本
const getTypeLabel = (pathType) => {
  const labelMap = {
    'network_path': '网络路径',
    'relative_path': '相对路径',
    'other': '其他格式'
  }
  return labelMap[pathType] || pathType
}

// 测试路径访问
const testPathAccess = async (record) => {
  testResult.value = null
  testDialogVisible.value = true
  
  try {
    // 这里可以添加实际的路径访问测试逻辑
    // 暂时模拟测试结果
    testResult.value = {
      success: record.isAccessible,
      path: record.normalizedPath,
      info: record.isAccessible ? '路径格式正确，可以访问' : null,
      error: record.isAccessible ? null : '路径格式不支持或无法访问'
    }
  } catch (error) {
    testResult.value = {
      success: false,
      path: record.normalizedPath,
      error: error.message
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchPathAnalysis()
})
</script>

<style scoped>
.path-analysis-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.type-distribution h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.path-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
