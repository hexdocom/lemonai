<template>
  <div class="render-preview-container">
    <!-- 预览内容区 -->
    <div class="preview-content-wrapper">
      <div class="preview-frame-container">
        <!-- iframe容器 -->
        <div class="iframe-wrapper">
          <iframe ref="previewIframe" class="preview-iframe" @load="onIframeLoad" />

          <!-- 交互层 -->
          <InteractionLayer
            v-if="aiEditMode || advancedEditMode"
            ref="interactionLayerRef"
            :iframe-element="previewIframe"
            :enable-resize="advancedEditMode"
            :show-element-info="advancedEditMode"
            :enable-alignment-guides="false"
            @element-selected="handleElementSelected"
            @element-hover="handleElementHover"
            @element-resize="handleElementResize"
            @refresh="handleRefresh"
          />
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="preview-loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin text-blue-500 text-2xl mb-2"></i>
            <span class="text-gray-600">正在加载预览...</span>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-if="error" class="preview-error">
          <div class="error-content">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
            <span class="text-red-600 mb-2">预览加载失败</span>
            <button @click="retryLoad" class="retry-button">
              <i class="fas fa-redo mr-1"></i>
              重试
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { createPreviewHTML } from "../utils/previewTemplates.js";
import { createIframeManager } from "../utils/iframeManager.js";
import { cleanContent } from "../utils/contentCleaner.js";
import InteractionLayer from "./InteractionLayer.vue";
import { useEditorStore } from "@/store/modules/editor";

