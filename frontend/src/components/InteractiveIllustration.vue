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
          <defs>
            <radialGradient id="skinGradient" cx="38%" cy="32%" r="70%">
              <stop offset="0%" stop-color="#FFD6A1"/>
              <stop offset="62%" stop-color="#FFBD73"/>
              <stop offset="100%" stop-color="#E89D53"/>
            </radialGradient>
            <linearGradient id="shirtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#5BA8FF"/>
              <stop offset="56%" stop-color="#3E8CFF"/>
              <stop offset="100%" stop-color="#2F6FD3"/>
            </linearGradient>
            <linearGradient id="pantsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#415A77"/>
              <stop offset="100%" stop-color="#25364A"/>
            </linearGradient>
            <linearGradient id="laptopScreenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38BDF8"/>
              <stop offset="100%" stop-color="#22D3EE"/>
            </linearGradient>
          </defs>
          <!-- 人物主体 -->
          <g class="character-body">
            <g class="character-chair">
              <rect x="39.5" y="38" width="21" height="22" rx="6" fill="#6B7C93" opacity="0.72"/>
              <rect x="35.8" y="61.2" width="28.4" height="6.2" rx="3.1" fill="#5A6B83"/>
              <rect x="39.2" y="66.4" width="2.6" height="13" rx="1.3" fill="#46576E"/>
              <rect x="58.2" y="66.4" width="2.6" height="13" rx="1.3" fill="#46576E"/>
            </g>

            <path d="M47.8 28.2 Q50 27.4 52.2 28.2 L51.6 31.4 Q50 32.1 48.4 31.4 Z" fill="url(#skinGradient)" class="character-neck"/>
            <path d="M42.4 36.4 Q44.4 33.2 50 33.2 Q55.6 33.2 57.6 36.4 L57 61.4 Q50 63 43 61.4 Z" fill="url(#shirtGradient)" class="character-torso"/>
            <path d="M43.6 61 Q50 63.8 56.4 61.2 L56.6 66.2 Q50 68.5 43.4 66.2 Z" fill="#2B3A4F" class="character-waist"/>

            <path d="M46.2 66.4 C42.6 66.5 38.9 68.2 36 71.2" stroke="url(#pantsGradient)" stroke-width="6" stroke-linecap="round" fill="none" class="character-leg-left-upper"/>
            <path d="M36 71.2 C33.9 75.6 34.5 81.8 36.8 87.2" stroke="url(#pantsGradient)" stroke-width="5.2" stroke-linecap="round" fill="none" class="character-leg-left-lower"/>
            <ellipse cx="37.2" cy="88.8" rx="3.1" ry="1.8" fill="#334155" class="character-foot-left"/>

            <path d="M53.8 66.4 C57.4 66.5 61.1 68.2 64 71.2" stroke="url(#pantsGradient)" stroke-width="6" stroke-linecap="round" fill="none" class="character-leg-right-upper"/>
            <path d="M64 71.2 C66.1 75.6 65.5 81.8 63.2 87.2" stroke="url(#pantsGradient)" stroke-width="5.2" stroke-linecap="round" fill="none" class="character-leg-right-lower"/>
            <ellipse cx="62.8" cy="88.8" rx="3.1" ry="1.8" fill="#334155" class="character-foot-right"/>

            <g class="character-desk">
              <rect x="25.5" y="52.5" width="49" height="4.8" rx="2.4" fill="#4B5563" opacity="0.92"/>
              <rect x="27.2" y="56.9" width="2.3" height="31" rx="1.15" fill="#334155"/>
              <rect x="70.5" y="56.9" width="2.3" height="31" rx="1.15" fill="#334155"/>
            </g>

            <path d="M43.4 41.6 C41.8 44.4 40.9 47.2 40.5 50.2" stroke="url(#shirtGradient)" stroke-width="5.2" stroke-linecap="round" fill="none" class="character-arm-left-upper"/>
            <path d="M40.5 50.2 C39.7 54.6 39.4 51.6 39.2 48" stroke="url(#shirtGradient)" stroke-width="4.7" stroke-linecap="round" fill="none" class="character-arm-left-lower"/>
            <circle cx="39.2" cy="49" r="2.2" fill="url(#skinGradient)" class="character-hand-left"/>

            <path d="M56.6 41.6 C58.2 44.4 59.1 47.2 59.5 50.2" stroke="url(#shirtGradient)" stroke-width="5.2" stroke-linecap="round" fill="none" class="character-arm-right-upper"/>
            <path d="M59.5 50.2 C60.3 54.6 60.6 51.6 60.8 48" stroke="url(#shirtGradient)" stroke-width="4.7" stroke-linecap="round" fill="none" class="character-arm-right-lower"/>
            <circle cx="60.8" cy="49" r="2.2" fill="url(#skinGradient)" class="character-hand-right"/>

            <circle cx="50" cy="20.2" r="8.8" fill="url(#skinGradient)" class="character-head"/>
            <circle cx="42.5" cy="20.4" r="1.2" fill="url(#skinGradient)" class="character-ear-left"/>
            <circle cx="57.5" cy="20.4" r="1.2" fill="url(#skinGradient)" class="character-ear-right"/>
            <path d="M41.2 16.4 Q45.4 9.1 50 10.2 Q54.6 9.1 58.8 16.4 Q57 13.7 54.8 14.1 Q50 10.9 45.2 14.1 Q43 13.7 41.2 16.4" fill="#8D6E63" class="character-hair"/>
            <path d="M43.2 15.2 Q47 11.9 50.1 12.5 Q53.2 11.9 56.8 15.2" fill="#A1887F" class="character-hair-highlight"/>
            <circle cx="44.2" cy="17.6" r="1.2" fill="#8D6E63" class="character-hair-curl"/>
            <circle cx="55.8" cy="17.6" r="1.2" fill="#8D6E63" class="character-hair-curl"/>
            <path d="M44.8 16.8 Q46.2 16.1 47.6 16.8" stroke="#6B4A38" stroke-width="0.8" fill="none" class="character-brow-left"/>
            <path d="M52.4 16.8 Q53.8 16.1 55.2 16.8" stroke="#6B4A38" stroke-width="0.8" fill="none" class="character-brow-right"/>
            <circle cx="46.2" cy="19.1" r="0.95" fill="#2C3E50" class="character-eye-left"/>
            <circle cx="53.8" cy="19.1" r="0.95" fill="#2C3E50" class="character-eye-right"/>
            <path d="M50 19.6 Q50.7 20.3 50 20.8" stroke="#D18853" stroke-width="0.6" fill="none" class="character-nose"/>
            <path d="M48.3 23.2 Q50 24.2 51.7 23.2" stroke="#2C3E50" stroke-width="0.9" fill="none" class="character-smile"/>
            <ellipse cx="47" cy="21.7" rx="1.1" ry="0.55" fill="#F3A985" opacity="0.38" class="character-cheek-left"/>
            <ellipse cx="53" cy="21.7" rx="1.1" ry="0.55" fill="#F3A985" opacity="0.38" class="character-cheek-right"/>

            <g class="laptop" transform="translate(39, 30)">
              <!-- 屏幕 -->
              <rect x="0" y="0" width="26" height="16" rx="2" fill="#34495E" stroke="#2C3E50" stroke-width="1"/>
              <rect x="2" y="2" width="22" height="12" fill="url(#laptopScreenGradient)"/>
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
            <ellipse cx="50" cy="92" rx="22" ry="2.8" fill="#E0E0E0" opacity="0.5" class="sitting-ground"/>
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
  transform: scale(0.98);
}

.character-svg {
  filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.16));
}

.character-head {
  animation: headBob 4s ease-in-out infinite;
  filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.25));
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
  filter: drop-shadow(0 1px 2px rgba(37, 99, 235, 0.25));
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
  transform-origin: center;
}

.laptop {
  animation: laptopGlow 4s ease-in-out infinite;
}

.character-brow-left,
.character-brow-right,
.character-nose,
.character-cheek-left,
.character-cheek-right,
.character-ear-left,
.character-ear-right {
  opacity: 0.96;
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
  0%, 100% { transform: scale(0.98) translateY(0px); }
  50% { transform: scale(0.98) translateY(-6px); }
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
