<template>
  <div class="chart-demo-container">
    <h1>ECharts风格图表演示</h1>
    
    <!-- ECharts风格趋势图表 -->
    <div class="echarts-style-container">
      <!-- 图表标题和工具栏 -->
      <div class="chart-header">
        <div class="chart-title">{{ new Date().getFullYear() }}年质量指标趋势分析</div>
        <div class="chart-tools">
          <el-button size="small" type="text" @click="refreshChart">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button size="small" type="text" @click="exportChart">
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
      </div>
      
      <!-- 图例区域 -->
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-line pass-rate"></span>
          <span class="legend-text">一次交检合格率</span>
          <span class="legend-axis">(左轴)</span>
        </div>
        <div class="legend-item">
          <span class="legend-line complaint-rate"></span>
          <span class="legend-text">客户投诉率</span>
          <span class="legend-axis">(右轴)</span>
        </div>
        <div class="legend-item">
          <span class="legend-line target"></span>
          <span class="legend-text">目标线</span>
        </div>
      </div>
      
      <!-- 主图表区域 -->
      <div class="echarts-chart-container">
        <!-- 左侧Y轴 - 一次交检合格率 -->
        <div class="y-axis left-axis">
          <div class="axis-title">一次交检合格率 (%)</div>
          <div class="axis-labels">
            <div 
              v-for="tick in primaryYAxisTicks" 
              :key="'left-' + tick"
              class="axis-label"
              :style="{ bottom: getPrimaryYPosition(tick) + '%' }"
            >
              {{ tick }}
            </div>
          </div>
        </div>
        
        <!-- 右侧Y轴 - 客户投诉率 -->
        <div class="y-axis right-axis">
          <div class="axis-title">客户投诉率 (%)</div>
          <div class="axis-labels">
            <div 
              v-for="tick in secondaryYAxisTicks" 
              :key="'right-' + tick"
              class="axis-label"
              :style="{ bottom: getSecondaryYPosition(tick) + '%' }"
            >
              {{ tick }}
            </div>
          </div>
        </div>
        
        <!-- 图表绘制区域 -->
        <div class="chart-plot-area">
          <!-- 网格线 -->
          <div class="chart-grid">
            <!-- 水平网格线 -->
            <div 
              v-for="tick in primaryYAxisTicks" 
              :key="'h-grid-' + tick"
              class="grid-line horizontal"
              :style="{ bottom: getPrimaryYPosition(tick) + '%' }"
            ></div>
            <!-- 垂直网格线 -->
            <div 
              v-for="(month, index) in yearlyTrendData" 
              :key="'v-grid-' + month.month"
              class="grid-line vertical"
              :style="{ left: getXPosition(index) + '%' }"
            ></div>
          </div>
          
          <!-- 目标线 -->
          <div class="target-lines">
            <div 
              class="target-line pass-rate-target" 
              :style="{ bottom: getPrimaryYPosition(98.5) + '%' }"
            >
              <span class="target-label">目标 98.5%</span>
            </div>
            <div 
              class="target-line complaint-rate-target" 
              :style="{ bottom: getSecondaryYPosition(2.0) + '%' }"
            >
              <span class="target-label">目标 2.0%</span>
            </div>
          </div>
          
          <!-- SVG绘制区域 -->
          <svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- 渐变定义 -->
            <defs>
              <linearGradient id="passRateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#67c23a;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#67c23a;stop-opacity:0.1" />
              </linearGradient>
              <linearGradient id="complaintRateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#f56c6c;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#f56c6c;stop-opacity:0.1" />
              </linearGradient>
            </defs>
            
            <!-- 面积填充 -->
            <polygon
              :points="getPassRateAreaPoints()"
              class="area-fill pass-rate-area"
              fill="url(#passRateGradient)"
            />
            <polygon
              :points="getComplaintRateAreaPoints()"
              class="area-fill complaint-rate-area"
              fill="url(#complaintRateGradient)"
            />
            
            <!-- 趋势线 -->
            <polyline
              :points="getPassRatePoints()"
              class="trend-line pass-rate-line"
              fill="none"
            />
            <polyline
              :points="getComplaintRatePoints()"
              class="trend-line complaint-rate-line"
              fill="none"
            />
          </svg>
          
          <!-- 数据点 -->
          <div 
            v-for="(month, index) in yearlyTrendData" 
            :key="'point-' + month.month"
            class="data-point-group"
            :style="{ left: getXPosition(index) + '%' }"
          >
            <!-- 一次交检合格率数据点 -->
            <div 
              class="data-point pass-rate-point"
              :style="{ bottom: getPrimaryYPosition(month.passRate) + '%' }"
              @mouseenter="showTooltip($event, month, 'passRate')"
              @mouseleave="hideTooltip"
            >
              <div class="point-inner"></div>
              <div class="point-hover-area"></div>
            </div>
            
            <!-- 客户投诉率数据点 -->
            <div 
              class="data-point complaint-rate-point"
              :style="{ bottom: getSecondaryYPosition(month.complaintRate) + '%' }"
              @mouseenter="showTooltip($event, month, 'complaintRate')"
              @mouseleave="hideTooltip"
            >
              <div class="point-inner"></div>
              <div class="point-hover-area"></div>
            </div>
          </div>
        </div>
        
        <!-- X轴 -->
        <div class="x-axis">
          <div class="axis-line"></div>
          <div class="axis-labels">
            <div 
              v-for="(month, index) in yearlyTrendData" 
              :key="'x-' + month.month"
              class="axis-label"
              :style="{ left: getXPosition(index) + '%' }"
            >
              {{ month.monthLabel }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 工具提示 -->
      <div 
        v-if="tooltipVisible" 
        class="chart-tooltip"
        :style="{ 
          left: tooltipPosition.x + 'px', 
          top: tooltipPosition.y + 'px' 
        }"
      >
        <div class="tooltip-title">{{ tooltipData.month }}</div>
        <div class="tooltip-content">
          <div class="tooltip-item">
            <span class="tooltip-label">{{ tooltipData.type }}:</span>
            <span class="tooltip-value">{{ tooltipData.value }}%</span>
          </div>
          <div class="tooltip-target">目标: {{ tooltipData.target }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Refresh, Download } from '@element-plus/icons-vue'

