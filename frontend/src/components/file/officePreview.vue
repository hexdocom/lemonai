<template>
  <div class="office-preview-container">
    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading document...</p>
      </div>
    </div>

    <!-- Document toolbar -->
    <div v-if="(fileType === 'docx' || ['pptx', 'ppt'].includes(fileType)) && fileUrl && !error && !loading" class="document-toolbar">
      <div class="toolbar-left" v-if="fileType === 'docx'">
        <button class="tool-btn" @click="zoomOut" :disabled="documentScale <= 0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13H5V11H19V13Z" />
          </svg>
        </button>
        <span class="zoom-level">{{ Math.round(documentScale * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn" :disabled="documentScale >= 3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
        </button>
      </div>
      
      <div class="toolbar-center" v-if="(fileType === 'docx' || ['pptx', 'ppt'].includes(fileType)) && totalPages > 0">
        <button class="tool-btn" @click="prevPage" :disabled="currentPage <= 1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
          </svg>
        </button>
        <div class="page-input">
          <input 
            v-model.number="pageInput" 
            @keyup.enter="goToPage"
            @blur="goToPage"
            type="number" 
            :min="1" 
            :max="totalPages"
          />
          <span>/ {{ totalPages }}</span>
        </div>
        <button class="tool-btn" @click="nextPage" :disabled="currentPage >= totalPages">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
          </svg>
        </button>
      </div>
      
      <div class="toolbar-center" v-else-if="fileType === 'docx'">
        <span class="document-type">DOCX Document</span>
      </div>
      
      <div class="toolbar-center" v-else-if="['pptx', 'ppt'].includes(fileType)">
        <span class="document-type">PPTX Presentation</span>
      </div>

      <div class="toolbar-right" v-if="fileType === 'docx'">
        <button class="tool-btn reset-btn" @click="resetZoom">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z" />
          </svg>
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Document container -->
    <div class="office-container" ref="officeContainer">
      <!-- Error state -->
      <div v-if="error" class="error-container">
        <p class="error-message">{{ error }}</p>
        <button class="retry-btn" @click="loadFile">Retry</button>
      </div>

      <!-- Document preview -->
      <div v-show="fileUrl && !error && containerReady" class="document-wrapper">
        <!-- PDF preview -->
        <div v-if="fileType === 'pdf'" class="pdf-wrapper">
          <div class="pdf-zoom-container" :style="{ 
            transform: `scale(${documentScale})`,
            transformOrigin: 'center top'
          }">
            <!-- 临时隐藏VueOfficePdf组件 -->
            <!-- <VueOfficePdf
              :key="fileUrl"
              :src="fileUrl"
              style="height: 100vh;"
              @rendered="onPdfRendered"
              @error="onDocumentError"
            /> -->
            
            <!-- 使用iframe嵌套PDF -->
            <iframe
               :src="fileUrl + '#toolbar=1&navpanes=0&scrollbar=1&view=FitH'"
              style="width: 100%; height: 100vh; border: none;"
              type="application/pdf"
            ></iframe>
          </div>
        </div>
        
        <!-- DOCX preview -->
        <div v-else-if="fileType === 'docx'" class="docx-wrapper">
          <div class="docx-scaler" :style="{ 
            transform: `scale(${documentScale})`,
            transformOrigin: 'top left'
          }">
            <VueOfficeDocx
              :key="fileUrl"
              :src="fileUrl"
              style="width: 100%; height: 100%;"
              @rendered="onDocumentReady"
              @error="onDocumentError"
            />
          </div>
        </div>
        
        <!-- DOC preview (unsupported) -->
        <div v-else-if="fileType === 'doc'" class="unsupported-format">
          <p>DOC format is not supported</p>
          <p>Please convert the file to DOCX format for preview</p>
          <p>Supported formats: PDF, DOCX, XLSX, XLS, PPTX, PPT</p>
        </div>
        
        <!-- EXCEL preview -->
        <div v-else-if="['xlsx', 'xls'].includes(fileType)" class="excel-wrapper">
          <VueOfficeExcel
            :key="fileUrl"
            :src="fileUrl"
            style="width: 100%; height: 100vh;"
            @rendered="onDocumentReady"
            @error="onDocumentError"
          />
        </div>
        
        <!-- PPTX preview -->
        <div v-else-if="['pptx', 'ppt'].includes(fileType)" class="pptx-wrapper" :style="{
          '--document-scale': documentScale
        }">
          <VueOfficePptx
            :key="fileUrl"
            :src="fileUrl"
            style="width: 100%; height: 100vh;"
            @rendered="onDocumentReady"
            @error="onDocumentError"
          />
        </div>
        
        <!-- Unsupported format -->
        <div v-else class="unsupported-format">
          <p>Unsupported file format: {{ fileType.toUpperCase() }}</p>
          <p>Supported formats: PDF, DOCX, XLSX, XLS, PPTX, PPT</p>
          <p v-if="fileType === 'doc'" style="color: #ff7875; margin-top: 8px;">
            Note: Legacy DOC format is not supported. Please convert to DOCX format.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import VueOfficePdf from '@vue-office/pdf'
