<template>
  <Teleport to="body">
    <Transition name="media-dialog">
      <div v-if="visible" class="media-edit-overlay" @click.self="handleClose" @dragover.prevent @drop.prevent @paste.prevent>
        <div class="media-edit-dialog" @dragover.stop @drop.stop @paste.stop @click.stop>
          <!-- 头部 -->
          <div class="dialog-header">
            <div class="header-info">
              <i class="fas fa-image text-blue-500 mr-2"></i>
              <span class="font-semibold">编辑 {{ mediaTypeText }}</span>
              <a-tag :color="getMediaTypeColor()" size="small" class="ml-2">
                {{ elementInfo.tagName }}
              </a-tag>
            </div>
            <a-button type="text" @click="handleClose" class="close-btn">
              <template #icon><i class="fas fa-times"></i></template>
            </a-button>
          </div>

          <!-- 当前媒体预览 -->
          <div class="current-media-preview">
            <div class="preview-header">
              <div class="preview-label">
                <i class="fas fa-image text-blue-500 mr-2"></i>
                <span>当前内容</span>
              </div>
              <div v-if="hasChanges" class="preview-indicator">
                <i class="fas fa-arrow-right text-blue-500 mx-3"></i>
                <span class="text-blue-600 font-medium">预览新内容</span>
              </div>
            </div>

            <div class="media-comparison">
              <!-- 原始媒体 -->
              <div class="media-item" :class="{ 'half-width': hasChanges }">
                <div v-if="hasChanges" class="item-label">原始</div>
                <div class="media-container">
                  <!-- 图片 -->
                  <img v-if="mediaType === 'img' && currentSrc" :src="currentSrc" :alt="elementInfo.alt || '图片'" class="current-media" @error="handleImageError" />
                  <!-- 视频 -->
                  <video v-else-if="mediaType === 'video' && currentSrc" :src="currentSrc" controls class="current-media" @error="handleVideoError">您的浏览器不支持视频播放</video>
                  <!-- 音频 -->
                  <audio v-else-if="mediaType === 'audio' && currentSrc" :src="currentSrc" controls class="current-media audio-player" @error="handleAudioError">您的浏览器不支持音频播放</audio>
                  <!-- iframe -->
                  <iframe v-else-if="mediaType === 'iframe' && currentSrc" :src="currentSrc" class="current-media iframe-preview" @error="handleIframeError"></iframe>
                  <!-- 其他媒体类型 -->
                  <div v-else-if="currentSrc" class="media-preview-generic">
                    <div class="generic-icon">
                      <i :class="getMediaIcon()" class="text-4xl mb-2"></i>
                    </div>
                    <div class="generic-info">
                      <p class="media-url">{{ currentSrc }}</p>
                      <p class="media-type">{{ mediaType.toUpperCase() }} 元素</p>
                    </div>
                    <a :href="currentSrc" target="_blank" class="preview-link">
                      <i class="fas fa-external-link-alt mr-1"></i>
                      在新窗口中查看
                    </a>
                  </div>
                  <!-- 无内容状态 -->
                  <div v-else class="media-placeholder">
                    <i :class="getMediaIcon()" class="text-4xl text-gray-400 mb-2"></i>
                    <span class="text-gray-500">{{ mediaTypeText }}</span>
                    <span class="text-xs text-gray-400 mt-1">未找到有效的src属性</span>
                  </div>
                </div>
              </div>

              <!-- 新媒体预览 -->
              <div v-if="hasChanges" class="media-item half-width">
                <div class="item-label new">新内容</div>
                <div class="media-container new">
                  <!-- 图片 -->
                  <img v-if="mediaType === 'img' && newSrc" :src="newSrc" :alt="'新图片预览'" class="current-media" @error="handleNewImageError" />
                  <!-- 视频 -->
                  <video v-else-if="mediaType === 'video' && newSrc" :src="newSrc" controls class="current-media" @error="handleNewVideoError">您的浏览器不支持视频播放</video>
                  <!-- 音频 -->
                  <audio v-else-if="mediaType === 'audio' && newSrc" :src="newSrc" controls class="current-media audio-player" @error="handleNewAudioError">您的浏览器不支持音频播放</audio>
                  <!-- iframe -->
                  <iframe v-else-if="mediaType === 'iframe' && newSrc" :src="newSrc" class="current-media iframe-preview" @error="handleNewIframeError"></iframe>
                  <!-- 其他类型 -->
                  <div v-else-if="newSrc" class="media-preview-generic">
                    <div class="generic-icon">
                      <i :class="getMediaIcon()" class="text-4xl mb-2 text-blue-500"></i>
                    </div>
                    <div class="generic-info">
                      <p class="media-url">{{ newSrc }}</p>
                      <p class="media-type">新{{ mediaType.toUpperCase() }} 元素</p>
                    </div>
                    <a :href="newSrc" target="_blank" class="preview-link">
                      <i class="fas fa-external-link-alt mr-1"></i>
                      在新窗口中查看
                    </a>
                  </div>
                  <!-- 加载中 -->
                  <div v-else class="media-placeholder">
                    <i class="fas fa-spinner fa-spin text-blue-500 text-2xl mb-2"></i>
                    <span class="text-blue-600">准备中...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 编辑选项卡 -->
          <div class="edit-tabs">
            <a-tabs v-model:activeKey="activeTab" type="card" class="custom-tabs">
              <a-tab-pane key="local" class="tab-content">
                <template #tab>
                  <span class="tab-title">
                    <i class="fas fa-upload mr-2"></i>
                    本地替换
                  </span>
                </template>
                <LocalReplacePanel
                  :media-type="mediaType"
                  :current-src="currentSrc"
                  @file-selected="handleFileSelected"
                  @upload-complete="handleUploadComplete"
                  @replace-confirm="handleReplaceConfirm"
                />
              </a-tab-pane>

              <a-tab-pane key="search" class="tab-content">
                <template #tab>
                  <span class="tab-title">
                    <i class="fas fa-search mr-2"></i>
                    一键搜图
                    <a-badge v-if="mediaType !== 'img'" status="default" class="ml-1" />
                  </span>
                </template>
                <ImageSearchPanel v-if="mediaType === 'img'" :current-alt="elementInfo.alt" @image-selected="handleSearchImageSelected" />
                <div v-else class="not-supported">
                  <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                  <span>搜图功能仅支持图片元素</span>
                </div>
              </a-tab-pane>

              <a-tab-pane key="generate" class="tab-content">
                <template #tab>
                  <span class="tab-title">
                    <i class="fas fa-magic mr-2"></i>
                    智能生图
                    <a-badge v-if="mediaType !== 'img'" status="default" class="ml-1" />
                  </span>
                </template>
                <AIGeneratePanel v-if="mediaType === 'img'" :current-alt="elementInfo.alt" @image-generated="handleGeneratedImage" />
                <div v-else class="not-supported">
                  <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                  <span>AI生图功能仅支持图片元素</span>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>

          <!-- 底部操作 -->
          <div class="dialog-footer">
            <div class="footer-info">
              <span class="text-sm text-gray-500"> 尺寸: {{ currentDimensions }} | 格式: {{ currentFormat }} </span>
            </div>
            <div class="footer-actions">
              <a-space>
                <a-button @click="handleClose">取消</a-button>
                <a-button type="primary" @click="handleSave" :loading="saving">
                  <template #icon><i class="fas fa-save"></i></template>
                  保存更改
                </a-button>
              </a-space>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import LocalReplacePanel from "./media/LocalReplacePanel.vue";