// 响应式数据
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipData = ref({})

// 模拟年度趋势数据
const yearlyTrendData = ref([
  { month: 1, monthLabel: '1月', passRate: 97.2, complaintRate: 1.8 },
  { month: 2, monthLabel: '2月', passRate: 98.1, complaintRate: 1.5 },
  { month: 3, monthLabel: '3月', passRate: 97.8, complaintRate: 1.9 },
  { month: 4, monthLabel: '4月', passRate: 98.5, complaintRate: 1.2 },
  { month: 5, monthLabel: '5月', passRate: 98.9, complaintRate: 0.8 },
  { month: 6, monthLabel: '6月', passRate: 98.3, complaintRate: 1.4 },
  { month: 7, monthLabel: '7月', passRate: 97.9, complaintRate: 1.7 }
])

// Y轴刻度
const primaryYAxisTicks = computed(() => [96, 97, 98, 99, 100])
const secondaryYAxisTicks = computed(() => [0, 0.5, 1.0, 1.5, 2.0])

// 计算位置函数
const getPrimaryYPosition = (value) => {
  return ((value - 96) / (100 - 96)) * 100
}

const getSecondaryYPosition = (value) => {
  return (value / 2.0) * 100
}

const getXPosition = (index) => {
  const totalPoints = yearlyTrendData.value.length
  return (index / (totalPoints - 1)) * 100
}

// 生成趋势线点坐标
const getPassRatePoints = () => {
  return yearlyTrendData.value.map((month, index) => {
    const x = getXPosition(index)
    const y = 100 - getPrimaryYPosition(month.passRate)
    return `${x},${y}`
  }).join(' ')
}

const getComplaintRatePoints = () => {
  return yearlyTrendData.value.map((month, index) => {
    const x = getXPosition(index)
    const y = 100 - getSecondaryYPosition(month.complaintRate)
    return `${x},${y}`
  }).join(' ')
}

// 面积填充点坐标生成
const getPassRateAreaPoints = () => {
  const points = yearlyTrendData.value.map((month, index) => {
    const x = getXPosition(index)
    const y = 100 - getPrimaryYPosition(month.passRate)
    return `${x},${y}`
  })
  
  const firstX = getXPosition(0)
  const lastX = getXPosition(yearlyTrendData.value.length - 1)
  return `${firstX},100 ${points.join(' ')} ${lastX},100`
}

