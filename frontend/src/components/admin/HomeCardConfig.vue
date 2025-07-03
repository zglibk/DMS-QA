<template>
  <div class="home-card-config">
    <el-card>
      <template #header>
        <div class="config-header">
          <div class="config-title">
            <el-icon><Setting /></el-icon>
            <span>主页卡片显示配置</span>
          </div>
          <div class="config-description">
            配置主页顶部统计卡片的显示内容，避免重复显示相同的部门/车间
          </div>
        </div>
      </template>

      <div class="config-content">
        <!-- 基础卡片配置 -->
        <div class="config-section">
          <h4>基础统计卡片</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="显示今日投诉">
                <el-switch v-model="config.showTodayCount" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="显示本月投诉">
                <el-switch v-model="config.showMonthCount" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 部门/车间卡片配置 -->
        <div class="config-section">
          <h4>部门/车间统计卡片</h4>
          <div class="unit-config">
            <div class="unit-header">
              <div class="unit-header-info">
                <span>选择要显示的部门/车间：</span>
                <el-tag size="small" type="info" style="margin-left: 8px;">
                  数据源：数据库Workshop/Department表
                </el-tag>
              </div>
              <el-dropdown @command="handleAddUnit" trigger="click" :loading="isLoadingOptions">
                <el-button type="primary" size="small" :disabled="isLoadingOptions">
                  <el-icon><Plus /></el-icon>
                  {{ isLoadingOptions ? '加载中...' : '添加单位' }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="workshop" :disabled="workshops.length === 0">
                      <el-icon><Tools /></el-icon>
                      添加车间 ({{ workshops.length }}个可选)
                    </el-dropdown-item>
                    <el-dropdown-item command="department" :disabled="departments.length === 0">
                      <el-icon><OfficeBuilding /></el-icon>
                      添加部门 ({{ departments.length }}个可选)
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            
            <div class="unit-list">
              <div 
                v-for="(unit, index) in config.displayUnits" 
                :key="index"
                class="unit-item"
              >
                <el-card shadow="hover">
                  <div class="unit-item-content">
                    <div class="unit-info">
                      <el-select
                        v-model="unit.name"
                        placeholder="请选择单位名称"
                        style="width: 200px;"
                        filterable
                        :loading="isLoadingOptions"
                        @change="handleUnitNameChange(unit, index)"
                      >
                        <el-option
                          v-for="option in getAvailableOptions(unit.type, index)"
                          :key="option.ID"
                          :label="option.Name"
                          :value="option.Name"
                        />
                      </el-select>
                      <el-select
                        v-model="unit.type"
                        placeholder="选择类型"
                        style="width: 120px; margin-left: 12px;"
                        @change="handleTypeChange(unit, index)"
                      >
                        <el-option label="部门" value="department" />
                        <el-option label="车间" value="workshop" />
                      </el-select>
                      <el-switch
                        v-model="unit.enabled"
                        style="margin-left: 12px;"
                        active-text="启用"
                        inactive-text="禁用"
                      />
                    </div>
                    <div class="unit-actions">
                      <el-button
                        type="danger"
                        size="small"
                        :icon="Delete"
                        @click="removeUnit(index)"
                      >
                        删除
                      </el-button>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>
          </div>
        </div>

        <!-- 显示顺序配置 -->
        <div class="config-section">
          <h4>显示顺序</h4>
          <el-alert 
            title="提示" 
            type="info" 
            :closable="false"
            style="margin-bottom: 16px;"
          >
            拖拽下方卡片可以调整显示顺序
          </el-alert>
          
          <draggable
            v-model="previewOrder"
            class="order-preview"
            item-key="key"
            @end="onDragEnd"
          >
            <template #item="{ element }">
              <div
                class="preview-card"
                :class="{ disabled: !element.enabled }"
              >
                <div class="preview-content">
                  <span class="preview-title">{{ element.title }}</span>
                  <span class="preview-type">{{ element.type }}</span>
                </div>
                <div class="drag-handle">⋮⋮</div>
              </div>
            </template>
          </draggable>
        </div>

        <!-- 操作按钮 -->
        <div class="config-actions">
          <el-button
            type="primary"
            @click="saveConfig"
            :loading="isSubmitting"
          >
            {{ isSubmitting ? '保存中...' : '保存配置' }}
          </el-button>

          <el-button
            type="success"
            @click="saveAsDefault"
            :loading="isSubmitting"
          >
            {{ isSubmitting ? '设置中...' : '保存并设为默认' }}
          </el-button>

          <el-button @click="loadConfig" :loading="isLoading">
            {{ isLoading ? '刷新中...' : '刷新配置' }}
          </el-button>

          <el-button @click="resetConfig">
            重置为默认
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Plus, Delete, ArrowDown, Tools, OfficeBuilding } from '@element-plus/icons-vue'
import axios from 'axios'
import draggable from 'vuedraggable'