import ImageSearchPanel from "./media/ImageSearchPanel.vue";
import AIGeneratePanel from "./media/AIGeneratePanel.vue";

const emit = defineEmits(["close", "save", "media-updated"]);

// 状态管理
const visible = ref(false);
const activeTab = ref("local");
const saving = ref(false);
const elementInfo = ref({});
const mediaType = ref("img");
const currentSrc = ref("");
const newSrc = ref("");
const newFileData = ref(null); // 存储新文件的完整数据
const hasChanges = ref(false);

// 保存原始的 body overflow 样式
let originalBodyOverflow = "";

// 计算属性
const mediaTypeText = computed(() => {
  const typeMap = {
    img: "图片",
    video: "视频",
    audio: "音频",
    embed: "嵌入内容",
    object: "对象",
    iframe: "框架",
  };
  return typeMap[mediaType.value] || "媒体";
});

const currentDimensions = computed(() => {
  // 这里可以从elementInfo中获取尺寸信息
  return elementInfo.value.width && elementInfo.value.height ? `${elementInfo.value.width} × ${elementInfo.value.height}` : "未知";
});

const currentFormat = computed(() => {
  if (!currentSrc.value) return "未知";
  const ext = currentSrc.value.split(".").pop()?.toLowerCase();
  if (ext.length > 200) {
    return "base64";
  }
  return ext || "未知";
});

