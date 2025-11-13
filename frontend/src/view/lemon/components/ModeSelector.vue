<template>
  <div class="mode-selector-wrapper">
    <!-- 桌面端下拉框 -->
    <a-select
      v-if="!isMobile"
      :value="modelValue"
      class="mode-select-dropdown"
      :options="workModeOptions"
      @change="handleModeChange"
      :dropdownMatchSelectWidth="false"
      :bordered="false"
      :disabled="disabled"
    >
      <template #option="{ value, label }">
        <div class="mode-option">
          <!-- <span class="mode-circle">
            <span v-if="modelValue === value" class="mode-inner-circle" />
          </span> -->
          <div class="mode-texts">
            <div class="mode-label">{{ label }}</div>
          </div>
        </div>
      </template>
    </a-select>

    <!-- 移动端触发器 -->
    <div v-else class="mobile-mode-trigger" :class="{ 'disabled': disabled }" @click="handleClick">
      <span class="mode-name">{{ workModeOptions.find((opt) => opt.value === modelValue)?.label || "Auto" }}</span>
      <DownOutlined class="dropdown-icon" />
    </div>

    <!-- 移动端模式选择弹窗 -->
    <teleport to="body">
      <div v-if="showModeModal" class="mode-modal-overlay" @click="closeModeModal">
        <div class="mode-modal-content" @click.stop>
          <div class="modal-header">
            <h3>Mode</h3>
            <a-button type="text" @click="closeModeModal" class="close-btn">
              <CloseOutlined />
            </a-button>
          </div>
          <div class="option-list">
            <div v-for="option in workModeOptions" :key="option.value" class="option-item" :class="{ selected: option.value === modelValue }" @click="handleMobileModeSelect(option.value)">
              <div class="option-info">
                <span class="option-circle">
                  <span v-if="modelValue === option.value" class="option-inner-circle" />
                </span>
                <div class="option-texts">
                  <div class="option-label">{{ option.label }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Twins Mode Info Modal -->
    <a-modal v-model:open="showTwinsInfoModal" title="Twins Chat Mode" centered width="500px" :footer="null" @cancel="closeTwinsInfoModal">
      <div style="padding: 20px 0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <p style="font-weight: 500;">
            You need to create a new conversation task to use this feature
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a-button @click="closeTwinsInfoModal">Cancel</a-button>
          <a-button type="primary" @click="confirmTwinsMode">Create New Task</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DownOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { useChatStore } from '@/store/modules/chat';
import emitter from '@/utils/emitter';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'twins'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'modeChange']);

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

// 工作模式选项
const workModeOptions = [
  { value: 'twins', label: 'Twins Chat' },
  { value: 'task', label: 'Evolving Agent' },
  { value: 'chat', label: 'AI Chat' },
  { value: 'auto', label: 'Adaptive' }
];

// 移动端相关状态
const isMobile = ref(window.innerWidth <= 768); // 初始化时立即检测
const showModeModal = ref(false);
const showTwinsInfoModal = ref(false);

// 移动端检测
const checkMobile = () => {
  const newIsMobile = window.innerWidth <= 768;
  if (isMobile.value !== newIsMobile) {
    isMobile.value = newIsMobile;
  }
};

// 移动端弹窗控制函数
const handleClick = () => {
  console.log('handleClick triggered, disabled:', props.disabled, 'showModeModal before:', showModeModal.value);
  if (props.disabled) {
    console.log('Click blocked because disabled');
    return;
  }
  openModeModal();
};

const openModeModal = () => {
  console.log('openModeModal called');
  showModeModal.value = true;
  console.log('showModeModal after:', showModeModal.value);
};

const closeModeModal = () => {
  const modalSelector = document.querySelector(".mode-modal-content");
  if (modalSelector) {
    modalSelector.classList.add("closing");
  }
  setTimeout(() => {
    showModeModal.value = false;
  }, 250);
};

// twins模式相关方法
const closeTwinsInfoModal = () => {
  showTwinsInfoModal.value = false;
  // 切回之前选择的模式
  const previousMode = localStorage.getItem("workMode");
  if (previousMode) {
    emit('update:modelValue', previousMode);
  }
};

const confirmTwinsMode = () => {
  emit('update:modelValue', 'twins');
  localStorage.setItem("workMode", 'twins');
  showTwinsInfoModal.value = false;

  closeOtherWindows();
  chatStore.conversationId = null;
  chatStore.clearMessages();
  router.push(`/lemon/${route.params.agentId}`);
};