// 响应式数据
const isSubmitting = ref(false)
const isLoading = ref(false)
const isLoadingOptions = ref(false)

// 车间和部门数据
const workshops = ref([])
const departments = ref([])

// 配置数据
const config = reactive({
  showTodayCount: true,
  showMonthCount: true,
  displayUnits: [
    { name: '数码印刷', type: 'workshop', enabled: true },
    { name: '轮转机', type: 'workshop', enabled: true },
    { name: '跟单', type: 'department', enabled: true },
    { name: '设计', type: 'department', enabled: true },
    { name: '品检', type: 'department', enabled: true }
  ]
})

// 预览顺序
const previewOrder = computed(() => {
  const items = []
  
  if (config.showTodayCount) {
    items.push({ key: 'today', title: '今日投诉', type: '基础统计', enabled: true })
  }
  
  if (config.showMonthCount) {
    items.push({ key: 'month', title: '本月总投诉', type: '基础统计', enabled: true })
  }
  
  config.displayUnits.forEach((unit, index) => {
    items.push({
      key: `unit-${index}`,
      title: unit.name,
      type: unit.type === 'department' ? '部门' : '车间',
      enabled: unit.enabled
    })
  })
  
  return items
})

// 获取车间和部门数据
const loadWorkshopsAndDepartments = async () => {
  isLoadingOptions.value = true
  try {
    // 并行获取车间和部门数据
    const [workshopsRes, departmentsRes] = await Promise.all([
      axios.get('/api/config/workshops'),
      axios.get('/api/config/departments')
    ])

    if (workshopsRes.data.success) {
      workshops.value = workshopsRes.data.data
    }

    if (departmentsRes.data.success) {
      departments.value = departmentsRes.data.data
    }
  } catch (error) {
    console.error('获取车间/部门数据失败:', error)
    ElMessage.error('获取车间/部门数据失败')
  } finally {
    isLoadingOptions.value = false
  }
}

// 根据类型获取选项
const getUnitOptions = (type) => {
  return type === 'workshop' ? workshops.value : departments.value
}

// 处理添加单位
const handleAddUnit = (type) => {
  const options = getUnitOptions(type)
  if (options.length === 0) {
    ElMessage.warning(`暂无可选的${type === 'workshop' ? '车间' : '部门'}数据`)
    return
  }

  // 查找第一个未添加的选项
  const existingNames = config.displayUnits
    .filter(unit => unit.type === type)
    .map(unit => unit.name)

  const availableOption = options.find(option => !existingNames.includes(option.Name))

  if (!availableOption) {
    ElMessage.warning(`所有${type === 'workshop' ? '车间' : '部门'}都已添加`)
    return
  }

  config.displayUnits.push({
    name: availableOption.Name,
    type: type,
    enabled: true
  })

  ElMessage.success(`已添加${type === 'workshop' ? '车间' : '部门'}：${availableOption.Name}`)
}

// 获取可用选项（排除已选择的）
const getAvailableOptions = (type, currentIndex) => {
  const allOptions = getUnitOptions(type)
  const usedNames = config.displayUnits
    .filter((unit, index) => unit.type === type && index !== currentIndex)
    .map(unit => unit.name)

  return allOptions.filter(option => !usedNames.includes(option.Name))
}

// 处理单位名称变更
const handleUnitNameChange = (unit, index) => {
  // 检查是否重复
  const duplicateIndex = config.displayUnits.findIndex((u, i) =>
    i !== index && u.name === unit.name && u.type === unit.type
  )

  if (duplicateIndex !== -1) {
    ElMessage.warning(`该${unit.type === 'workshop' ? '车间' : '部门'}已存在`)
    // 重置为空，让用户重新选择
    setTimeout(() => {
      unit.name = ''
    }, 100)
  }
}

