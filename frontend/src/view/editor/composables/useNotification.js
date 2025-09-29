import { message } from 'ant-design-vue'

export function useNotification() {
  
  const showNotification = (content, type = 'info', duration = 3) => {
    switch (type) {
      case 'success':
        message.success(content, duration)
        break
      case 'error':
        message.error(content, duration)
        break
      case 'warning':
        message.warning(content, duration)
        break
      case 'info':
      default:
        message.info(content, duration)
        break
    }
  }
  
  const showSuccess = (content, duration = 3) => {
    showNotification(content, 'success', duration)
  }
  
  const showError = (content, duration = 3) => {
    showNotification(content, 'error', duration)
  }
  
  const showWarning = (content, duration = 3) => {
    showNotification(content, 'warning', duration)
  }
  
  const showInfo = (content, duration = 3) => {
    showNotification(content, 'info', duration)
  }
  
  const showLoading = (content = '加载中...', duration = 0) => {
    return message.loading(content, duration)
  }
  
  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  }
}