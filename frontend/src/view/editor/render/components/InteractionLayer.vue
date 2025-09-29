<template>
  <div class="interaction-layer" ref="layerRef">
    <!-- 悬停指示器 -->
    <div v-if="hoverIndicator.visible" class="hover-indicator" :style="hoverIndicator.style" />

    <!-- 选中指示器 -->
    <div v-if="selectionIndicator.visible" class="selection-indicator" :style="selectionIndicator.style">
      <!-- 调整大小把手 -->
      <template v-if="showResizeHandles && false">
        <div v-for="handle in resizeHandles" :key="handle.position" :class="['resize-handle', `handle-${handle.position}`]" @mousedown.stop="startResize($event, handle.position)" />
      </template>

      <!-- 元素信息提示 -->
      <div v-if="showElementInfo" class="element-info">
        {{ selectionIndicator.elementInfo }}
      </div>
    </div>

    <!-- 编辑输入组件 -->
    <EditInput
      v-if="false"
      :visible="selectionIndicator.visible"
      :selected-element="selectionIndicator.element"
      :position="editInputPosition"
      :iframe-element="iframeElement"
      @refresh="handleRefresh"
      @cancel="handleEditCancel"
    />

    <!-- 对齐辅助线 -->
    <template v-if="alignmentGuides.length > 0">
      <div v-for="(guide, index) in alignmentGuides" :key="`guide-${index}`" class="alignment-guide" :class="guide.type" :style="guide.style" />
    </template>

    <!-- 拖拽预览 -->
    <div v-if="dragPreview.visible" class="drag-preview" :style="dragPreview.style" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import EditInput from "./EditInput.vue";

