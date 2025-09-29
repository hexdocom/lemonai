<template>
  <a-modal
    v-model:open="visible"
    width="900px"
    :footer="null"
    @cancel="handleCancel"
    class="rich-text-modal"
  >
    <template #title>
      <div class="flex items-center">
        <div class="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
          <i class="fas fa-edit text-white"></i>
        </div>
        <span class="text-lg font-semibold">富文本编辑器</span>
      </div>
    </template>
    <div class="space-y-4">
      <div v-if="selectedElement">
        <h4 class="font-medium text-gray-800 mb-2">编辑元素:</h4>
        <div class="bg-gray-100 p-3 rounded text-sm font-mono">
          {{ getElementInfo(selectedElement) }}
        </div>
      </div>
      
      <!-- 工具栏 -->
      <div class="border rounded p-2 bg-gray-50">
        <div class="flex items-center space-x-2 flex-wrap">
          <a-button-group size="small">
            <a-button @click="execCommand('bold')" :type="isActive('bold') ? 'primary' : 'default'">
              <template #icon><i class="fas fa-bold"></i></template>
            </a-button>
            <a-button @click="execCommand('italic')" :type="isActive('italic') ? 'primary' : 'default'">
              <template #icon><i class="fas fa-italic"></i></template>
            </a-button>
            <a-button @click="execCommand('underline')" :type="isActive('underline') ? 'primary' : 'default'">
              <template #icon><i class="fas fa-underline"></i></template>
            </a-button>
          </a-button-group>
          
          <a-divider type="vertical" />
          
          <a-button-group size="small">
            <a-button @click="execCommand('justifyLeft')">
              <template #icon><i class="fas fa-align-left"></i></template>
            </a-button>
            <a-button @click="execCommand('justifyCenter')">
              <template #icon><i class="fas fa-align-center"></i></template>
            </a-button>
            <a-button @click="execCommand('justifyRight')">
              <template #icon><i class="fas fa-align-right"></i></template>
            </a-button>
          </a-button-group>
          
          <a-divider type="vertical" />
          
          <a-button-group size="small">
            <a-button @click="execCommand('insertUnorderedList')">
              <template #icon><i class="fas fa-list-ul"></i></template>
            </a-button>
            <a-button @click="execCommand('insertOrderedList')">
              <template #icon><i class="fas fa-list-ol"></i></template>
            </a-button>
          </a-button-group>
          
          <a-divider type="vertical" />
          
          <a-select
            v-model:value="currentFontSize"
            @change="changeFontSize"
            size="small"
            style="width: 80px"
          >
            <a-select-option value="12px">12px</a-select-option>
            <a-select-option value="14px">14px</a-select-option>
            <a-select-option value="16px">16px</a-select-option>
            <a-select-option value="18px">18px</a-select-option>
            <a-select-option value="24px">24px</a-select-option>
            <a-select-option value="32px">32px</a-select-option>
          </a-select>
          
          <input
            type="color"
            v-model="currentColor"
            @change="changeColor"
            class="w-8 h-6 border rounded cursor-pointer"
          />
        </div>
      </div>
      
      <!-- 编辑区域 -->
      <div class="border rounded">
        <div
          ref="editorRef"
          contenteditable="true"
          class="min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          @input="handleInput"
          @keydown="handleKeydown"
          @focus="handleFocus"
          @blur="handleBlur"
        ></div>
      </div>
      
      <div class="flex justify-end space-x-2 pt-4 border-t">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { message } from 'ant-design-vue'

const emit = defineEmits(['save-content'])

const visible = ref(false)
const selectedElement = ref(null)
const editorRef = ref(null)
const currentFontSize = ref('16px')
const currentColor = ref('#000000')
const originalContent = ref('')

const show = (element) => {
  selectedElement.value = element
  visible.value = true
  
  nextTick(() => {
    if (editorRef.value && element) {
      // 保存原始内容
      originalContent.value = element.innerHTML
      // 设置编辑器内容，保持原有的类名和样式
      editorRef.value.innerHTML = element.innerHTML
      editorRef.value.focus()
    }
  })
}