import VueOfficeDocx from '@vue-office/docx'
import VueOfficeExcel from '@vue-office/excel'
import VueOfficePptx from '@vue-office/pptx'
import workspaceService from '@/services/workspace'
//引入相关样式
import '@vue-office/excel/lib/index.css'
// Props
const props = defineProps({
  filePath: {
    type: String,
    required: true
  }
})

// Reactive data
const loading = ref(false)
const error = ref(null)
const fileUrl = ref('')
const fileBlob = ref(null)
const containerReady = ref(false)

// Document toolbar related
const documentScale = ref(1) // PPT default 100%
const currentPage = ref(1)
const totalPages = ref(0)
const pageInput = ref(1)

// PDF uses documentScale directly

// DOM references
const officeContainer = ref(null)

// Calculate file name
const fileName = computed(() => {
  if (!props.filePath) return ''
  return props.filePath.split('/').pop() || ''
})

// Calculate file type
const fileType = computed(() => {
  if (!props.filePath) return ''
  const ext = props.filePath.split('.').pop()?.toLowerCase() || ''
  return ext
})

// Load file
const loadFile = async () => {
  if (!props.filePath) return
  
  loading.value = true
  error.value = null
  
  try {
    // Clean up previous file URL
    if (fileUrl.value) {
      URL.revokeObjectURL(fileUrl.value)
      fileUrl.value = ''
    }
    
    console.log('Loading file:', props.filePath)
    
    // Get file content
    const response = await workspaceService.getFile(props.filePath)
    
    let blob
    if (response instanceof Blob) {
      blob = response
    } else if (response instanceof ArrayBuffer) {
      blob = new Blob([response], { type: getMimeType(fileType.value) })
    } else if (response.data) {
      if (response.data instanceof Blob) {
        blob = response.data
      } else if (response.data instanceof ArrayBuffer) {
        blob = new Blob([response.data], { type: getMimeType(fileType.value) })
      } else {
        throw new Error('Unsupported file format')
      }
    } else {
      throw new Error('Unable to get file content')
    }
    
    // Create blob URL
    fileBlob.value = blob
    fileUrl.value = URL.createObjectURL(blob)
    
    console.log('File loaded successfully, URL created')
    
    // Delay closing loading
    setTimeout(() => {
      loading.value = false
    }, 2000)
    
  } catch (err) {
    console.error('Failed to load file:', err)
    error.value = err.message || `Unable to load ${fileType.value.toUpperCase()} file`
    loading.value = false
  }
}

// Get MIME type
const getMimeType = (fileType) => {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint'
  }
  return mimeTypes[fileType] || 'application/octet-stream'
}

// PDF render complete callback
const onPdfRendered = (pdf) => {
  console.log('PDF rendered successfully', pdf)
  
  // 获取PDF总页数的多种方式
  const getTotalPages = () => {
    // 方式1: 从PDF对象直接获取页数(如果可用)
    if (pdf && pdf.numPages) {
      totalPages.value = pdf.numPages
      currentPage.value = 1
      pageInput.value = 1
      console.log('Total pages from PDF object:', pdf.numPages)
      return true
    }
    
    // 方式2: 从vue-office-pdf组件实例获取
    try {
      const pdfElement = document.querySelector('.vue-office-pdf')
      if (pdfElement && pdfElement.__vue__ && pdfElement.__vue__.numPages) {
        totalPages.value = pdfElement.__vue__.numPages
        currentPage.value = 1
        pageInput.value = 1
        console.log('Total pages from component:', pdfElement.__vue__.numPages)
        return true
      }
    } catch (e) {
      // ignore
    }
    
    // 方式3: 统计canvas元素数量
    const canvases = document.querySelectorAll('.vue-office-pdf-wrapper canvas, .vue-office-pdf canvas')
    if (canvases.length > 0) {
      totalPages.value = canvases.length
      currentPage.value = 1
      pageInput.value = 1
      console.log('Total pages from canvas count:', canvases.length)
      return true
    }
    
    // 方式4: 查找页面容器
    const pageElements = document.querySelectorAll('.vue-office-pdf .page, .vue-office-pdf-wrapper .page')
    if (pageElements.length > 0) {
      totalPages.value = pageElements.length
      currentPage.value = 1
      pageInput.value = 1
      console.log('Total pages from page elements:', pageElements.length)
      return true
    }
    
    return false
  }
  
  // 立即尝试获取
  if (!getTotalPages()) {
    // 如果立即获取失败，延迟重试
    setTimeout(() => {
      if (!getTotalPages()) {
        // 再次重试
        setTimeout(() => {
          if (!getTotalPages()) {
            // 最后一次重试，同时开启监听
            setTimeout(() => {
              getTotalPages()
              startPageCountObserver()
            }, 3000)
          }
        }, 1000)
      }
    }, 500)
  } else {
    // 如果成功获取，也开启监听以防滚动加载更多页面
    startPageCountObserver()
  }
}

