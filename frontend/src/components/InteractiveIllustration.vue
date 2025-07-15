<template>
  <div class="interactive-illustration">
    <!-- 主容器 -->
    <div class="illustration-container">
      <!-- 背景装饰元素 -->
      <div class="bg-elements">
        <!-- 浮动的小方块 -->
        <div class="floating-square square-1"></div>
        <div class="floating-square square-2"></div>
      </div>

      <!-- 主要窗口 - 后台管理页面 -->
      <div class="main-window">
        <!-- 窗口标题栏 -->
        <div class="window-header">
          <div class="window-controls">
            <span class="control-dot red"></span>
            <span class="control-dot yellow"></span>
            <span class="control-dot green"></span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>

        <!-- 窗口内容 - 左右布局 -->
        <div class="window-content">
          <!-- 左侧边栏 -->
          <div class="sidebar">
            <div class="sidebar-item active"></div>
            <div class="sidebar-item"></div>
            <div class="sidebar-item"></div>
            <div class="sidebar-item"></div>
          </div>

          <!-- 右侧内容区 - 上下布局 -->
          <div class="content-area">
            <!-- 上部统计卡片 -->
            <div class="stats-card">
              <div class="card-header"></div>
              <div class="card-content">
                <div class="stat-item"></div>
                <div class="stat-item"></div>
                <div class="stat-item"></div>
              </div>
            </div>

            <!-- 下部折线图 -->
            <div class="chart-area">
              <svg class="line-chart" viewBox="0 0 200 80">
                <path
                  class="chart-line"
                  d="M20,60 Q60,30 100,45 T180,25"
                  fill="none"
                  stroke="#409EFF"
                  stroke-width="2"
                />
                <!-- 数据点 -->
                <circle class="data-point point-1" cx="60" cy="30" r="3" fill="#409EFF"/>
                <circle class="data-point point-2" cx="100" cy="45" r="3" fill="#409EFF"/>
                <circle class="data-point point-3" cx="140" cy="35" r="3" fill="#409EFF"/>
                <circle class="data-point point-4" cx="180" cy="25" r="3" fill="#409EFF"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 左下角 - 左右结构：圆环图+列表 -->
      <div class="chart-list-frame">
        <div class="frame-border">
          <div class="chart-list-container">
            <!-- 左侧圆环图 -->
            <div class="mini-chart">
              <svg class="mini-donut" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="20" fill="none" stroke="#f0f0f0" stroke-width="4"/>
                <circle cx="30" cy="30" r="20" fill="none" stroke="#409EFF" stroke-width="4"
                        stroke-dasharray="94 31" stroke-linecap="round" transform="rotate(-90 30 30)"/>
              </svg>
            </div>
            <!-- 右侧列表项 -->
            <div class="mini-list">
              <div class="list-item">
                <div class="list-dot"></div>
                <div class="list-bar"></div>
              </div>
              <div class="list-item">
                <div class="list-dot"></div>
                <div class="list-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下角 - 人形图案 -->
      <div class="character">
        <svg width="100" height="100" viewBox="0 0 100 100" class="character-svg">
          <!-- 人物主体 -->
          <g class="character-body">
            <!-- 头部 -->
            <circle cx="50" cy="20" r="10" fill="#FFB74D" class="character-head"/>
            <!-- 头发 - 更丰富的造型 -->
            <path d="M40 15 Q45 8 50 10 Q55 8 60 15 Q58 12 55 13 Q50 9 45 13 Q42 12 40 15" fill="#8D6E63" class="character-hair"/>
            <path d="M42 14 Q47 10 52 12 Q57 10 58 14" fill="#A1887F" class="character-hair-highlight"/>
            <circle cx="44" cy="16" r="1.5" fill="#8D6E63" class="character-hair-curl"/>
            <circle cx="56" cy="16" r="1.5" fill="#8D6E63" class="character-hair-curl"/>

            <!-- 颈部 -->
            <rect x="47" y="28" width="6" height="8" fill="#FFB74D" class="character-neck"/>

            <!-- 身体躯干 -->
            <rect x="42" y="36" width="16" height="25" rx="8" fill="#409EFF" class="character-torso"/>

            <!-- 左臂上臂 -->
            <rect x="36" y="42" width="8" height="6" rx="3" fill="#409EFF" class="character-arm-left-upper"/>
            <!-- 左臂下臂 (向下到键盘) -->
            <rect x="35" y="48" width="6" height="12" rx="3" fill="#409EFF" class="character-arm-left-lower"/>
            <!-- 左手 (在键盘上) -->
            <circle cx="38" cy="88" r="2.5" fill="#FFB74D" class="character-hand-left"/>

            <!-- 右臂上臂 -->
            <rect x="56" y="42" width="8" height="6" rx="3" fill="#409EFF" class="character-arm-right-upper"/>
            <!-- 右臂下臂 (向下到键盘) -->
            <rect x="59" y="48" width="6" height="12" rx="3" fill="#409EFF" class="character-arm-right-lower"/>
            <!-- 右手 (在键盘上) -->
            <circle cx="62" cy="88" r="2.5" fill="#FFB74D" class="character-hand-right"/>

            <!-- 腰部 -->
            <rect x="44" y="61" width="12" height="6" rx="6" fill="#2C3E50" class="character-waist"/>

            <!-- 盘腿坐姿 - 左腿 -->
            <!-- 左大腿 (水平向左) -->
            <rect x="30" y="67" width="18" height="6" rx="3" fill="#2C3E50" class="character-leg-left-upper"/>
            <!-- 左小腿 (向内弯曲) -->
            <rect x="28" y="72" width="12" height="5" rx="2.5" fill="#2C3E50" class="character-leg-left-lower"/>
            <!-- 左脚 (盘在右腿下) -->
            <ellipse cx="65" cy="85" rx="3" ry="2" fill="#34495E" class="character-foot-left"/>

            <!-- 盘腿坐姿 - 右腿 -->
            <!-- 右大腿 (水平向右) -->
            <rect x="52" y="67" width="18" height="6" rx="3" fill="#2C3E50" class="character-leg-right-upper"/>
            <!-- 右小腿 (向内弯曲) -->
            <rect x="60" y="72" width="12" height="5" rx="2.5" fill="#2C3E50" class="character-leg-right-lower"/>
            <!-- 右脚 (盘在左腿下) -->
            <ellipse cx="35" cy="85" rx="3" ry="2" fill="#34495E" class="character-foot-right"/>

            <!-- 坐垫/地面指示 -->
            <ellipse cx="50" cy="88" rx="25" ry="3" fill="#E0E0E0" opacity="0.5" class="sitting-ground"/>

            <!-- 面部特征 -->
            <circle cx="46" cy="18" r="1" fill="#2C3E50" class="character-eye-left"/>
            <circle cx="54" cy="18" r="1" fill="#2C3E50" class="character-eye-right"/>
            <path d="M48 22 Q50 24 52 22" stroke="#2C3E50" stroke-width="1" fill="none" class="character-smile"/>

            <!-- 笔记本电脑 - 放在腿上 -->
            <g class="laptop" transform="translate(37, 70)">
              <!-- 屏幕 -->
              <rect x="0" y="0" width="26" height="16" rx="2" fill="#34495E" stroke="#2C3E50" stroke-width="1"/>
              <rect x="2" y="2" width="22" height="12" fill="#1ABC9C"/>
              <!-- 屏幕内容线条 -->
              <rect x="4" y="4" width="6" height="1" fill="#ffffff" opacity="0.8"/>
              <rect x="4" y="6" width="10" height="1" fill="#ffffff" opacity="0.6"/>
              <rect x="4" y="8" width="5" height="1" fill="#ffffff" opacity="0.4"/>
              <rect x="14" y="4" width="4" height="1" fill="#ffffff" opacity="0.7"/>
              <rect x="14" y="6" width="6" height="1" fill="#ffffff" opacity="0.5"/>

              <!-- 键盘 -->
              <rect x="0" y="16" width="26" height="5" rx="1" fill="#BDC3C7"/>
              <rect x="2" y="18" width="22" height="1" fill="#95A5A6"/>
              <!-- 键盘按键细节 -->
              <rect x="3" y="17" width="2" height="1" fill="#ffffff" opacity="0.3"/>
              <rect x="6" y="17" width="2" height="1" fill="#ffffff" opacity="0.3"/>
              <rect x="9" y="17" width="2" height="1" fill="#ffffff" opacity="0.3"/>
            </g>
          </g>
        </svg>
      </div>

      <!-- 右上角 - 对话框 -->
      <div class="dialog-box">
        <div class="dialog-content">
          <div class="dialog-avatar"></div>
          <div class="dialog-text">
            <div class="text-line line-1"></div>
            <div class="text-line line-2"></div>
          </div>
        </div>
        <div class="dialog-tail"></div>
      </div>

      <!-- 装饰性元素 -->
      <div class="decorative-elements">
        <div class="deco-circle circle-1"></div>
        <div class="deco-triangle triangle-1"></div>
        <div class="deco-line line-2"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// 鼠标跟随效果
