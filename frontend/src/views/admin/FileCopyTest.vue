<template>
  <div class="file-copy-test">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>文件拷贝功能测试</h2>
          <p>测试Excel超链接文件自动拷贝到服务器功能</p>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 单文件测试 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>单文件拷贝测试</h3>
            </template>

            <el-form @submit.prevent="testSingleFile">
              <el-form-item label="文件路径">
                <el-input
                  v-model="singleFilePath"
                  placeholder="例如: C:\Users\Documents\图片.jpg"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="testSingleFile" :loading="singleFileLoading">
                  测试拷贝
                </el-button>
                <el-button @click="singleFilePath = ''">清空</el-button>
              </el-form-item>
            </el-form>

            <div v-if="singleFileResult" class="result-section">
              <h4>测试结果:</h4>
              <el-alert
                :title="singleFileResult.success ? '拷贝成功' : '拷贝失败'"
                :type="singleFileResult.success ? 'success' : 'error'"
                :closable="false"
                show-icon
              >
                <template #default>
                  <div v-if="singleFileResult.success">
                    <p><strong>原始路径:</strong> {{ singleFileResult.data.originalPath }}</p>
                    <p><strong>文件名:</strong> {{ singleFileResult.data.fileName }}</p>
                    <p><strong>访问URL:</strong> 
                      <a :href="singleFileResult.data.accessUrl" target="_blank">
                        {{ singleFileResult.data.accessUrl }}
                      </a>
                    </p>
                    <p><strong>文件大小:</strong> {{ formatFileSize(singleFileResult.data.fileSize) }}</p>
                  </div>
                  <div v-else>
                    <p><strong>错误信息:</strong> {{ singleFileResult.data.error }}</p>
                  </div>
                </template>
              </el-alert>
            </div>
          </el-card>
        </el-col>

        <!-- 批量文件测试 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>批量文件拷贝测试</h3>
            </template>

            <el-form @submit.prevent="testBatchFiles">
              <el-form-item label="文件路径列表">
                <el-input
                  v-model="batchFilePaths"
                  type="textarea"
                  :rows="4"
                  placeholder="每行一个文件路径，例如:&#10;C:\Users\Documents\图片1.jpg&#10;D:\文档\报告.pdf&#10;E:\视频\演示.mp4"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="testBatchFiles" :loading="batchFileLoading">
                  批量测试
                </el-button>
                <el-button @click="batchFilePaths = ''">清空</el-button>
              </el-form-item>
            </el-form>

            <div v-if="batchFileResult" class="result-section">
              <h4>批量测试结果:</h4>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="总数">{{ batchFileResult.total }}</el-descriptions-item>
                <el-descriptions-item label="成功">{{ batchFileResult.successful }}</el-descriptions-item>
                <el-descriptions-item label="失败">{{ batchFileResult.failed }}</el-descriptions-item>
              </el-descriptions>

              <div v-if="batchFileResult.results.length > 0" style="margin-top: 15px;">
                <el-table :data="batchFileResult.results" border size="small">
                  <el-table-column prop="originalPath" label="原始路径" min-width="200" />
                  <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                      <el-tag :type="scope.row.success ? 'success' : 'danger'" size="small">
                        {{ scope.row.success ? '成功' : '失败' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="结果" min-width="200">
                    <template #default="scope">
                      <div v-if="scope.row.success">
                        <a :href="scope.row.accessUrl" target="_blank" style="color: #409EFF;">
                          {{ scope.row.fileName }}
                        </a>
                      </div>
                      <div v-else style="color: #F56C6C;">
                        {{ scope.row.error }}
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 配置信息 -->
      <el-card style="margin-top: 20px;">
        <template #header>
          <h3>当前配置信息</h3>
        </template>

        <el-row :gutter="20" v-loading="configLoading">
          <el-col :span="8">
            <el-descriptions title="服务器配置" :column="1" border>
              <el-descriptions-item label="服务器IP">{{ config.serverIP || '加载中...' }}</el-descriptions-item>
              <el-descriptions-item label="文件服务端口">8080</el-descriptions-item>
              <el-descriptions-item label="访问前缀">/files/attachments</el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="8">
            <el-descriptions title="文件限制" :column="1" border>
              <el-descriptions-item label="最大文件大小">50 MB</el-descriptions-item>
              <el-descriptions-item label="允许的文件类型">
                <el-tag v-for="type in config.supportedFileTypes?.slice(0, 5)" :key="type" size="small" style="margin: 2px;">
                  {{ type }}
                </el-tag>
                <span v-if="config.supportedFileTypes?.length > 5">...</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="8">
            <el-descriptions title="拷贝模式" :column="1" border>
              <el-descriptions-item label="状态">
                <el-tag :type="config.accessMethods?.fileCopy?.enabled ? 'success' : 'danger'" size="small">
                  {{ config.accessMethods?.fileCopy?.enabled ? '已启用' : '已禁用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="目标目录">{{ config.accessMethods?.fileCopy?.targetDirectory || 'N/A' }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </el-card>

      <!-- 常用测试路径 -->
      <el-card style="margin-top: 20px;">
        <template #header>
          <h3>常用测试路径</h3>
        </template>

        <el-row :gutter="10">
          <el-col :span="6" v-for="(path, index) in commonTestPaths" :key="index">
            <el-button 
              size="small" 
              style="width: 100%; margin-bottom: 5px;"
              @click="singleFilePath = path"
            >
              {{ path.split('\\').pop() }}
            </el-button>
          </el-col>
        </el-row>
      </el-card>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 响应式数据
const singleFilePath = ref('')
const singleFileLoading = ref(false)
const singleFileResult = ref(null)

const batchFilePaths = ref('')
const batchFileLoading = ref(false)
const batchFileResult = ref(null)

const config = ref({})
const configLoading = ref(false)

// 常用测试路径
const commonTestPaths = ref([
  'C:\\Windows\\System32\\notepad.exe',
  'C:\\Users\\Public\\Pictures\\Sample Pictures\\Chrysanthemum.jpg',
  'D:\\测试文件\\图片.jpg',
  'E:\\文档\\报告.pdf'
])

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 测试单文件拷贝
const testSingleFile = async () => {
  if (!singleFilePath.value.trim()) {
    ElMessage.warning('请输入文件路径')
    return
  }

  singleFileLoading.value = true
  singleFileResult.value = null

  try {
    const response = await axios.post('/api/import/test-file-copy', {
      filePath: singleFilePath.value.trim()
    })

    singleFileResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('文件拷贝测试成功')
    } else {
      ElMessage.error('文件拷贝测试失败')
    }
  } catch (error) {
    singleFileResult.value = {
      success: false,
      data: {
        error: error.response?.data?.message || error.message
      }
    }
    ElMessage.error('测试请求失败: ' + error.message)
  } finally {
    singleFileLoading.value = false
  }
}

// 测试批量文件拷贝
const testBatchFiles = async () => {
  if (!batchFilePaths.value.trim()) {
    ElMessage.warning('请输入文件路径列表')
    return
  }

  const paths = batchFilePaths.value.split('\n').filter(path => path.trim())
  if (paths.length === 0) {
    ElMessage.warning('请输入有效的文件路径')
    return
  }

  batchFileLoading.value = true
  batchFileResult.value = null

  try {
    // 模拟批量测试（逐个调用单文件测试API）
    const results = []
    for (const path of paths) {
      try {
        const response = await axios.post('/api/import/test-file-copy', {
          filePath: path.trim()
        })
        results.push(response.data.data)
      } catch (error) {
        results.push({
          success: false,
          originalPath: path.trim(),
          error: error.response?.data?.message || error.message
        })
      }
    }

    batchFileResult.value = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    }

    ElMessage.success(`批量测试完成：成功 ${batchFileResult.value.successful} 个，失败 ${batchFileResult.value.failed} 个`)
  } catch (error) {
    ElMessage.error('批量测试失败: ' + error.message)
  } finally {
    batchFileLoading.value = false
  }
}

// 加载配置信息
const loadConfig = async () => {
  configLoading.value = true
  try {
    const response = await axios.get('/api/import/path-mapping-config')
    if (response.data.success) {
      config.value = response.data.data
    }
  } catch (error) {
    ElMessage.error('加载配置失败: ' + error.message)
  } finally {
    configLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.file-copy-test {
  padding: 20px;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.result-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #EBEEF5;
}

.result-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}
</style>
