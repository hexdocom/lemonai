<template>
  <div class="code-panel-container">
    <div class="code-panel-header">
      <h3 class="code-panel-title">
        <i class="fas fa-code mr-2"></i>
        HTML 代码
      </h3>
      <p class="code-panel-subtitle">在此编辑代码将实时同步到预览区域</p>
    </div>
    <div class="code-panel-content">
      <a-textarea ref="codeEditorRef" v-model:value="currentContent" @input="handleInput" class="code-editor" placeholder="HTML 代码将显示在这里..." :autoSize="false" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  htmlContent: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["sync-from-code"]);

const codeEditorRef = ref(null);

const currentContent = ref("");

// 初始化内容
currentContent.value = props.htmlContent;

const handleInput = (e) => {
  const newValue = e.target.value;
  currentContent.value = newValue;
  console.log("代码面板输入变化:", newValue?.substring(0, 100) + "...");
  emit("sync-from-code", newValue);
};

// 监听 htmlContent 变化，同步到本地状态
watch(
  () => props.htmlContent,
  (newContent) => {
    if (newContent !== currentContent.value) {
      currentContent.value = newContent;
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.code-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 400px;
  background: white;
  border-left: 1px solid #e5e7eb;
}

.code-panel-header {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.code-panel-title {
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
  margin: 0;
}

.code-panel-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

.code-panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-height: 0; // 重要：允许flex子元素收缩
}

.code-editor {
  flex: 1;
  font-family: "SF Mono", "Monaco", "Menlo", "Consolas", "Ubuntu Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fafafa;
  padding: 12px;
  resize: none;
  word-wrap: break-word;
  white-space: pre-wrap;

  // 确保textarea可以滚动
  overflow-y: auto;
  overflow-x: auto;

  &:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background: white;
  }

  &::placeholder {
    color: #9ca3af;
    font-style: italic;
  }

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }
}

// 覆盖Ant Design的样式
:deep(.ant-input) {
  font-family: "SF Mono", "Monaco", "Menlo", "Consolas", "Ubuntu Mono", monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  height: 100% !important;
  border: 1px solid #d1d5db !important;
  border-radius: 8px !important;
  background: #fafafa !important;

  &:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    background: white !important;
  }
}

.fas {
  font-size: 14px;
  color: #3b82f6;
}
</style>
