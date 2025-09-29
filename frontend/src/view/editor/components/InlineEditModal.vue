<template>
  <!-- 直接内联编辑，无模态框 -->
  <div class="inline-edit-overlay" v-if="visible" @click.self="handleCancel">
    <!-- 编辑工具栏 -->
    <div class="edit-toolbar" :style="toolbarStyle">
      <div class="toolbar-content">
        <div class="element-info">
          <a-tag :color="getTagColor(elementInfo.tagName)" size="small">{{ elementInfo.tagName?.toUpperCase() }}</a-tag>
        </div>
        <div class="toolbar-actions">
          <a-space size="small">
            <a-button size="small" type="text" @click="handleSave" :loading="saving" title="保存 (Enter)">
              <template #icon><i class="fas fa-check text-green-500"></i></template>
            </a-button>
            <a-button size="small" type="text" @click="handleCancel" title="取消 (Esc)">
              <template #icon><i class="fas fa-times text-red-500"></i></template>
            </a-button>
          </a-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from "vue";

const visible = ref(false);
const elementInfo = ref({});
const saving = ref(false);
const toolbarStyle = ref({});
const currentEditingElement = ref(null);

const emit = defineEmits(["save", "cancel"]);

// 显示内联编辑
const show = (element) => {
  elementInfo.value = element;
  visible.value = true;

  nextTick(() => {
    // 启用 contentEditable 直接编辑
    enableDirectEditing(element);
  });
};

// 启用直接编辑模式
const enableDirectEditing = (element) => {
  // 通过 iframe 发送消息来启用编辑
  const iframe = document.querySelector('#preview-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      action: 'enableEdit',
      selector: element.selector,
      tempId: element.tempId
    }, '*');
    
    // 监听编辑状态
    currentEditingElement.value = element;
    
    // 计算工具栏位置
    updateToolbarPosition(element);
  }
};

// 更新工具栏位置
const updateToolbarPosition = (element) => {
  // 这里需要根据元素在iframe中的位置来计算工具栏位置
  // 由于跨iframe限制，我们将工具栏固定在顶部
  toolbarStyle.value = {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 1000
  };
};

// 获取标签颜色
const getTagColor = (tagName) => {
  const colorMap = {
    h1: "red",
    h2: "volcano", 
    h3: "orange",
    h4: "gold",
    h5: "lime",
    h6: "green",
    p: "cyan",
    div: "blue",
    span: "geekblue",
    a: "purple",
    img: "magenta",
  };
  return colorMap[tagName?.toLowerCase()] || "default";
};

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSave();
  } else if (e.key === "Escape") {
    e.preventDefault();
    handleCancel();
  }
};

// 保存编辑
const handleSave = () => {
  if (saving.value) return;

  saving.value = true;

  // 从iframe获取编辑后的内容
  const iframe = document.querySelector('#preview-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      action: 'saveEdit',
      tempId: currentEditingElement.value?.tempId
    }, '*');
  }

  setTimeout(() => {
    saving.value = false;
    visible.value = false;
    currentEditingElement.value = null;
  }, 300);
};

// 取消编辑
const handleCancel = () => {
  // 通知iframe取消编辑
  const iframe = document.querySelector('#preview-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      action: 'cancelEdit',
      tempId: currentEditingElement.value?.tempId
    }, '*');
  }

  emit("cancel");
  visible.value = false;
  currentEditingElement.value = null;
};

// 监听iframe的消息
const handleIframeMessage = (event) => {
  if (event.data.action === 'editComplete') {
    // 编辑完成，发送保存事件
    emit("save", {
      element: currentEditingElement.value,
      content: event.data.content,
    });
  }
};

// 添加全局键盘监听
const handleGlobalKeyDown = (e) => {
  if (visible.value) {
    handleKeyDown(e);
  }
};

onMounted(() => {
  window.addEventListener('message', handleIframeMessage);
  document.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage);
  document.removeEventListener('keydown', handleGlobalKeyDown);
});

// 监听显示状态变化
watch(visible, (newVal) => {
  if (!newVal) {
    // 重置状态
    elementInfo.value = {};
    saving.value = false;
    currentEditingElement.value = null;
  }
});

defineExpose({
  show,
});
</script>

<style lang="scss" scoped>
.inline-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  z-index: 999;
  pointer-events: none;
}

.edit-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: auto;
  
  .toolbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    
    .element-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toolbar-actions {
      :deep(.ant-btn) {
        border: none;
        box-shadow: none;
        background: transparent;
        
        &:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        .fas {
          font-size: 12px;
        }
      }
    }
  }
}

// 编辑状态样式注入到iframe中
:global(.editing-element) {
  outline: 2px solid #00aaff !important;
  box-shadow: 0 0 10px rgba(0, 170, 255, 0.7) !important;
  transition: all 0.2s ease !important;
}

:global(.editing-element:focus) {
  outline: 2px solid #0066cc !important;
  box-shadow: 0 0 15px rgba(0, 102, 204, 0.8) !important;
}
</style>