const closeOtherWindows = () => {
  emitter.emit('preview-close', false);
  emitter.emit('terminal-visible', false);
  emitter.emit('fullPreviewVisable-close');
};

// 处理模式切换
const handleModeChange = (mode) => {
  console.log("handleModeChange called with mode:", mode);
  console.log("Current chat state:", {
    twins_id: chatStore.chat?.twins_id,
    messagesLength: chatStore.messages.length
  });

  // 如果当前对话有 twins_id，禁止切换到非 twins 模式
  const currentHasTwinsId = chatStore.chat?.twins_id && chatStore.twinsChatMessages.length > 0;
  if (currentHasTwinsId && mode !== 'twins') {
    console.log("当前对话有 twins_id，不能切换到其他模式");
    return;
  }

  // 如果当前对话没有 twins_id 但有普通消息，禁止切换到 twins 模式
  if (mode === 'twins' && !chatStore.chat?.twins_id && chatStore.messages.length > 0) {
    console.log("当前对话没有 twins_id 但有消息，不能切换到 twins 模式");
    showTwinsInfoModal.value = true;
    return;
  }

  console.log("工作模式切换为:", mode);
  emit('update:modelValue', mode);
  emit('modeChange', mode);
  // updateWorkMode 请触发一下 emitter
  emitter.emit('updateWorkMode', mode);
  // 保存到浏览器缓存
  localStorage.setItem("workMode", mode);
};

// 移动端选项选择处理
const handleMobileModeSelect = (mode) => {
  handleModeChange(mode);
  closeModeModal();
};

// 生命周期
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<style scoped>
.mode-selector-wrapper {
  display: flex;
  align-items: center;
  pointer-events: auto;
  position: relative;
}

.mobile-mode-trigger {
  pointer-events: auto !important;
  cursor: pointer !important;
}
</style>

<style>
/* 模式选择下拉框样式 */
.mode-select-dropdown .ant-select-selector {
  border: 1px solid #e9ecef !important;
  border-radius: 6px !important;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

.mode-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-radius: 50%;
  margin-top: 3px;
  position: relative;
}

.mode-inner-circle {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 8px;
  height: 8px;
  background-color: #333;
  border-radius: 50%;
}

.mode-texts {
  display: flex;
  flex-direction: column;
}

.mode-label {
  font-size: 14px;
  font-weight: 500;
}

/* 移动端触发器样式 */
.mobile-mode-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 24px;
  padding: 0 2px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  pointer-events: auto;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.mobile-mode-trigger:active {
  background: #f5f5f5;
}

.mobile-mode-trigger.disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: #f5f5f5;
  color: #999;
  pointer-events: none;
}

.mobile-mode-trigger .mode-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 2px;
  max-width: 45px;
  pointer-events: none;
}

.mobile-mode-trigger .dropdown-icon {
  font-size: 8px;
  color: #999;
  pointer-events: none;
}

/* 移动端自定义模态框样式 */
.mode-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 10001;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

/* 移动端模态框内容样式 */
.mode-modal-content {
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0;
  max-height: 50vh;
  min-height: 200px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUpIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.mode-modal-content.closing {
  animation: slideDownOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  padding: 4px !important;
  color: #999 !important;
}

.option-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option-item:hover {
  background-color: #f5f5f5;
}

.option-item.selected {
  background-color: #e6f7ff;
}

.option-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.option-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-radius: 50%;
  margin-top: 3px;
  position: relative;
  flex-shrink: 0;
}

.option-inner-circle {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 8px;
  height: 8px;
  background-color: #333;
  border-radius: 50%;
}

.option-texts {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 动画关键帧 */
@keyframes slideUpIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideDownOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/** 适配移动设备屏幕 */
@media (max-width: 768px) {
  .mode-selector-wrapper .mode-select-dropdown {
    height: 24px;
    font-size: 10px;
  }

  .mode-selector-wrapper .mode-select-dropdown .ant-select-selection-item {
    font-size: 10px !important;
    padding-inline-end: 0px !important;
    line-height: 24px !important;
  }

  .mode-selector-wrapper .mode-select-dropdown .ant-select-selector {
    padding: 0px 2px !important;
    height: 24px !important;
  }

  .mode-selector-wrapper .mode-select-dropdown .ant-select-arrow {
    display: none !important;
  }
}


.mode-label{
  line-height: 20px;
  color: rgba(79,79,79,1);
  font-size: 14px;
  text-align: left;
  font-family: PingFangSC-regular;
  }
</style>
