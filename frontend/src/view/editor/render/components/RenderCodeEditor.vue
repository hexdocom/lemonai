<template>
  <div class="code-editor-container">
    <!-- 代码编辑器信息栏 -->
    <div class="editor-info-bar">
      <div class="info-left">
        <i class="fas fa-code text-green-500 mr-2"></i>
        <span class="font-medium text-gray-700">HTML Editor</span>
      </div>
      <div class="info-right">
        <a-space>
          <span class="text-sm text-gray-500"> lines: {{ lineCount }} | characters: {{ charCount }} </span>
          <a-button size="small" type="text" @click="formatCode" :loading="formatting">
            <template #icon>
              <i class="fas fa-magic mr-2"></i>
            </template>
            Format
          </a-button>
          <a-button size="small" type="text" @click="toggleWordWrap">
            <template #icon>
              <i class="fas fa-expand-arrows-alt mr-2"></i>
            </template>
            {{ wordWrap ? "Cancel Wrap" : "Auto Wrap" }}
          </a-button>
          <a-button size="small" type="text" @click="toggleTheme">
            <template #icon>
              <i :class="isDarkTheme ? 'fas fa-sun mr-2' : 'fas fa-moon mr-2'"></i>
            </template>
            {{ isDarkTheme ? "Light" : "Dark" }}
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 代码编辑区域 -->
    <div class="editor-content-wrapper">
      <Codemirror
        v-model="internalContent"
        placeholder="在此输入或粘贴 HTML 代码..."
        :style="{ height: '100%', width: '100%' }"
        :autofocus="true"
        :tab-size="2"
        :extensions="extensions"
        @change="handleChange"
        @ready="handleReady"
        ref="cmRef"
      />
    </div>

    <!-- 底部状态栏 -->
    <div class="editor-status-bar">
      <div class="status-left">
        <span class="text-xs text-gray-500"> HTML | UTF-8 | {{ cursorLine }}:{{ cursorColumn }} </span>
      </div>
      <div class="status-right">
        <a-space size="small">
          <span v-if="hasUnsavedChanges" class="text-xs text-orange-500">
            <i class="fas fa-circle mr-1"></i>
            未保存
          </span>
          <span class="text-xs text-gray-500"> 最后修改: {{ lastModified }} </span>
        </a-space>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { Codemirror } from "vue-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

const props = defineProps({
  htmlContent: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["content-change"]);

// 响应式状态
const cmRef = ref(null);
const internalContent = ref("");
const wordWrap = ref(false);
const formatting = ref(false);
const hasUnsavedChanges = ref(false);
const lastModified = ref("");
const cursorLine = ref(1);
const cursorColumn = ref(1);
const isDarkTheme = ref(true);

// 计算属性
const lineCount = computed(() => {
  return Math.max(1, internalContent.value.split("\n").length);
});

const charCount = computed(() => {
  return internalContent.value.length;
});

// 自定义亮色主题
const lightTheme = EditorView.theme({
  "&": {
    color: "#374151",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    fontFamily: "'Monaco', 'Consolas', 'Ubuntu Mono', monospace",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#f6c82c",
    padding: "16px",
    minHeight: "400px", // 增加最小高度以确保有足够空间
  },
  ".cm-editor": {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
    maxHeight: "100%",
  },
  ".cm-focused": {
    outline: "none",
    borderColor: "#f6c82c",
  },
  ".cm-gutters": {
    backgroundColor: "#f9fafb",
    color: "#9ca3af",
    border: "none",
    borderRight: "1px solid #e5e7eb",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(246, 200, 44, 0.1)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(246, 200, 44, 0.2)",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(246, 200, 44, 0.3)",
  },
});

// 暗色主题扩展
const darkTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    fontFamily: "'Monaco', 'Consolas', 'Ubuntu Mono', monospace",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#f6c82c",
    padding: "16px",
    minHeight: "400px", // 增加最小高度以确保有足够空间
  },
  ".cm-editor": {
    border: "1px solid #374151",
    borderRadius: "8px",
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
    maxHeight: "100%",
  },
  ".cm-focused": {
    outline: "none",
    borderColor: "#f6c82c",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(246, 200, 44, 0.1)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(246, 200, 44, 0.2)",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(246, 200, 44, 0.3)",
  },
});

// 编辑器扩展配置
const extensions = computed(() => {
  const baseExtensions = [
    html(),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        updateCursorPosition();
      }
    }),
  ];

  if (wordWrap.value) {
    baseExtensions.push(EditorView.lineWrapping);
  }

  if (isDarkTheme.value) {
    baseExtensions.push(oneDark, darkTheme);
  } else {
    baseExtensions.push(lightTheme);
  }

  return baseExtensions;
});

