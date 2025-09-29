<template>
  <div class="version-history-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="flex items-center">
        <div class="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded flex items-center justify-center mr-2">
          <i class="fas fa-history text-white text-xs"></i>
        </div>
        <h3 class="font-semibold text-gray-800">版本历史</h3>
        <span class="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
          {{ versionCount }} 个版本
        </span>
      </div>
      
      <div class="flex items-center gap-1">
        <a-tooltip title="导出历史">
          <a-button type="text" size="small" @click="exportHistory">
            <template #icon>
              <i class="fas fa-download"></i>
            </template>
          </a-button>
        </a-tooltip>
        
        <a-tooltip title="导入历史">
          <a-button type="text" size="small" @click="triggerImportHistory">
            <template #icon>
              <i class="fas fa-upload"></i>
            </template>
          </a-button>
        </a-tooltip>
        
        <a-tooltip title="清理历史">
          <a-button type="text" size="small" @click="confirmClearHistory">
            <template #icon>
              <i class="fas fa-trash-alt"></i>
            </template>
          </a-button>
        </a-tooltip>
        
        <a-tooltip title="折叠面板">
          <a-button type="text" size="small" @click="toggleCollapse">
            <template #icon>
              <i :class="collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
            </template>
          </a-button>
        </a-tooltip>
      </div>
    </div>
    
    <!-- 面板内容 -->
    <div v-show="!collapsed" class="panel-content">
      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-item">
            <i class="fas fa-check-circle text-green-500"></i>
            <span class="stat-value">{{ hasUnsavedChanges ? '未保存' : '已保存' }}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-clock text-blue-500"></i>
            <span class="stat-value">{{ formatRelativeTime(currentVersion?.timestamp) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 版本列表 -->
      <div class="version-list">
        <div 
          v-for="(version, index) in versionHistory" 
          :key="version.id"
          class="version-item"
          :class="{
            'current': version.isCurrent,
            'saved': version.isSaved,
            'hover:bg-gray-50': !version.isCurrent
          }"
          @click="goToVersion(index)"
        >
          <div class="version-info">
            <div class="version-header">
              <div class="flex items-center">
                <div class="version-indicator">
                  <i v-if="version.isCurrent" class="fas fa-arrow-right text-blue-500"></i>
                  <i v-else-if="version.isSaved" class="fas fa-save text-green-500"></i>
                  <div v-else class="version-dot"></div>
                </div>
                <span class="version-action">{{ version.action }}</span>
              </div>
              <div class="version-meta">
                <span class="version-time">{{ formatTime(version.timestamp) }}</span>
                <span class="version-size">{{ formatFileSize(version.metadata.contentLength) }}</span>
              </div>
            </div>
            
            <div class="version-details">
              <span class="version-index">#{{ index + 1 }}</span>
              <div class="version-tags">
                <span v-if="version.isCurrent" class="tag current-tag">当前</span>
                <span v-if="version.isSaved" class="tag saved-tag">已保存</span>
                <span v-if="version.metadata.source" class="tag source-tag">{{ version.metadata.source }}</span>
              </div>
            </div>
          </div>
          
          <div class="version-actions">
            <a-tooltip title="查看详情">
              <a-button type="text" size="small" @click.stop="showVersionDetails(version, index)">
                <template #icon>
                  <i class="fas fa-info-circle"></i>
                </template>
              </a-button>
            </a-tooltip>
            
            <a-tooltip title="比较版本" v-if="selectedVersions.length < 2">
              <a-button 
                type="text" 
                size="small" 
                :class="{ 'text-blue-500': selectedVersions.includes(index) }"
                @click.stop="toggleVersionSelection(index)"
              >
                <template #icon>
                  <i class="fas fa-code-compare"></i>
                </template>
              </a-button>
            </a-tooltip>
          </div>
        </div>
        
        <div v-if="versionHistory.length === 0" class="empty-state">
          <i class="fas fa-history text-gray-400 text-2xl mb-2"></i>
          <p class="text-gray-500 text-sm">暂无版本历史</p>
        </div>
      </div>
      
      <!-- 版本比较 -->
      <div v-if="selectedVersions.length === 2" class="version-compare">
        <div class="compare-header">
          <h4 class="font-medium">版本比较</h4>
          <a-button type="text" size="small" @click="clearSelection">
            <template #icon>
              <i class="fas fa-times"></i>
            </template>
          </a-button>
        </div>
        
        <div class="compare-content">
          <div v-if="compareResult" class="compare-stats">
            <div class="compare-stat">
              <span class="stat-label">相似度</span>
              <span class="stat-value">{{ Math.round(compareResult.contentDiff.similarity * 100) }}%</span>
            </div>
            <div class="compare-stat">
              <span class="stat-label">时间差</span>
              <span class="stat-value">{{ formatDuration(compareResult.timeDiff) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本详情模态框 -->
    <a-modal
      v-model:open="showDetailsModal"
      title="版本详情"
      width="600px"
      :footer="null"
    >
      <div v-if="selectedVersionDetail" class="version-detail-content">
        <div class="detail-section">
          <h4 class="detail-title">基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">版本号</span>
              <span class="detail-value">#{{ selectedVersionIndex + 1 }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">操作类型</span>
              <span class="detail-value">{{ selectedVersionDetail.action }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">创建时间</span>
              <span class="detail-value">{{ formatFullTime(selectedVersionDetail.timestamp) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">内容大小</span>
              <span class="detail-value">{{ formatFileSize(selectedVersionDetail.metadata.contentLength) }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4 class="detail-title">内容预览</h4>
          <div class="content-preview">
            <pre class="preview-text">{{ getContentPreview(selectedVersionDetail.content) }}</pre>
          </div>
        </div>
      </div>
    </a-modal>
    
    <!-- 隐藏的文件输入 -->
    <input 
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'

const props = defineProps({
  versionManager: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['version-change', 'export-history', 'import-history'])

const collapsed = ref(false)
const selectedVersions = ref([])
const compareResult = ref(null)
const showDetailsModal = ref(false)
const selectedVersionDetail = ref(null)
const selectedVersionIndex = ref(-1)
const fileInputRef = ref(null)

// 使用传入的版本管理器
const {
  versionCount,
  hasUnsavedChanges,
  currentVersion,
  getVersionHistory,
  goToVersion: goToVersionManager,
  compareVersions,
  clearHistory,
  exportVersionHistory,
  importVersionHistory
} = props.versionManager

// 版本历史列表
const versionHistory = computed(() => getVersionHistory())

// 切换折叠状态
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 跳转到指定版本
const goToVersion = (index) => {
  const version = goToVersionManager(index)
  if (version) {
    emit('version-change', version)
  }
}

// 选择版本进行比较
const toggleVersionSelection = (index) => {
  const existingIndex = selectedVersions.value.indexOf(index)
  if (existingIndex > -1) {
    selectedVersions.value.splice(existingIndex, 1)
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(index)
  }
  
  // 如果选择了两个版本，进行比较
  if (selectedVersions.value.length === 2) {
    const [index1, index2] = selectedVersions.value.sort((a, b) => a - b)
    compareResult.value = compareVersions(index1, index2)
  } else {
    compareResult.value = null
  }
}

// 清除版本选择
const clearSelection = () => {
  selectedVersions.value = []
  compareResult.value = null
}

// 显示版本详情
const showVersionDetails = (version, index) => {
  selectedVersionDetail.value = version
  selectedVersionIndex.value = index
  showDetailsModal.value = true
}

// 确认清理历史
const confirmClearHistory = () => {
  Modal.confirm({
    title: '确认清理历史',
    content: '此操作将删除所有版本历史记录（当前版本除外），且不可恢复。确定要继续吗？',
    okText: '确定',
    cancelText: '取消',
    onOk() {
      clearHistory()
      clearSelection()
    }
  })
}

// 导出历史
const exportHistory = () => {
  try {
    exportVersionHistory()
    emit('export-history')
  } catch (error) {
    message.error('导出失败: ' + error.message)
  }
}

// 触发导入文件选择
const triggerImportHistory = () => {
  fileInputRef.value?.click()
}

// 处理导入文件
const handleImportFile = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const jsonData = e.target.result
      if (importVersionHistory(jsonData)) {
        emit('import-history')
        clearSelection()
      }
    } catch (error) {
      message.error('导入失败: ' + error.message)
    }
  }
  reader.readAsText(file)
  
  // 清空文件输入
  event.target.value = ''
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化完整时间
const formatFullTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 格式化相对时间
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatTime(timestamp)
}

// 格式化持续时间
const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  
  if (minutes < 60) return `${minutes}分钟`
  if (hours < 24) return `${hours}小时`
  return `${days}天`
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return ''
  return content.length > 200 ? content.substring(0, 200) + '...' : content
}

// 监听版本变化，自动清除选择
watch(versionHistory, () => {
  clearSelection()
})
</script>

<style lang="scss" scoped>
.version-history-panel {
  width: 100%;
  height: 100%;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.stats-section {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .stat-value {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.current {
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
  }
  
  &:hover {
    background: #f9fafb;
  }
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.version-indicator {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  
  .version-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d1d5db;
  }
}

.version-action {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #9ca3af;
}

.version-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.version-index {
  font-size: 11px;
  color: #9ca3af;
  font-family: monospace;
}

.version-tags {
  display: flex;
  gap: 4px;
}

.tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 500;
  
  &.current-tag {
    background: #dbeafe;
    color: #1d4ed8;
  }
  
  &.saved-tag {
    background: #d1fae5;
    color: #065f46;
  }
  
  &.source-tag {
    background: #f3e8ff;
    color: #7c3aed;
  }
}

.version-actions {
  display: flex;
  gap: 2px;
  margin-left: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.version-compare {
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  background: #f9fafb;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  
  h4 {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
}

.compare-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.compare-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .stat-label {
    font-size: 11px;
    color: #6b7280;
  }
  
  .stat-value {
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }
}

.version-detail-content {
  .detail-section {
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .detail-title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
  }
  
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .detail-item {
    display: flex;
    flex-direction: column;
    
    .detail-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    
    .detail-value {
      font-size: 13px;
      color: #374151;
      font-weight: 500;
    }
  }
  
  .content-preview {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
    
    .preview-text {
      font-size: 11px;
      line-height: 1.4;
      color: #374151;
      margin: 0;
      white-space: pre-wrap;
      font-family: 'Monaco', 'Menlo', monospace;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .compare-stats {
    grid-template-columns: 1fr;
  }
}
</style>