// Document render complete callback
const onDocumentReady = () => {
  console.log('Document rendered successfully')
  
  // 启动容器尺寸监听器
  setTimeout(() => {
    startContainerResizeObserver()
  }, 500)
  
  // If Excel file, handle scrollbar issues
  if (['xlsx', 'xls'].includes(fileType.value)) {
    setTimeout(() => {
      setupExcelScrollbarFix()
    }, 1000)
  }
  
  // If DOCX file, delay calculating page count
  if (fileType.value === 'docx') {
    setTimeout(() => {
      calculateDocxPages()
    }, 1000)
  }
  
  // If PPTX file, delay calculating page count and set adaptive scale
  if (['pptx', 'ppt'].includes(fileType.value)) {
    setTimeout(() => {
      if (typeof calculatePptxPages === 'function') {
        calculatePptxPages()
      } else {
        console.error('calculatePptxPages function not defined')
      }
      // Set adaptive initial scale for PPT
      setAdaptivePptScale()
    }, 1000)
  }
}

// Calculate DOCX page count
const calculateDocxPages = () => {
  // Find section elements in DOCX (each section represents a page)
  const docxSections = document.querySelectorAll('.vue-office-docx section')
  
  if (docxSections.length > 0) {
    totalPages.value = docxSections.length
    currentPage.value = 1
    pageInput.value = 1
    console.log('DOCX pages found via section elements:', docxSections.length)
    return
  }
  
  // Fallback: estimate page count based on container height
  const docxContainer = document.querySelector('.vue-office-docx')
  if (docxContainer) {
    const containerHeight = docxContainer.scrollHeight
    const estimatedPages = Math.max(1, Math.ceil(containerHeight / 1122))
    totalPages.value = estimatedPages
    currentPage.value = 1
    pageInput.value = 1
    console.log('DOCX pages estimated by height:', estimatedPages, 'Container height:', containerHeight)
  }
}


// Calculate PPTX page count
const calculatePptxPages = () => {
  console.log('Calculating PPTX pages...')
  
  // Find slide wrapper elements in PPTX (each represents a slide)
  const pptxSlides = document.querySelectorAll('.vue-office-pptx .pptx-preview-slide-wrapper')
  
  if (pptxSlides.length > 0) {
    totalPages.value = pptxSlides.length
    currentPage.value = 1
    pageInput.value = 1
    console.log('PPTX slides found via slide wrapper elements:', pptxSlides.length)
    return
  }
  
  // Fallback: look for other possible slide elements
  const altSlides = document.querySelectorAll('.vue-office-pptx .slide, .vue-office-pptx [data-slide]')
  if (altSlides.length > 0) {
    totalPages.value = altSlides.length
    currentPage.value = 1
    pageInput.value = 1
    console.log('PPTX slides found via alternative selectors:', altSlides.length)
    return
  }
  
  console.log('No PPTX slides found')
}

// Set adaptive PPT scale based on screen size
const setAdaptivePptScale = () => {
  const pptxWrapper = document.querySelector('.pptx-wrapper')
  if (!pptxWrapper) return

  // Get container width
  const containerWidth = pptxWrapper.clientWidth
  console.log('Container width:', containerWidth)
  
  // PPT standard width is 960px, calculate adaptive scale
  const pptStandardWidth = 960
  let adaptiveScale = containerWidth / pptStandardWidth
  
  // Set reasonable scale limits (0.3 to 1.0)
  adaptiveScale = Math.max(0.3, Math.min(1.0, adaptiveScale))
  
  // Apply scale with some padding margin (reduce by 10% for better display)
  adaptiveScale = adaptiveScale * 0.9
  
  console.log('Calculated adaptive PPT scale:', adaptiveScale)
  
  // Update document scale
  documentScale.value = adaptiveScale
}

