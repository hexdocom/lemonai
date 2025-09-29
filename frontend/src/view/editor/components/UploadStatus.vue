<template>
  <transition name="status-slide">
    <div v-if="visible" class="upload-status-container">
      <div 
        class="status-card"
        :class="{
          'status-success': status === 'success',
          'status-error': status === 'error',
          'status-warning': status === 'warning',
          'status-info': status === 'info'
        }"
      >
        <!-- 状态图标 -->
        <div class="status-icon">
          <i 
            :class="{
              'fas fa-check-circle': status === 'success',
              'fas fa-exclamation-circle': status === 'error',
              'fas fa-exclamation-triangle': status === 'warning',
              'fas fa-info-circle': status === 'info'
            }"
          ></i>
        </div>
        
        <!-- 状态内容 -->
        <div class="status-content">
          <h4 class="status-title">{{ title }}</h4>
          <p v-if="message" class="status-message">{{ message }}</p>
          
          <!-- 文件列表 -->
          <div v-if="files && files.length > 0" class="file-list">
            <div 
              v-for="(file, index) in files"
              :key="index"
              class="file-item"
              :class="{ 'file-error': !file.success }"
            >
              <div class="file-info">
                <i class="fas fa-file-alt file-icon"></i>
                <span class="file-name">{{ file.filename }}</span>
                <span v-if="file.size" class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
              <div class="file-status">
                <i 
                  v-if="file.success"
                  class="fas fa-check text-green-500"
                ></i>
                <i 
                  v-else
                  class="fas fa-times text-red-500"
                  :title="file.error"
                ></i>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div v-if="showActions" class="status-actions">
            <a-button 
              v-if="status === 'success' && onConfirm"
              type="primary" 
              size="small"
              @click="handleConfirm"
            >
              确认
            </a-button>
            <a-button 
              v-if="onRetry"
              type="default" 
              size="small"
              @click="handleRetry"
            >
              重试
            </a-button>
            <a-button 
              size="small"
              @click="handleClose"
            >
              关闭
            </a-button>
          </div>
        </div>
        
        <!-- 关闭按钮 -->
        <button class="status-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'info', // success, error, warning, info
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  files: {
    type: Array,
    default: () => []
  },
  showActions: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Boolean,
    default: false
  },
  autoCloseDelay: {
    type: Number,
    default: 3000
  },
  onConfirm: {
    type: Function,
    default: null
  },
  onRetry: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['close', 'confirm', 'retry'])

let autoCloseTimer = null

// 监听visible变化，自动关闭
watch(() => props.visible, (newVal) => {
  if (newVal && props.autoClose) {
    autoCloseTimer = setTimeout(() => {
      handleClose()
    }, props.autoCloseDelay)
  } else if (!newVal && autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
})

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 处理确认
const handleConfirm = () => {
  if (props.onConfirm) {
    props.onConfirm()
  }
  emit('confirm')
}

// 处理重试
const handleRetry = () => {
  if (props.onRetry) {
    props.onRetry()
  }
  emit('retry')
}

// 处理关闭
const handleClose = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
  emit('close')
}

// 清理定时器
const cleanup = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
}

// 组件卸载时清理
import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanup()
})
</script>

<style lang="scss" scoped>
.upload-status-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  min-width: 300px;
}

.status-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  overflow: hidden;
  position: relative;
  animation: statusAppear 0.3s ease;
  
  &.status-success {
    border-left-color: #10b981;
    
    .status-icon i {
      color: #10b981;
    }
  }
  
  &.status-error {
    border-left-color: #ef4444;
    
    .status-icon i {
      color: #ef4444;
    }
  }
  
  &.status-warning {
    border-left-color: #f59e0b;
    
    .status-icon i {
      color: #f59e0b;
    }
  }
  
  &.status-info {
    border-left-color: #3b82f6;
    
    .status-icon i {
      color: #3b82f6;
    }
  }
}

.status-icon {
  position: absolute;
  top: 16px;
  left: 16px;
  
  i {
    font-size: 20px;
  }
}

.status-content {
  padding: 16px 50px 16px 48px;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.status-message {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.file-list {
  margin: 12px 0;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.file-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
  }
  
  &:hover {
    background: #f3f4f6;
    
    &.file-error {
      background: #fef2f2;
    }
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-icon {
  color: #6b7280;
  font-size: 12px;
}

.file-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  flex: 1;
  truncate: true;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #9ca3af;
  font-weight: normal;
}

.file-status {
  margin-left: 8px;
  
  i {
    font-size: 12px;
  }
}

.status-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.status-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
}

// 动画
@keyframes statusAppear {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 过渡动画
.status-slide-enter-active,
.status-slide-leave-active {
  transition: all 0.3s ease;
}

.status-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.status-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

// 响应式设计
@media (max-width: 640px) {
  .upload-status-container {
    left: 10px;
    right: 10px;
    max-width: none;
  }
  
  .status-content {
    padding: 14px 40px 14px 40px;
  }
  
  .status-title {
    font-size: 15px;
  }
  
  .status-message {
    font-size: 13px;
  }
}
</style>