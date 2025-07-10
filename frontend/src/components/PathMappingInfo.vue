<template>
  <el-dialog
    v-model="visible"
    title="文件路径映射说明"
    width="800px"
    :before-close="handleClose"
  >
    <div v-loading="loading" element-loading-text="正在加载配置信息...">
      <el-alert
        title="重要提示"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px;"
      >
        <template #default>
          <p>Excel导入时，本地文件路径将自动转换为网络可访问的HTTP URL，确保在局域网内任何设备都能正常访问文件。</p>
        </template>
      </el-alert>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 路径转换规则 -->
        <el-tab-pane label="路径转换规则" name="mapping">
          <el-table :data="pathMappings" style="width: 100%">
            <el-table-column prop="name" label="规则名称" width="150" />
            <el-table-column prop="description" label="说明" width="200" />
            <el-table-column label="转换示例">
              <template #default="scope">
                <div class="path-example">
                  <div class="original-path">
                    <el-tag type="warning" size="small">原路径</el-tag>
                    <code>{{ getExamplePath(scope.row) }}</code>
                  </div>
                  <el-icon style="margin: 5px 0;"><ArrowDown /></el-icon>
                  <div class="converted-path">
                    <el-tag type="success" size="small">转换后</el-tag>
                    <code>{{ getConvertedExample(scope.row) }}</code>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 访问方式 -->
        <el-tab-pane label="访问方式" name="access">
          <el-row :gutter="20">
            <el-col :span="12" v-for="(method, key) in accessMethods" :key="key">
              <el-card :class="{ 'method-enabled': method.enabled, 'method-disabled': !method.enabled }">
                <template #header>
                  <div class="method-header">
                    <span>{{ getMethodName(key) }}</span>
                    <el-tag :type="method.enabled ? 'success' : 'info'" size="small">
                      {{ method.enabled ? '已启用' : '未启用' }}
                    </el-tag>
                  </div>
                </template>
                <p>{{ method.description }}</p>
                <div v-if="method.baseUrl" class="base-url">
                  <strong>基础URL:</strong> <code>{{ method.baseUrl }}</code>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 支持的文件类型 -->
        <el-tab-pane label="支持的文件类型" name="filetypes">
          <div class="file-types">
            <h4>图片文件</h4>
            <div class="type-group">
              <el-tag v-for="type in imageTypes" :key="type" class="type-tag">{{ type }}</el-tag>
            </div>
            
            <h4>文档文件</h4>
            <div class="type-group">
              <el-tag v-for="type in documentTypes" :key="type" class="type-tag">{{ type }}</el-tag>
            </div>
            
            <h4>媒体文件</h4>
            <div class="type-group">
              <el-tag v-for="type in mediaTypes" :key="type" class="type-tag">{{ type }}</el-tag>
            </div>
            
            <h4>压缩文件</h4>
            <div class="type-group">
              <el-tag v-for="type in archiveTypes" :key="type" class="type-tag">{{ type }}</el-tag>
            </div>
          </div>
        </el-tab-pane>

        <!-- 部署说明 -->
        <el-tab-pane label="部署说明" name="deployment">
          <el-steps :active="deploymentStep" direction="vertical">
            <el-step title="安装文件服务器" description="在数据库服务器上安装Nginx或Apache">
              <template #icon><el-icon><Setting /></el-icon></template>
            </el-step>
            <el-step title="配置文件服务" description="设置文件服务器指向共享目录">
              <template #icon><el-icon><Folder /></el-icon></template>
            </el-step>
            <el-step title="设置网络权限" description="配置CORS和安全策略">
              <template #icon><el-icon><Lock /></el-icon></template>
            </el-step>
            <el-step title="测试访问" description="验证局域网内其他设备的访问">
              <template #icon><el-icon><Check /></el-icon></template>
            </el-step>
          </el-steps>
          
          <el-alert
            title="服务器配置信息"
            type="success"
            :closable="false"
            show-icon
            style="margin-top: 20px;"
          >
            <template #default>
              <p><strong>数据库服务器IP:</strong> {{ serverIP }}</p>
              <p><strong>文件服务器端口:</strong> 8080</p>
              <p><strong>访问基础URL:</strong> {{ accessMethods.http?.baseUrl || 'http://192.168.1.57:8080/files' }}</p>
            </template>
          </el-alert>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="testConnection">测试连接</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, Setting, Folder, Lock, Check } from '@element-plus/icons-vue'