// Document error callback
const onDocumentError = (err) => {
  // Ignore Transport destroyed errors, which usually occur when component is destroyed
  if (err && (
    (typeof err === 'string' && err.includes('Transport destroyed')) ||
    (err.message && err.message.includes('Transport destroyed')) ||
    (err.toString && err.toString().includes('Transport destroyed'))
  )) {
    // Handle silently, no error log output
    return
  }
  
  console.error('Document render error:', err)
  error.value = 'Document rendering failed, please check if the file format is correct'
}

// Download file
const downloadFile = () => {
  if (!fileBlob.value) return
  
  const link = document.createElement('a')
  link.href = fileUrl.value
  link.download = fileName.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Document toolbar functions
const zoomIn = () => {
  if (documentScale.value < 3) {
    const oldScale = documentScale.value
    documentScale.value = Math.min(3, documentScale.value + 0.25)
    adjustScrollPositionAfterZoom(oldScale, documentScale.value)
  }
}

const zoomOut = () => {
  if (documentScale.value > 0.5) {
    const oldScale = documentScale.value
    documentScale.value = Math.max(0.5, documentScale.value - 0.25)
    adjustScrollPositionAfterZoom(oldScale, documentScale.value)
  }
}

const resetZoom = () => {
  const oldScale = documentScale.value
  documentScale.value = 1 // Reset all formats to 100%
  adjustScrollPositionAfterZoom(oldScale, documentScale.value)
}

// 调整缩放后的滚动位置
const adjustScrollPositionAfterZoom = (oldScale, newScale) => {
  setTimeout(() => {
    const pdfWrapper = document.querySelector('.pdf-wrapper')
    if (pdfWrapper) {
      const scaleRatio = newScale / oldScale
      const centerX = pdfWrapper.scrollLeft + pdfWrapper.clientWidth / 2
      const centerY = pdfWrapper.scrollTop + pdfWrapper.clientHeight / 2
      
      // 计算新的滚动位置，保持视觉中心不变
      const newScrollLeft = centerX * scaleRatio - pdfWrapper.clientWidth / 2
      const newScrollTop = centerY * scaleRatio - pdfWrapper.clientHeight / 2
      
      pdfWrapper.scrollTo({
        left: Math.max(0, newScrollLeft),
        top: Math.max(0, newScrollTop),
        behavior: 'auto'
      })
    }
  }, 50) // 等待transform应用完成
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    pageInput.value = currentPage.value
    scrollToPage(currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    pageInput.value = currentPage.value
    scrollToPage(currentPage.value)
  }
}

const goToPage = () => {
  const page = Number(pageInput.value)
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    scrollToPage(page)
  } else {
    // Restore current page when input is invalid
    pageInput.value = currentPage.value
  }
}

const scrollToPage = (pageNum) => {
  setTimeout(() => {
    if (fileType.value === 'pdf') {
      scrollToPdfPage(pageNum)
    } else if (fileType.value === 'docx') {
      scrollToDocxPage(pageNum)
    } else if (['pptx', 'ppt'].includes(fileType.value)) {
      scrollToPptxPage(pageNum)
    }
  }, 100)
}

const scrollToPdfPage = (pageNum) => {
  const pdfWrapper = document.querySelector('.pdf-wrapper')
  if (!pdfWrapper) return
  
  // Find target page through canvas elements
  const canvases = document.querySelectorAll('.vue-office-pdf-wrapper canvas')
  if (canvases.length === 0) return
  
  const targetCanvas = canvases[pageNum - 1] // Page numbers start from 1, array from 0
  if (!targetCanvas) return
  
  // Simplified logic: calculate directly based on canvas element position
  const canvasRect = targetCanvas.getBoundingClientRect()
  const wrapperRect = pdfWrapper.getBoundingClientRect()
  
  // Calculate canvas position relative to scroll container
  const relativeTop = canvasRect.top - wrapperRect.top + pdfWrapper.scrollTop
  
  // Subtract some offset to better display page top
  const scrollTop = Math.max(0, relativeTop - 20)
  
  pdfWrapper.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  })
  
  console.log(`Scrolled to PDF page ${pageNum}, position: ${scrollTop}`)
}

