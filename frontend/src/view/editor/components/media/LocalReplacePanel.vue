<template>
  <div class="local-replace-panel">
    <!-- 文件选择区域 -->
    <div class="upload-section">
      <div class="upload-area" :class="{ 'drag-over': dragOver, 'has-file': selectedFile }" @drop="handleDrop" @dragover="handleDragOver" @dragleave="handleDragLeave" @click="triggerFileSelect">
        <!-- 默认状态 -->
        <div v-if="!selectedFile && !uploading" class="upload-placeholder">
          <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt text-4xl text-blue-500 mb-4"></i>
          </div>
          <div class="upload-text">
            <p class="text-lg font-medium text-gray-700 mb-2">拖拽文件到这里，或点击选择</p>
            <p class="text-sm text-gray-500">支持 {{ acceptedFormats }} 格式，最大 {{ maxSizeText }}</p>
          </div>
          <div class="upload-actions mt-4">
            <a-button type="primary" @click.stop="triggerFileSelect">
              <template #icon><i class="fas fa-folder-open"></i></template>
              选择文件
            </a-button>
            <a-button @click.stop="pasteFromClipboard" class="ml-2">
              <template #icon><i class="fas fa-paste"></i></template>
              粘贴图片
            </a-button>
          </div>
        </div>

        <!-- 文件已选择状态 -->
        <div v-else class="file-preview">
          <div class="preview-container">
            <img v-if="previewUrl && mediaType === 'img'" :src="previewUrl" alt="预览" class="preview-image" />
            <video v-else-if="previewUrl && mediaType === 'video'" :src="previewUrl" controls class="preview-video" />
            <audio v-else-if="previewUrl && mediaType === 'audio'" :src="previewUrl" controls class="preview-audio" />
            <div v-else class="file-info">
              <i :class="getFileIcon()" class="text-3xl text-gray-400 mb-2"></i>
              <p class="text-sm font-medium">{{ selectedFile?.name }}</p>
              <p class="text-xs text-gray-400">{{ selectedFile?.type }}</p>
            </div>
          </div>

          <div class="file-actions">
            <div class="file-meta">
              <span class="text-sm text-gray-500">
                {{ formatFileSize(selectedFile?.size) }}
              </span>
            </div>
            <div class="action-buttons">
              <a-button @click.stop="clearSelection" size="small">
                <template #icon><i class="fas fa-times"></i></template>
                清除
              </a-button>
              <a-button type="primary" @click.stop="confirmReplace" size="small">
                <template #icon><i class="fas fa-check"></i></template>
                确认替换
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示区域 -->
    <div v-if="selectedFile" class="tips-section">
      <div class="tip-item">
        <i class="fas fa-info-circle text-blue-500 mr-2"></i>
        <span class="text-sm text-gray-600"> 点击“确认替换”后，系统将自动处理文件上传和替换操作 </span>
      </div>
      <div class="tip-item">
        <i class="fas fa-clock text-orange-500 mr-2"></i>
        <span class="text-sm text-gray-600"> 支持的格式：{{ acceptedFormats }}，最大 {{ maxSizeText }} </span>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" :accept="acceptedMimeTypes" style="display: none" @change="handleFileSelect" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { message } from "ant-design-vue";