// 处理类型变更
const handleTypeChange = (unit, index) => {
  const availableOptions = getAvailableOptions(unit.type, index)
  if (availableOptions.length > 0) {
    // 重置为该类型的第一个可用选项
    unit.name = availableOptions[0].Name
  } else {
    unit.name = ''
    ElMessage.warning(`暂无可选的${unit.type === 'workshop' ? '车间' : '部门'}数据`)
  }
}

// 删除单位
const removeUnit = (index) => {
  config.displayUnits.splice(index, 1)
}

// 加载配置
const loadConfig = async (showMessage = false) => {
  isLoading.value = true
  try {
    const response = await axios.get('/api/config/home-cards')
    if (response.data.success) {
      const data = response.data.data
      config.showTodayCount = data.showTodayCount !== false
      config.showMonthCount = data.showMonthCount !== false
      config.displayUnits = data.displayUnits || config.displayUnits
      
      if (showMessage) {
        ElMessage.success('配置刷新成功')
      }
    }
  } catch (error) {
    console.error('加载主页卡片配置失败:', error)
    if (showMessage) {
      ElMessage.error('加载配置失败')
    }
  } finally {
    isLoading.value = false
  }
}

// 保存配置
const saveConfig = async (setAsDefault = false) => {
  isSubmitting.value = true
  try {
    const response = await axios.put('/api/config/home-cards', {
      showTodayCount: config.showTodayCount,
      showMonthCount: config.showMonthCount,
      displayUnits: config.displayUnits,
      setAsDefault: setAsDefault
    })

    if (response.data.success) {
      if (setAsDefault) {
        ElMessage.success('主页卡片配置已保存并设为默认')
      } else {
        ElMessage.success('主页卡片配置保存成功')
      }

      // 通知主页刷新统计数据
      window.dispatchEvent(new CustomEvent('homeConfigUpdated', {
        detail: {
          showTodayCount: config.showTodayCount,
          showMonthCount: config.showMonthCount,
          displayUnits: config.displayUnits
        }
      }))
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存主页卡片配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    isSubmitting.value = false
  }
}

// 保存并设为默认
const saveAsDefault = async () => {
  await saveConfig(true)
}

// 拖拽结束处理
const onDragEnd = () => {
  console.log('拖拽结束，新顺序:', previewOrder.value)
  // 更新config.displayUnits的顺序
  const newOrder = []

  previewOrder.value.forEach(item => {
    if (item.key === 'today' || item.key === 'month') {
      // 跳过今日和本月卡片，它们不在displayUnits中
      return
    }

    // 找到对应的displayUnit
    const unit = config.displayUnits.find(u =>
      u.name === item.title && u.type === item.type
    )
    if (unit) {
      newOrder.push(unit)
    }
  })

  config.displayUnits = newOrder
  ElMessage.success('显示顺序已更新，请保存配置')
}

// 重置配置
const resetConfig = () => {
  config.showTodayCount = true
  config.showMonthCount = true
  config.displayUnits = [
    { name: '数码印刷', type: 'workshop', enabled: true },
    { name: '轮转机', type: 'workshop', enabled: true },
    { name: '跟单', type: 'department', enabled: true },
    { name: '设计', type: 'department', enabled: true },
    { name: '品检', type: 'department', enabled: true }
  ]
  ElMessage.success('配置已重置为默认值')
}

// 组件挂载时加载配置和选项数据
onMounted(async () => {
  await Promise.all([
    loadConfig(),
    loadWorkshopsAndDepartments()
  ])
})
</script>

<style scoped>
.home-card-config {
  max-width: 1000px;
}

.config-header {
  margin: 0;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.config-description {
  font-size: 14px;
  color: #606266;
}

.config-section {
  margin-bottom: 32px;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.unit-config {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  background: #fafbfc;
}

.unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 500;
}

.unit-header-info {
  display: flex;
  align-items: center;
}

.unit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unit-info {
  display: flex;
  align-items: center;
}

.order-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.preview-card {
  padding: 12px 16px;
  border: 2px solid #409eff;
  border-radius: 8px;
  background: #ecf5ff;
  min-width: 120px;
  text-align: center;
  transition: all 0.3s;
  cursor: move;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.drag-handle {
  position: absolute;
  top: 4px;
  right: 6px;
  color: #909399;
  font-size: 12px;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.preview-card.disabled {
  border-color: #dcdfe6;
  background: #f5f7fa;
  opacity: 0.6;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-title {
  font-weight: 600;
  color: #303133;
}

.preview-type {
  font-size: 12px;
  color: #909399;
}

.config-actions {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}
</style>