const scrollToDocxPage = (pageNum) => {
  const docxContainer = document.querySelector('.vue-office-docx')
  if (!docxContainer) return
  
  // Find target section element (each page in DOCX corresponds to a section)
  const docxSections = document.querySelectorAll('.vue-office-docx section')
  console.log('DOCX sections found:', docxSections.length)
  
  if (docxSections.length > 0 && docxSections[pageNum - 1]) {
    const targetSection = docxSections[pageNum - 1]
    
    // Calculate target section position relative to .vue-office-docx container
    const sectionOffsetTop = targetSection.offsetTop
    const scrollTop = Math.max(0, sectionOffsetTop - 20)
    
    docxContainer.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
    
    console.log(`Scrolled to DOCX page ${pageNum} via section element, position: ${scrollTop}`)
    return
  }
  
  // Fallback: page position based on height estimation
  if (docxContainer && totalPages.value > 0) {
    const containerHeight = docxContainer.scrollHeight
    const pageHeight = containerHeight / totalPages.value
    const scrollTop = Math.max(0, (pageNum - 1) * pageHeight - 20)
    
    docxContainer.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
    
    console.log(`Scrolled to DOCX page ${pageNum} via height estimation, position: ${scrollTop}`)
  }
}

const scrollToPptxPage = (pageNum) => {
  console.log(`Attempting to scroll to PPTX slide ${pageNum}`)
  
  // First find the scroll container
  const pptxWrapper = document.querySelector('.pptx-wrapper')
  if (!pptxWrapper) {
    console.log('pptx-wrapper not found')
    return
  }
  
  // Find target slide elements
  const pptxSlides = document.querySelectorAll('.vue-office-pptx .pptx-preview-slide-wrapper')
  console.log('PPTX slides found:', pptxSlides.length)
  
  if (pptxSlides.length > 0 && pptxSlides[pageNum - 1]) {
    const targetSlide = pptxSlides[pageNum - 1]
    console.log('Target slide found:', targetSlide)
    
    // Use scrollIntoView method, more reliable
    targetSlide.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'center'
    })
    
    console.log(`Scrolled to PPTX slide ${pageNum} using scrollIntoView`)
    return
  }
  
  // Fallback 1: look for alternative selectors
  const altSlides = document.querySelectorAll('.vue-office-pptx .pptx-slide')
  console.log('Alternative PPTX slides found:', altSlides.length)
  
  if (altSlides.length > 0 && altSlides[pageNum - 1]) {
    const targetSlide = altSlides[pageNum - 1]
    targetSlide.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'center'
    })
    console.log(`Scrolled to PPTX slide ${pageNum} using alternative selector`)
    return
  }
  
  // Fallback 2: based on height estimation
  const pptxContainer = document.querySelector('.vue-office-pptx')
  if (pptxContainer && totalPages.value > 0) {
    const containerHeight = pptxContainer.scrollHeight
    const slideHeight = containerHeight / totalPages.value
    const scrollTop = Math.max(0, (pageNum - 1) * slideHeight - 20)
    
    pptxWrapper.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
    
    console.log(`Scrolled to PPTX slide ${pageNum} via height estimation, position: ${scrollTop}`)
  } else {
    console.log('No suitable scrolling method found for PPTX')
  }
}

// 监听页面数量变化和滚动位置
let pageCountObserver = null
let scrollTimeout = null
let resizeObserver = null
let resizeTimeout = null

// 启动页面计数监听器
const startPageCountObserver = () => {
  // 清理之前的监听器
  if (pageCountObserver) {
    pageCountObserver.disconnect()
  }
  
  // 创建MutationObserver监听DOM变化
  pageCountObserver = new MutationObserver(() => {
    const canvases = document.querySelectorAll('.vue-office-pdf-wrapper canvas, .vue-office-pdf canvas')
    const pageElements = document.querySelectorAll('.vue-office-pdf .page, .vue-office-pdf-wrapper .page')
    
    const newPageCount = Math.max(canvases.length, pageElements.length)
    if (newPageCount > totalPages.value) {
      totalPages.value = newPageCount
      console.log('Updated total pages via observer:', newPageCount)
    }
  })
  
  // 开始观察PDF容器的变化
  const pdfContainer = document.querySelector('.vue-office-pdf, .vue-office-pdf-wrapper')
  if (pdfContainer) {
    pageCountObserver.observe(pdfContainer, {
      childList: true,
      subtree: true
    })
    
    // 添加滚动监听
    const pdfWrapper = document.querySelector('.pdf-wrapper')
    if (pdfWrapper) {
      pdfWrapper.addEventListener('scroll', updateCurrentPageOnScroll)
    }
  }
}

