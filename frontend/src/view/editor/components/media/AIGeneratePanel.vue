<template>
  <div class="ai-generate-panel">
    <!-- 描述输入区域 -->
    <div class="prompt-section">
      <div class="section-title">
        <i class="fas fa-magic text-purple-500 mr-2"></i>
        <span>AI生图描述</span>
      </div>
      
      <div class="prompt-input-area">
        <a-textarea 
          v-model:value="promptText"
          placeholder="描述你想要的图片，例如：一只可爱的橙色小猫坐在阳光明媚的窗台上，背景是绿色植物，卡通风格，高质量"
          :rows="4"
          :maxlength="500"
          show-count
          class="prompt-textarea"
        />
        
        <div class="prompt-actions">
          <a-space>
            <a-button @click="clearPrompt" size="small">
              <template #icon><i class="fas fa-eraser"></i></template>
              清空
            </a-button>
            <a-button @click="optimizePrompt" size="small" :loading="optimizing">
              <template #icon><i class="fas fa-sparkles"></i></template>
              优化描述
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 快速提示词 -->
      <div class="quick-prompts">
        <div class="prompts-label">快速提示词:</div>
        <a-space wrap>
          <a-tag 
            v-for="prompt in quickPrompts" 
            :key="prompt"
            class="prompt-tag"
            @click="selectQuickPrompt(prompt)"
          >
            {{ prompt }}
          </a-tag>
        </a-space>
      </div>
    </div>

    <!-- 生成参数 -->
    <div class="params-section">
      <div class="section-title">
        <i class="fas fa-sliders-h text-blue-500 mr-2"></i>
        <span>生成参数</span>
      </div>

      <div class="params-grid">
        <div class="param-group">
          <label class="param-label">风格:</label>
          <a-select v-model:value="style" size="small" class="param-select">
            <a-select-option value="realistic">写实</a-select-option>
            <a-select-option value="cartoon">卡通</a-select-option>
            <a-select-option value="anime">动漫</a-select-option>
            <a-select-option value="painting">绘画</a-select-option>
            <a-select-option value="sketch">素描</a-select-option>
          </a-select>
        </div>

        <div class="param-group">
          <label class="param-label">尺寸:</label>
          <a-select v-model:value="size" size="small" class="param-select">
            <a-select-option value="512x512">正方形 (512×512)</a-select-option>
            <a-select-option value="768x512">横向 (768×512)</a-select-option>
            <a-select-option value="512x768">竖向 (512×768)</a-select-option>
            <a-select-option value="1024x1024">高清正方形 (1024×1024)</a-select-option>
          </a-select>
        </div>

        <div class="param-group">
          <label class="param-label">质量:</label>
          <a-select v-model:value="quality" size="small" class="param-select">
            <a-select-option value="standard">标准</a-select-option>
            <a-select-option value="high">高质量</a-select-option>
            <a-select-option value="ultra">超高质量</a-select-option>
          </a-select>
        </div>

        <div class="param-group">
          <label class="param-label">数量:</label>
          <a-select v-model:value="count" size="small" class="param-select">
            <a-select-option :value="1">1张</a-select-option>
            <a-select-option :value="2">2张</a-select-option>
            <a-select-option :value="4">4张</a-select-option>
          </a-select>
        </div>
      </div>
    </div>

    <!-- 生成按钮 -->
    <div class="generate-section">
      <a-button 
        type="primary" 
        size="large" 
        :loading="generating"
        :disabled="!promptText.trim()"
        @click="handleGenerate"
        class="generate-btn"
      >
        <template #icon>
          <i class="fas fa-magic"></i>
        </template>
        {{ generating ? '正在生成中...' : 'AI生成图片' }}
      </a-button>
      
      <div class="generate-cost">
        <i class="fas fa-coins text-yellow-500 mr-1"></i>
        <span class="text-sm text-gray-600">预计消耗 {{ estimatedCost }} 积分</span>
      </div>
    </div>

    <!-- 生成结果 -->
    <div v-if="generatedImages.length > 0 || generating" class="results-section">
      <div class="section-title">
        <i class="fas fa-images text-green-500 mr-2"></i>
        <span>生成结果</span>
      </div>

      <!-- 生成中状态 -->
      <div v-if="generating" class="generating-state">
        <div class="progress-container">
          <a-spin size="large" />
          <div class="progress-text">
            <p class="text-lg font-medium text-gray-700 mb-2">AI正在创作中...</p>
            <p class="text-sm text-gray-500">{{ progressText }}</p>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 生成结果网格 -->
      <div v-else class="results-grid">
        <div 
          v-for="(image, index) in generatedImages" 
          :key="index"
          class="result-item"
          :class="{ selected: selectedImage?.index === index }"
          @click="selectImage(image, index)"
        >
          <div class="image-wrapper">
            <img 
              :src="image.url" 
              :alt="`生成图片 ${index + 1}`"
              class="result-image"
              @load="handleImageLoad"
              @error="handleImageError"
            />
            <div class="image-overlay">
              <div class="image-actions">
                <a-button type="text" size="small" @click.stop="previewImage(image, index)">
                  <template #icon><i class="fas fa-eye text-white"></i></template>
                </a-button>
                <a-button type="text" size="small" @click.stop="downloadImage(image)">
                  <template #icon><i class="fas fa-download text-white"></i></template>
                </a-button>
                <a-button type="text" size="small" @click.stop="selectImage(image, index)">
                  <template #icon><i class="fas fa-check text-white"></i></template>
                </a-button>
              </div>
            </div>
          </div>
          
          <div class="image-info">
            <div class="image-size">{{ image.width }} × {{ image.height }}</div>
            <div class="image-quality">{{ getQualityText(image.quality) }}</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="generatedImages.length > 0" class="result-actions">
        <a-space size="large">
          <a-button @click="regenerate">
            <template #icon><i class="fas fa-redo"></i></template>
            重新生成
          </a-button>
          <a-button 
            type="primary" 
            :disabled="!selectedImage"
            @click="confirmSelection"
          >
            <template #icon><i class="fas fa-check"></i></template>
            使用选中图片
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <a-modal 
      v-model:open="previewVisible" 
      title="AI生成图片预览" 
      :footer="null" 
      width="80%"
      centered
    >
      <div v-if="previewingImage" class="image-preview">
        <img 
          :src="previewingImage.url" 
          :alt="`预览图片 ${previewingIndex + 1}`"
          class="preview-full-image"
        />
        <div class="preview-info">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">尺寸:</span>
              <span>{{ previewingImage.width }} × {{ previewingImage.height }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">风格:</span>
              <span>{{ getStyleText(previewingImage.style) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">质量:</span>
              <span>{{ getQualityText(previewingImage.quality) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">提示词:</span>
              <span>{{ previewingImage.prompt }}</span>
            </div>
          </div>
        </div>
        <div class="preview-actions">
          <a-space>
            <a-button @click="downloadImage(previewingImage)">
              <template #icon><i class="fas fa-download"></i></template>
              下载
            </a-button>
            <a-button type="primary" @click="selectPreviewImage">
              <template #icon><i class="fas fa-check"></i></template>
              选择此图片
            </a-button>
          </a-space>
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

const emit = defineEmits(['image-generated'])

// 状态管理
const promptText = ref('')
const style = ref('realistic')
const size = ref('512x512')
const quality = ref('standard')
const count = ref(1)
const generating = ref(false)
const optimizing = ref(false)
const progress = ref(0)
const progressText = ref('')
const generatedImages = ref([])
const selectedImage = ref(null)
const previewVisible = ref(false)
const previewingImage = ref(null)
const previewingIndex = ref(0)

// 快速提示词
const quickPrompts = ref([
  '可爱的小动物',
  '现代建筑外观', 
  '美丽的自然风景',
  '科技感界面',
  '温馨的室内设计',
  '美味的食物',
  '抽象艺术作品',
  '卡通人物'
])

// 计算属性
const estimatedCost = computed(() => {
  const baseCost = 2
  const qualityMultiplier = quality.value === 'ultra' ? 3 : quality.value === 'high' ? 2 : 1
  const sizeMultiplier = size.value.includes('1024') ? 2 : 1
  return baseCost * count.value * qualityMultiplier * sizeMultiplier
})

// 方法
const clearPrompt = () => {
  promptText.value = ''
}

const optimizePrompt = async () => {
  if (!promptText.value.trim()) return
  
  optimizing.value = true
  try {
    // 模拟提示词优化
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 这里应该调用AI优化提示词的API
    const optimizedPrompt = `${promptText.value}, high quality, detailed, professional photography`
    promptText.value = optimizedPrompt
    
  } catch (error) {
    console.error('优化失败:', error)
  } finally {
    optimizing.value = false
  }
}

const selectQuickPrompt = (prompt) => {
  promptText.value = prompt
}

const handleGenerate = async () => {
  if (!promptText.value.trim()) return
  
  generating.value = true
  progress.value = 0
  progressText.value = '正在准备生成...'
  generatedImages.value = []
  selectedImage.value = null

  try {
    // 模拟生成进度
    const progressSteps = [
      { value: 20, text: '分析提示词...' },
      { value: 40, text: '构建图像结构...' },
      { value: 60, text: '绘制细节...' },
      { value: 80, text: '优化画质...' },
      { value: 100, text: '生成完成!' }
    ]

    for (const step of progressSteps) {
      progress.value = step.value
      progressText.value = step.text
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // 生成图片结果
    const results = []
    for (let i = 0; i < count.value; i++) {
      const [width, height] = size.value.split('x').map(Number)
      results.push({
        url: `https://picsum.photos/${width}/${height}?random=${Date.now() + i}`,
        width,
        height,
        style: style.value,
        quality: quality.value,
        prompt: promptText.value
      })
    }
    
    generatedImages.value = results

  } catch (error) {
    console.error('生成失败:', error)
    message.error('生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

const regenerate = () => {
  handleGenerate()
}

const selectImage = (image, index) => {
  selectedImage.value = { ...image, index }
}

const confirmSelection = () => {
  if (selectedImage.value) {
    emit('image-generated', selectedImage.value.url)
  }
}

const previewImage = (image, index) => {
  previewingImage.value = image
  previewingIndex.value = index
  previewVisible.value = true
}

const selectPreviewImage = () => {
  selectImage(previewingImage.value, previewingIndex.value)
  previewVisible.value = false
}

const downloadImage = (image) => {
  const link = document.createElement('a')
  link.href = image.url
  link.download = `ai-generated-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const getStyleText = (styleValue) => {
  const styleMap = {
    realistic: '写实',
    cartoon: '卡通',
    anime: '动漫',
    painting: '绘画',
    sketch: '素描'
  }
  return styleMap[styleValue] || styleValue
}

const getQualityText = (qualityValue) => {
  const qualityMap = {
    standard: '标准',
    high: '高质量',
    ultra: '超高质量'
  }
  return qualityMap[qualityValue] || qualityValue
}

const handleImageLoad = (e) => {
  // 图片加载成功
}

const handleImageError = (e) => {
  console.error('图片加载失败:', e.target.src)
}

// 初始化时如果有currentAlt，使用它作为提示词
if (props.currentAlt) {
  promptText.value = props.currentAlt
}
</script>

<style lang="scss" scoped>
.ai-generate-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.prompt-section {
  .prompt-input-area {
    position: relative;
    margin-bottom: 16px;
    
    .prompt-textarea {
      border-radius: 8px;
      
      :deep(.ant-input) {
        font-size: 13px;
        line-height: 1.5;
      }
    }
    
    .prompt-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      
      :deep(.ant-btn) {
        border-radius: 4px;
        font-size: 11px;
      }
    }
  }

  .quick-prompts {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    
    .prompts-label {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }
    
    .prompt-tag {
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    }
  }
}

.params-section {
  .params-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    
    .param-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .param-label {
        font-size: 12px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .param-select {
        :deep(.ant-select-selector) {
          border-radius: 6px;
          font-size: 12px;
        }
      }
    }
  }
}

.generate-section {
  text-align: center;
  
  .generate-btn {
    border-radius: 8px;
    min-width: 160px;
    height: 40px;
    font-weight: 600;
  }
  
  .generate-cost {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 8px;
  }
}

.results-section {
  flex: 1;
  overflow-y: auto;
  
  .generating-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    
    .progress-container {
      text-align: center;
      width: 100%;
      max-width: 300px;
      
      .progress-text {
        margin: 20px 0;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.5s ease;
          border-radius: 3px;
        }
      }
    }
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
    
    .result-item {
      cursor: pointer;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      }
      
      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
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
          background: rgba(0, 0, 0, 0.6);
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
        padding: 12px 16px;
        background: #f9fafb;
        
        .image-size {
          font-size: 12px;
          color: #374151;
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        .image-quality {
          font-size: 11px;
          color: #9ca3af;
        }
      }
    }
  }

  .result-actions {
    text-align: center;
    padding: 20px 0;
    border-top: 1px solid #e5e7eb;
    
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
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    margin-bottom: 24px;
  }
  
  .preview-info {
    margin-bottom: 24px;
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      text-align: left;
      
      .info-item {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        
        .info-label {
          width: 60px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 500;
        }
        
        span:last-child {
          flex: 1;
          font-size: 13px;
        }
      }
    }
  }
  
  .preview-actions {
    :deep(.ant-btn) {
      border-radius: 8px;
      min-width: 100px;
    }
  }
}
</style>