<template>
  <div class="quality-targets-analysis">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>质量目标统计分析</h2>
      <p>质量目标达成情况分析与趋势统计</p>
    </div>

    <!-- 统计概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon total">
                <el-icon><Target /></el-icon>
              </div>
              <div class="card-info">
                <h3>{{ overview.totalTargets }}</h3>
                <p>总目标数</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon achieved">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="card-info">
                <h3>{{ overview.achievedTargets }}</h3>
                <p>已达成目标</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon rate">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="card-info">
                <h3>{{ overview.achievementRate }}%</h3>
                <p>达成率</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="card-info">
                <h3>{{ overview.pendingTargets }}</h3>
                <p>进行中目标</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="考核年度">
          <el-select v-model="filterForm.year" placeholder="请选择年度" @change="loadChartData">
            <el-option label="全部" value="" />
            <el-option 
              v-for="year in yearOptions" 
              :key="year" 
              :label="year" 
              :value="year" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标分类">
          <el-select v-model="filterForm.category" placeholder="请选择分类" @change="loadChartData">
            <el-option label="全部" value="" />
            <el-option 
              v-for="category in categoryOptions" 
              :key="category" 
              :label="category" 
              :value="category" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="考核单位">
          <el-select v-model="filterForm.assessmentUnit" placeholder="请选择考核单位" @change="loadChartData">
            <el-option label="全部" value="" />
            <el-option 
              v-for="unit in assessmentUnitOptions" 
              :key="unit" 
              :label="unit" 
              :value="unit" 
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadChartData">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图表区域 -->
    <el-row :gutter="20">
      <!-- 分类统计饼图 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>目标分类统计</span>
            </div>
          </template>
          <div ref="categoryChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 达成情况柱状图 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>达成情况统计</span>
            </div>
          </template>
          <div ref="achievementChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势分析图 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>目标达成趋势分析</span>
        </div>
      </template>
      <div ref="trendChart" class="chart-container-large"></div>
    </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { qualityTargetsApi } from './qualityTargetsApi'
import { Target, CircleCheck, TrendCharts, Clock, Search, Refresh } from '@element-plus/icons-vue'

