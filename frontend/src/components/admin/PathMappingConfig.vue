<template>
  <div class="path-mapping-config">
    <div class="config-header">
      <h3>路径映射配置</h3>
      <p>配置文件路径映射规则和转换方式</p>
    </div>

    <div class="mapping-sections">
      <!-- 路径映射规则 -->
      <div class="form-section">
        <h4>路径映射规则</h4>
        
        <div class="mapping-list">
          <div 
            v-for="(mapping, index) in pathMappings" 
            :key="index" 
            class="mapping-item"
          >
            <div class="mapping-header">
              <span class="mapping-name">{{ mapping.name }}</span>
              <el-button 
                type="danger" 
                size="small" 
                @click="removeMapping(index)"
                :icon="Delete"
              >
                删除
              </el-button>
            </div>
            
            <el-form :model="mapping" label-width="100px" class="mapping-form">
              <el-form-item label="规则名称">
                <el-input v-model="mapping.name" placeholder="输入规则名称" />
              </el-form-item>
              
              <el-form-item label="本地路径">
                <el-input 
                  v-model="mapping.localPattern" 
                  placeholder="如：C:\Users\*\AppData\Roaming\Microsoft\Excel\*"
                />
              </el-form-item>
              
              <el-form-item label="目标路径">
                <el-input 
                  v-model="mapping.targetPattern" 
                  placeholder="如：\\tj_server\工作\品质部\生产异常周报考核统计\*"
                />
              </el-form-item>
              
              <el-form-item label="描述">
                <el-input 
                  v-model="mapping.description" 
                  placeholder="规则描述"
                  type="textarea"
                  :rows="2"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>
        
        <el-button 
          type="primary" 
          @click="addMapping" 
          :icon="Plus"
          style="margin-top: 16px"
        >
          添加映射规则
        </el-button>
      </div>

      <!-- 转换设置 -->
      <div class="form-section">
        <h4>转换设置</h4>
        
        <el-form :model="conversionConfig" label-width="140px">
          <el-form-item label="启用自动转换">
            <el-switch v-model="conversionConfig.autoConvert" />
            <div class="form-item-tip">
              自动将Excel临时路径转换为网络路径
            </div>
          </el-form-item>
          
          <el-form-item label="保留原始路径">
            <el-switch v-model="conversionConfig.keepOriginal" />
            <div class="form-item-tip">
              在转换后保留原始路径信息
            </div>
          </el-form-item>
          
          <el-form-item label="文件拷贝模式">
            <el-switch v-model="conversionConfig.fileCopyMode" />
            <div class="form-item-tip">
              启用文件拷贝到服务器存储路径
            </div>
          </el-form-item>
          
          <el-form-item label="路径验证">
            <el-switch v-model="conversionConfig.validatePaths" />
            <div class="form-item-tip">
              在转换前验证路径是否存在
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 测试区域 -->
      <div class="form-section">
        <h4>路径转换测试</h4>
        
        <el-form label-width="100px">
          <el-form-item label="测试路径">
            <el-input 
              v-model="testPath" 
              placeholder="输入要测试的路径"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="testConversion" :loading="isTesting">
              {{ isTesting ? '测试中...' : '测试转换' }}
            </el-button>
          </el-form-item>
          
          <el-form-item label="转换结果" v-if="testResult">
            <el-input 
              v-model="testResult" 
              type="textarea" 
              :rows="3" 
              readonly
            />
          </el-form-item>
        </el-form>
      </div>
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
      
      <el-button @click="() => loadConfig(true)" :loading="isLoading">
        {{ isLoading ? '刷新中...' : '刷新配置' }}
      </el-button>
      
      <el-button @click="resetConfig">
        重置为默认
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const isSubmitting = ref(false)
const isTesting = ref(false)
const isLoading = ref(false)
const testPath = ref('')
const testResult = ref('')

// 路径映射规则
const pathMappings = ref([
  {
    name: 'Excel临时文件映射',
    localPattern: 'C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Excel\\*',
    targetPattern: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\*',
    description: 'Excel临时文件映射到tj_server共享盘'
  },
  {
    name: '2025年异常汇总映射',
    localPattern: '*2025年异常汇总\\*',
    targetPattern: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\不良图片&资料\\*',
    description: '2025年异常汇总文件映射'
  }
])

