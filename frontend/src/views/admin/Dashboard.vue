<template>
  <div class="dashboard-main">
    <div class="stat-card-row">
      <div class="stat-card" v-for="item in statList" :key="item.title">
        <div class="stat-card-title">{{ item.title }}</div>
        <div class="stat-card-value">{{ item.value }}</div>
        <div class="stat-card-trend" :class="item.trend > 0 ? 'trend-up' : item.trend < 0 ? 'trend-down' : ''">
          较上周
          <span>{{ item.trend > 0 ? '+' : '' }}{{ item.trend }}%</span>
        </div>
        <div class="stat-card-icon" :style="{ background: item.iconBg }">
          <el-icon :size="22" :style="{ color: item.iconColor }">
            <component :is="item.icon" />
          </el-icon>
        </div>
      </div>
    </div>
    <!-- 其它内容... -->
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { PieChart, WarningFilled, DataLine, RefreshRight } from '@element-plus/icons-vue'
const statList = ref([
  { title: '总交货批', value: 1200, trend: 5, icon: PieChart, iconBg: '#f5f8ff', iconColor: '#6b8cff' },
  { title: '总投诉批', value: 32, trend: -8, icon: WarningFilled, iconBg: '#fff7f5', iconColor: '#f56c6c' },
  { title: '投诉率', value: '2.67%', trend: 0.2, icon: DataLine, iconBg: '#f5fff7', iconColor: '#67c23a' },
  { title: '退货率', value: '0.83%', trend: -0.1, icon: RefreshRight, iconBg: '#f5faff', iconColor: '#409eff' }
])
</script>

<style scoped>
.dashboard-main {
  padding: 18px 0 0 0;
}
.stat-card-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}
.stat-card {
  flex: 1 1 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  padding: 22px 18px 18px 22px;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  min-height: 110px;
}
.stat-card-title {
  font-size: 15px;
  color: #222;
  font-weight: 500;
  margin-bottom: 8px;
}
.stat-card-value {
  font-size: 28px;
  font-weight: bold;
  color: #222;
  margin-bottom: 8px;
}
.stat-card-trend {
  font-size: 13px;
  color: #888;
  margin-bottom: 0;
}
.stat-card-trend span {
  margin-left: 4px;
  font-weight: bold;
}
.trend-up span {
  color: #20c77b;
}
.trend-down span {
  color: #f56c6c;
}
.stat-card-icon {
  position: absolute;
  right: 18px;
  top: 22px;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 