import axios from 'axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const activeTab = ref('mapping')
const deploymentStep = ref(3)

// 配置数据
const serverIP = ref('192.168.1.57')
const pathMappings = ref([])
const accessMethods = ref({})
const supportedFileTypes = ref([])

// 计算属性：按类型分组的文件类型
const imageTypes = computed(() => 
  supportedFileTypes.value.filter(type => 
    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(type)
  )
)

const documentTypes = computed(() => 
  supportedFileTypes.value.filter(type => 
    ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(type)
  )
)

const mediaTypes = computed(() => 
  supportedFileTypes.value.filter(type => 
    ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mp3', '.wav', '.wma', '.aac'].includes(type)
  )
)

const archiveTypes = computed(() => 
  supportedFileTypes.value.filter(type => 
    ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(type)
  )
)

// 方法
const handleClose = () => {
  visible.value = false
}

const getMethodName = (key) => {
  const names = {
    http: 'HTTP服务器',
    direct: '直接网络路径',
    ftp: 'FTP服务器'
  }
  return names[key] || key
}

const getExamplePath = (mapping) => {
  const examples = {
    'Windows C Drive': 'C:\\Users\\Documents\\图片.jpg',
    'Windows D Drive': 'D:\\共享文件\\报告.pdf',
    'Windows E Drive': 'E:\\工厂照片\\设备.png',
    'Shared Folder': './相对路径/文件.txt',
    'Network Path': '\\\\192.168.1.100\\shared\\file.jpg'
  }
  return examples[mapping.name] || 'C:\\example\\file.jpg'
}

const getConvertedExample = (mapping) => {
  const baseUrl = accessMethods.value.http?.baseUrl || 'http://192.168.1.57:8080/files'
  const examples = {
    'Windows C Drive': `${baseUrl}/C$/Users/Documents/%E5%9B%BE%E7%89%87.jpg`,
    'Windows D Drive': `${baseUrl}/D$/共享文件/%E6%8A%A5%E5%91%8A.pdf`,
    'Windows E Drive': `${baseUrl}/E$/工厂照片/%E8%AE%BE%E5%A4%87.png`,
    'Shared Folder': `${baseUrl}/shared/相对路径/%E6%96%87%E4%BB%B6.txt`,
    'Network Path': `${baseUrl}/shared/file.jpg`
  }
  return examples[mapping.name] || `${baseUrl}/example/file.jpg`
}

const loadConfig = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/import/path-mapping-config')
    if (response.data.success) {
      const { data } = response.data
      serverIP.value = data.serverIP
      pathMappings.value = data.pathMappings
      accessMethods.value = data.accessMethods
      supportedFileTypes.value = data.supportedFileTypes
    }
  } catch (error) {
    ElMessage.error('加载配置失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const testConnection = async () => {
  const testUrl = accessMethods.value.http?.baseUrl || 'http://192.168.1.57:8080'
  try {
    ElMessage.info('正在测试连接...')
    // 这里可以添加实际的连接测试逻辑
    // 由于跨域限制，实际测试可能需要后端代理
    ElMessage.success('连接测试功能需要在实际部署环境中进行')
  } catch (error) {
    ElMessage.error('连接测试失败: ' + error.message)
  }
}

onMounted(() => {
  if (visible.value) {
    loadConfig()
  }
})

// 监听对话框打开
const handleOpen = () => {
  loadConfig()
}

defineExpose({
  handleOpen
})
</script>

<style scoped>
.path-example {
  font-size: 12px;
}

.original-path, .converted-path {
  margin: 2px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.original-path code, .converted-path code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 11px;
  word-break: break-all;
}

.method-enabled {
  border-color: #67c23a;
}

.method-disabled {
  border-color: #e4e7ed;
  opacity: 0.7;
}

.method-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.base-url {
  margin-top: 10px;
  font-size: 12px;
}

.base-url code {
  background: #f0f9ff;
  color: #1890ff;
  padding: 2px 4px;
  border-radius: 3px;
}

.file-types h4 {
  margin: 20px 0 10px 0;
  color: #303133;
}

.type-group {
  margin-bottom: 15px;
}

.type-tag {
  margin: 2px 4px 2px 0;
}
</style>
