<template>
  <div v-if="visible" class="edit-input-container" :style="containerStyle" @click.stop>
    <input ref="editInputRef" v-model="editRequest" class="edit-input" placeholder="输入修改需求..." @keydown.enter="handleSend" @keydown.esc="handleCancel" :disabled="loading" />
    <button class="send-button" @click="handleSend" :disabled="!editRequest.trim() || loading" :class="{ loading: loading }">
      <span v-if="!loading" class="send-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"
          />
        </svg>
      </span>
      <span v-else class="loading-spinner"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, inject } from "vue";
import { useRoute } from "vue-router";
import instance from "@/utils/http";
import { message } from "ant-design-vue";

const route = useRoute();

const path = inject("path");

const props = defineProps({
  // 是否显示
  visible: {
    type: Boolean,
    default: false,
  },
  // 选中元素
  selectedElement: {
    type: Object,
    default: null,
  },
  // 位置信息
  position: {
    type: Object,
    default: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  },
  // iframe元素引用
  iframeElement: {
    type: HTMLIFrameElement,
    default: null,
  },
});

const emit = defineEmits(["modified", "cancel", "refresh"]);

// 输入框引用
const editInputRef = ref(null);
const editRequest = ref("");
const loading = ref(false);

// 计算容器样式
const containerStyle = computed(() => {
  const { top, left, width, height } = props.position;

  // 设置容器宽度，最小 280px
  const containerWidth = Math.max(width, 280);

  // 获取 iframe 的尺寸作为边界
  const iframeRect = props.iframeElement?.getBoundingClientRect();
  const maxWidth = iframeRect?.width || window.innerWidth;
  const maxHeight = iframeRect?.height || window.innerHeight;

  // 输入框高度（包括padding和border）
  const inputHeight = 44; // 根据样式计算得出
  const margin = 8; // 距离元素的间距

  // 计算水平位置
  let finalLeft = left + (width - containerWidth) / 2; // 默认居中对齐

  // 确保不超出左边界
  if (finalLeft < margin) {
    finalLeft = margin;
  }

  // 确保不超出右边界
  if (finalLeft + containerWidth > maxWidth - margin) {
    finalLeft = maxWidth - containerWidth - margin;
  }

  // 计算垂直位置
  let finalTop = top + height + margin; // 默认在元素下方
  let placement = "bottom"; // 记录放置位置

  // 检查下方空间是否足够
  const bottomSpace = maxHeight - (top + height);
  const topSpace = top;

  // 如果下方空间不足但上方空间足够，则显示在上方
  if (bottomSpace < inputHeight + margin * 2 && topSpace > inputHeight + margin * 2) {
    finalTop = top - inputHeight - margin;
    placement = "top";
  }

  // 如果上下都不够，选择空间较大的一侧，并调整到可视区域内
  if (bottomSpace < inputHeight + margin * 2 && topSpace < inputHeight + margin * 2) {
    if (bottomSpace >= topSpace) {
      // 使用下方，但确保不超出底部
      finalTop = Math.min(top + height + margin, maxHeight - inputHeight - margin);
    } else {
      // 使用上方，但确保不超出顶部
      finalTop = Math.max(margin, top - inputHeight - margin);
    }
  }

  return {
    position: "absolute",
    top: `${finalTop}px`,
    left: `${finalLeft}px`,
    width: `${containerWidth}px`,
    // 添加数据属性用于调试
    "data-placement": placement,
  };
});

// 监听显示状态，自动聚焦
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      editRequest.value = "";
      nextTick(() => {
        editInputRef.value?.focus();
      });
    }
  }
);

// 取消编辑
const handleCancel = () => {
  editRequest.value = "";
  emit("cancel");
};

// 发送修改请求
const handleSend = async () => {
  if (!editRequest.value.trim() || loading.value) return;

  const request = editRequest.value.trim();
  loading.value = true;

  const conversation_id = route.params.id;
  const agent_id = route.params.agentId;

  try {
    // 获取选中元素的HTML和相关信息
    const elementHtml = props.selectedElement?.outerHTML || "";
    const elementInfo = {
      tagName: props.selectedElement?.tagName,
      id: props.selectedElement?.id,
      className: props.selectedElement?.className,
      innerHTML: props.selectedElement?.innerHTML,
    };

    // 调用AI编辑接口
    const options = {
      requirement: request,
      selection: elementHtml,
      conversation_id,
      filepath: path,
      element: elementInfo,
      agent_id: agent_id,
    };
    // const response = await instance.post("/api/agent/coding/ai", options);
    const response = await instance.post("/api/agent/coding/sse", options);
    console.log("response", response);

    if (response && response.status === "success") {
      message.success("修改成功");
      // 清空输入框
      editRequest.value = "";
      // 触发刷新事件，让父组件重新加载文件
      emit("refresh");
    } else {
      message.error(response.data?.message || "修改失败，请重试");
    }
  } catch (error) {
    console.error("Edit request failed:", error);
    message.error(error.response?.data?.message || "修改请求失败，请检查网络连接");
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.edit-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(59, 130, 246, 0.1);
  pointer-events: auto;
  z-index: 1000; // 提高 z-index 确保显示在其他元素上方
  animation: slideUp 0.2s ease;
  position: relative;

  // 添加指向箭头
  &::before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
  }

  // 根据放置位置使用不同的动画和箭头方向
  &[data-placement="top"] {
    animation: slideDown 0.2s ease;

    // 下方箭头
    &::before {
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 8px 8px 0 8px;
      border-color: #3b82f6 transparent transparent transparent;
    }

    &::after {
      content: "";
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 6px 6px 0 6px;
      border-color: white transparent transparent transparent;
    }
  }

  &[data-placement="bottom"] {
    animation: slideUp 0.2s ease;

    // 上方箭头
    &::before {
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 0 8px 8px 8px;
      border-color: transparent transparent #3b82f6 transparent;
    }

    &::after {
      content: "";
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 6px 6px 6px;
      border-color: transparent transparent white transparent;
    }
  }

  .edit-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #3b82f6;
    }

    &:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }
  }

  .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: #3b82f6;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #2563eb;
      transform: scale(1.1);
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    &.loading {
      background: #60a5fa;
    }

    .send-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
