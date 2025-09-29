import { ref, reactive, computed } from 'vue'

export function useEditorCore() {
  // 回调函数
  let onContentChangeCallback = null
  let onInlineEditCallback = null
  const selectedElement = ref(null)
  const hoveredElement = ref(null)
  const elementPath = ref([])
  const previewAreaRef = ref(null)

  const history = reactive({
    states: [],
    currentIndex: -1
  })

  let editorInstance = null
  let currentEditingElement = null
  let currentEditContainer = null
  let currentEditCleanup = null

  // 计算属性
  const canUndo = computed(() => history.currentIndex > 0)
  const canRedo = computed(() => history.currentIndex < history.states.length - 1)

  const initializeEditor = (previewAreaComponent, htmlContent) => {
    previewAreaRef.value = previewAreaComponent

    // 创建编辑器实例
    editorInstance = {
      previewAreaComponent,
      selectedElement: null,
      hoveredElement: null
    }

    // 添加到历史记录
    addToHistory(htmlContent)

    // 更新预览
    updatePreview(htmlContent)

    // 设置iframe消息监听
    setupIframeListeners()
  }

  const setupIframeListeners = () => {
    if (!previewAreaRef.value) return

    // 监听iframe消息
    previewAreaRef.value.onMessage('elementSelected', (data) => {
      selectedElement.value = {
        ...data.element,
        path: data.path
      }
      elementPath.value = data.path.map((selector, index) => ({
        display: selector,
        tagName: selector.split(/[#.:]/)[0],
        index: index
      }))
      console.log('Element selected:', data.element)
    })

    previewAreaRef.value.onMessage('elementDoubleClick', (data) => {
      console.log('Element double clicked:', data.element)
      // 触发内联编辑
      startInlineEdit(data.element)
    })

    previewAreaRef.value.onMessage('contentUpdated', (data) => {
      if (data.success) {
        console.log('Content updated successfully')
        // 获取更新后的内容
        syncToCode()
      } else {
        console.error('Content update failed:', data.error)
      }
    })

    previewAreaRef.value.onMessage('iframeReady', () => {
      console.log('Iframe ready for interaction')
    })
  }

  const selectElement = (elementInfo) => {
    // 通过iframe选择元素
    if (previewAreaRef.value && elementInfo.path) {
      previewAreaRef.value.selectElementByPath(elementInfo.path)
    }
  }

  const selectFromPath = (pathIndex) => {
    // 根据路径索引选择元素
    if (selectedElement.value && selectedElement.value.path) {
      const targetPath = selectedElement.value.path.slice(0, pathIndex + 1)
      previewAreaRef.value.selectElementByPath(targetPath)
    }
  }

  const updatePreview = (htmlContent) => {
    if (!previewAreaRef.value) return

    // 使用PreviewArea组件的updatePreview方法
    previewAreaRef.value.updatePreview(htmlContent)
  }

  const addToHistory = (content) => {
    // 移除当前位置之后的历史记录
    history.states.splice(history.currentIndex + 1)

    // 添加新状态
    history.states.push(content)
    history.currentIndex = history.states.length - 1

    // 限制历史记录数量
    if (history.states.length > 50) {
      history.states.shift()
      history.currentIndex--
    }
  }

  const undo = () => {
    if (history.currentIndex > 0) {
      history.currentIndex--
      return history.states[history.currentIndex]
    }
    return null
  }

  const redo = () => {
    if (history.currentIndex < history.states.length - 1) {
      history.currentIndex++
      return history.states[history.currentIndex]
    }
    return null
  }


  const syncToCode = () => {
    // 由于使用iframe，无法直接获取innerHTML
    // 这个方法现在主要用于版本管理，返回当前存储的HTML内容
    return history.states[history.currentIndex] || ''
  }

  const clearInlineEdit = () => {
    if (previewAreaRef.value) {
      previewAreaRef.value.clearSelection()
    }
  }

  const startInlineEdit = (elementInfo) => {
    // 触发内联编辑事件，由主组件处理
    console.log('内联编辑触发，元素信息:', elementInfo)

    // 通过事件通知主组件显示编辑模态框
    if (onInlineEditCallback) {
      onInlineEditCallback(elementInfo)
    }
  }

  // 为元素添加临时唯一标识
  const addTemporaryId = (elementInfo) => {
    const tempId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    elementInfo.tempId = tempId

    console.log('为元素添加临时ID:', tempId)
    return tempId
  }

  // 更新元素内容
  const updateElementContent = (elementInfo, newContent) => {
    console.log('更新元素内容开始:', elementInfo, newContent)

    // 为元素添加临时唯一标识以确保精准定位
    let tempId = elementInfo.tempId
    if (!tempId) {
      tempId = addTemporaryId(elementInfo)
    }

    // 如果还没有DOM路径，尝试生成一个
    if (!elementInfo.domPath && history.states[history.currentIndex]) {
      const domPath = generateDOMPathFromHtml(history.states[history.currentIndex], elementInfo)
      if (domPath) {
        elementInfo.domPath = domPath
        console.log('为元素生成DOM路径:', domPath)
      }
    }

    const selector = generateElementSelector(elementInfo)
    console.log('使用选择器:', selector)

    // 通过iframe更新内容
    if (previewAreaRef.value) {
      previewAreaRef.value.updateElementContent(selector, newContent)

      // 获取更新后的完整HTML内容
      setTimeout(() => {
        // 由于iframe隔离，我们需要重新构建HTML内容
        const currentHtml = history.states[history.currentIndex] || ''
        console.log('当前HTML内容长度:', currentHtml.length)
        const updatedHtml = updateHtmlContent(currentHtml, selector, newContent, tempId, elementInfo)
        console.log('更新后HTML内容长度:', updatedHtml.length)
        console.log('HTML内容是否改变:', updatedHtml !== currentHtml)

        if (updatedHtml !== currentHtml) {
          // 在保存到历史记录前，从HTML中移除临时标识
          const cleanHtml = removeTempIdFromHtml(updatedHtml, tempId)
          addToHistory(cleanHtml)
          console.log('触发内容变化回调')
          if (onContentChangeCallback) {
            onContentChangeCallback(cleanHtml, '元素内容更新')
          }

          // 清理临时ID
          delete elementInfo.tempId
        } else {
          console.log('HTML内容未改变，不触发回调')
          // 即使内容未改变，也要清理临时ID
          delete elementInfo.tempId
        }
      }, 100)
    }
  }

  // 从HTML中移除临时ID标记
  const removeTempIdFromHtml = (html, tempId) => {
    return html.replace(new RegExp(`\\s*data-editor-temp="${tempId}"`, 'g'), '')
  }

  // 辅助函数：通过选择器查找元素（带错误处理）
  const findElementBySelector = (container, selector) => {
    try {
      return container.querySelector(selector)
    } catch (e) {
      console.log('选择器查找失败:', selector, e.message)
      return null
    }
  }

  // 更新HTML内容中的特定元素
  const updateHtmlContent = (htmlContent, selector, newContent, tempId = null, elementInfo = null) => {
    console.log('updateHtmlContent 开始执行')
    console.log('输入HTML长度:', htmlContent.length)
    console.log('选择器:', selector)
    console.log('新内容:', newContent)
    console.log('临时ID:', tempId)

    try {
      // 创建一个临时DOM来解析和修改HTML
      const parser = new DOMParser()
      let doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html')
      let container = doc.querySelector('div')

      console.log('容器是否存在:', !!container)

      if (container) {
        let targetElement = null

        // 如果提供了临时ID，首先在HTML中添加临时标记
        if (tempId && !htmlContent.includes(`data-editor-temp="${tempId}"`)) {
          // 先尝试找到目标元素并添加临时标记
          const tempContainer = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html').querySelector('div')
          if (tempContainer) {
            const tempElement = findElementBySelector(tempContainer, selector)
            if (tempElement) {
              tempElement.setAttribute('data-editor-temp', tempId)
              htmlContent = tempContainer.innerHTML
              // 重新解析包含临时标记的HTML
              doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html')
              container = doc.querySelector('div')
              console.log('重新解析容器，添加了临时ID:', tempId)
            }
          }
        }

        // 多种选择器策略 - 按精准度排序
        const strategies = [
          tempId ? `[data-editor-temp="${tempId}"]` : null, // 1. 临时ID选择器（最精准）
          elementInfo?.domPath ? elementInfo.domPath : null, // 2. DOM路径选择器（精准且稳定）
          selector, // 3. 完整类名选择器  
          selector.includes('.') ? selector.split('.').slice(0, 2).join('.') : null, // 4. 标签名+主要类
          selector.includes('.') ? selector.split('.')[0] : null, // 5. 仅标签名（兜底）
        ].filter(Boolean)

        for (const strategy of strategies) {
          console.log('尝试选择器策略:', strategy)
          targetElement = findElementBySelector(container, strategy)
          if (targetElement) {
            console.log('策略成功:', strategy)
            break
          }
        }

        console.log('目标元素是否找到:', !!targetElement)
        console.log('目标元素:', targetElement)

        if (targetElement) {
          const oldContent = targetElement.innerHTML
          console.log('元素原始内容:', oldContent)

          // 检查是否包含HTML标签
          if (newContent.includes('<') && newContent.includes('>')) {
            targetElement.innerHTML = newContent
            console.log('使用innerHTML更新')
          } else {
            targetElement.textContent = newContent
            console.log('使用textContent更新')
          }

          const newInnerHTML = targetElement.innerHTML
          console.log('元素更新后内容:', newInnerHTML)

          const resultHtml = container.innerHTML
          console.log('返回的完整HTML:', resultHtml)
          return resultHtml
        } else {
          console.log('未找到目标元素，所有选择器策略都失败')
          // 打印容器的HTML以便调试
          console.log('容器HTML:', container.innerHTML.substring(0, 500) + '...')
        }
      } else {
        console.log('未找到容器元素')
      }
    } catch (error) {
      console.error('更新HTML内容失败:', error)
    }

    console.log('返回原始HTML内容')
    return htmlContent
  }

  // 生成元素的DOM路径选择器
  const generateDOMPathSelector = (element, container) => {
    const path = []
    let current = element

    while (current && current !== container && current.parentElement) {
      let selector = current.tagName.toLowerCase()

      // 计算同级相同标签的索引
      const siblings = Array.from(current.parentElement.children)
      const sameTagSiblings = siblings.filter(sibling =>
        sibling.tagName.toLowerCase() === selector
      )

      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }

      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  // 基于HTML内容和元素信息生成DOM路径
  const generateDOMPathFromHtml = (htmlContent, elementInfo) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html')
      const container = doc.querySelector('div')

      if (!container) return null

      // 首先尝试通过现有选择器找到元素
      const basicSelector = generateElementSelector({
        ...elementInfo,
        domPath: null,
        tempId: null
      })
      const targetElement = findElementBySelector(container, basicSelector)

      if (targetElement) {
        const domPath = generateDOMPathSelector(targetElement, container)
        console.log('生成DOM路径:', domPath)
        return domPath
      }
    } catch (error) {
      console.error('生成DOM路径失败:', error)
    }

    return null
  }

  // 根据元素信息生成精准选择器
  const generateElementSelector = (elementInfo) => {
    console.log('generateElementSelector 输入:', elementInfo)

    // 优先使用ID选择器
    if (elementInfo.id) {
      const selector = `#${elementInfo.id}`
      console.log('使用ID选择器:', selector)
      return selector
    }

    // 如果有DOM路径信息，使用DOM路径选择器
    if (elementInfo.domPath) {
      console.log('使用DOM路径选择器:', elementInfo.domPath)
      return elementInfo.domPath
    }

    // 生成临时唯一标记选择器
    if (elementInfo.tempId) {
      const selector = `[data-editor-temp="${elementInfo.tempId}"]`
      console.log('使用临时ID选择器:', selector)
      return selector
    }

    // 回退到改进的类名选择器
    let selector = elementInfo.tagName?.toLowerCase() || 'div'
    if (elementInfo.className) {
      // 过滤掉编辑器添加的临时类名和包含特殊字符的类名
      const classes = elementInfo.className
        .split(' ')
        .filter(c => c) // 移除空字符串
        .filter(c => !c.includes(':')) // 移除包含冒号的类名（如 md:text-7xl）
        .filter(c => c !== 'hovered-element') // 移除悬停状态类
        .filter(c => c !== 'selected-element') // 移除选中状态类
        .filter(c => !c.startsWith('hover:')) // 移除 hover: 前缀的类
        .filter(c => !c.startsWith('focus:')) // 移除 focus: 前缀的类
        .filter(c => !c.startsWith('active:')) // 移除 active: 前缀的类
        .slice(0, 2) // 只取前2个类名，避免选择器过于复杂

      console.log('过滤后的类名:', classes)

      if (classes.length > 0) {
        selector += '.' + classes.join('.')
        console.log('使用类选择器:', selector)
      } else {
        console.log('使用标签选择器:', selector)
      }
    } else {
      console.log('使用标签选择器:', selector)
    }

    console.log('最终选择器:', selector)
    return selector
  }

  // 设置内容变化回调
  const setOnContentChangeCallback = (callback) => {
    onContentChangeCallback = callback
  }

  // 设置内联编辑回调
  const setOnInlineEditCallback = (callback) => {
    onInlineEditCallback = callback
  }

  return {
    selectedElement,
    hoveredElement,
    elementPath,
    canUndo,
    canRedo,
    history,
    initializeEditor,
    updatePreview,
    selectElement,
    selectFromPath,
    addToHistory,
    undo,
    redo,
    syncToCode,
    clearInlineEdit,
    setOnContentChangeCallback,
    setOnInlineEditCallback,
    updateElementContent,
    openAIDialog: () => {
      // 由组件处理
    },
    openRichEditor: () => {
      // 由组件处理  
    },
    openInlineEditor: startInlineEdit
  }
}