// 更新最后修改时间
const updateLastModified = () => {
  const now = new Date();
  lastModified.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// 初始化内容
watch(
  () => props.htmlContent,
  (newContent) => {
    if (newContent !== internalContent.value) {
      internalContent.value = newContent;
      hasUnsavedChanges.value = false;
      updateLastModified();
    }
  },
  { immediate: true }
);

// CodeMirror 内容变化处理
const handleChange = (value) => {
  internalContent.value = value;
  hasUnsavedChanges.value = true;
  updateLastModified();

  // 防抖发射事件
  clearTimeout(handleChange.timer);
  handleChange.timer = setTimeout(() => {
    emit("content-change", value);
    hasUnsavedChanges.value = false;
  }, 1000);
};

// 编辑器准备就绪
const handleReady = (payload) => {
  console.log("CodeMirror ready:", payload);
};

// 更新光标位置
const updateCursorPosition = () => {
  if (!cmRef.value) return;

  try {
    const view = cmRef.value.view;
    if (view) {
      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.head);
      cursorLine.value = line.number;
      cursorColumn.value = selection.head - line.from + 1;
    }
  } catch (error) {
    console.log("Failed to update cursor position:", error);
  }
};

// 切换自动换行
const toggleWordWrap = () => {
  wordWrap.value = !wordWrap.value;
};

// 切换主题
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
};

// 格式化代码
const formatCode = async () => {
  formatting.value = true;
  try {
    // 简单的HTML格式化
    let formatted = internalContent.value;

    // 移除多余空白
    formatted = formatted.replace(/>\s+</g, "><");

    // 添加换行和缩进
    let indentLevel = 0;
    const lines = [];
    const tokens = formatted.match(/<\/?[^>]+>|[^<]+/g) || [];

    for (const token of tokens) {
      if (token.startsWith("</")) {
        indentLevel = Math.max(0, indentLevel - 1);
        lines.push("  ".repeat(indentLevel) + token.trim());
      } else if (token.startsWith("<") && !token.endsWith("/>")) {
        lines.push("  ".repeat(indentLevel) + token.trim());
        if (!token.match(/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i)) {
          indentLevel++;
        }
      } else {
        const trimmed = token.trim();
        if (trimmed) {
          lines.push("  ".repeat(indentLevel) + trimmed);
        }
      }
    }

    internalContent.value = lines.join("\n");
    handleChange(internalContent.value);
  } catch (error) {
    console.error("格式化失败:", error);
  } finally {
    formatting.value = false;
  }
};

// 组件挂载
onMounted(() => {
  updateLastModified();

  // 添加窗口失焦事件，自动保存
  const handleBeforeUnload = (event) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault();
      event.returnValue = "有未保存的更改，确定要离开吗？";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });
});
</script>

<style lang="scss" scoped>
.code-editor-container {
  height: 100%;
  max-height: 100vh; // 限制最大高度为视窗高度
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden; // 防止容器滚动
}

.editor-info-bar {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;

  .info-left {
    display: flex;
    align-items: center;
    font-size: 13px;
    color: #374151;
  }

  .info-right {
    :deep(.ant-btn) {
      color: #6b7280;
      border-color: transparent;

      &:hover {
        color: #f6c82c;
        background: rgba(246, 200, 44, 0.1);
        border-color: transparent;
      }
    }
  }
}

.editor-content-wrapper {
  flex: 1;
  min-height: 0; // 重要：允许flex子元素收缩
  overflow: hidden;

  :deep(.vue-codemirror) {
    height: 100%;
    overflow: hidden;
  }

  :deep(.cm-editor) {
    height: 100%;
    border: none !important;
    border-radius: 0 !important;
    overflow: hidden;
  }

  :deep(.cm-scroller) {
    font-family: "Monaco", "Consolas", "Ubuntu Mono", monospace;
    height: 100%;
    overflow: auto; // 确保编辑器内部可滚动
    max-height: calc(100vh - 200px); // 限制最大高度，留出工具栏和状态栏空间
  }

  :deep(.cm-content) {
    min-height: 100%;
    padding: 16px;
  }
}

.editor-status-bar {
  background: #f6c82c;
  padding: 4px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  font-size: 12px;
  color: #ffffff;
}

// 响应式设计
@media (max-width: 768px) {
  .editor-info-bar {
    padding: 6px 12px;

    .info-right {
      display: none; // 在小屏幕上隐藏工具按钮
    }
  }
}
</style>
