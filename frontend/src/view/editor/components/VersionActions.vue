<template>
  <div 
    class="version-actions-floating" 
    :class="{ 'dragging': isDragging }"
    :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
    ref="floatingPanel"
  >
    <div 
      class="version-controls" 
      :class="{ 'dragging': isDragging }"
      @mouseenter="handleMouseEnter" 
      @mouseleave="handleMouseLeave"
    >
      <!-- 拖拽手柄 -->
      <div 
        class="drag-handle"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <i class="fas fa-grip-dots-vertical"></i>
      </div>

      <div class="control-buttons">
        <a-tooltip title="撤销 (Ctrl+Z)" placement="left">
          <button 
            :disabled="!canUndo" 
            @click="$emit('undo')"
            :class="['control-btn', 'undo-btn', { 'disabled': !canUndo }]"
          >
            <i class="fas fa-undo"></i>
          </button>
        </a-tooltip>

        <a-tooltip title="重做 (Ctrl+Y)" placement="left">
          <button 
            :disabled="!canRedo" 
            @click="$emit('redo')"
            :class="['control-btn', 'redo-btn', { 'disabled': !canRedo }]"
          >
            <i class="fas fa-redo"></i>
          </button>
        </a-tooltip>
      </div>

      <div class="version-status-compact">
        <div class="status-indicator" :class="{ 'modified': hasUnsavedChanges }">
          <i class="fas fa-circle"></i>
        </div>
        <span class="version-text">{{ versionCount }}</span>
      </div>
    </div>

    <!-- 详细信息展开 -->
    <Transition name="details">
      <div class="version-details" v-if="showDetails">
        <div class="detail-item">
          <span class="detail-label">版本数量</span>
          <span class="detail-value">{{ versionCount }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">保存状态</span>
          <span class="detail-value" :class="{ 'modified': hasUnsavedChanges }">
            {{ hasUnsavedChanges ? '未保存' : '已保存' }}
          </span>
        </div>
        <div class="detail-item" v-if="canUndo || canRedo">
          <span class="detail-label">操作</span>
          <span class="detail-value">
            <span v-if="canUndo" class="text-green-600">可撤销</span>
            <span v-if="canUndo && canRedo" class="mx-1">·</span>
            <span v-if="canRedo" class="text-orange-600">可重做</span>
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

defineProps({
  canUndo: {
    type: Boolean,
    default: false,
  },
  canRedo: {
    type: Boolean,
    default: false,
  },
  versionCount: {
    type: Number,
    default: 0,
  },
  hasUnsavedChanges: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["undo", "redo"]);

const showDetails = ref(false)
const floatingPanel = ref(null)
const isDragging = ref(false)

// 位置状态
const position = reactive({
  x: 0,
  y: 0
})

// 拖拽状态
const dragState = reactive({
  startX: 0,
  startY: 0,
  startPos: { x: 0, y: 0 }
})

// 初始化位置
const initPosition = () => {
  // 从 localStorage 读取保存的位置，或使用默认位置
  const savedPosition = localStorage.getItem('version-actions-position')
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition)
      position.x = pos.x
      position.y = pos.y
    } catch (e) {
      // 如果解析失败，使用默认位置
      setDefaultPosition()
    }
  } else {
    setDefaultPosition()
  }
}

// 设置默认位置（屏幕右侧中央）
const setDefaultPosition = () => {
  position.x = window.innerWidth - 100
  position.y = window.innerHeight / 2 - 50
}

// 保存位置到 localStorage
const savePosition = () => {
  localStorage.setItem('version-actions-position', JSON.stringify({
    x: position.x,
    y: position.y
  }))
}

// 限制位置在屏幕范围内
const constrainPosition = () => {
  const panel = floatingPanel.value
  if (!panel) return
  
  const rect = panel.getBoundingClientRect()
  const margin = 10
  
  // 获取面板尺寸
  const panelWidth = rect.width
  const panelHeight = rect.height
  
  // 考虑可能的详细信息展开区域
  const detailsWidth = 152 // 详细信息面板的宽度加上边距
  const leftConstraint = showDetails.value ? margin + detailsWidth : margin
  
  // 限制在屏幕范围内，确保详细信息面板也能完全显示
  position.x = Math.max(leftConstraint, Math.min(window.innerWidth - panelWidth - margin, position.x))
  position.y = Math.max(margin, Math.min(window.innerHeight - panelHeight - margin, position.y))
}

// 开始拖拽
const startDrag = (e) => {
  e.preventDefault()
  isDragging.value = true
  
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  
  dragState.startX = clientX
  dragState.startY = clientY
  dragState.startPos = { x: position.x, y: position.y }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
  
  // 添加拖拽中的样式
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return
  
  e.preventDefault()
  
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
  
  const deltaX = clientX - dragState.startX
  const deltaY = clientY - dragState.startY
  
  position.x = dragState.startPos.x + deltaX
  position.y = dragState.startPos.y + deltaY
  
  constrainPosition()
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
  
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
  
  // 移除拖拽样式
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  
  // 保存位置
  savePosition()
}