// 方法
const show = (element, type) => {
  elementInfo.value = element;
  mediaType.value = type;

  // 根据不同媒体类型获取正确的src
  let src = "";
  if (element.src) {
    src = element.src;
  } else if (element.href) {
    src = element.href;
  } else if (element.data) {
    src = element.data;
  }

  currentSrc.value = src;
  newSrc.value = "";
  newFileData.value = null; // 重置文件数据
  hasChanges.value = false;
  activeTab.value = "local";

  // 防止背景滚动
  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  visible.value = true;

  console.log("MediaEditDialog opened for:", {
    element: element,
    type: type,
    src: src,
  });
};

const getMediaTypeColor = () => {
  const colorMap = {
    img: "blue",
    video: "purple",
    audio: "orange",
    embed: "green",
    object: "cyan",
    iframe: "magenta",
  };
  return colorMap[mediaType.value] || "default";
};

const handleClose = () => {
  if (hasChanges.value) {
    // 可以添加确认对话框
  }

  // 恢复背景滚动
  document.body.style.overflow = originalBodyOverflow;

  visible.value = false;
  emit("close");
};

const handleSave = async () => {
  if (!hasChanges.value) {
    handleClose();
    return;
  }

  saving.value = true;
  try {
    emit("save", {
      element: elementInfo.value,
      newSrc: newSrc.value,
      mediaType: mediaType.value,
      fileData: newFileData.value, // 传递完整的文件数据
    });

    setTimeout(() => {
      saving.value = false;
      visible.value = false;
    }, 500);
  } catch (error) {
    console.error("保存失败:", error);
    saving.value = false;
  }
};

// 子组件事件处理
const handleFileSelected = (file) => {
  console.log("文件选择:", file);
};

const handleUploadComplete = (result) => {
  console.log("上传完成:", result);
  newSrc.value = result.url;
  hasChanges.value = true;
};

const handleReplaceConfirm = (data) => {
  console.log("Replace confirm:", data);

  if (typeof data === "string") {
    // 兼容旧版本，直接传URL字符串
    newSrc.value = data;
    newFileData.value = null;
  } else if (data && data.url) {
    // 新版本，传递对象
    newSrc.value = data.url;
    // 保存文件数据以便传递给父组件
    newFileData.value = {
      file: data.file,
      type: data.type,
      name: data.name,
      size: data.size,
      base64: data.url,
    };
  }

  hasChanges.value = true;
};

const handleSearchImageSelected = (imageUrl) => {
  newSrc.value = imageUrl;
  hasChanges.value = true;
  // 保持在当前标签，用户可以看到预览对比
};

const handleGeneratedImage = (imageUrl) => {
  newSrc.value = imageUrl;
  hasChanges.value = true;
  // 保持在当前标签，用户可以看到预览对比
};

// 媒体图标映射
const getMediaIcon = () => {
  const iconMap = {
    img: "fas fa-image text-blue-500",
    video: "fas fa-video text-purple-500",
    audio: "fas fa-volume-up text-green-500",
    embed: "fas fa-code text-orange-500",
    object: "fas fa-cube text-cyan-500",
    iframe: "fas fa-external-link-alt text-indigo-500",
  };
  return iconMap[mediaType.value] || "fas fa-file-alt text-gray-500";
};

// 错误处理方法
const handleImageError = (e) => {
  console.error("原始图片加载失败:", e.target.src);
  e.target.style.display = "none";
};

const handleNewImageError = (e) => {
  console.error("新图片加载失败:", e.target.src);
  e.target.style.display = "none";
};

const handleVideoError = (e) => {
  console.error("原始视频加载失败:", e.target.src);
};

const handleNewVideoError = (e) => {
  console.error("新视频加载失败:", e.target.src);
};

const handleAudioError = (e) => {
  console.error("原始音频加载失败:", e.target.src);
};

const handleNewAudioError = (e) => {
  console.error("新音频加载失败:", e.target.src);
};

const handleIframeError = (e) => {
  console.error("原始iframe加载失败:", e.target.src);
};

const handleNewIframeError = (e) => {
  console.error("新iframe加载失败:", e.target.src);
};

