export function useFileManager() {
  
  const createFileInput = (accept = '*/*') => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.style.display = 'none'
      
      input.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (!file) {
          reject(new Error('未选择文件'))
          return
        }
        
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve({
            content: event.target.result,
            filename: file.name,
            size: file.size,
            type: file.type
          })
        }
        
        reader.onerror = () => {
          reject(new Error('文件读取失败'))
        }
        
        if (accept === 'text/html' || file.type === 'text/html' || file.name.endsWith('.html')) {
          reader.readAsText(file)
        } else {
          reader.readAsText(file)
        }
        
        // 清理
        document.body.removeChild(input)
      })
      
      input.addEventListener('cancel', () => {
        reject(new Error('用户取消选择'))
        document.body.removeChild(input)
      })
      
      document.body.appendChild(input)
      input.click()
    })
  }
  
  const importHTML = async () => {
    try {
      const result = await createFileInput('text/html,.html')
      
      // 验证 HTML 内容
      if (!result.content.trim()) {
        throw new Error('文件内容为空')
      }
      
      // 简单的 HTML 验证
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = result.content
      
      return {
        content: result.content,
        filename: result.filename,
        success: true
      }
    } catch (error) {
      throw error
    }
  }
  
  const exportHTML = (htmlContent, filename = null) => {
    try {
      const defaultFilename = filename || `html-editor-export-${new Date().toISOString().slice(0, 10)}.html`
      
      // 创建完整的 HTML 文档
      const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Editor Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${htmlContent}
</body>
</html>`
      
      // 创建 Blob
      const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' })
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = defaultFilename
      link.style.display = 'none'
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理 URL
      URL.revokeObjectURL(link.href)
      
      return {
        success: true,
        filename: defaultFilename
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  const processDroppedFiles = async (files) => {
    const results = []
    
    for (const file of files) {
      try {
        const result = await processFile(file)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: error.message
        })
      }
    }
    
    return results
  }
  
  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.includes('text') && !file.name.endsWith('.html')) {
        reject(new Error('不支持的文件类型'))
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve({
          success: true,
          content: event.target.result,
          filename: file.name,
          size: file.size,
          type: file.type
        })
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsText(file)
    })
  }
  
  const validateHTMLContent = (content) => {
    try {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      return {
        valid: true,
        content: tempDiv.innerHTML
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
  
  return {
    importHTML,
    exportHTML,
    createFileInput,
    processDroppedFiles,
    processFile,
    validateHTMLContent
  }
}