const handleCancel = () => {
  visible.value = false
  selectedElement.value = null
  originalContent.value = ''
}

const getElementInfo = (element) => {
  if (!element) return ''
  const tagName = element.tagName.toLowerCase()
  const className = element.className ? ` class=\"${element.className}\"` : ''
  const id = element.id ? ` id=\"${element.id}\"` : ''
  return `<${tagName}${id}${className}>`
}

const execCommand = (command, value = null) => {
  document.execCommand(command, false, value)
  editorRef.value.focus()
}

const isActive = (command) => {
  try {
    return document.queryCommandState(command)
  } catch (e) {
    return false
  }
}

const changeFontSize = (size) => {
  execCommand('fontSize', '3') // 使用默认大小
  // 然后手动设置样式
  const selection = window.getSelection()
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    if (!range.collapsed) {
      const span = document.createElement('span')
      span.style.fontSize = size
      try {
        range.surroundContents(span)
      } catch (e) {
        // 如果无法包围，则直接应用到选中文本
        const contents = range.extractContents()
        span.appendChild(contents)
        range.insertNode(span)
      }
    }
  }
  editorRef.value.focus()
}

const changeColor = () => {
  execCommand('foreColor', currentColor.value)
}

const handleInput = () => {
  // 实时更新预览（可选）
}

const handleKeydown = (e) => {
  // 处理快捷键
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'b':
        e.preventDefault()
        execCommand('bold')
        break
      case 'i':
        e.preventDefault()
        execCommand('italic')
        break
      case 'u':
        e.preventDefault()
        execCommand('underline')
        break
    }
  }
}

const handleFocus = () => {
  // 编辑器获得焦点
}

const handleBlur = () => {
  // 编辑器失去焦点
}

const handleSave = () => {
  if (!selectedElement.value || !editorRef.value) return
  
  try {
    // 获取编辑器的内容
    const newContent = editorRef.value.innerHTML
    
    // 检查内容是否有变化
    if (newContent === originalContent.value) {
      message.info('内容未发生变化')
      handleCancel()
      return
    }
    
    // 将新内容应用到原元素，保持类名和其他属性
    selectedElement.value.innerHTML = newContent
    
    // 发送保存事件，传递完整的元素信息
    emit('save-content', {
      content: newContent,
      element: selectedElement.value,
      originalContent: originalContent.value
    })
    
    message.success('内容已保存')
    handleCancel()
    
  } catch (error) {
    message.error('保存失败')
    console.error('Save error:', error)
  }
}

defineExpose({
  show
})
</script>

<style lang="scss" scoped>
.fas {
  font-size: 12px;
}

:deep(.rich-text-modal) {
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-header {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border-bottom: none;
    padding: 20px 24px;
    
    .ant-modal-title {
      color: white;
      margin: 0;
    }
  }
  
  .ant-modal-close {
    color: white;
    
    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .ant-modal-body {
    padding: 24px;
  }
}

:deep(.ant-select-selection-item) {
  font-size: 12px;
}

:deep(.ant-btn-group) {
  .ant-btn {
    border-radius: 0;
    
    &:first-child {
      border-radius: 6px 0 0 6px;
    }
    
    &:last-child {
      border-radius: 0 6px 6px 0;
    }
  }
}

// 编辑器样式
:deep([contenteditable="true"]) {
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #f093fb;
    box-shadow: 0 0 0 2px rgba(240, 147, 251, 0.1);
  }
  
  // 保持原有样式
  * {
    margin: inherit;
    padding: inherit;
    color: inherit;
    font-size: inherit;
    font-weight: inherit;
    text-align: inherit;
  }
}

// 工具栏样式优化
.border {
  border-radius: 8px;
  border-color: #e1e5e9;
}

:deep(.ant-btn) {
  border-radius: 6px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
  }
}
</style>