const props = defineProps({
  // iframe元素引用
  iframeElement: {
    type: HTMLIFrameElement,
    default: null,
  },
  // 是否显示调整大小把手
  enableResize: {
    type: Boolean,
    default: true,
  },
  // 是否显示元素信息
  showElementInfo: {
    type: Boolean,
    default: true,
  },
  // 是否启用对齐辅助线
  enableAlignmentGuides: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["element-selected", "element-hover", "element-resize", "element-drag", "element-modified", "refresh"]);

// 组件引用
const layerRef = ref(null);

// 悬停指示器
const hoverIndicator = reactive({
  visible: false,
  style: {},
  element: null,
});

// 选中指示器
const selectionIndicator = reactive({
  visible: false,
  style: {},
  element: null,
  elementInfo: "",
});

// 拖拽预览
const dragPreview = reactive({
  visible: false,
  style: {},
});

// 对齐辅助线
const alignmentGuides = ref([]);

// 调整大小把手
const resizeHandles = [
  { position: "tl", cursor: "nw-resize" },
  { position: "tr", cursor: "ne-resize" },
  { position: "bl", cursor: "sw-resize" },
  { position: "br", cursor: "se-resize" },
  { position: "t", cursor: "n-resize" },
  { position: "r", cursor: "e-resize" },
  { position: "b", cursor: "s-resize" },
  { position: "l", cursor: "w-resize" },
];

// 是否显示调整大小把手
const showResizeHandles = computed(() => {
  return props.enableResize && selectionIndicator.visible && selectionIndicator.element && ["IMG", "VIDEO", "IFRAME", "DIV"].includes(selectionIndicator.element?.tagName);
});

// 当前操作状态
const operationState = reactive({
  isResizing: false,
  isDragging: false,
  resizeHandle: null,
  startPos: { x: 0, y: 0 },
  startSize: { width: 0, height: 0 },
  startOffset: { top: 0, left: 0 },
});

/**
 * 统一的位置计算方法
 * 将元素在iframe中的位置转换为相对于交互层的位置
 */
const calculateRelativePosition = (element) => {
  if (!element || !props.iframeElement) return null;

  // 获取iframe的window和document
  const iframeWindow = props.iframeElement.contentWindow;
  const iframeDocument = props.iframeElement.contentDocument;

  if (!iframeWindow || !iframeDocument) return null;

  // 获取元素相对于iframe视口的位置
  const rect = element.getBoundingClientRect();

  // 获取iframe内部的滚动位置
  const scrollTop = iframeWindow.scrollY || iframeDocument.documentElement.scrollTop || iframeDocument.body.scrollTop || 0;
  const scrollLeft = iframeWindow.scrollX || iframeDocument.documentElement.scrollLeft || iframeDocument.body.scrollLeft || 0;

  // 计算元素在iframe文档中的绝对位置
  const elementTop = rect.top + scrollTop;
  const elementLeft = rect.left + scrollLeft;

  // 返回相对于iframe视口的位置（不包括滚动）
  return {
    top: elementTop - scrollTop, // 这等同于 rect.top
    left: elementLeft - scrollLeft, // 这等同于 rect.left
    width: rect.width,
    height: rect.height,
  };
};

// 计算编辑输入框位置
const editInputPosition = computed(() => {
  if (!selectionIndicator.visible) {
    return { top: 0, left: 0, width: 0, height: 0 };
  }

  // 直接使用选中指示器的样式值，已经考虑了iframe偏移
  const top = parseFloat(selectionIndicator.style.top) || 0;
  const left = parseFloat(selectionIndicator.style.left) || 0;
  const width = parseFloat(selectionIndicator.style.width) || 0;
  const height = parseFloat(selectionIndicator.style.height) || 0;

  return { top, left, width, height };
});

/**
 * 更新悬停指示器
 */
const updateHoverIndicator = (elementInfo) => {
  if (!elementInfo || elementInfo.element === selectionIndicator.element) {
    hoverIndicator.visible = false;
    return;
  }

  // 尝试直接使用 iframeManager 传递过来的 rect
  if (elementInfo.rect) {
    // iframeManager.js 中的 rect 包含了 scrollY/scrollX
    // 我们需要去除这些偏移
    const iframeWindow = props.iframeElement.contentWindow;
    const scrollTop = iframeWindow.scrollY || 0;
    const scrollLeft = iframeWindow.scrollX || 0;

    hoverIndicator.visible = true;
    hoverIndicator.element = elementInfo.element;
    hoverIndicator.style = {
      top: `${elementInfo.rect.top - scrollTop}px`,
      left: `${elementInfo.rect.left - scrollLeft}px`,
      width: `${elementInfo.rect.width}px`,
      height: `${elementInfo.rect.height}px`,
    };
  } else {
    // 备用方案：直接使用元素的 getBoundingClientRect
    const rect = elementInfo.element.getBoundingClientRect();
    hoverIndicator.visible = true;
    hoverIndicator.element = elementInfo.element;
    hoverIndicator.style = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  }
};

/**
 * 更新选中指示器
 */
const updateSelectionIndicator = (elementInfo) => {
  console.log("elementInfo", elementInfo);
  if (!elementInfo || !elementInfo.element) {
    selectionIndicator.visible = false;
    return;
  }

  // 与 hover 指示器相同的处理逻辑
  if (elementInfo.rect) {
    const iframeWindow = props.iframeElement.contentWindow;
    const scrollTop = iframeWindow.scrollY || 0;
    const scrollLeft = iframeWindow.scrollX || 0;

    selectionIndicator.visible = true;
    selectionIndicator.element = elementInfo.element;
    selectionIndicator.style = {
      top: `${elementInfo.rect.top - scrollTop}px`,
      left: `${elementInfo.rect.left - scrollLeft}px`,
      width: `${elementInfo.rect.width}px`,
      height: `${elementInfo.rect.height}px`,
    };
  } else {
    const rect = elementInfo.element.getBoundingClientRect();
    selectionIndicator.visible = true;
    selectionIndicator.element = elementInfo.element;
    selectionIndicator.style = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  }

  // 更新元素信息
  if (props.showElementInfo) {
    const tag = elementInfo.tagName?.toLowerCase() || elementInfo.element?.tagName?.toLowerCase() || "";
    const id = elementInfo.id || elementInfo.element?.id || "";
    const className = elementInfo.className || elementInfo.element?.className || "";
    const idStr = id ? `#${id}` : "";
    const classStr = className ? `.${className.split(" ").filter(Boolean).join(".")}` : "";
    selectionIndicator.elementInfo = `${tag}${idStr}${classStr}`;
  }
};

/**
 * 清除所有指示器
 */
const clearIndicators = () => {
  hoverIndicator.visible = false;
  selectionIndicator.visible = false;
  dragPreview.visible = false;
  alignmentGuides.value = [];
};

/**
 * 开始调整大小
 */
const startResize = (event, handle) => {
  event.preventDefault();

  operationState.isResizing = true;
  operationState.resizeHandle = handle;
  operationState.startPos = {
    x: event.clientX,
    y: event.clientY,
  };

  const rect = selectionIndicator.element.getBoundingClientRect();
  operationState.startSize = {
    width: rect.width,
    height: rect.height,
  };
  operationState.startOffset = {
    top: rect.top,
    left: rect.left,
  };

  // 添加全局事件监听
  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);

  // 添加resize类
  document.body.style.cursor = resizeHandles.find((h) => h.position === handle).cursor;
  document.body.classList.add("resizing");
};

