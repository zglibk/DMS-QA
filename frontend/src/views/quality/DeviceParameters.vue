<template>
  <div class="device-parameters-container">
    <div class="page-header">
      <h2>HP Indigo 数码印刷机</h2>
    </div>

    <el-card class="main-card">
      <el-tabs v-model="activeTab" type="card" class="device-tabs">
        <!-- 计数器 Tab -->
        <el-tab-pane label="计数器" name="counters">
          <div class="tab-content">
            <!-- 顶部计数器统计 -->
            <div class="section-header">
              <div class="section-title">常规计数器</div>
              <el-button type="primary" link @click="resetAllCounters('normal')">复位</el-button>
            </div>
            <el-row class="counters-grid" :gutter="20">
              <el-col :span="8">
                <div class="counter-section left-section">
                  <div class="counter-item">
                    <span class="label">总印刷数:</span>
                    <div class="value-container">
                      <div class="input-display-wrapper">
                        <span v-if="!countersEditing.totalImpressions" class="display-text" @click="startEditCounter('totalImpressions')">
                          {{ counters.totalImpressions.toLocaleString() }}
                        </span>
                        <el-input-number 
                          v-else
                          v-model="counters.totalImpressions" 
                          :min="0" 
                          size="small" 
                          @blur="stopEditCounter('totalImpressions')"
                          controls-position="right"
                          style="width: 140px;"
                          class="transparent-input editing"
                          :controls="false"
                          ref="totalImpressionsInput"
                        />
                      </div>
                      <span class="unit">印数</span>
                    </div>
                  </div>
                  <div class="counter-item">
                    <span class="label">单色作业:</span>
                    <div class="value-container">
                      <div class="input-display-wrapper">
                        <span v-if="!countersEditing.monochromeJobs" class="display-text" @click="startEditCounter('monochromeJobs')">
                          {{ counters.monochromeJobs.toLocaleString() }}
                        </span>
                        <el-input-number 
                          v-else
                          v-model="counters.monochromeJobs" 
                          :min="0" 
                          size="small" 
                          @blur="stopEditCounter('monochromeJobs')"
                          controls-position="right"
                          style="width: 140px;"
                          class="transparent-input editing"
                          :controls="false"
                          ref="monochromeJobsInput"
                        />
                      </div>
                      <span class="unit">个页面</span>
                    </div>
                  </div>
                  <div class="counter-item">
                    <span class="label">双色作业:</span>
                    <div class="value-container">
                      <div class="input-display-wrapper">
                        <span v-if="!countersEditing.twoColorJobs" class="display-text" @click="startEditCounter('twoColorJobs')">
                          {{ counters.twoColorJobs.toLocaleString() }}
                        </span>
                        <el-input-number 
                          v-else
                          v-model="counters.twoColorJobs" 
                          :min="0" 
                          size="small" 
                          @blur="stopEditCounter('twoColorJobs')"
                          controls-position="right"
                          style="width: 140px;"
                          class="transparent-input editing"
                          :controls="false"
                          ref="twoColorJobsInput"
                        />
                      </div>
                      <span class="unit">个页面</span>
                    </div>
                  </div>
                </div>
              </el-col>
              <el-col :span="10">
                <div class="counter-section right-section">
                  <div class="counter-item">
                    <span class="label">BCS:</span>
                    <div class="value-container">
                      <div class="input-display-wrapper">
                        <span v-if="!countersEditing.bcs" class="display-text" @click="startEditCounter('bcs')">
                          {{ counters.bcs }}
                        </span>
                        <el-input 
                          v-else
                          v-model="counters.bcs" 
                          size="small" 
                          @blur="stopEditCounter('bcs')"
                          style="width: 140px;"
                          class="transparent-input editing"
                          ref="bcsInput"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="counter-item">
                    <span class="label">增强型生产模式:</span>
                    <div class="value-container">
                      <div class="input-display-wrapper">
                        <span v-if="!countersEditing.epmImpressions" class="display-text" @click="startEditCounter('epmImpressions')">
                          {{ counters.epmImpressions.toLocaleString() }}
                        </span>
                        <el-input-number 
                          v-else
                          v-model="counters.epmImpressions" 
                          :min="0" 
                          size="small" 
                          @blur="stopEditCounter('epmImpressions')"
                          controls-position="right"
                          style="width: 140px;"
                          class="transparent-input editing"
                          :controls="false"
                          ref="epmImpressionsInput"
                        />
                      </div>
                      <span class="unit">印数</span>
                    </div>
                  </div>
                </div>
              </el-col>
            </el-row>

            <!-- 耗材寿命表格 -->
            <div class="consumables-section">
              <el-table :data="consumables" style="width: 100%" :header-cell-style="{ background: '#c1c1c1', color: '#303133' }" stripe>
                <el-table-column prop="name" label="耗材" width="180" />
                <el-table-column prop="current" label="当前" width="180">
                  <template #default="{ row }">
                    <div class="input-display-wrapper">
                      <!-- 显示态：千分位格式化文本 -->
                      <span v-if="!row.editingCurrent" class="display-text" @click="startEdit(row, 'current')">
                        {{ row.current.toLocaleString() }}
                      </span>
                      <!-- 编辑态：输入框 -->
                      <el-input-number 
                        v-else
                        v-model="row.current" 
                        :min="0" 
                        size="small" 
                        @change="updateRemaining(row)"
                        @blur="stopEdit(row, 'current')"
                        controls-position="right"
                        style="width: 140px;"
                        class="transparent-input editing"
                        :controls="false"
                        ref="currentInput"
                      />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="target" label="目标" width="180">
                  <template #default="{ row }">
                    <div class="input-display-wrapper">
                      <span v-if="!row.editingTarget" class="display-text" @click="startEdit(row, 'target')">
                        {{ row.target.toLocaleString() }}
                      </span>
                      <el-input-number 
                        v-else
                        v-model="row.target" 
                        :min="1" 
                        size="small" 
                        @change="updateRemaining(row)"
                        @blur="stopEdit(row, 'target')"
                        controls-position="right"
                        style="width: 140px;"
                        class="transparent-input editing"
                        :controls="false"
                        ref="targetInput"
                      />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="印刷机平均使用寿命(印数)" header-align="left">
                  <el-table-column prop="remaining" label="剩余" width="180" align="left">
                    <template #default="{ row }">
                      <div class="input-display-wrapper" style="padding-left: 10px;">
                        <span v-if="!row.editingRemaining" class="display-text" @click="startEdit(row, 'remaining')">
                          {{ row.remaining.toLocaleString() }}
                        </span>
                        <el-input-number 
                          v-else
                          v-model="row.remaining" 
                          :min="0" 
                          :max="row.target"
                          size="small" 
                          @blur="stopEdit(row, 'remaining')"
                          controls-position="right"
                          style="width: 140px;"
                          class="transparent-input editing"
                          :controls="false"
                          ref="remainingInput"
                        />
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="进度" min-width="200" align="center">
                    <template #default="{ row }">
                      <div class="progress-container">
                        <div class="custom-progress" ref="progressBars">
                          <div class="progress-track">
                            <!-- 红色段 -->
                            <div class="progress-segment red"></div>
                            <!-- 黄色段 -->
                            <div class="progress-segment yellow"></div>
                            <!-- 绿色段 -->
                            <div class="progress-segment green"></div>
                          </div>
                          <!-- 指示器 -->
                          <div 
                            class="indicator" 
                            :style="{ left: calculateProgress(row) + '%' }"
                            @mousedown.prevent="startDrag($event, row)"
                            style="cursor: pointer;"
                          >
                            <div class="indicator-line"></div>
                            <div class="indicator-knob"></div>
                          </div>
                          <!-- 目标标记 (G) -->
                          <div class="target-marker" style="left: 80%">
                            <div class="marker-circle">G</div>
                            <div class="marker-line"></div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <!-- BID 计数器 Tab -->
        <el-tab-pane label="BID 计数器" name="bidCounters">
          <div class="tab-content">
            <div class="section-header" style="margin-bottom: 30px;">
              <div class="section-title" style="margin-bottom: 0;">BID 计数器 (印数)</div>
              <el-button type="primary" link @click="resetAllCounters('bid')">复位</el-button>
            </div>
            
            <el-table :data="bidCounters" style="width: 100%" :header-cell-style="{ background: '#c1c1c1', color: '#303133' }" stripe>
              <el-table-column label="BID" width="200">
                <template #default="{ row }">
                  <div class="bid-info">
                    <div class="bid-icon" :style="{ backgroundColor: row.colorCode }">
                      <!-- 简单的梯形模拟 BID 墨盒形状 -->
                      <div class="bid-shape"></div>
                    </div>
                    <span class="bid-name">{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="roller" label="辊">
                <template #default="{ row }">
                  <div class="input-display-wrapper">
                    <span v-if="!row.editingRoller" class="display-text" @click="startEdit(row, 'roller')">
                      {{ row.roller.toLocaleString() }}
                    </span>
                    <el-input-number 
                      v-else
                      v-model="row.roller" 
                      :min="0" 
                      size="small"
                      controls-position="right"
                      @blur="stopEdit(row, 'roller')"
                      style="width: 150px;"
                      class="transparent-input editing"
                      :controls="false"
                      ref="rollerInput"
                    />
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="base" label="底座">
                <template #default="{ row }">
                  <div class="input-display-wrapper">
                    <span v-if="!row.editingBase" class="display-text" @click="startEdit(row, 'base')">
                      {{ row.base.toLocaleString() }}
                    </span>
                    <el-input-number 
                      v-model="row.base" 
                      v-else
                      :min="0" 
                      size="small"
                      controls-position="right"
                      @blur="stopEdit(row, 'base')"
                      style="width: 150px;"
                      class="transparent-input editing"
                      :controls="false"
                      ref="baseInput"
                    />
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 用户自定义计数器 Tab -->
        <el-tab-pane label="用户自定义计数器" name="customCounters">
          <div class="tab-content">
            <div class="section-title" style="margin-bottom: 30px;">用户自定义计数器</div>
            
            <el-table :data="customCountersList" style="width: 100%" :header-cell-style="{ background: '#fff', color: '#303133' }">
              <el-table-column label="计数器名称" width="400">
                <template #default="{ row }">
                  <el-input v-model="row.name" class="custom-name-input" />
                </template>
              </el-table-column>
              <el-table-column prop="totalImpressions" label="总印数" align="center">
                <template #default="{ row }">
                  {{ row.totalImpressions.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="actualTotalImpressions" label="实际总印数" align="center">
                <template #default="{ row }">
                  {{ row.actualTotalImpressions.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="" width="200" align="center">
                <template #default="{ row }">
                  <el-button class="reset-btn" @click="resetCounter(row)">复位</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'

const activeTab = ref('counters')
const currentInput = ref(null)
const targetInput = ref(null)
const remainingInput = ref(null)
const rollerInput = ref(null)
const baseInput = ref(null)

// 常规计数器输入框引用
const totalImpressionsInput = ref(null)
const monochromeJobsInput = ref(null)
const twoColorJobsInput = ref(null)
const bcsInput = ref(null)
const epmImpressionsInput = ref(null)

// 拖拽相关状态
const draggingRow = ref(null)
const startX = ref(0)
const startRemaining = ref(0)
const progressBarWidth = ref(0)

// 默认数据定义 (硬编码值)
const defaultCounters = {
  totalImpressions: 33395152,
  monochromeJobs: 3229214,
  twoColorJobs: 488656,
  bcs: '222',
  epmImpressions: 3150
}

const defaultConsumables = [
  { name: 'BID 底座 - CMYK', current: 767246, target: 1200000, remaining: 578996 },
  { name: '显影辊 - CMYK', current: 477446, target: 1100000, remaining: 278228 },
  { name: 'PIP', current: 10540, target: 145000, remaining: 115897 },
  { name: '橡皮布', current: 116424, target: 155000, remaining: 127783 }
]

const defaultBidCounters = [
  { name: 'Std white', colorCode: '#ffffff', roller: 612558, base: 202976 },
  { name: 'Cyan', colorCode: '#00ffff', roller: 316062, base: 761298 },
  { name: 'Magenta', colorCode: '#ff00ff', roller: 324520, base: 123594 },
  { name: 'Yellow', colorCode: '#ffff00', roller: 1040242, base: 1955132 },
  { name: 'Black', colorCode: '#000000', roller: 228960, base: 228960 },
  { name: 'Orange', colorCode: '#ffa500', roller: 0, base: 113722 }
]

// 模拟计数器数据
const counters = reactive({ ...defaultCounters })

// 常规计数器编辑状态
const countersEditing = reactive({
  totalImpressions: false,
  monochromeJobs: false,
  twoColorJobs: false,
  bcs: false,
  epmImpressions: false
})

// 模拟耗材数据
const consumables = ref(JSON.parse(JSON.stringify(defaultConsumables)))

// 模拟 BID 计数器数据
const bidCounters = ref(JSON.parse(JSON.stringify(defaultBidCounters)))

// 模拟用户自定义计数器数据
const customCountersList = ref([
  { id: 1, name: '', totalImpressions: 42159736, actualTotalImpressions: 33396772 },
  { id: 2, name: '', totalImpressions: 42159736, actualTotalImpressions: 33396772 },
  { id: 3, name: '', totalImpressions: 42159736, actualTotalImpressions: 33396772 }
])

// 复位计数器
const resetCounter = (row) => {
  row.actualTotalImpressions = 0
  // 这里可以添加实际的API调用
}

// 批量复位计数器
const resetAllCounters = (type) => {
  if (type === 'normal') {
    // 复位常规计数器相关逻辑
    Object.assign(counters, defaultCounters)
    // 耗材列表复位逻辑：重置为默认值，但将 current 置为 0
    const resetConsumables = JSON.parse(JSON.stringify(defaultConsumables))
    resetConsumables.forEach(item => {
      item.current = 0
    })
    consumables.value = resetConsumables
  } else if (type === 'bid') {
    // 复位 BID 计数器相关逻辑
    bidCounters.value = JSON.parse(JSON.stringify(defaultBidCounters))
  }
}

// 更新剩余寿命 (已取消自动计算，仅作为change事件占位)
const updateRemaining = (row) => {
  // row.remaining = Math.max(0, row.target - row.current)
}

// 获取剩余寿命样式类
const getRemainingClass = (row) => {
  const percent = (row.remaining / row.target) * 100
  if (percent <= 20) return 'text-danger'
  if (percent <= 50) return 'text-warning'
  return 'text-success'
}

// 计算进度百分比 (简化逻辑：当前/目标，限制在0-100)
const calculateProgress = (row) => {
  if (!row.target) return 0
  // 修正计算逻辑：使用剩余寿命比例
  let percent = (row.remaining / row.target) * 100
  // 为了匹配图片的 UI (左红右绿)，0%是左边(红)，100%是右边(绿)。
  return Math.min(Math.max(percent, 0), 100)
}

// 切换常规计数器编辑状态
const startEditCounter = (field) => {
  countersEditing[field] = true
  
  nextTick(() => {
    // 根据字段名获取对应的 ref
    let inputRef = null
    switch(field) {
      case 'totalImpressions': inputRef = totalImpressionsInput.value; break;
      case 'monochromeJobs': inputRef = monochromeJobsInput.value; break;
      case 'twoColorJobs': inputRef = twoColorJobsInput.value; break;
      case 'bcs': inputRef = bcsInput.value; break;
      case 'epmImpressions': inputRef = epmImpressionsInput.value; break;
    }
    
    if (inputRef) {
      // 兼容 el-input 和 el-input-number
      if (inputRef.focus) {
        inputRef.focus()
      } else if (inputRef.$el && inputRef.$el.querySelector('input')) {
        inputRef.$el.querySelector('input').focus()
      }
    }
  })
}

const stopEditCounter = (field) => {
  countersEditing[field] = false
}

// 切换编辑状态
const startEdit = (row, field) => {
  // 根据字段名设置对应的编辑状态
  switch(field) {
    case 'current': row.editingCurrent = true; break;
    case 'target': row.editingTarget = true; break;
    case 'remaining': row.editingRemaining = true; break;
    case 'roller': row.editingRoller = true; break;
    case 'base': row.editingBase = true; break;
  }
  
  // 自动聚焦
  nextTick(() => {
    // 这里简化处理，实际项目中可能需要更精确的 ref 定位
    const inputs = document.querySelectorAll('.transparent-input.editing input')
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus()
    }
  })
}

const stopEdit = (row, field) => {
  switch(field) {
    case 'current': row.editingCurrent = false; break;
    case 'target': row.editingTarget = false; break;
    case 'remaining': row.editingRemaining = false; break;
    case 'roller': row.editingRoller = false; break;
    case 'base': row.editingBase = false; break;
  }
}

// 拖拽处理
const startDrag = (e, row) => {
  if (!row.target) return
  draggingRow.value = row
  startX.value = e.clientX
  startRemaining.value = row.remaining
  
  // 获取进度条元素宽度
  // e.target 是 indicator, parentElement 是 custom-progress
  const progressBar = e.target.parentElement
  if (progressBar) {
    progressBarWidth.value = progressBar.getBoundingClientRect().width
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (!draggingRow.value) return
  
  const deltaX = e.clientX - startX.value
  // 计算移动的比例
  const deltaPercent = deltaX / progressBarWidth.value
  // 计算对应的数值变化
  const deltaValue = deltaPercent * draggingRow.value.target
  
  // 更新剩余值，限制在 0 到 target 之间
  let newRemaining = startRemaining.value + deltaValue
  newRemaining = Math.max(0, Math.min(newRemaining, draggingRow.value.target))
  
  draggingRow.value.remaining = Math.round(newRemaining)
}

const onMouseUp = () => {
  draggingRow.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.text-danger { color: #303133; font-weight: normal; }
.text-warning { color: #303133; font-weight: normal; }
.text-success { color: #303133; font-weight: normal; }

.device-parameters-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.main-card {
  min-height: 600px;
}

.counters-grid {
  margin-bottom: 30px;
  padding: 20px;
}

.counter-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.counter-item {
  font-size: 14px;
}

.counter-item .label {
  color: #606266;
  margin-right: 160px;
  display: inline-block;
  min-width: 120px;
}

.counter-item .value-container {
  display: inline-flex;
  align-items: center;
}

.counter-item .unit {
  margin-left: 8px;
  color: #303133;
}

.counter-item .value {
  font-weight: normal;
  color: #303133;
}

/* 进度条样式 */
.progress-container {
  width: 100%;
  padding: 10px 0;
  position: relative;
}

.custom-progress {
  height: 14px;
  width: 100%;
  position: relative;
}

.progress-track {
  height: 100%;
  width: 100%;
  background: #e4e7ed;
  border-radius: 7px;
  display: flex;
  overflow: hidden; /* 确保圆角 */
  border: 1px solid #dcdfe6;
}

.progress-segment {
  height: 100%;
}

.progress-segment.red {
  width: 40%;
  background: linear-gradient(to right, #e74c3c, #e6a23c);
}

.progress-segment.yellow {
  width: 20%;
  background: linear-gradient(to right, #e6a23c, #f1c40f);
}

.progress-segment.green {
  width: 40%;
  background: linear-gradient(to right, #f1c40f, #2ecc71);
}

/* 指示器 - 白色药丸形状 */
.indicator {
  position: absolute;
  top: 50%;
  height: 24px;
  width: 12px !important;
  background-color: white;
  border: 1px solid #999;
  border-radius: 2px;
  transform: translate(-50%, -50%);
  z-index: 2;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.indicator-line { display: none; }
.indicator-knob { display: none; }

/* 目标标记 G */
.target-marker {
  position: absolute;
  top: -15px;
  z-index: 1;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-circle {
  width: 14px;
  height: 14px;
  background-color: #333;
  color: white;
  border-radius: 50%;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.marker-line {
  width: 1px;
  height: 25px; /* 延伸到进度条 */
  background-color: #333;
  opacity: 0.8;
}

/* 进度条样式 */
.progress-container {
  width: 100%;
  padding: 10px 0;
  position: relative;
}

.custom-progress {
  height: 14px;
  width: 100%;
  background: #e4e7ed;
  border-radius: 7px;
  position: relative;
  display: flex;
  overflow: hidden; /* 确保圆角 */
  border: 1px solid #dcdfe6;
}

.progress-segment {
  height: 100%;
}

.progress-segment.red {
  width: 30%;
  background: linear-gradient(to right, #e74c3c, #e6a23c);
}

.progress-segment.yellow {
  width: 25%;
  background: linear-gradient(to right, #e6a23c, #f1c40f);
}

.progress-segment.green {
  width: 45%;
  background: linear-gradient(to right, #f1c40f, #2ecc71);
}

/* 指示器 - 白色药丸形状 */
.indicator {
  position: absolute;
  top: 50%;
  height: 16px;
  width: 6px;
  background-color: white;
  border: 1px solid #999;
  border-radius: 3px;
  transform: translate(-50%, -50%);
  z-index: 2;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.indicator-line { display: none; }
.indicator-knob { display: none; }

/* 隐藏输入框边框，获得焦点时显示 */
.transparent-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent;
  padding: 0;
}

.transparent-input.editing :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
  background-color: white;
  padding: 0 11px;
}

.transparent-input.editing :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}

/* 始终隐藏加减按钮 */
.transparent-input :deep(.el-input-number__decrease),
.transparent-input :deep(.el-input-number__increase) {
  display: none !important;
}

/* 调整输入框内文字对齐和样式 */
.transparent-input :deep(.el-input__inner) {
  text-align: left;
  padding: 0;
  color: inherit;
}

/* 编辑显示切换容器 */
.input-display-wrapper {
  height: 24px;
  display: flex;
  align-items: center;
}

.display-text {
  cursor: text;
  width: 100%;
  display: inline-block;
}

.display-text:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

/* Tab标签样式覆盖 */
:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border: none;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  background-color: #c1c1c1;
  color: #606266;
  border-bottom: 1px solid #e4e7ed;
  border-left: 1px solid #e4e7ed;
  margin-right: 0;
  border-radius: 0;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #fff;
  color: #02547f;
  border-bottom: none;
  border-left: none;
  border-right: none;
  border-top: 5px solid #02547f;
}

/* 表格隔行变色: 强制覆盖斑马纹颜色为 #9c9b9f */
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #c1c1c1 !important;
  color: #303133;
}

/* 统一行高设置 */
:deep(.el-table .el-table__row) {
  height: 60px;
}

/* 隐藏嵌套表头的第二行 */
:deep(.el-table__header tr:nth-child(2)) {
  display: none;
}

/* 移除表格线 */
:deep(.el-table td.el-table__cell),
:deep(.el-table th.el-table__cell.is-leaf) {
  border-bottom: none !important;
  border-right: none !important;
}

:deep(.el-table) {
  --el-table-border-color: transparent;
  --el-table-row-hover-bg-color: transparent;
}

:deep(.el-table__inner-wrapper::before),
:deep(.el-table__border-left-patch) {
  display: none !important;
}

/* 统一表头行高设置 */
:deep(.el-table__header th.el-table__cell) {
  height: 60px;
  padding: 0;
}

/* 输入框在深色背景下的适配 */
.transparent-input :deep(.el-input__wrapper) {
  color: inherit;
}
.transparent-input :deep(.el-input__inner) {
  color: inherit;
}
.bid-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bid-icon {
  width: 24px;
  height: 20px;
  border: 1px solid #999;
  position: relative;
  /* 简单的梯形效果可以通过 clip-path 或者伪元素实现，这里简单用矩形代替 */
  border-radius: 2px;
}

.bid-name {
  font-weight: 500;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 自定义计数器样式 */
.custom-name-input :deep(.el-input__wrapper) {
  background-color: transparent;
  box-shadow: 0 0 0 1px #606266 inset;
  border-radius: 0;
}

.custom-name-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.reset-btn {
  background-color: #02547f !important;
  border-color: #02547f !important;
  color: #ffffff !important;
  border-radius: 0;
  width: 160px;
  height: 32px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  line-height: 1;
}

.reset-btn:hover,
.reset-btn:focus {
  background-color: #036699 !important;
  border-color: #036699 !important;
  color: #ffffff !important;
}
</style>