const props = defineProps({
  htmlContent: {
    type: String,
    default: "",
  },
  path: {
    type: String,
    default: "",
  },
  aiEditMode: {
    type: Boolean,
    default: false,
  },
  advancedEditMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["content-updated", "element-selected", "media-edit", "refresh"]);

// 组件引用
const previewIframe = ref(null);
const interactionLayerRef = ref(null);

// 状态管理
const loading = ref(false);
const error = ref(false);
const isIframeReady = ref(false);

// iframe管理器实例
let iframeManager = null;

// iframe加载完成事件
const onIframeLoad = async () => {
  // 避免重复处理
  if (iframeManager) {
    return;
  }

  const iframe = previewIframe.value;
  if (!iframe) {
    console.warn("Iframe element not found");
    return;
  }

  try {
    loading.value = false;
    error.value = false;
    isIframeReady.value = true;

    // 等待下一个tick确保DOM更新
    await nextTick();

    // 初始化iframe管理器
    initializeIframeManager();

    // 如果有初始内容，更新它
    if (props.htmlContent) {
      // 延迟一下确保管理器完全初始化
      setTimeout(() => {
        updateIframeContent();
      }, 100);
    }

    console.log("RenderPreview iframe loaded successfully");
  } catch (err) {
    console.error("RenderPreview iframe load error:", err);
    error.value = true;
    loading.value = false;
  }
};

// 初始化iframe管理器
const initializeIframeManager = () => {
  // 销毁旧的管理器
  if (iframeManager) {
    iframeManager.destroy();
    iframeManager = null;
  }

  // 检查iframe是否存在
  if (!previewIframe.value) {
    console.error("Cannot initialize iframe manager: iframe element not found");
    return;
  }

  try {
    iframeManager = createIframeManager(previewIframe.value, {
      editable: false, // 默认不启用编辑，由用户手动控制
      injectStyles: false,
    });

    // 设置事件回调
    iframeManager.on("contentChange", handleContentChange);
    iframeManager.on("elementClick", handleIframeElementClick);
    iframeManager.on("elementHover", handleIframeElementHover);
    iframeManager.on("scroll", handleIframeScroll);
    iframeManager.on("editModeChange", handleEditModeChange);
    iframeManager.on("mediaElementDoubleClick", handleMediaElementDoubleClick);
  } catch (error) {
    console.error("Failed to initialize iframe manager:", error);
    iframeManager = null;
  }
};

// 处理内容变化
let isUpdatingFromExternal = false;

const handleContentChange = (cleanContent) => {
  // 在编辑模式下，不自动保存，等待用户退出时才保存
  // 如果正在进行外部更新，不触发保存
  if (!isUpdatingFromExternal && !isEditingMode.value) {
    emit("content-updated", cleanContent);
  }
};

// 处理编辑模式变化
const handleEditModeChange = (editMode) => {
  // 编辑模式变化由父组件通过 props 控制
};

// 处理多媒体元素双击事件
const handleMediaElementDoubleClick = (mediaInfo, event) => {
  return false;
  console.log("[RenderPreview2] Media element double clicked:", {
    mediaInfo,
    mediaType: mediaInfo.mediaType,
    src: mediaInfo.src,
    editorId: mediaInfo.editorId,
    element: mediaInfo.element,
  });

  // 触发媒体编辑事件
  emit("media-edit", {
    element: mediaInfo,
    mediaType: mediaInfo.mediaType,
    event: event,
  });
};

// 编辑模式控制（由父组件触发）
const enterEditMode = (mode) => {
  if (!iframeManager) {
    console.warn("iframeManager not ready");
    return false;
  }

  const success = iframeManager.enterEditMode();
  if (!success) {
    console.error("Failed to enter edit mode");
  }
  return success;
};

const exitEditMode = (shouldSave = false) => {
  if (!iframeManager) {
    console.warn("iframeManager not ready");
    return null;
  }

  const completeHTML = iframeManager.exitEditMode();
  // console.log("[RenderPreview] Complete HTML:", completeHTML);

  // 只有在需要保存时才触发保存
  if (completeHTML && shouldSave) {
    console.log("[RenderPreview] Saving content on exit");
    emit("content-updated", completeHTML);
  } else if (completeHTML) {
    console.log("[RenderPreview] Exiting without save");
  }

  return completeHTML;
};

// 获取编辑器store
const editorStore = useEditorStore();

// 处理元素点击
const handleIframeElementClick = (elementInfo, event) => {
  if (!elementInfo || (!props.aiEditMode && !props.advancedEditMode)) return;

  // 更新交互层的选中指示器
  if (interactionLayerRef.value) {
    interactionLayerRef.value.updateSelectionIndicator(elementInfo);
  }

  // 只有在AI编辑模式下才处理canvas截屏和左侧预览逻辑
  if (props.aiEditMode && elementInfo.screenshot) {
    editorStore.setSelectedElement({
      ...elementInfo,
      path: props.path || "",
      html: elementInfo.element?.outerHTML?.substring(0, 500) || "",
    });
  }

  emit("element-selected", elementInfo);
};

// 处理元素悬停
const handleIframeElementHover = (elementInfo, event) => {
  if (!elementInfo || elementInfo.element === document.body || (!props.aiEditMode && !props.advancedEditMode)) return;

  // 更新交互层的悬停指示器
  if (interactionLayerRef.value) {
    interactionLayerRef.value.updateHoverIndicator(elementInfo);
  }
};

// 处理iframe滚动
const handleIframeScroll = (scrollInfo) => {
  // 更新交互层指示器位置
  if (interactionLayerRef.value && (props.aiEditMode || props.advancedEditMode)) {
    interactionLayerRef.value.handleIframeScroll();
  }
};

// 处理元素选中（来自交互层）
const handleElementSelected = (elementInfo) => {
  if (props.aiEditMode || props.advancedEditMode) {
    emit("element-selected", elementInfo);
  }
};

// 处理元素悬停（来自交互层）
const handleElementHover = (elementInfo) => {
  if (props.aiEditMode || props.advancedEditMode) {
    // 可以在这里添加额外的逻辑
  }
};

// 处理元素调整大小
const handleElementResize = (resizeInfo) => {
  if (!props.advancedEditMode) return;

  const { element, width, height } = resizeInfo;

  // 更新元素尺寸
  if (element) {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;

    // 触发内容更新
    if (iframeManager) {
      iframeManager.handleContentChange();
    }
  }
};

// 处理刷新请求
const handleRefresh = () => {
  console.log("[RenderPreview] Refresh requested, emitting to parent...");
  emit("refresh");
};

// 更新iframe内容
const updateIframeContent = () => {
  if (!isIframeReady.value) {
    console.warn("Iframe not ready yet");
    return;
  }

  if (!iframeManager) {
    console.warn("Iframe manager not initialized, trying to initialize...");
    initializeIframeManager();
    if (!iframeManager) {
      console.error("Failed to initialize iframe manager");
      return;
    }
  }

  try {
    // 使用简化的HTML模板（不包含交互脚本）
    // const fullHtml = createPreviewHTML(props.htmlContent);
    const fullHtml = props.htmlContent;

    // 通过iframe管理器写入内容并增强
    iframeManager.writeContent(fullHtml);

    // 延迟调整高度，等待内容渲染完成
    setTimeout(() => {
      adjustIframeHeight();
    }, 500);
  } catch (err) {
    console.error("Failed to update iframe content:", err);
    error.value = true;
  }
};

// 重试加载
const retryLoad = () => {
  error.value = false;
  loading.value = true;

  // 重新加载iframe
  const iframe = previewIframe.value;
  if (iframe) {
    iframe.src = "about:blank";
    setTimeout(() => {
      updateIframeContent();
    }, 100);
  }
};

// 防抖定时器
let contentUpdateTimer = null;

// 监听HTML内容变化
watch(
  () => props.htmlContent,
  (newContent, oldContent) => {
    // 避免在用户编辑时重新加载内容导致样式错乱
    if (newContent && newContent !== oldContent && isIframeReady.value && iframeManager) {
      // 清除之前的定时器
      if (contentUpdateTimer) {
        clearTimeout(contentUpdateTimer);
      }

      // 防抖更新，避免快速切换时的冲突
      contentUpdateTimer = setTimeout(() => {
        // 标记为外部更新
        isUpdatingFromExternal = true;
        updateIframeContent();
        // 重置标记
        setTimeout(() => {
          isUpdatingFromExternal = false;
        }, 1000);
        contentUpdateTimer = null;
      }, 150); // 150ms 防抖
    }
  }
);

// 监听编辑模式变化
watch([() => props.aiEditMode, () => props.advancedEditMode], ([aiEdit, advancedEdit], [prevAiEdit, prevAdvancedEdit]) => {
  if (!iframeManager) return;

  const isAnyEditMode = aiEdit || advancedEdit;
  const wasAnyEditMode = prevAiEdit || prevAdvancedEdit;

  // 从一个编辑模式切换到另一个编辑模式时，不需要退出再进入
  const isSwitchingBetweenEditModes = isAnyEditMode && wasAnyEditMode && (aiEdit !== prevAiEdit || advancedEdit !== prevAdvancedEdit);

  if (isAnyEditMode && !wasAnyEditMode) {
    // 从预览模式进入编辑模式
    enterEditMode(aiEdit ? "ai" : "advanced");
  } else if (!isAnyEditMode && wasAnyEditMode) {
    // 从编辑模式回到预览模式
    // 只有从高级编辑模式退出时才保存
    const shouldSave = prevAdvancedEdit;
    console.log("[RenderPreview] Exiting edit mode, shouldSave:", shouldSave, "was advanced edit:", prevAdvancedEdit);
    exitEditMode(shouldSave);
  } else if (isSwitchingBetweenEditModes) {
    // 在不同编辑模式之间切换，不触发保存，只是模式切换
    console.log("[RenderPreview] Switching between edit modes without save");
  }
});

// 动态调整 iframe 高度
const adjustIframeHeight = () => {
  const iframe = previewIframe.value;
  if (!iframe) return;

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (iframeDoc && iframeDoc.body) {
      // 获取内容实际高度
      const contentHeight = Math.max(iframeDoc.body.scrollHeight, iframeDoc.body.offsetHeight, iframeDoc.documentElement.scrollHeight, iframeDoc.documentElement.offsetHeight);

      // 设置最小高度，但不超过视窗高度
      const minHeight = Math.max(500, contentHeight);
      const maxHeight = window.innerHeight - 120;
      console.log("minHeight", minHeight);
      console.log("maxHeight", maxHeight);

      iframe.style.height = Math.min(minHeight, maxHeight) + "px";
    }
  } catch (err) {
    // 跨域或其他错误时使用默认高度
    console.log("Cannot access iframe content for height adjustment");
  }
};