/**
 * 处理调整大小移动
 */
const handleResizeMove = (event) => {
  if (!operationState.isResizing) return;

  const deltaX = event.clientX - operationState.startPos.x;
  const deltaY = event.clientY - operationState.startPos.y;

  const handle = operationState.resizeHandle;
  let newWidth = operationState.startSize.width;
  let newHeight = operationState.startSize.height;
  let newTop = operationState.startOffset.top;
  let newLeft = operationState.startOffset.left;

  // 根据把手位置计算新尺寸
  if (handle.includes("r")) {
    newWidth = Math.max(50, operationState.startSize.width + deltaX);
  }
  if (handle.includes("l")) {
    newWidth = Math.max(50, operationState.startSize.width - deltaX);
    newLeft = operationState.startOffset.left + deltaX;
  }
  if (handle.includes("b")) {
    newHeight = Math.max(50, operationState.startSize.height + deltaY);
  }
  if (handle.includes("t")) {
    newHeight = Math.max(50, operationState.startSize.height - deltaY);
    newTop = operationState.startOffset.top + deltaY;
  }

  // 更新选中指示器样式
  selectionIndicator.style = {
    top: `${newTop}px`,
    left: `${newLeft}px`,
    width: `${newWidth}px`,
    height: `${newHeight}px`,
  };

  // 触发resize事件
  emit("element-resize", {
    element: selectionIndicator.element,
    width: newWidth,
    height: newHeight,
    top: newTop,
    left: newLeft,
  });

  // 显示对齐辅助线
  if (props.enableAlignmentGuides) {
    updateAlignmentGuides(newLeft, newTop, newWidth, newHeight);
  }
};

/**
 * 结束调整大小
 */
const handleResizeEnd = () => {
  operationState.isResizing = false;
  operationState.resizeHandle = null;

  // 移除全局事件监听
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);

  // 恢复光标
  document.body.style.cursor = "";
  document.body.classList.remove("resizing");

  // 清除对齐辅助线
  alignmentGuides.value = [];
};

/**
 * 处理元素修改完成
 */
const handleRefresh = () => {
  emit("refresh");
};

/**
 * 处理编辑取消
 */
const handleEditCancel = () => {
  // 可以在这里处理取消逻辑
};

/**
 * 更新对齐辅助线
 */
