<template>
  <div class="image-search-panel">
    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-input-area">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="输入描述词，如：蓝天白云、现代建筑、可爱小猫..."
          size="large"
          :loading="searching"
          @search="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #addonBefore>
            <a-select v-model:value="searchSource" style="width: 100px">
              <a-select-option value="unsplash">Unsplash</a-select-option>
              <a-select-option value="pixabay">Pixabay</a-select-option>
              <a-select-option value="pexels">Pexels</a-select-option>
            </a-select>
          </template>
          <template #suffix>
            <i class="fas fa-search text-gray-400"></i>
          </template>
        </a-input-search>
      </div>

      <div class="search-options">
        <div class="option-group">
          <label class="option-label">尺寸:</label>
          <a-radio-group v-model:value="sizeFilter" size="small">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="large">大图</a-radio-button>
            <a-radio-button value="medium">中图</a-radio-button>
            <a-radio-button value="small">小图</a-radio-button>
          </a-radio-group>
        </div>

        <div class="option-group">
          <label class="option-label">方向:</label>
          <a-radio-group v-model:value="orientationFilter" size="small">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="horizontal">横向</a-radio-button>
            <a-radio-button value="vertical">竖向</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <!-- 快速标签 -->
      <div class="quick-tags">
        <span class="tags-label">热门标签:</span>
        <a-space wrap>
          <a-tag 
            v-for="tag in quickTags" 
            :key="tag"
            :color="searchQuery === tag ? 'blue' : 'default'"
            class="quick-tag"
            @click="selectQuickTag(tag)"
          >
            {{ tag }}
          </a-tag>
        </a-space>
      </div>
    </div>

    <!-- 搜索结果区域 -->
    <div class="results-section">
      <!-- 加载中 -->
      <div v-if="searching" class="loading-state">
        <a-spin size="large" />
        <p class="text-gray-600 mt-4">正在搜索图片...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="searchError" class="error-state">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p class="text-gray-600 mb-4">搜索出错了</p>
        <p class="text-sm text-gray-500 mb-4">{{ searchError }}</p>
        <a-button @click="retrySearch">重试</a-button>
      </div>

      <!-- 无结果 -->
      <div v-else-if="searchResults.length === 0 && hasSearched" class="no-results">
        <i class="fas fa-image text-gray-400 text-4xl mb-4"></i>
        <p class="text-gray-600 mb-2">没有找到相关图片</p>
        <p class="text-sm text-gray-500">试试其他关键词吧</p>
      </div>

      <!-- 搜索结果网格 -->
      <div v-else-if="searchResults.length > 0" class="results-grid">
        <div 
          v-for="image in searchResults" 
          :key="image.id"
          class="image-item"
          :class="{ selected: selectedImage?.id === image.id }"
          @click="selectImage(image)"
        >
          <div class="image-wrapper">
            <img 
              :src="image.thumbnailUrl" 
              :alt="image.alt"
              class="result-image"
              @load="handleImageLoad"
              @error="handleImageError"
            />
            <div class="image-overlay">
              <div class="image-actions">
                <a-button type="text" size="small" @click.stop="previewImage(image)">
                  <template #icon><i class="fas fa-eye text-white"></i></template>
                </a-button>
                <a-button type="text" size="small" @click.stop="selectImage(image)">
                  <template #icon><i class="fas fa-check text-white"></i></template>
                </a-button>
              </div>
            </div>
          </div>
          
          <div class="image-info">
            <div class="image-size">{{ image.width }} × {{ image.height }}</div>
            <div class="image-source">{{ image.source }}</div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="searchResults.length > 0 && hasMore" class="load-more">
        <a-button @click="loadMore" :loading="loadingMore">
          <template #icon><i class="fas fa-plus"></i></template>
          加载更多
        </a-button>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <a-modal 
      v-model:open="previewVisible" 
      title="图片预览" 
      :footer="null" 
      width="80%"
      centered
    >
      <div v-if="previewingImage" class="image-preview">
        <img 
          :src="previewingImage.fullUrl || previewingImage.thumbnailUrl" 
          :alt="previewingImage.alt"
          class="preview-full-image"
        />
        <div class="preview-info">
          <div class="info-row">
            <span class="info-label">尺寸:</span>
            <span>{{ previewingImage.width }} × {{ previewingImage.height }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">来源:</span>
            <span>{{ previewingImage.source }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">作者:</span>
            <span>{{ previewingImage.author || '未知' }}</span>
          </div>
        </div>
        <div class="preview-actions">
          <a-button type="primary" @click="selectPreviewImage">
            <template #icon><i class="fas fa-check"></i></template>
            选择此图片
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  currentAlt: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['image-selected'])

// 状态管理
const searchQuery = ref('')
const searchSource = ref('unsplash')
const sizeFilter = ref('all')
const orientationFilter = ref('all')
const searching = ref(false)
const searchError = ref('')
const hasSearched = ref(false)
const searchResults = ref([])
const selectedImage = ref(null)
const hasMore = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const previewVisible = ref(false)
const previewingImage = ref(null)

// 快速标签
const quickTags = ref([
  '风景', '建筑', '人物', '动物', '植物', '科技', 
  '美食', '运动', '艺术', '自然', '城市', '海洋'
])

// 方法
const handleSearch = () => {
  if (!searchQuery.value.trim()) return
  
  currentPage.value = 1
  searchResults.value = []
  performSearch()
}

const performSearch = async () => {
  searching.value = true
  searchError.value = ''
  hasSearched.value = true

  try {
    // 这里应该调用实际的搜索API
    const params = {
      query: searchQuery.value,
      source: searchSource.value,
      size: sizeFilter.value,
      orientation: orientationFilter.value,
      page: currentPage.value
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟搜索结果
    const mockResults = generateMockResults(searchQuery.value, currentPage.value)
    
    if (currentPage.value === 1) {
      searchResults.value = mockResults
    } else {
      searchResults.value.push(...mockResults)
    }
    
    hasMore.value = mockResults.length === 20 // 假设每页20个结果

  } catch (error) {
    console.error('搜索失败:', error)
    searchError.value = error.message || '搜索失败，请稍后重试'
  } finally {
    searching.value = false
    loadingMore.value = false
  }
}

const generateMockResults = (query, page) => {
  const results = []
  const baseId = (page - 1) * 20
  
  for (let i = 0; i < 20; i++) {
    const id = baseId + i + 1
    const width = 800 + Math.floor(Math.random() * 400)
    const height = 600 + Math.floor(Math.random() * 400)
    
    results.push({
      id: `${query}-${id}`,
      thumbnailUrl: `https://picsum.photos/${width}/${height}?random=${id}`,
      fullUrl: `https://picsum.photos/${width * 2}/${height * 2}?random=${id}`,
      width,
      height,
      alt: `${query} ${id}`,
      source: searchSource.value,
      author: `作者${id % 10 + 1}`
    })
  }
  
  return results
}

const selectQuickTag = (tag) => {
  searchQuery.value = tag
  handleSearch()
}

const retrySearch = () => {
  performSearch()
}

const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return
  
  loadingMore.value = true
  currentPage.value++
  performSearch()
}

const selectImage = (image) => {
  selectedImage.value = image
  emit('image-selected', image.fullUrl || image.thumbnailUrl)
}

const previewImage = (image) => {
  previewingImage.value = image
  previewVisible.value = true
}

const selectPreviewImage = () => {
  selectImage(previewingImage.value)
  previewVisible.value = false
}

const handleImageLoad = (e) => {
  // 图片加载成功
}

const handleImageError = (e) => {
  console.error('图片加载失败:', e.target.src)
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzlmYTJhNyI+5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg=='
}

// 初始化时如果有currentAlt，使用它作为搜索词
if (props.currentAlt) {
  searchQuery.value = props.currentAlt
}
</script>

<style lang="scss" scoped>
.image-search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 20px;
}