// 鼠标进入处理
const handleMouseEnter = () => {
  if (!isDragging.value) {
    showDetails.value = true
  }
}

// 鼠标离开处理
const handleMouseLeave = () => {
  if (!isDragging.value) {
    showDetails.value = false
  }
}

// 窗口大小改变时重新调整位置
const handleResize = () => {
  nextTick(() => {
    constrainPosition()
    savePosition()
  })
}

onMounted(() => {
  initPosition()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<style lang="scss" scoped>
.version-actions-floating {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  transition: transform 0.1s ease-out;
  
  &:not(.dragging) {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .version-controls {
    position: relative;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.6);
    border-radius: 16px;
    padding: 8px 8px 12px 8px;
    box-shadow: 
      0 10px 25px rgba(0, 0, 0, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 
        0 20px 35px rgba(0, 0, 0, 0.15),
        0 8px 20px rgba(0, 0, 0, 0.08);
      transform: scale(1.02);
    }
    
    &.dragging {
      transform: scale(1.05) rotate(2deg);
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.25),
        0 12px 30px rgba(0, 0, 0, 0.15);
      z-index: 1000;
    }
  }
  
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 20px;
    cursor: grab;
    color: #94a3b8;
    font-size: 12px;
    transition: all 0.2s ease;
    border-radius: 6px;
    margin-bottom: 4px;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, transparent 30%, rgba(148, 163, 184, 0.1) 30%, rgba(148, 163, 184, 0.1) 70%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: 6px;
    }
    
    &:hover {
      color: #64748b;
      background: rgba(148, 163, 184, 0.1);
      
      &::before {
        opacity: 1;
      }
    }
    
    &:active {
      cursor: grabbing;
      background: rgba(148, 163, 184, 0.2);
      transform: scale(1.05);
      
      &::before {
        opacity: 0.8;
      }
    }
    
    i {
      transform: rotate(90deg);
      position: relative;
      z-index: 1;
    }
  }

  .control-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .control-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.1);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    &:hover:not(.disabled) {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 
        0 8px 25px rgba(102, 126, 234, 0.4),
        0 4px 12px rgba(102, 126, 234, 0.2);
        
      &::before {
        opacity: 1;
      }
    }
    
    &:active:not(.disabled) {
      transform: translateY(-1px) scale(1.02);
    }
    
    &.disabled {
      background: #f1f5f9;
      color: #cbd5e1;
      cursor: not-allowed;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
      
      &:hover {
        transform: none;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
      }
    }
    
    &.undo-btn:not(.disabled) {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      
      &:hover {
        box-shadow: 
          0 8px 25px rgba(16, 185, 129, 0.4),
          0 4px 12px rgba(16, 185, 129, 0.2);
      }
    }
    
    &.redo-btn:not(.disabled) {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      
      &:hover {
        box-shadow: 
          0 8px 25px rgba(245, 158, 11, 0.4),
          0 4px 12px rgba(245, 158, 11, 0.2);
      }
    }
    
    i {
      position: relative;
      z-index: 1;
    }
  }
  
  .version-status-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .status-indicator {
    font-size: 8px;
    color: #10b981;
    transition: all 0.2s ease;
    
    &.modified {
      color: #f59e0b;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  }
  
  .version-text {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-align: center;
  }
  
  .version-details {
    position: absolute;
    right: 100%;
    top: 0;
    margin-right: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.6);
    min-width: 140px;
    box-shadow: 
      0 10px 25px rgba(0, 0, 0, 0.15),
      0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .detail-label {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 500;
  }
  
  .detail-value {
    font-size: 10px;
    font-weight: 600;
    color: #10b981;
    
    &.modified {
      color: #f59e0b;
    }
  }
}

// 过渡动画
.details-enter-active, .details-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.details-enter-from {
  opacity: 0;
  transform: translateX(10px) scale(0.95);
}

.details-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.95);
}

// 响应式设计
@media (max-width: 768px) {
  .version-actions-floating {
    position: fixed;
    bottom: 20px;
    right: 50%;
    top: auto;
    transform: translateX(50%);
    
    .version-controls {
      flex-direction: row;
      padding: 8px 16px;
      border-radius: 24px;
      
      &:hover {
        transform: scale(1.05);
      }
    }
    
    .control-buttons {
      flex-direction: row;
    }
    
    .control-btn {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }
    
    .version-details {
      position: static;
      margin: 8px 0 0 0;
      width: 100%;
    }
  }
}

@media (max-width: 480px) {
  .version-actions-floating {
    .control-btn {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }
  }
}
</style>