// 基于滚动位置更新当前页
const updateCurrentPageOnScroll = () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  
  scrollTimeout = setTimeout(() => {
    const pdfWrapper = document.querySelector('.pdf-wrapper')
    if (!pdfWrapper || totalPages.value === 0) return
    
    const canvases = document.querySelectorAll('.vue-office-pdf-wrapper canvas, .vue-office-pdf canvas')
    if (canvases.length === 0) return
    
    const wrapperRect = pdfWrapper.getBoundingClientRect()
    const wrapperCenter = wrapperRect.top + wrapperRect.height / 2
    
    let closestPage = 1
    let minDistance = Infinity
    
    canvases.forEach((canvas, index) => {
      const canvasRect = canvas.getBoundingClientRect()
      const canvasCenter = canvasRect.top + canvasRect.height / 2
      const distance = Math.abs(canvasCenter - wrapperCenter)
      
      if (distance < minDistance) {
        minDistance = distance
        closestPage = index + 1
      }
    })
    
    if (closestPage !== currentPage.value && closestPage <= totalPages.value) {
      currentPage.value = closestPage
      pageInput.value = closestPage
      console.log('Current page updated via scroll:', closestPage)
    }
  }, 100)
}

// Clean up resources
const cleanup = () => {
  if (fileUrl.value) {
    URL.revokeObjectURL(fileUrl.value)
    fileUrl.value = ''
  }
  fileBlob.value = null
  error.value = null
  loading.value = false
  
  // 清理监听器
  if (pageCountObserver) {
    pageCountObserver.disconnect()
    pageCountObserver = null
  }
  
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
  
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }
  
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  // 清理Excel菜单监听器
  if (excelMenuRef) {
    excelMenuRef.removeEventListener('click', resetExcelScrollbar)
    excelMenuRef = null
  }
  
  const pdfWrapper = document.querySelector('.pdf-wrapper')
  if (pdfWrapper) {
    pdfWrapper.removeEventListener('scroll', updateCurrentPageOnScroll)
  }
  
  // Reset document related state
  documentScale.value = 1 // Default 100%
  currentPage.value = 1
  totalPages.value = 0
  pageInput.value = 1
}

// Handle window resize for PPT adaptive scaling
const handleWindowResize = () => {
  if (['pptx', 'ppt'].includes(fileType.value) && containerReady.value) {
    setTimeout(() => {
      setAdaptivePptScale()
    }, 100)
  }
}

// 处理容器大小变化
const handleContainerResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  
  resizeTimeout = setTimeout(() => {
    console.log('Container size changed, triggering refresh...')
    
    // Excel组件重新渲染
    if (['xlsx', 'xls'].includes(fileType.value) && containerReady.value) {
      refreshExcelComponent()
    }
    
    // PPT自适应缩放
    if (['pptx', 'ppt'].includes(fileType.value) && containerReady.value) {
      setAdaptivePptScale()
    }
    
    // DOCX重新计算页面
    if (fileType.value === 'docx' && containerReady.value) {
      setTimeout(() => {
        calculateDocxPages()
      }, 500)
    }
  }, 300) // 防抖300ms
}

// 刷新Excel组件
const refreshExcelComponent = () => {
  console.log('Refreshing Excel component...')
  
  // 方案1: 直接调用Excel组件的resize方法（如果存在）
  const excelElement = document.querySelector('.vue-office-excel')
  if (excelElement && excelElement.__vue__ && typeof excelElement.__vue__.resize === 'function') {
    excelElement.__vue__.resize()
    console.log('Excel component resized via API')
    // 重新设置滚动条修复
    setTimeout(() => {
      resetExcelScrollbar()
    }, 100)
    return
  }
  
  // 方案2: 触发窗口resize事件，让Excel组件自适应
  const excelContainer = document.querySelector('.excel-wrapper')
  if (excelContainer) {
    // 派发resize事件
    window.dispatchEvent(new Event('resize'))
    console.log('Excel component refreshed via resize event')
    // 重新设置滚动条修复
    setTimeout(() => {
      resetExcelScrollbar()
    }, 100)
  }
}

// 设置Excel滚动条修复
let excelMenuRef = null
const setupExcelScrollbarFix = () => {
  console.log('Setting up Excel scrollbar fix...')
  
  // 查找sheet菜单元素
  const menuElement = document.querySelector('.x-spreadsheet-menu')
  
  if (menuElement && !excelMenuRef) {
    excelMenuRef = menuElement
    // 添加点击监听器来修复切换sheet时的滚动条问题
    menuElement.addEventListener('click', resetExcelScrollbar)
    console.log('Excel menu click listener added')
  }
  
  // 立即执行一次滚动条重置
  resetExcelScrollbar()
}

