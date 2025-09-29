<template>
  <div class="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
    <!-- 元素层级面板 -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-center mb-3">
        <i class="fas fa-sitemap text-blue-500 mr-2"></i>
        <h3 class="font-semibold text-gray-800">元素层级</h3>
      </div>
      
      <div v-if="elementPath.length > 0" class="bg-gray-50 rounded-lg p-3">
        <div class="flex flex-wrap gap-1">
          <a-tag 
            v-for="(item, index) in elementPath" 
            :key="index"
            @click="$emit('select-from-path', item)"
            class="cursor-pointer transition-all hover:shadow-sm"
            color="blue"
          >
            {{ item.display }}
          </a-tag>
        </div>
      </div>
      
      <div v-else class="text-center py-6 text-gray-400">
        <i class="fas fa-mouse-pointer text-2xl mb-2 block"></i>
        <p class="text-sm">点击预览区域的元素</p>
        <p class="text-xs">查看元素层级</p>
      </div>
    </div>
    
    <!-- 操作面板 -->
    <div class="p-4 flex-1">
      <div class="flex items-center mb-3">
        <i class="fas fa-tools text-green-500 mr-2"></i>
        <h3 class="font-semibold text-gray-800">编辑工具</h3>
      </div>
      
      <div class="space-y-3">
        <!-- AI 编辑按钮 -->
        <a-button 
          @click="handleAIEdit" 
          :disabled="!selectedElement"
          size="large"
          block
          class="ai-edit-btn"
          :class="{ 'opacity-50 cursor-not-allowed': !selectedElement }"
        >
          <template #icon>
            <i class="fas fa-magic"></i>
          </template>
          <span class="ml-2">AI 智能编辑</span>
        </a-button>
        
        <!-- 富文本编辑按钮 -->
        <a-button 
          @click="handleRichEdit" 
          :disabled="!selectedElement"
          size="large"
          block
          class="rich-edit-btn"
          :class="{ 'opacity-50 cursor-not-allowed': !selectedElement }"
        >
          <template #icon>
            <i class="fas fa-edit"></i>
          </template>
          <span class="ml-2">富文本编辑</span>
        </a-button>
        
        <!-- 快速编辑按钮 -->
        <a-button 
          @click="handleInlineEdit" 
          :disabled="!selectedElement"
          size="large"
          block
          class="inline-edit-btn"
          :class="{ 'opacity-50 cursor-not-allowed': !selectedElement }"
        >
          <template #icon>
            <i class="fas fa-i-cursor"></i>
          </template>
          <span class="ml-2">快速编辑</span>
        </a-button>
      </div>
      
      <!-- 当前选中元素信息 -->
      <div v-if="selectedElement" class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex items-center mb-2">
          <i class="fas fa-crosshairs text-blue-500 mr-2"></i>
          <span class="text-sm font-medium text-blue-800">当前选中</span>
        </div>
        <div class="text-xs font-mono text-blue-700 bg-white p-2 rounded border">
          {{ getElementInfo(selectedElement) }}
        </div>
      </div>
      
      <!-- 使用提示 -->
      <div class="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div class="flex items-center mb-2">
          <i class="fas fa-lightbulb text-purple-500 mr-2"></i>
          <span class="text-sm font-medium text-purple-800">使用提示</span>
        </div>
        <ul class="text-xs text-purple-700 space-y-1">
          <li class="flex items-center">
            <i class="fas fa-dot-circle text-purple-400 mr-2 text-xs"></i>
            单击选择元素
          </li>
          <li class="flex items-center">
            <i class="fas fa-dot-circle text-purple-400 mr-2 text-xs"></i>
            双击快速编辑
          </li>
          <li class="flex items-center">
            <i class="fas fa-dot-circle text-purple-400 mr-2 text-xs"></i>
            AI 编辑智能修改样式
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  elementPath: {
    type: Array,
    default: () => []
  },
  selectedElement: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'select-from-path',
  'open-ai-dialog',
  'open-rich-editor',
  'open-inline-editor'
])

const getElementInfo = (element) => {
  if (!element) return ''
  const tagName = element.tagName.toLowerCase()
  const className = element.className ? ` class="${element.className}"` : ''
  const id = element.id ? ` id="${element.id}"` : ''
  return `<${tagName}${id}${className}>`
}

const handleAIEdit = () => {
  if (props.selectedElement) {
    emit('open-ai-dialog')
  }
}

const handleRichEdit = () => {
  if (props.selectedElement) {
    emit('open-rich-editor')
  }
}

const handleInlineEdit = () => {
  if (props.selectedElement) {
    emit('open-inline-editor')
  }
}
</script>

<style lang="scss" scoped>
.fas {
  font-size: 14px;
}

.ai-edit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
}

.rich-edit-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
  }
}

.inline-edit-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  color: white;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
  }
}

:deep(.ant-btn-large) {
  height: 44px;
  font-weight: 500;
}

:deep(.ant-tag) {
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 8px;
}
</style>