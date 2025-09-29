import { ref, reactive } from 'vue'
import { useNotification } from './useNotification'

export function useFileUpload() {
  const { showNotification } = useNotification()
  
  // 上传状态
  const uploadState = reactive({
    visible: false,
    status: 'info', // success, error, warning, info
    title: '',
    message: '',
    files: [],
    autoClose: false
  })
  
  // 显示上传状态
  const showUploadStatus = (config) => {
    Object.assign(uploadState, {
      visible: true,
      ...config
    })
  }
  
  // 隐藏上传状态
  const hideUploadStatus = () => {
    uploadState.visible = false
    // 清理状态
    setTimeout(() => {
      uploadState.status = 'info'
      uploadState.title = ''
      uploadState.message = ''
      uploadState.files = []
      uploadState.autoClose = false
    }, 300)
  }
  
  // 处理单个文件上传成功
  const handleSingleFileUpload = (result, callback) => {
    if (result.success) {
      showUploadStatus({
        status: 'success',
        title: '文件上传成功',
        message: `已成功导入文件: ${result.filename}`,
        files: [result],
        autoClose: true,
        autoCloseDelay: 2000
      })
      
      if (callback) {
        callback(result)
      }
      
      showNotification(`已导入文件: ${result.filename}`, 'success')
    } else {
      showUploadStatus({
        status: 'error',
        title: '文件上传失败',
        message: result.error || '未知错误',
        files: [result],
        showActions: true
      })
      
      showNotification(`导入失败: ${result.error || '未知错误'}`, 'error')
    }
  }
  
  // 处理多个文件上传结果
  const handleMultipleFileUpload = (results, callback) => {
    const successFiles = results.filter(r => r.success)
    const failedFiles = results.filter(r => !r.success)
    
    if (successFiles.length > 0 && failedFiles.length === 0) {
      // 全部成功
      showUploadStatus({
        status: 'success',
        title: '文件上传成功',
        message: `已成功导入 ${successFiles.length} 个文件`,
        files: results,
        autoClose: true,
        autoCloseDelay: 3000
      })
      
      if (callback) {
        // 使用最后一个成功的文件作为主要内容
        const lastSuccess = successFiles[successFiles.length - 1]
        callback(lastSuccess)
      }
      
      showNotification(`已成功导入 ${successFiles.length} 个文件`, 'success')
    } else if (successFiles.length > 0 && failedFiles.length > 0) {
      // 部分成功
      showUploadStatus({
        status: 'warning',
        title: '文件上传部分成功',
        message: `成功导入 ${successFiles.length} 个文件，失败 ${failedFiles.length} 个文件`,
        files: results,
        showActions: true
      })
      
      if (callback && successFiles.length > 0) {
        const lastSuccess = successFiles[successFiles.length - 1]
        callback(lastSuccess)
      }
      
      showNotification(`部分文件导入成功: ${successFiles.length}/${results.length}`, 'warning')
    } else {
      // 全部失败
      showUploadStatus({
        status: 'error',
        title: '文件上传失败',
        message: '所有文件都导入失败，请检查文件格式',
        files: results,
        showActions: true
      })
      
      showNotification('所有文件导入失败', 'error')
    }
  }
  
  // 处理粘贴内容
  const handlePasteContent = (result, callback) => {
    if (result.success) {
      showUploadStatus({
        status: 'success',
        title: '内容粘贴成功',
        message: `已成功处理粘贴内容`,
        files: [result],
        autoClose: true,
        autoCloseDelay: 2000
      })
      
      if (callback) {
        callback(result)
      }
      
      showNotification('已导入粘贴内容', 'success')
    } else {
      showUploadStatus({
        status: 'error',
        title: '内容粘贴失败',
        message: result.error || '内容处理失败',
        showActions: true
      })
      
      showNotification(`粘贴失败: ${result.error || '未知错误'}`, 'error')
    }
  }
  
  // 验证文件类型
  const validateFileType = (file) => {
    const allowedTypes = ['html', 'htm', 'txt', 'md']
    const extension = file.name.toLowerCase().split('.').pop()
    return allowedTypes.includes(extension)
  }
  
  // 批量验证文件
  const validateFiles = (files) => {
    const validFiles = []
    const invalidFiles = []
    
    files.forEach(file => {
      if (validateFileType(file)) {
        validFiles.push(file)
      } else {
        invalidFiles.push(file)
      }
    })
    
    return { validFiles, invalidFiles }
  }
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
  
  // 获取文件信息摘要
  const getFileInfo = (file) => {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeFormatted: formatFileSize(file.size),
      extension: file.name.toLowerCase().split('.').pop()
    }
  }
  
  // 重试上传
  const retryUpload = (callback) => {
    hideUploadStatus()
    if (callback) {
      callback()
    }
  }
  
  // 确认上传结果
  const confirmUpload = (callback) => {
    hideUploadStatus()
    if (callback) {
      callback()
    }
  }
  
  // 检查是否支持的文件类型
  const getSupportedTypes = () => {
    return {
      extensions: ['html', 'htm', 'txt', 'md'],
      mimeTypes: ['text/html', 'text/plain', 'text/markdown'],
      description: '支持 HTML、TXT、MD 格式文件'
    }
  }
  
  // 处理拖拽文件预检
  const previewDragFiles = (files) => {
    const { validFiles, invalidFiles } = validateFiles(files)
    
    let message = ''
    let status = 'info'
    
    if (validFiles.length > 0 && invalidFiles.length === 0) {
      message = `准备导入 ${validFiles.length} 个文件`
      status = 'info'
    } else if (validFiles.length > 0 && invalidFiles.length > 0) {
      message = `${validFiles.length} 个文件可导入，${invalidFiles.length} 个文件格式不支持`
      status = 'warning'
    } else {
      message = '没有支持的文件格式'
      status = 'error'
    }
    
    return {
      validFiles,
      invalidFiles,
      message,
      status,
      canProceed: validFiles.length > 0
    }
  }
  
  return {
    // 状态
    uploadState,
    
    // 方法
    showUploadStatus,
    hideUploadStatus,
    handleSingleFileUpload,
    handleMultipleFileUpload,
    handlePasteContent,
    validateFileType,
    validateFiles,
    formatFileSize,
    getFileInfo,
    retryUpload,
    confirmUpload,
    getSupportedTypes,
    previewDragFiles
  }
}