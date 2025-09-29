<template>
  <div 
    class="upload-area-container"
    :class="{ 'upload-active': isUploading, 'drag-over': isDragOver }"
    @drop="handleDrop"
    @dragover.prevent="handleDragOver"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @click="triggerFileInput"
  >
    <!-- 背景装饰 -->
    <div class="upload-background">
      <div class="upload-pattern"></div>
    </div>
    
    <!-- 上传区域内容 -->
    <div class="upload-content" v-if="!isUploading">
      <div class="upload-icon">
        <i class="fas fa-cloud-upload-alt"></i>
      </div>
      <h3 class="upload-title">拖拽文件到此处上传</h3>
      <p class="upload-subtitle">或者点击选择文件</p>
      <div class="upload-types">
        支持 HTML、TXT、MD 格式
      </div>
      <div class="upload-hint">
        <i class="fas fa-info-circle"></i>
        您也可以使用 Ctrl+V 粘贴文件或文本内容
      </div>
    </div>
    
    <!-- 上传进度 -->
    <div class="upload-progress" v-if="isUploading">
      <div class="progress-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <h3 class="progress-title">正在处理文件...</h3>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="progress-text">{{ progressText }}</p>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input 
      ref="fileInputRef"
      type="file"
      accept=".html,.htm,.txt,.md"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'

const emit = defineEmits(['file-uploaded', 'files-uploaded'])

const isDragOver = ref(false)
const isUploading = ref(false)
const progress = ref(0)
const progressText = ref('')
const fileInputRef = ref(null)
const dragCounter = ref(0)

// 处理拖拽进入
const handleDragEnter = (e) => {
  e.preventDefault()
  dragCounter.value++
  if (dragCounter.value === 1) {
    isDragOver.value = true
  }
}

// 处理拖拽离开
const handleDragLeave = (e) => {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragOver.value = false
  }
}

// 处理拖拽悬停
const handleDragOver = (e) => {
  e.preventDefault()
}

// 处理文件拖放
const handleDrop = (e) => {
  e.preventDefault()
  isDragOver.value = false
  dragCounter.value = 0
  
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    processFiles(files)
  }
}

// 触发文件选择
const triggerFileInput = () => {
  if (!isUploading.value) {
    fileInputRef.value?.click()
  }
}

// 处理文件选择
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  if (files.length > 0) {
    processFiles(files)
  }
  // 清空input值，允许重复选择同一文件
  e.target.value = ''
}

// 处理粘贴事件
const handlePaste = (e) => {
  const clipboardData = e.clipboardData || window.clipboardData
  
  // 检查是否有文件
  const files = Array.from(clipboardData.files)
  if (files.length > 0) {
    e.preventDefault()
    processFiles(files)
    return
  }
  
  // 检查是否有文本内容
  const text = clipboardData.getData('text/plain')
  const html = clipboardData.getData('text/html')
  
  if (html && html.trim()) {
    e.preventDefault()
    processTextContent(html, 'HTML')
  } else if (text && text.trim()) {
    e.preventDefault()
    processTextContent(text, 'TEXT')
  }
}

// 处理文件
const processFiles = async (files) => {
  if (isUploading.value) return
  
  isUploading.value = true
  progress.value = 0
  
  try {
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop()
      return ['html', 'htm', 'txt', 'md'].includes(extension)
    })
    
    if (validFiles.length === 0) {
      message.error('请选择 HTML、TXT 或 MD 格式的文件')
      return
    }
    
    if (validFiles.length !== files.length) {
      message.warning(`已过滤 ${files.length - validFiles.length} 个不支持的文件格式`)
    }
    
    const results = []
    
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      progressText.value = `正在处理: ${file.name}`
      progress.value = Math.round((i / validFiles.length) * 80)
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 300))
      
      try {
        const content = await readFileContent(file)
        const result = {
          success: true,
          filename: file.name,
          content: content,
          size: file.size,
          type: file.type || 'text/plain'
        }
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: error.message
        })
      }
    }
    
    progress.value = 100
    progressText.value = '处理完成'
    
    // 延迟一下显示完成状态
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (results.length === 1) {
      emit('file-uploaded', results[0])
    } else {
      emit('files-uploaded', results)
    }
    
  } catch (error) {
    message.error(`文件处理失败: ${error.message}`)
  } finally {
    isUploading.value = false
    progress.value = 0
    progressText.value = ''
  }
}

// 处理文本内容
const processTextContent = async (content, type) => {
  if (isUploading.value) return
  
  isUploading.value = true
  progress.value = 0
  progressText.value = `正在处理粘贴的${type}内容`
  
  try {
    // 模拟处理
    for (let i = 0; i <= 100; i += 20) {
      progress.value = i
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const result = {
      success: true,
      filename: `粘贴内容.${type.toLowerCase() === 'html' ? 'html' : 'txt'}`,
      content: content,
      size: new Blob([content]).size,
      type: type.toLowerCase() === 'html' ? 'text/html' : 'text/plain'
    }
    
    progressText.value = '处理完成'
    await new Promise(resolve => setTimeout(resolve, 300))
    
    emit('file-uploaded', result)
    
  } catch (error) {
    message.error(`内容处理失败: ${error.message}`)
  } finally {
    isUploading.value = false
    progress.value = 0
    progressText.value = ''
  }
}

// 读取文件内容
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target.result)
    }
    reader.onerror = (e) => {
      reject(new Error('文件读取失败'))
    }
    reader.readAsText(file, 'UTF-8')
  })
}

// 添加全局粘贴监听
onMounted(() => {
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<style lang="scss" scoped>
.upload-area-container {
  position: relative;
  width: 100%;
  height: 300px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
  }
  
  &.drag-over {
    border-color: #10b981;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    transform: scale(1.02);
    box-shadow: 0 12px 35px rgba(16, 185, 129, 0.2);
    
    .upload-icon i {
      color: #10b981;
      animation: bounce 0.6s ease infinite alternate;
    }
    
    .upload-title {
      color: #065f46;
    }
  }
  
  &.upload-active {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    cursor: wait;
  }
}

.upload-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  
  .upload-pattern {
    width: 100%;
    height: 100%;
    background-image: 
      radial-gradient(circle at 25px 25px, #3b82f6 2px, transparent 2px),
      radial-gradient(circle at 75px 75px, #8b5cf6 2px, transparent 2px);
    background-size: 100px 100px;
    animation: patternMove 20s linear infinite;
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 24px;
  z-index: 1;
  position: relative;
}

.upload-icon {
  margin-bottom: 16px;
  
  i {
    font-size: 48px;
    color: #6b7280;
    transition: all 0.3s ease;
  }
}

.upload-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.upload-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.upload-types {
  display: inline-block;
  background: rgba(59, 130, 246, 0.1);
  color: #1e40af;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 16px;
}

.upload-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  
  i {
    color: #6b7280;
  }
}

.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 24px;
  z-index: 1;
  position: relative;
}

.progress-spinner {
  margin-bottom: 16px;
  
  i {
    font-size: 36px;
    color: #f59e0b;
  }
}

.progress-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.6),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-10px);
  }
}

@keyframes patternMove {
  0% {
    background-position: 0 0, 50px 50px;
  }
  100% {
    background-position: 100px 100px, 150px 150px;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

// 响应式设计
@media (max-width: 640px) {
  .upload-area-container {
    height: 250px;
  }
  
  .upload-icon i {
    font-size: 36px;
  }
  
  .upload-title {
    font-size: 18px;
  }
  
  .progress-bar {
    width: 160px;
  }
}
</style>