// 重置Excel滚动条位置
const resetExcelScrollbar = () => {
  // 横向滚动条
  const scrollbarElementX = document.querySelector('.x-spreadsheet-scrollbar.horizontal')
  // 竖向滚动条
  const scrollbarElementY = document.querySelector('.x-spreadsheet-scrollbar.vertical')

  // 竖向重置到顶部
  if (scrollbarElementY) {
    // 先保证excel视图的正确渲染
    setTimeout(() => {
      scrollbarElementY.scrollTop = 1
    })
    // 再重置滚动条位置
    setTimeout(() => {
      scrollbarElementY.scrollTop = 0
    }, 10)
    console.log('Vertical scrollbar reset')
  }

  // 横向重置到左侧
  if (scrollbarElementX) {
    // 先保证excel视图的正确渲染
    setTimeout(() => {
      scrollbarElementX.scrollLeft = 1
    })
    // 再重置滚动条位置
    setTimeout(() => {
      scrollbarElementX.scrollLeft = 0
    }, 10)
    console.log('Horizontal scrollbar reset')
  }
}

// 启动容器尺寸监听器
const startContainerResizeObserver = () => {
  if (!window.ResizeObserver) {
    console.warn('ResizeObserver not supported')
    return
  }
  
  // 清理之前的监听器
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  
  const targetContainer = officeContainer.value
  if (!targetContainer) {
    console.warn('Office container not found')
    return
  }
  
  resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect
      console.log(`Container resized: ${width}x${height}`)
      handleContainerResize()
    }
  })
  
  // 开始监听容器大小变化
  resizeObserver.observe(targetContainer)
  console.log('Container resize observer started')
}

// Open in new window
const openInNewTab = () => {
  if (!fileUrl.value) return
  window.open(fileUrl.value, '_blank')
}

// Watch file path changes
watch(() => props.filePath, (newPath, oldPath) => {
  if (newPath && newPath !== oldPath) {
    cleanup()
    // Only load file after container is ready
    if (containerReady.value) {
      loadFile()
    }
  } else if (!newPath) {
    cleanup()
  }
}, { immediate: false })

// Watch container ready state
watch(containerReady, (ready) => {
  if (ready && props.filePath) {
    loadFile()
  }
})

// Lifecycle
onMounted(() => {
  // Ensure container DOM is rendered
  setTimeout(() => {
    containerReady.value = true
  }, 100)
  
  // Add window resize listener for PPT adaptive scaling
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  cleanup()
  // Remove window resize listener
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped lang="less">
.office-preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  position: relative;
}

.office-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-right {
    justify-content: flex-end;
  }

  .file-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-type {
    padding: 4px 8px;
    background: #1890ff;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    font-weight: 500;

    svg {
      flex-shrink: 0;
    }

    &:hover {
      background: #f0f8ff;
      border-color: #1890ff;
      color: #1890ff;
    }

    &:active {
      transform: translateY(1px);
    }
  }
}

.document-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  z-index: 10;

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-center {
    flex: 1;
    justify-content: center;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: #f0f8ff;
      border-color: #1890ff;
      color: #1890ff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.reset-btn {
      width: auto;
      padding: 6px 12px;
      gap: 6px;
      
      span {
        white-space: nowrap;
        font-size: 14px;
      }
    }
  }

  .zoom-level {
    min-width: 45px;
    text-align: center;
    font-size: 14px;
    color: #666;
  }

  .document-type {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .page-input {
    display: flex;
    align-items: center;
    gap: 8px;
    
    input {
      width: 50px;
      height: 28px;
      padding: 4px 8px;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      text-align: center;
      font-size: 14px;
      background: #fff;
      color: #333;
      
      &:focus {
        outline: none;
        border-color: #1890ff;
        background: #fff;
      }

      /* Fix number input up/down arrow styles */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      /* Firefox compatibility */
      &[type=number] {
        -moz-appearance: textfield;
      }
    }
    
    span {
      font-size: 14px;
      color: #666;
      white-space: nowrap;
    }
  }
}

.office-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.document-wrapper {
  width: 100%;
  height: 100%;
}

.pdf-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  justify-content: center;
}

.pdf-zoom-container {
  width: fit-content;
  min-width: 100%;
  height: auto;
  min-height: 100vh;
  transition: transform 0.2s ease;
  overflow: visible;
  margin: 0 auto;
}

.excel-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

.docx-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

.docx-scaler {
  min-width: 100%;
  min-height: 100%;
  display: inline-block;
}