export default {
  name: 'QualityTargetsAnalysis',
  components: {
    Target,
    CircleCheck, 
    TrendCharts,
    Clock,
    Search,
    Refresh
  },
  data() {
    return {
      // 概览数据
      overview: {
        totalTargets: 0,
        achievedTargets: 0,
        achievementRate: 0,
        pendingTargets: 0
      },
      // 筛选表单
      filterForm: {
        year: '',
        category: '',
        assessmentUnit: ''
      },
      // 选项数据
      yearOptions: [],
      categoryOptions: [],
      assessmentUnitOptions: [],
      // 图表实例
      categoryChartInstance: null,
      achievementChartInstance: null,
      trendChartInstance: null,
      // 图表数据
      categoryData: [],
      achievementData: [],
      trendData: []
    }
  },
  mounted() {
    this.initCharts()
    this.loadOptions()
    this.loadOverview()
    this.loadChartData()
  },
  beforeUnmount() {
    // 销毁图表实例
    if (this.categoryChartInstance) {
      this.categoryChartInstance.dispose()
    }
    if (this.achievementChartInstance) {
      this.achievementChartInstance.dispose()
    }
    if (this.trendChartInstance) {
      this.trendChartInstance.dispose()
    }
  },
  methods: {
    /**
     * 初始化图表
     */
    initCharts() {
      this.$nextTick(() => {
        // 初始化分类统计饼图
        this.categoryChartInstance = echarts.init(this.$refs.categoryChart)
        
        // 初始化达成情况柱状图
        this.achievementChartInstance = echarts.init(this.$refs.achievementChart)
        
        // 初始化趋势分析图
        this.trendChartInstance = echarts.init(this.$refs.trendChart)
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize)
      })
    },

    /**
     * 处理窗口大小变化
     */
    handleResize() {
      if (this.categoryChartInstance) {
        this.categoryChartInstance.resize()
      }
      if (this.achievementChartInstance) {
        this.achievementChartInstance.resize()
      }
      if (this.trendChartInstance) {
        this.trendChartInstance.resize()
      }
    },

    /**
     * 加载选项数据
     */
    async loadOptions() {
      try {
        const response = await qualityTargetsApi.getOptions()
        if (response.success) {
          this.categoryOptions = response.data.categories || []
          this.assessmentUnitOptions = response.data.assessmentUnits || []
          
          // 生成年度选项（当前年份前后5年）
          const currentYear = new Date().getFullYear()
          this.yearOptions = []
          for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            this.yearOptions.push(i.toString())
          }
        }
      } catch (error) {
        console.error('加载选项数据失败:', error)
        this.$message.error('加载选项数据失败')
      }
    },

    /**
     * 加载概览数据
     */
    async loadOverview() {
      try {
        const response = await qualityTargetsApi.getOverview(this.filterForm)
        if (response.success) {
          this.overview = response.data
        }
      } catch (error) {
        console.error('加载概览数据失败:', error)
        this.$message.error('加载概览数据失败')
      }
    },

    /**
     * 加载图表数据
     */
    async loadChartData() {
      await Promise.all([
        this.loadCategoryData(),
        this.loadAchievementData(),
        this.loadTrendData(),
        this.loadOverview()
      ])
    },

    /**
     * 加载分类统计数据
     */
    async loadCategoryData() {
      try {
        const response = await qualityTargetsApi.getCategoryStats(this.filterForm)
        if (response.success) {
          this.categoryData = response.data
          this.renderCategoryChart()
        }
      } catch (error) {
        console.error('加载分类统计数据失败:', error)
      }
    },

    /**
     * 加载达成情况数据
     */
    async loadAchievementData() {
      try {
        const response = await qualityTargetsApi.getAchievementStats(this.filterForm)
        if (response.success) {
          this.achievementData = response.data
          this.renderAchievementChart()
        }
      } catch (error) {
        console.error('加载达成情况数据失败:', error)
      }
    },

    /**
     * 加载趋势数据
     */
    async loadTrendData() {
      try {
        const response = await qualityTargetsApi.getTrendStats(this.filterForm)
        if (response.success) {
          this.trendData = response.data
          this.renderTrendChart()
        }
      } catch (error) {
        console.error('加载趋势数据失败:', error)
      }
    },

    /**
     * 渲染分类统计饼图
     */
    renderCategoryChart() {
      if (!this.categoryChartInstance) return
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '目标分类',
            type: 'pie',
            radius: '50%',
            data: this.categoryData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
      
      this.categoryChartInstance.setOption(option)
    },

    /**
     * 渲染达成情况柱状图
     */
    renderAchievementChart() {
      if (!this.achievementChartInstance) return
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.achievementData.map(item => item.name)
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '目标数量',
            type: 'bar',
            data: this.achievementData.map(item => item.value),
            itemStyle: {
              color: function(params) {
                const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666']
                return colors[params.dataIndex % colors.length]
              }
            }
          }
        ]
      }
      
      this.achievementChartInstance.setOption(option)
    },

    /**
     * 渲染趋势分析图
     */
    renderTrendChart() {
      if (!this.trendChartInstance) return
      
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['总目标数', '已达成', '达成率']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this.trendData.map(item => item.period)
        },
        yAxis: [
          {
            type: 'value',
            name: '目标数量',
            position: 'left'
          },
          {
            type: 'value',
            name: '达成率(%)',
            position: 'right',
            max: 100
          }
        ],
        series: [
          {
            name: '总目标数',
            type: 'line',
            data: this.trendData.map(item => item.totalTargets),
            itemStyle: { color: '#5470c6' }
          },
          {
            name: '已达成',
            type: 'line',
            data: this.trendData.map(item => item.achievedTargets),
            itemStyle: { color: '#91cc75' }
          },
          {
            name: '达成率',
            type: 'line',
            yAxisIndex: 1,
            data: this.trendData.map(item => item.achievementRate),
            itemStyle: { color: '#fac858' }
          }
        ]
      }
      
      this.trendChartInstance.setOption(option)
    },

    /**
     * 重置筛选条件
     */
    resetFilter() {
      this.filterForm = {
        year: '',
        category: '',
        assessmentUnit: ''
      }
      this.loadChartData()
    }
  }
}
</script>

<style scoped>
.quality-targets-analysis {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.overview-cards {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.card-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.achieved {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.rate {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.pending {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-info h3 {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.card-info p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-container-large {
  width: 100%;
  height: 400px;
}
</style>