let mouseX = 0
let mouseY = 0

const handleMouseMove = (e) => {
  const container = document.querySelector('.illustration-container')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  mouseX = (e.clientX - rect.left - rect.width / 2) / rect.width
  mouseY = (e.clientY - rect.top - rect.height / 2) / rect.height
  
  // 应用视差效果
  const elements = container.querySelectorAll('.floating-square, .chart-list-frame, .dialog-box, .deco-circle')
  elements.forEach((el, index) => {
    const speed = (index + 1) * 0.3
    el.style.transform = `translate(${mouseX * speed * 8}px, ${mouseY * speed * 8}px)`
  })
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.interactive-illustration {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.illustration-container {
  position: relative;
  width: 480px;
  height: 360px;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* 背景装饰元素 */
.bg-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.floating-square {
  position: absolute;
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  border-radius: 8px;
  animation: float 6s ease-in-out infinite;
}

.square-1 {
  width: 20px;
  height: 20px;
  top: 30px;
  right: 70px;
  animation-delay: 0s;
  opacity: 0.9;
  z-index: 15;
}

.square-2 {
  width: 16px;
  height: 16px;
  top: 70px;
  right: 30px;
  animation-delay: 2s;
  opacity: 0.8;
  z-index: 15;
}

.floating-line {
  position: absolute;
  background: linear-gradient(90deg, #FF6B6B, #FF8E8E);
  border-radius: 2px;
  animation: float 8s ease-in-out infinite;
}

.line-1 {
  width: 60px;
  height: 4px;
  top: 40px;
  right: 10px;
  animation-delay: 1s;
}

/* 主窗口 */
.main-window {
  position: absolute;
  top: 40px;
  left: 70px;
  width: 380px;
  height: 260px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 18px;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.15),
    0 15px 30px rgba(64, 158, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
  animation: windowFloat 8s ease-in-out infinite;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 5;
}

.window-header {
  height: 40px;
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 14px;
  border-radius: 18px 18px 0 0;
}

.window-controls {
  display: flex;
  gap: 6px;
}

.control-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.red { background: #FF5F56; }
.yellow { background: #FFBD2E; }
.green { background: #27CA3F; }

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 65%;
  background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.8));
  border-radius: 3px;
  animation: progressMove 4s ease-in-out infinite;
  box-shadow: 0 1px 4px rgba(255, 255, 255, 0.5);
}

.window-content {
  padding: 0;
  display: flex;
  gap: 0;
  height: calc(100% - 40px);
}

/* 左侧边栏 */
.sidebar {
  width: 60px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  border-right: 1px solid #e9ecef;
}

.sidebar-item {
  height: 24px;
  background: #e9ecef;
  border-radius: 4px;
  animation: sidebarPulse 3s ease-in-out infinite;
}

.sidebar-item.active {
  background: #409EFF;
}

.sidebar-item:nth-child(2) { animation-delay: 0.5s; }
.sidebar-item:nth-child(3) { animation-delay: 1s; }
.sidebar-item:nth-child(4) { animation-delay: 1.5s; }

/* 右侧内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

/* 统计卡片 */
.stats-card {
  height: 50px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 8px;
}

.card-header {
  height: 8px;
  width: 80px;
  background: #409EFF;
  border-radius: 4px;
  margin-bottom: 8px;
}

.card-content {
  display: flex;
  gap: 12px;
}

.stat-item {
  height: 16px;
  background: #e9ecef;
  border-radius: 3px;
  animation: statPulse 2s ease-in-out infinite;
}

.stat-item:nth-child(1) { width: 40px; animation-delay: 0s; }
.stat-item:nth-child(2) { width: 30px; animation-delay: 0.3s; }
.stat-item:nth-child(3) { width: 35px; animation-delay: 0.6s; }

/* 图表区域 */
.chart-area {
  flex: 1;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.line-chart {
  width: 100%;
  height: 100%;
}

.chart-line {
  animation: lineDraw 4s ease-in-out infinite;
}

.data-point {
  animation: pointPulse 2s ease-in-out infinite;
  fill: white;
  stroke: #409EFF;
  stroke-width: 2;
}

.point-1 { animation-delay: 0s; }
.point-2 { animation-delay: 0.5s; }
.point-3 { animation-delay: 1s; }
.point-4 { animation-delay: 1.5s; }

/* 左下角图表列表框 */
.chart-list-frame {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 140px;
  height: 70px;
  animation: frameFloat 5s ease-in-out infinite;
  z-index: 10;
}

.frame-border {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(64, 158, 255, 0.08);
  padding: 12px;
  position: relative;
}

.chart-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.mini-chart {
  flex: 0 0 40px;
  height: 40px;
}

.mini-donut {
  width: 100%;
  height: 100%;
  animation: miniChartRotate 4s ease-in-out infinite;
}

.mini-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-dot {
  width: 6px;
  height: 6px;
  background: #409EFF;
  border-radius: 50%;
  animation: dotPulse 2s ease-in-out infinite;
}

.list-item:nth-child(2) .list-dot {
  background: #67C23A;
  animation-delay: 1s;
}

.list-bar {
  flex: 1;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.list-bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 70%;
  background: #409EFF;
  border-radius: 2px;
  animation: barGrow 3s ease-in-out infinite;
}

.list-item:nth-child(2) .list-bar::after {
  width: 85%;
  background: #67C23A;
  animation-delay: 1.5s;
}

/* 右上角对话框 */
.dialog-box {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 120px;
  height: 70px;
  animation: dialogFloat 6s ease-in-out infinite;
  z-index: 12;
}

.dialog-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(64, 158, 255, 0.08);
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  position: relative;
}

.dialog-avatar {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  border-radius: 50%;
  flex-shrink: 0;
}

.dialog-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-line {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  animation: textPulse 2s ease-in-out infinite;
}

.line-1 {
  width: 100%;
  animation-delay: 0s;
}

.line-2 {
  width: 70%;
  animation-delay: 0.5s;
}

.dialog-tail {
  position: absolute;
  bottom: -8px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* 右下角人形图案 */
.character {
  position: absolute;
  bottom: 20px;
  right: 20px;
  animation: characterFloat 6s ease-in-out infinite;
  z-index: 8;
  transform: scale(0.9);
}

.character-svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.character-head {
  animation: headBob 4s ease-in-out infinite;
}

.character-hair {
  animation: hairSway 5s ease-in-out infinite;
}

.character-hair-highlight {
  animation: hairSway 5s ease-in-out infinite;
  animation-delay: 0.5s;
}

.character-hair-curl {
  animation: hairCurl 4s ease-in-out infinite;
}



.character-torso {
  animation: breathe 3s ease-in-out infinite;
}

.character-arm-left-upper,
.character-arm-right-upper {
  animation: armMove 5s ease-in-out infinite;
}

.character-arm-left-lower,
.character-arm-right-lower {
  animation: armMove 5s ease-in-out infinite;
  animation-delay: 0.5s;
}

.character-hand-left,
.character-hand-right {
  animation: handMove 4s ease-in-out infinite;
}

.character-leg-left-upper,
.character-leg-right-upper {
  animation: legSway 6s ease-in-out infinite;
}

.character-leg-left-lower,
.character-leg-right-lower {
  animation: legSway 6s ease-in-out infinite;
  animation-delay: 0.5s;
}

.sitting-ground {
  animation: groundPulse 4s ease-in-out infinite;
}

.character-eye-left,
.character-eye-right {
  animation: eyeBlink 3s ease-in-out infinite;
}

.laptop {
  animation: laptopGlow 4s ease-in-out infinite;
}

/* 浮动卡片 */
.floating-card {
  position: absolute;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 8px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(64, 158, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 12px;
  animation: cardFloat 7s ease-in-out infinite;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.card-1 {
  top: 30px;
  left: 30px;
  width: 90px;
  height: 70px;
  animation-delay: 1s;
  z-index: 2;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #67C23A, #85CE61);
  border-radius: 6px;
}

.card-text {
  height: 8px;
  background: #E4E7ED;
  border-radius: 4px;
}

/* 装饰性元素 */
.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  animation: float 10s ease-in-out infinite;
}

.circle-1 {
  width: 14px;
  height: 14px;
  background: #F56C6C;
  top: 85px;
  left: 15px;
  animation-delay: 3s;
  opacity: 0.8;
  z-index: 15;
}

.deco-triangle {
  position: absolute;
  width: 0;
  height: 0;
  animation: float 9s ease-in-out infinite;
}

.triangle-1 {
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 14px solid #E6A23C;
  top: 120px;
  left: 380px;
  animation-delay: 2s;
}

.deco-line {
  position: absolute;
  background: #909399;
  border-radius: 2px;
  animation: float 7s ease-in-out infinite;
}

.line-2 {
  width: 40px;
  height: 2px;
  top: 200px;
  left: 350px;
  animation-delay: 4s;
}

/* 动画定义 */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes windowFloat {
  0%, 100% { transform: translateY(0px) scale(1); }
  25% { transform: translateY(-8px) scale(1.01); }
  50% { transform: translateY(-12px) scale(1.02); }
  75% { transform: translateY(-6px) scale(1.01); }
}

@keyframes progressMove {
  0% { width: 30%; }
  50% { width: 80%; }
  100% { width: 30%; }
}

@keyframes sidebarPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes statPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes lineDraw {
  0% { stroke-dasharray: 0 1000; }
  50% { stroke-dasharray: 200 1000; }
  100% { stroke-dasharray: 0 1000; }
}

@keyframes pointPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes frameFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

@keyframes donutRotate {
  0% { stroke-dasharray: 150 70; }
  50% { stroke-dasharray: 100 120; }
  100% { stroke-dasharray: 150 70; }
}

@keyframes dialogFloat {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-6px) scale(1.05); }
}

@keyframes textPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes characterFloat {
  0%, 100% { transform: scale(0.9) translateY(0px); }
  50% { transform: scale(0.9) translateY(-6px); }
}

@keyframes headBob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
}

@keyframes hairSway {
  0%, 100% { transform: translateX(0px); }
  50% { transform: translateX(1px); }
}

@keyframes hairCurl {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(5deg); }
}

@keyframes groundPulse {
  0%, 100% { opacity: 0.5; transform: scaleX(1); }
  50% { opacity: 0.3; transform: scaleX(1.05); }
}

@keyframes breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.02); }
}