const updateAlignmentGuides = (left, top, width, height) => {
  const guides = [];
  const threshold = 5; // 对齐阈值

  // 获取iframe中的其他元素
  if (!props.iframeElement) return;

  const iframeDoc = props.iframeElement.contentDocument;
  const elements = iframeDoc.querySelectorAll("*");

  elements.forEach((el) => {
    if (el === selectionIndicator.element) return;

    const rect = el.getBoundingClientRect();
    const elLeft = rect.left;
    const elTop = rect.top;
    const elRight = rect.right;
    const elBottom = rect.bottom;

    // 垂直对齐线
    if (Math.abs(left - elLeft) < threshold) {
      guides.push({
        type: "vertical",
        style: {
          left: `${elLeft}px`,
          top: `${Math.min(top, elTop)}px`,
          height: `${Math.abs(top - elTop) + height}px`,
        },
      });
    }

    // 水平对齐线
    if (Math.abs(top - elTop) < threshold) {
      guides.push({
        type: "horizontal",
        style: {
          top: `${elTop}px`,
          left: `${Math.min(left, elLeft)}px`,
          width: `${Math.abs(left - elLeft) + width}px`,
        },
      });
    }
  });

  alignmentGuides.value = guides;
};

/**
 * 处理iframe滚动
 */
const handleIframeScroll = () => {
  // 滚动时，重新计算指示器位置
  // 因为 getBoundingClientRect 返回的是相对于视口的位置，滚动后会自动更新
  if (selectionIndicator.visible && selectionIndicator.element) {
    const rect = selectionIndicator.element.getBoundingClientRect();
    selectionIndicator.style = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  }

  if (hoverIndicator.visible && hoverIndicator.element) {
    const rect = hoverIndicator.element.getBoundingClientRect();
    hoverIndicator.style = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  }
};

// 暴露方法给父组件
defineExpose({
  updateHoverIndicator,
  updateSelectionIndicator,
  clearIndicators,
  handleIframeScroll,
});

// 生命周期
onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener("resize", clearIndicators);
});

onUnmounted(() => {
  window.removeEventListener("resize", clearIndicators);

  // 清理可能存在的全局事件
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
});
</script>

<style lang="scss" scoped>
.interaction-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* 层本身不拦截事件 */
  z-index: 10;
  overflow: visible; /* 允许内容超出，比如编辑框 */
}

// 悬停指示器
.hover-indicator {
  position: absolute;
  border: 1px dashed #3b82f6;
  pointer-events: none;
  animation: fadeIn 0.2s ease;

  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    background: rgba(59, 130, 246, 0.1);
  }
}

// 选中指示器
.selection-indicator {
  position: absolute;
  border: 2px solid #3b82f6;
  pointer-events: none; /* 改为none，只有resize handles可交互 */
  animation: fadeIn 0.2s ease;

  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    background: rgba(59, 130, 246, 0.05);
    pointer-events: none;
  }
}

// 元素信息提示
.element-info {
  position: absolute;
  top: -24px;
  left: -2px;
  padding: 2px 8px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-family: "Monaco", "Menlo", monospace;
  border-radius: 3px;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 8px;
    border: 4px solid transparent;
    border-top-color: #3b82f6;
  }
}

// 调整大小把手
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 2px;
  pointer-events: auto;

  &:hover {
    background: #3b82f6;
    transform: scale(1.2);
  }

  // 把手位置
  &.handle-tl {
    top: -4px;
    left: -4px;
    cursor: nw-resize;
  }

  &.handle-tr {
    top: -4px;
    right: -4px;
    cursor: ne-resize;
  }

  &.handle-bl {
    bottom: -4px;
    left: -4px;
    cursor: sw-resize;
  }

  &.handle-br {
    bottom: -4px;
    right: -4px;
    cursor: se-resize;
  }

  &.handle-t {
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
  }

  &.handle-r {
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: e-resize;
  }

  &.handle-b {
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
  }

  &.handle-l {
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: w-resize;
  }
}

// 对齐辅助线
.alignment-guide {
  position: absolute;
  pointer-events: none;

  &.vertical {
    width: 1px;
    background: #ef4444;
    opacity: 0.6;
  }

  &.horizontal {
    height: 1px;
    background: #ef4444;
    opacity: 0.6;
  }
}

// 拖拽预览
.drag-preview {
  position: absolute;
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  transition: all 0.1s ease;
}

// 动画
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// 全局样式（调整大小时）
:global(.resizing) {
  user-select: none !important;

  * {
    user-select: none !important;
  }
}
</style>
