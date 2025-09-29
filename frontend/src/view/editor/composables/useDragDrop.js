import { ref } from 'vue'
import { useFileManager } from './useFileManager'
import { useNotification } from './useNotification'

export function useDragDrop() {
  const isDragging = ref(false)
  const dragCounter = ref(0)
  
  const { processDroppedFiles } = useFileManager()
  const { showNotification } = useNotification()
  
  let callbacks = {
    onFileProcessed: null,
    onMultipleFilesProcessed: null
  }
  
  const setCallbacks = (newCallbacks) => {
    callbacks = { ...callbacks, ...newCallbacks }
  }
  
  const initDragDrop = (targetElement) => {
    if (!targetElement) return
    
    // 防止页面的默认拖放行为
    const preventDefaults = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // 拖拽进入
    const handleDragEnter = (e) => {
      preventDefaults(e)
      
      // 检查是否在MediaEditDialog中，如果是则不处理
      if (e.target.closest('.media-edit-dialog') || document.querySelector('.media-edit-overlay')) {
        return
      }
      
      dragCounter.value++
      isDragging.value = true
      targetElement.classList.add('drag-over')
    }
    
    // 拖拽离开
    const handleDragLeave = (e) => {
      preventDefaults(e)
      dragCounter.value--
      if (dragCounter.value <= 0) {
        isDragging.value = false
        targetElement.classList.remove('drag-over')
      }
    }
    
    // 拖拽悬停
    const handleDragOver = (e) => {
      preventDefaults(e)
      e.dataTransfer.dropEffect = 'copy'
    }
    
    // 文件放置
    const handleDrop = async (e) => {
      preventDefaults(e)
      isDragging.value = false
      dragCounter.value = 0
      targetElement.classList.remove('drag-over')
      
      // 检查是否在MediaEditDialog中，如果是则不处理
      if (e.target.closest('.media-edit-dialog') || document.querySelector('.media-edit-overlay')) {
        return
      }
      
      const files = Array.from(e.dataTransfer.files)
      
      if (files.length === 0) {
        showNotification('没有检测到文件', 'warning')
        return
      }
      
      // 过滤支持的文件类型
      const supportedFiles = files.filter(file => 
        file.type.includes('text') || 
        file.name.endsWith('.html') ||
        file.name.endsWith('.htm')
      )
      
      if (supportedFiles.length === 0) {
        showNotification('不支持的文件类型，请选择 HTML 或文本文件', 'error')
        return
      }
      
      if (supportedFiles.length !== files.length) {
        showNotification(`跳过了 ${files.length - supportedFiles.length} 个不支持的文件`, 'warning')
      }
      
      try {
        showNotification('正在处理文件...', 'info', 1)
        const results = await processDroppedFiles(supportedFiles)
        
        const successResults = results.filter(r => r.success)
        const failedResults = results.filter(r => !r.success)
        
        if (failedResults.length > 0) {
          failedResults.forEach(result => {
            showNotification(`处理文件失败 ${result.filename}: ${result.error}`, 'error')
          })
        }
        
        if (successResults.length > 0) {
          if (successResults.length === 1) {
            // 单个文件处理
            if (callbacks.onFileProcessed) {
              callbacks.onFileProcessed(successResults[0])
            }
          } else {
            // 多个文件处理
            if (callbacks.onMultipleFilesProcessed) {
              callbacks.onMultipleFilesProcessed(successResults)
            }
          }
        }
        
      } catch (error) {
        showNotification(`处理文件时发生错误: ${error.message}`, 'error')
      }
    }
    
    // 绑定事件
    targetElement.addEventListener('dragenter', handleDragEnter)
    targetElement.addEventListener('dragleave', handleDragLeave)
    targetElement.addEventListener('dragover', handleDragOver)
    targetElement.addEventListener('drop', handleDrop)
    
    // 返回清理函数
    return () => {
      targetElement.removeEventListener('dragenter', handleDragEnter)
      targetElement.removeEventListener('dragleave', handleDragLeave)
      targetElement.removeEventListener('dragover', handleDragOver)
      targetElement.removeEventListener('drop', handleDrop)
    }
  }
  
  const createDragOverlay = () => {
    const overlay = document.createElement('div')
    overlay.className = 'drag-overlay'
    overlay.innerHTML = `
      <div class="drag-overlay-content">
        <i class="fas fa-cloud-upload-alt drag-icon"></i>
        <p class="drag-text">释放文件以导入</p>
        <p class="drag-subtext">支持 HTML 和文本文件</p>
      </div>
    `
    
    const style = document.createElement('style')
    style.textContent = `
      .drag-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(59, 130, 246, 0.1);
        border: 3px dashed #3b82f6;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      
      .drag-overlay-content {
        text-align: center;
        color: #3b82f6;
      }
      
      .drag-icon {
        font-size: 48px;
        margin-bottom: 16px;
        display: block;
      }
      
      .drag-text {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }
      
      .drag-subtext {
        font-size: 14px;
        margin: 0;
        opacity: 0.8;
      }
      
      .drag-over {
        background: rgba(59, 130, 246, 0.05);
        border: 2px dashed #3b82f6;
      }
    `
    
    document.head.appendChild(style)
    
    return { overlay, style }
  }
  
  return {
    isDragging,
    dragCounter,
    initDragDrop,
    setCallbacks,
    createDragOverlay
  }
}