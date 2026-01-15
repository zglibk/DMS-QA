<template>
  <div 
    ref="sealRef"
    class="draggable-seal no-print"
    :style="style"
    @mousedown="startDrag"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <img :src="sealUrl" class="seal-img" draggable="false" />
    <div class="seal-controls no-print" v-if="isActive">
      <el-icon class="control-icon move-icon"><Rank /></el-icon>
      <el-icon class="control-icon delete-icon" @click.stop="$emit('remove')"><Close /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { Rank, Close } from '@element-plus/icons-vue'

const props = defineProps({
  sealUrl: {
    type: String,
    required: true
  },
  initialX: {
    type: Number,
    default: 0
  },
  initialY: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 140
  },
  height: {
    type: Number,
    default: 140
  }
})

const emit = defineEmits(['update:position', 'remove'])

const x = ref(props.initialX)
const y = ref(props.initialY)
const isDragging = ref(false)
const isActive = ref(false) // Show controls on hover/active

const style = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${props.width}px`,
  height: `${props.height}px`,
  transform: 'translate(-50%, -50%)', // Center the seal on coordinates
  zIndex: isDragging.value ? 2000 : 1500
}))

let startX = 0
let startY = 0
let initialLeft = 0
let initialTop = 0

const startDrag = (e) => {
  // Only left click
  if (e.button !== 0) return
  
  isDragging.value = true
  startX = e.clientX
  startY = e.clientY
  initialLeft = x.value
  initialTop = y.value
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  
  x.value = initialLeft + dx
  y.value = initialTop + dy
  
  emit('update:position', { x: x.value, y: y.value })
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  
  // Check if mouse is still over the element
  if (!isActive.value) {
      // Logic for sticky active state can go here if needed
  }
}

const onMouseEnter = () => {
    isActive.value = true
}

const onMouseLeave = () => {
    if (!isDragging.value) {
        isActive.value = false
    }
}

onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.draggable-seal {
  position: absolute;
  cursor: move; /* Fallback */
  user-select: none;
}

.seal-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.85; /* Slight transparency for realistic look */
  pointer-events: none;
}

.seal-controls {
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 2px;
}

.draggable-seal:hover .seal-controls {
  opacity: 1;
}

.control-icon {
  font-size: 16px;
  padding: 4px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  color: #666;
}

.control-icon:hover {
  color: #409EFF;
  border-color: #409EFF;
}

.delete-icon:hover {
  color: #F56C6C;
  border-color: #F56C6C;
}

/* Print specific styles */
@media print {
  .draggable-seal {
    position: absolute !important; /* Ensure absolute positioning works in print */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Hide controls in print */
  .seal-controls,
  .no-print {
    display: none !important;
  }
}
</style>