.search-section {
  .search-input-area {
    margin-bottom: 16px;
    
    :deep(.ant-input-search) {
      border-radius: 8px;
    }
  }

  .search-options {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    
    .option-group {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .option-label {
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
      }
    }
  }

  .quick-tags {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    
    .tags-label {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }
    
    .quick-tag {
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        transform: translateY(-1px);
      }
    }
  }
}

.results-section {
  flex: 1;
  overflow-y: auto;
  
  .loading-state, .error-state, .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
    padding: 8px 0;
    
    .image-item {
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      &.selected {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .image-wrapper {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        
        .result-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        
        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          
          .image-actions {
            display: flex;
            gap: 8px;
          }
        }
        
        &:hover {
          .result-image {
            transform: scale(1.05);
          }
          
          .image-overlay {
            opacity: 1;
          }
        }
      }
      
      .image-info {
        padding: 8px 12px;
        background: #f9fafb;
        
        .image-size {
          font-size: 11px;
          color: #374151;
          font-weight: 500;
        }
        
        .image-source {
          font-size: 10px;
          color: #9ca3af;
          text-transform: uppercase;
        }
      }
    }
  }

  .load-more {
    text-align: center;
    padding: 20px;
    
    :deep(.ant-btn) {
      border-radius: 8px;
      min-width: 120px;
    }
  }
}

.image-preview {
  text-align: center;
  
  .preview-full-image {
    max-width: 100%;
    max-height: 60vh;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }
  
  .preview-info {
    display: inline-block;
    text-align: left;
    margin-bottom: 20px;
    
    .info-row {
      display: flex;
      margin-bottom: 8px;
      
      .info-label {
        width: 60px;
        color: #6b7280;
        font-size: 14px;
      }
    }
  }
  
  .preview-actions {
    :deep(.ant-btn) {
      border-radius: 8px;
      min-width: 120px;
    }
  }
}
</style>