const getComplaintRateAreaPoints = () => {
  const points = yearlyTrendData.value.map((month, index) => {
    const x = getXPosition(index)
    const y = 100 - getSecondaryYPosition(month.complaintRate)
    return `${x},${y}`
  })
  
  const firstX = getXPosition(0)
  const lastX = getXPosition(yearlyTrendData.value.length - 1)
  return `${firstX},100 ${points.join(' ')} ${lastX},100`
}

// 工具提示函数
const showTooltip = (event, month, type) => {
  tooltipVisible.value = true
  tooltipPosition.value = { x: event.clientX, y: event.clientY }
  tooltipData.value = {
    month: month.monthLabel,
    type: type === 'passRate' ? '一次交检合格率' : '客户投诉率',
    value: type === 'passRate' ? month.passRate : month.complaintRate,
    target: type === 'passRate' ? '≥98.5%' : '≤2.0%'
  }
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

// 图表工具函数
const refreshChart = () => {

}
</script>

<style scoped>
.chart-demo-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.chart-demo-container h1 {
  text-align: center;
  color: #303133;
  margin-bottom: 30px;
}

/* ECharts风格图表样式 */
.echarts-style-container {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-tools {
  display: flex;
  gap: 8px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  padding: 8px 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.legend-line {
  width: 20px;
  height: 2px;
  border-radius: 1px;
}

.legend-line.pass-rate {
  background: #67c23a;
}

.legend-line.complaint-rate {
  background: #f56c6c;
}

.legend-line.target {
  background: #909399;
  border-top: 2px dashed #909399;
  height: 0;
}

.legend-text {
  color: #303133;
  font-weight: 500;
}

.legend-axis {
  color: #909399;
  font-size: 11px;
}

.echarts-chart-container {
  position: relative;
  height: 320px;
  margin: 0 20px;
}

.y-axis {
  position: absolute;
  height: 100%;
  width: 50px;
  display: flex;
  flex-direction: column;
}

.y-axis.left-axis {
  left: -60px;
  align-items: flex-end;
}

.y-axis.right-axis {
  right: -60px;
  align-items: flex-start;
}

.axis-title {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.axis-labels {
  position: relative;
  flex: 1;
}

.axis-label {
  position: absolute;
  font-size: 11px;
  color: #909399;
  transform: translateY(50%);
  white-space: nowrap;
}

.chart-plot-area {
  position: relative;
  width: 100%;
  height: calc(100% - 40px);
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.chart-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  background: #f5f5f5;
}

.grid-line.horizontal {
  width: 100%;
  height: 1px;
}

.grid-line.vertical {
  height: 100%;
  width: 1px;
}

.target-lines {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.target-line {
  position: absolute;
  width: 100%;
  height: 0;
  border-top: 2px dashed #909399;
}

.target-line.pass-rate-target {
  border-color: #67c23a;
}

.target-line.complaint-rate-target {
  border-color: #f56c6c;
}

.target-label {
  position: absolute;
  top: -18px;
  right: 8px;
  font-size: 10px;
  color: #909399;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 2px;
  white-space: nowrap;
}

.chart-svg {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.area-fill {
  opacity: 0.6;
}

.trend-line {
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-line.pass-rate-line {
  stroke: #67c23a;
}

.trend-line.complaint-rate-line {
  stroke: #f56c6c;
}

.data-point-group {
  position: absolute;
  transform: translateX(-50%);
}

.data-point {
  position: absolute;
  width: 6px;
  height: 6px;
  transform: translate(-50%, 50%);
  cursor: pointer;
  z-index: 3;
}

.point-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.point-hover-area {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: transparent;
}

.data-point.pass-rate-point .point-inner {
  background: #67c23a;
}

.data-point.complaint-rate-point .point-inner {
  background: #f56c6c;
}

.data-point:hover .point-inner {
  transform: scale(1.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.x-axis {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 40px;
}

.axis-line {
  width: 100%;
  height: 1px;
  background: #e4e7ed;
  margin-bottom: 8px;
}

.x-axis .axis-labels {
  position: relative;
  height: 30px;
}

.x-axis .axis-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 11px;
  color: #909399;
  line-height: 30px;
}

.chart-tooltip {
  position: absolute;
  background: rgba(50, 50, 50, 0.95);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 1000;
  transform: translate(-50%, -100%);
  margin-top: -8px;
}

.chart-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(50, 50, 50, 0.95);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #ffffff;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tooltip-label {
  color: #cccccc;
}

.tooltip-value {
  font-weight: 600;
  color: #ffffff;
}

.tooltip-target {
  font-size: 11px;
  color: #999999;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #666666;
}
</style>