// 转换配置
const conversionConfig = reactive({
  autoConvert: true,
  keepOriginal: false,
  fileCopyMode: true,
  validatePaths: false
})

// 添加映射规则
const addMapping = () => {
  pathMappings.value.push({
    id: null, // 新记录没有ID
    name: '新映射规则',
    localPattern: '',
    targetPattern: '',
    description: '',
    isActive: true
  })
}

// 删除映射规则
const removeMapping = (index) => {
  pathMappings.value.splice(index, 1)
}

// 测试路径转换
const testConversion = async () => {
  if (!testPath.value.trim()) {
    ElMessage.warning('请输入要测试的路径')
    return
  }

  isTesting.value = true
  try {
    const response = await axios.post('/api/import/test-path-conversion', {
      path: testPath.value,
      mappings: pathMappings.value,
      config: conversionConfig
    })
    
    if (response.data.success) {
      testResult.value = response.data.data.convertedPath || '无匹配的映射规则'
      ElMessage.success('路径转换测试完成')
    } else {
      testResult.value = response.data.message || '转换失败'
      ElMessage.error('路径转换测试失败')
    }
  } catch (error) {
    testResult.value = '测试失败: ' + error.message
    ElMessage.error('测试路径转换失败')
  } finally {
    isTesting.value = false
  }
}

// 加载配置
const loadConfig = async (showMessage = false) => {
  isLoading.value = true
  try {
    const response = await axios.get('/api/import/path-mapping-config')
    if (response.data.success) {
      const config = response.data.data
      if (config.pathMappings) {
        // 过滤掉服务器存储路径映射（这是动态生成的，不需要用户编辑）
        const userMappings = config.pathMappings.filter(mapping => mapping.id !== 'server-storage')

        pathMappings.value = userMappings.map(mapping => ({
          id: mapping.id,
          name: mapping.name,
          localPattern: mapping.localPattern,
          targetPattern: mapping.targetPattern,
          description: mapping.description,
          isActive: mapping.isActive !== false
        }))
      }

      if (showMessage) {
        ElMessage.success('配置刷新成功')
      }
    } else {
      ElMessage.error(response.data.message || '加载配置失败')
    }
  } catch (error) {
    ElMessage.error('加载路径映射配置失败')
  } finally {
    isLoading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  // 验证配置数据
  if (!pathMappings.value || pathMappings.value.length === 0) {
    ElMessage.warning('请至少添加一个路径映射规则')
    return
  }

  // 验证每个映射规则
  for (let i = 0; i < pathMappings.value.length; i++) {
    const mapping = pathMappings.value[i]
    if (!mapping.name || !mapping.localPattern || !mapping.targetPattern) {
      ElMessage.error(`第 ${i + 1} 个映射规则信息不完整`)
      return
    }
  }

  isSubmitting.value = true
  try {
    const response = await axios.put('/api/import/path-mapping-config', {
      pathMappings: pathMappings.value.map(mapping => ({
        id: mapping.id,
        name: mapping.name,
        localPattern: mapping.localPattern,
        targetPattern: mapping.targetPattern,
        description: mapping.description || '',
        isActive: mapping.isActive !== false
      })),
      conversionConfig: conversionConfig
    })

    if (response.data.success) {
      ElMessage.success('路径映射配置保存成功')
      // 重新加载配置以确保数据同步
      await loadConfig()
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存路径映射配置失败: ' + (error.response?.data?.message || error.message))
  } finally {
    isSubmitting.value = false
  }
}

// 重置配置
const resetConfig = () => {
  pathMappings.value = [
    {
      name: 'Excel临时文件映射',
      localPattern: 'C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Excel\\*',
      targetPattern: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\*',
      description: 'Excel临时文件映射到tj_server共享盘'
    },
    {
      name: '2025年异常汇总映射',
      localPattern: '*2025年异常汇总\\*',
      targetPattern: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\不良图片&资料\\*',
      description: '2025年异常汇总文件映射'
    }
  ]
  
  Object.assign(conversionConfig, {
    autoConvert: true,
    keepOriginal: false,
    fileCopyMode: true,
    validatePaths: false
  })
  
  ElMessage.success('配置已重置为默认值')
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.path-mapping-config {
  max-width: 900px;
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

.mapping-item {
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.mapping-name {
  font-weight: 600;
  color: #303133;
}

.mapping-form {
  margin: 0;
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