// 监听新图片变化，更新预览
watch(newSrc, (newVal) => {
  if (newVal) {
    // 这里可以添加预览逻辑
  }
});

// 组件卸载时恢复滚动
onUnmounted(() => {
  if (visible.value) {
    document.body.style.overflow = originalBodyOverflow;
  }
});

defineExpose({
  show,
});
</script>

<style lang="scss" scoped>
// 过渡动画
.media-dialog-enter-active,
.media-dialog-leave-active {
  transition: all 0.3s ease;
}

.media-dialog-enter-from {
  opacity: 0;

  .media-edit-dialog {
    transform: scale(0.9) translateY(20px);
  }
}

.media-dialog-leave-to {
  opacity: 0;

  .media-edit-dialog {
    transform: scale(0.9) translateY(20px);
  }
}

.media-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  // 使用更高的 z-index 确保在最上层
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  // 确保覆盖整个视口
  width: 100vw;
  height: 100vh;

  // 阻止滚动
  overflow: hidden;

  /* 阻止所有事件穿透 */
  pointer-events: auto;
}

.media-edit-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: relative;
  // 确保弹窗内容也在最上层
  z-index: 10000;
  // 添加过渡动画
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  .header-info {
    display: flex;
    align-items: center;
    font-size: 16px;
  }

  .close-btn {
    color: white;
    border: none;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
}

.current-media-preview {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .preview-label {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #374151;
      font-weight: 600;
    }

    .preview-indicator {
      display: flex;
      align-items: center;
      font-size: 13px;
    }
  }

  .media-comparison {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .media-item {
    flex: 1;
    transition: all 0.3s ease;

    &.half-width {
      flex: 0 0 calc(50% - 8px);
    }

    .item-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 500;
      text-align: center;

      &.new {
        color: #3b82f6;
        font-weight: 600;
      }
    }
  }

  .media-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 140px;
    background: #f9fafb;
    border-radius: 8px;
    border: 2px dashed #d1d5db;
    position: relative;
    overflow: hidden;

    &.new {
      border-color: #3b82f6;
      background: #eff6ff;
    }
  }

  .current-media {
    max-width: 100%;
    max-height: 180px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.02);
    }

    &.audio-player {
      width: 100%;
      max-height: 54px;
      height: 54px;
      margin: 20px 0;
    }

    &.iframe-preview {
      width: 100%;
      height: 160px;
      border: 1px solid #e5e7eb;
      background: white;
    }
  }

  .media-preview-generic {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;

    .generic-icon {
      margin-bottom: 12px;
    }

    .generic-info {
      margin-bottom: 16px;

      .media-url {
        font-size: 12px;
        color: #6b7280;
        word-break: break-all;
        margin-bottom: 4px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .media-type {
        font-size: 13px;
        color: #374151;
        font-weight: 500;
      }
    }

    .preview-link {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      color: #3b82f6;
      text-decoration: none;
      padding: 6px 12px;
      border: 1px solid #3b82f6;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: #3b82f6;
        color: white;
        text-decoration: none;
      }
    }
  }

  .media-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    text-align: center;
  }
}

.edit-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .custom-tabs {
    height: 100%;

    :deep(.ant-tabs-nav) {
      padding: 0 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      margin: 0;
    }

    :deep(.ant-tabs-tab) {
      border-radius: 8px 8px 0 0;
      margin-right: 4px;
      border: none;
      background: transparent;

      &.ant-tabs-tab-active {
        background: white;
        border: 1px solid #e2e8f0;
        border-bottom: 1px solid white;
        margin-bottom: -1px;

        .ant-tabs-tab-btn {
          color: #3b82f6;
          font-weight: 600;
        }
      }

      &:hover:not(.ant-tabs-tab-active) {
        background: rgba(59, 130, 246, 0.05);
      }
    }

    .tab-title {
      display: flex;
      align-items: center;
      padding: 2px 4px;

      i {
        font-size: 13px;
      }
    }
  }

  :deep(.ant-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-tabs-content-holder) {
    flex: 1;
    overflow: auto;
    background: white;
  }

  .tab-content {
    padding: 24px;
    height: 100%;
    background: white;
  }

  .not-supported {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #6b7280;
    font-size: 14px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px dashed #d1d5db;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;

  .footer-info {
    font-size: 12px;
  }

  .footer-actions {
    :deep(.ant-btn) {
      border-radius: 6px;
    }
  }
}
</style>