@keyframes armMove {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
}

@keyframes handMove {
  0%, 100% { transform: translateY(0px); }
  25% { transform: translateY(-1px); }
  50% { transform: translateY(0px); }
  75% { transform: translateY(-0.5px); }
}

@keyframes legSway {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-0.5px); }
}

@keyframes eyeBlink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

@keyframes laptopGlow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

@keyframes miniChartRotate {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
}

@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes barGrow {
  0% { width: 0%; }
  100% { width: 70%; }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(2deg); }
}

@keyframes loaderFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-8px) rotate(5deg); }
  66% { transform: translateY(-12px) rotate(-3deg); }
}

/* 鼠标悬停效果 */
.illustration-container:hover .main-window {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.illustration-container:hover .character {
  animation-duration: 3s;
}

.illustration-container:hover .character-head {
  animation-duration: 2s;
}

.illustration-container:hover .laptop {
  animation-duration: 2s;
}

.illustration-container:hover .chart-list-frame {
  transform: translateY(-5px) scale(1.05);
}

.illustration-container:hover .dialog-box {
  transform: translateY(-3px) scale(1.02);
}

.illustration-container:hover .data-point {
  animation-duration: 1s;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .illustration-container {
    width: 320px;
    height: 240px;
    transform: scale(0.85);
  }

  .main-window {
    width: 300px;
    height: 200px;
  }

  .chart-list-frame {
    width: 120px;
    height: 60px;
  }

  .character {
    transform: scale(0.7);
  }

  /* 移动端减少动画以提升性能 */
  .floating-square,
  .floating-card,
  .deco-circle {
    animation-duration: 8s;
  }
}
</style>
