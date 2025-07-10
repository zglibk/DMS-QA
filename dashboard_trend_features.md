# Dashboard 趋势功能完善说明

## 完成的功能

### 1. 本月交付批次真实数据计算
- ✅ 从 MonthlyBatchStats 表的 DeliveryBatches 字段获取当前月和上月的交付批次数据
- ✅ 实现真实的月度对比趋势计算
- ✅ 替换了之前的静态数据显示

### 2. 趋势箭头图标优化
- ✅ 使用更直观的上升/下降箭头SVG图标
- ✅ 箭头尺寸从16x16增加到20x20，更加醒目
- ✅ 添加stroke-width="20"使箭头更加粗壮
- ✅ 箭头位置调整到数值右侧
- ✅ 添加动画效果（bounce-up/bounce-down）

### 3. 智能颜色逻辑
根据指标类型实现不同的颜色逻辑：

#### 正向指标（上升为好）- 绿色上升，红色下降
- 本月交付批次
- 一次交检合格率

#### 负向指标（下降为好）- 红色上升，绿色下降  
- 本月投诉总数
- 本月内诉数
- 本月客诉数
- 客诉率

### 4. 质量指标卡片趋势显示
- ✅ 为"一次交检合格率"卡片添加较上月趋势计算和箭头显示
- ✅ 为"客诉率"卡片添加较上月趋势计算和箭头显示
- ✅ 实现上月质量数据的获取和对比计算

## 技术实现

### 数据获取
```javascript
// 并行获取当前月和上月的批次统计数据
const [currentBatchRes, lastBatchRes] = await Promise.all([
  axios.get('/api/quality-metrics/month-batch-stats', {
    params: { month: selectedMonth.value }
  }),
  axios.get('/api/quality-metrics/month-batch-stats', {
    params: { month: getLastMonth(selectedMonth.value) }
  })
])
```

### 颜色逻辑函数
```javascript
// 获取箭头颜色
function getArrowColor(trend, trendType) {
  if (trendType === 'positive') {
    return trend > 0 ? '#67c23a' : '#f56c6c' // 正向：上升绿色，下降红色
  } else {
    return trend > 0 ? '#f56c6c' : '#67c23a' // 负向：上升红色，下降绿色
  }
}
```

### 趋势计算
```javascript
// 计算趋势百分比
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 0
  const trend = ((current - previous) / previous * 100)
  return parseFloat(trend.toFixed(1))
}
```

## 数据源
- **批次数据**: MonthlyBatchStats 表的 DeliveryBatches 字段
- **质量数据**: 通过 ComplaintRegister 表和 MonthlyBatchStats 表联合计算
- **趋势计算**: 当前月与上月数据的百分比变化

## 用户体验优化
- 箭头图标更大更醒目
- 颜色逻辑符合业务直觉（投诉下降为好事显示绿色）
- 动画效果增强视觉反馈
- 数据实时反映真实业务状况