const props = defineProps({
  mediaType: {
    type: String,
    default: "img",
  },
  currentSrc: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["file-selected", "upload-complete", "replace-confirm"]);

// 状态管理
const dragOver = ref(false);
const selectedFile = ref(null);
const previewUrl = ref("");
const fileInput = ref(null);

// 文件格式和大小限制
const formatLimits = {
  img: {
    types: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff"],
    formats: "JPG, PNG, GIF, WebP, SVG, BMP, TIFF",
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    types: ["video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov", "video/wmv", "video/flv", "video/mkv"],
    formats: "MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV",
    maxSize: 200 * 1024 * 1024, // 200MB
  },
  audio: {
    types: ["audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/m4a"],
    formats: "MP3, WAV, OGG, AAC, FLAC, M4A",
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  iframe: {
    types: ["text/html", "text/plain", "application/pdf"],
    formats: "HTML, TXT, PDF",
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  embed: {
    types: ["application/pdf", "application/x-shockwave-flash", "text/html"],
    formats: "PDF, SWF, HTML",
    maxSize: 20 * 1024 * 1024, // 20MB
  },
  object: {
    types: ["application/pdf", "application/x-shockwave-flash", "image/svg+xml"],
    formats: "PDF, SWF, SVG",
    maxSize: 20 * 1024 * 1024, // 20MB
  },
};

// 计算属性
const currentLimit = computed(() => {
  return formatLimits[props.mediaType] || formatLimits.img;
});

const acceptedMimeTypes = computed(() => {
  return currentLimit.value.types.join(",");
});

const acceptedFormats = computed(() => {
  return currentLimit.value.formats;
});

const maxSizeText = computed(() => {
  const mb = currentLimit.value.maxSize / (1024 * 1024);
  return `${mb}MB`;
});

// 方法
const triggerFileSelect = () => {
  fileInput.value?.click();
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    processFile(file);
  }
};

const processFile = (file) => {
  console.log("ProcessFile called:", {
    mediaType: props.mediaType,
    fileType: file.type,
    fileName: file.name,
    currentLimit: currentLimit.value,
  });

  // 验证文件类型
  if (!currentLimit.value.types.includes(file.type)) {
    console.error("File type not supported:", file.type, "Expected:", currentLimit.value.types);
    message.error(`不支持的文件格式，请选择 ${acceptedFormats.value} 格式的文件`);
    return;
  }

  // 验证文件大小
  if (file.size > currentLimit.value.maxSize) {
    message.error(`文件大小不能超过 ${maxSizeText.value}`);
    return;
  }

  selectedFile.value = file;
  createPreview(file);
  emit("file-selected", file);
};

const createPreview = (file) => {
  if (file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/")) {
    previewUrl.value = URL.createObjectURL(file);
  } else {
    previewUrl.value = "";
  }
};

// 获取文件图标
const getFileIcon = () => {
  if (!selectedFile.value) return "fas fa-file";

  const type = selectedFile.value.type;
  if (type.startsWith("image/")) return "fas fa-image";
  if (type.startsWith("video/")) return "fas fa-video";
  if (type.startsWith("audio/")) return "fas fa-volume-up";
  return "fas fa-file";
};

const clearSelection = () => {
  selectedFile.value = null;
  previewUrl.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

// 将文件转换为base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 直接确认替换，不需要上传预览步骤
const confirmReplace = async () => {
  if (!selectedFile.value) return;

  try {
    console.log("开始处理文件替换:", selectedFile.value.name, selectedFile.value.type);

    // 将文件转换为base64
    const base64Url = await fileToBase64(selectedFile.value);

    console.log("文件转换完成，base64长度:", base64Url.length);

    emit("replace-confirm", {
      file: selectedFile.value,
      url: base64Url, // 使用base64而不是blob URL
      type: selectedFile.value.type,
      name: selectedFile.value.name,
      size: selectedFile.value.size,
    });

    // 清理选择状态
    clearSelection();
  } catch (error) {
    console.error("文件转换失败:", error);
    message.error("文件处理失败，请重试");
  }
};

// 拖拽处理
const handleDragOver = (e) => {
  e.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  dragOver.value = false;
};

const handleDrop = (e) => {
  e.preventDefault();
  dragOver.value = false;

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
};

// 粘贴处理
const pasteFromClipboard = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith("image/")) {
          const blob = await clipboardItem.getType(type);
          const file = new File([blob], `clipboard-image.${type.split("/")[1]}`, { type });
          processFile(file);
          return;
        }
      }
    }
    message.info("剪贴板中没有找到图片内容");
  } catch (error) {
    console.error("读取剪贴板失败:", error);
    message.error("无法读取剪贴板内容");
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 全局粘贴监听
const handleGlobalPaste = (e) => {
  if (e.clipboardData?.files.length > 0) {
    const file = e.clipboardData.files[0];
    if (currentLimit.value.types.includes(file.type)) {
      processFile(file);
    }
  }
};

onMounted(() => {
  document.addEventListener("paste", handleGlobalPaste);
});

onUnmounted(() => {
  document.removeEventListener("paste", handleGlobalPaste);
});
</script>

<style lang="scss" scoped>
.local-replace-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-section {
  .upload-area {
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    &.drag-over {
      border-color: #10b981;
      background-color: #ecfdf5;
      transform: scale(1.02);
    }

    &.has-file {
      border-style: solid;
      border-color: #3b82f6;
      background-color: #f8fafc;
    }
  }

  .upload-placeholder {
    .upload-icon {
      margin-bottom: 16px;
    }

    .upload-actions {
      :deep(.ant-btn) {
        border-radius: 8px;
      }
    }
  }

  .tips-section {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    margin-top: 16px;

    .tip-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .file-preview {
    width: 100%;

    .preview-container {
      margin-bottom: 16px;

      .preview-image,
      .preview-video {
        max-width: 100%;
        max-height: 200px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .preview-audio {
        width: 100%;
        max-width: 300px;
        height: 32px;
        margin: 10px 0;
        border-radius: 16px;
      }

      .file-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
      }
    }

    .file-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .action-buttons {
        :deep(.ant-btn) {
          border-radius: 6px;
          margin-left: 8px;
        }
      }
    }
  }
}

.preview-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;

  .section-title {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .comparison-view {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;

    .comparison-item {
      flex: 1;
      text-align: center;

      .item-label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .item-content {
        background: #f9fafb;
        border-radius: 8px;
        padding: 12px;
        border: 1px solid #e5e7eb;

        .comparison-media {
          max-width: 100%;
          max-height: 120px;
          border-radius: 6px;
        }

        .media-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          color: #9ca3af;
        }
      }
    }

    .comparison-arrow {
      font-size: 20px;
      color: #3b82f6;
    }
  }

  .confirm-actions {
    text-align: center;

    :deep(.ant-btn) {
      border-radius: 8px;
      min-width: 120px;
    }
  }
}
</style>