// 组件挂载
onMounted(async () => {
  loading.value = true;

  // 等待DOM渲染
  await nextTick();

  // 初始化iframe
  const iframe = previewIframe.value;
  if (iframe) {
    // 设置src为about:blank会触发load事件
    iframe.src = "about:blank";
  } else {
    console.error("Iframe element not found on mount");
    error.value = true;
    loading.value = false;
  }

  // 监听窗口大小变化
  const handleResize = () => {
    adjustIframeHeight();
  };

  window.addEventListener("resize", handleResize);

  // 清理事件监听
  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });
});

// 更新多媒体元素src的方法（供外部调用）
const updateMediaElementSrc = (oldSrc, newSrc, mediaType) => {
  console.log("[RenderPreview2] updateMediaElementSrc called:", { oldSrc, newSrc, mediaType });

  if (!iframeManager) {
    console.warn("[RenderPreview2] iframeManager not ready for media src update");
    return false;
  }

  const result = iframeManager.updateMediaElementBySrc(oldSrc, newSrc, mediaType);
  console.log("[RenderPreview2] updateMediaElementSrc result:", result);
  return result;
};

// 通过编辑器ID更新多媒体元素（更精确的方式）
const updateMediaElementById = (editorId, newSrc) => {
  console.log("[RenderPreview2] updateMediaElementById called:", { editorId, newSrc });

  if (!iframeManager) {
    console.warn("[RenderPreview2] iframeManager not ready for media ID update");
    return false;
  }

  const result = iframeManager.updateMediaElementById(editorId, newSrc);
  console.log("[RenderPreview2] updateMediaElementById result:", result);
  return result;
};

// 暴露方法给父组件
defineExpose({
  updateMediaElementSrc,
  updateMediaElementById,
  enterEditMode,
  exitEditMode,
});

// 组件卸载
onUnmounted(() => {
  isIframeReady.value = false;

  // 清理防抖定时器
  if (contentUpdateTimer) {
    clearTimeout(contentUpdateTimer);
    contentUpdateTimer = null;
  }

  // 清理iframe管理器
  if (iframeManager) {
    iframeManager.destroy();
    iframeManager = null;
  }
});
</script>

<style lang="scss" scoped>
.render-preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.preview-content-wrapper {
  flex: 1;
  min-height: 0; // 重要：允许flex子元素收缩
  padding: 16px;
  overflow: hidden;
  /* 移除固定高度，让它自适应父容器 */
}

.preview-frame-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.iframe-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  border-radius: 8px;
  min-height: 500px; /* 最小高度 */
}

.preview-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.preview-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.retry-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:active {
    transform: translateY(1px);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .preview-content-wrapper {
    padding: 12px;
  }
}
</style>