.pptx-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  p {
    color: #666;
    font-size: 16px;
    font-weight: 500;
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  
  .error-message {
    color: #ff4d4f;
    font-size: 16px;
    margin-bottom: 16px;
    text-align: center;
    line-height: 1.5;
  }

  .retry-btn {
    padding: 10px 20px;
    background: #1890ff;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
      background: #40a9ff;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.unsupported-format {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;

  p {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
    line-height: 1.5;

    &:first-child {
      color: #ff4d4f;
      font-weight: 500;
      font-size: 18px;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .office-toolbar {
    padding: 10px 16px;
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }

    .file-name {
      max-width: none;
      text-align: center;
    }
  }
}

/* Override Vue Office component default styles */
:deep(.vue-office-wrapper) {
  height: 100% !important;
}

/* Minimal PDF styling to avoid interference */
:deep(.vue-office-pdf) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.vue-office-docx) {
  height: 100% !important;
  overflow: auto !important;
}

/* Fix DOCX scrolling issues */
:deep(.vue-office-docx .docx-wrapper) {
  overflow: auto !important;
  max-height: none !important;
}

:deep(.vue-office-docx .docx-container) {
  overflow: auto !important;
  height: auto !important;
  max-height: none !important;
}

/* Excel component styles */
:deep(.vue-office-excel) {
  width: 100% !important;
  height: 100% !important;
  overflow: auto !important;
}

:deep(.vue-office-excel .excel-wrapper) {
  overflow: auto !important;
  max-width: none !important;
  max-height: none !important;
}

:deep(.vue-office-excel .luckysheet) {
  overflow: auto !important;
  width: 100% !important;
  height: 100% !important;
}

:deep(.vue-office-excel .luckysheet-container) {
  overflow: auto !important;
}

/* 强制显示Excel滚动条和滚动块 - 针对x-spreadsheet */
:deep(.x-spreadsheet-scrollbar) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
}

:deep(.x-spreadsheet-scrollbar.vertical) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  width: 15px !important;
}

:deep(.x-spreadsheet-scrollbar.horizontal) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  height: 15px !important;
}

/* 强制显示滚动块 thumb */
:deep(.x-spreadsheet-scrollbar .x-scrollbar-thumb) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  background: #c1c1c1 !important;
  border-radius: 6px !important;
}

:deep(.x-spreadsheet-scrollbar.vertical .x-scrollbar-thumb) {
  width: 100% !important;
  min-height: 20px !important;
}

:deep(.x-spreadsheet-scrollbar.horizontal .x-scrollbar-thumb) {
  height: 100% !important;
  min-width: 20px !important;
}

/* hover状态的滚动块 */
:deep(.x-spreadsheet-scrollbar .x-scrollbar-thumb:hover) {
  background: #a8a8a8 !important;
}

/* 确保滚动条轨道也显示 */
:deep(.x-spreadsheet-scrollbar .x-scrollbar-track) {
  opacity: 1 !important;
  visibility: visible !important;
  background: #f1f1f1 !important;
}

/* 确保滚动条容器也始终显示 */
:deep(.x-spreadsheet) {
  --scrollbar-size: 15px;
}

/* Mac系统原生滚动条强制显示（备用方案） */
:deep(.x-spreadsheet-scrollbar::-webkit-scrollbar) {
  width: 15px;
  height: 15px;
  -webkit-appearance: none;
}

:deep(.x-spreadsheet-scrollbar::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 6px;
}

:deep(.x-spreadsheet-scrollbar::-webkit-scrollbar-thumb) {
  background: #c1c1c1;
  border-radius: 6px;
  min-height: 20px;
  min-width: 20px;
}

:deep(.x-spreadsheet-scrollbar::-webkit-scrollbar-thumb:hover) {
  background: #a8a8a8;
}


:deep(.vue-office-pptx) {
  height: 100% !important;
  overflow: auto !important;
}

/* Fix PPTX preview container height issues */
:deep(.vue-office-pptx .pptx-preview-wrapper) {
  width: 100% !important;
  height: auto !important;
  overflow: visible !important;
  min-height: 100vh;
}

/* PPT container overall scaling */
:deep(.vue-office-pptx) {
  width: 100% !important;
  height: auto !important;
  zoom: calc(var(--document-scale, 1) * 0.8) !important; /* Default 80%, multiplied by user scale ratio */
  transform-origin: top center !important;
}

/* PPT preview container */
:deep(.vue-office-pptx .pptx-preview-wrapper) {
  width: 100% !important;
  height: auto !important;
  overflow: visible !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

/* Each slide container */
:deep(.vue-office-pptx .pptx-preview-slide-wrapper) {
  width: 960px !important; /* Keep original width */
  margin: 10px auto !important;
  display: block !important;
  overflow: visible !important;
}

/* Slide content */
:deep(.vue-office-pptx .pptx-slide) {
  width: 960px !important;
  height: auto !important;
  margin: 0 !important;
  display: block !important;
  overflow: visible !important;
}
</style>