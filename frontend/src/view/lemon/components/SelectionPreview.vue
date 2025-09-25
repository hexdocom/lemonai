<template>
  <transition name="preview-slide">
    <div v-if="showSelectionPreview && selectedScreenshot && editorMode === 'ai-edit'" class="selection-preview">
      <div class="preview-header">
        <div class="preview-title">
          <i class="fas fa-crosshairs"></i>
          <span>Selected</span>
          <a-tag size="small" color="blue">{{ selectedElementTag }}</a-tag>
        </div>
        <a-button type="text" size="small" @click="handleClose" class="close-btn">
          <CloseOutlined />
        </a-button>
      </div>

      <div class="preview-content">
        <div class="preview-image-container">
          <img :src="selectedScreenshot" alt="Selected element preview" class="preview-image" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useEditorStore } from "@/store/modules/editor";
import { CloseOutlined } from "@ant-design/icons-vue";

const editorStore = useEditorStore();
const { editorMode, selectedElement, selectedScreenshot, showSelectionPreview } = storeToRefs(editorStore);

// 计算选中元素的标签
const selectedElementTag = computed(() => {
  if (!selectedElement.value) return "";
  const tag = selectedElement.value.tagName?.toLowerCase() || "";
  const id = selectedElement.value.id ? `#${selectedElement.value.id}` : "";
  const className = selectedElement.value.className ? `.${selectedElement.value.className.split(" ")[0]}` : "";
  return `${tag}${id}${className}`;
});

// 关闭预览
const handleClose = () => {
  editorStore.setShowSelectionPreview(false);
};
</script>

<style lang="scss" scoped>
.selection-preview {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center; // 这里已经设置了垂直居中
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;

  i {
    color: #1890ff;
  }
}

.close-btn {
  color: #999;
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 4px !important;

  &:hover {
    color: #333;
  }
}

.preview-content {
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image-container {
  display: inline-block;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.preview-image {
  display: block;
  max-width: 100%;
  max-height: 180px;
  width: auto;
  height: auto;
  object-fit: contain;
  background: #f5f5f5;
}

// 过渡动画
.preview-slide-enter-active,
.preview-slide-leave-active {
  transition: all 0.3s ease;
}

.preview-slide-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.preview-slide-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .selection-preview {
    margin-bottom: 8px;
  }

  .preview-header {
    padding: 8px 12px;
  }

  .preview-content {
    padding: 12px;
  }

  .preview-image {
    max-height: 150px;
  }

  .preview-actions {
    padding: 8px 12px;

    button {
      flex: 1;
    }
  }
}
</style>
