<template>
  <div class="chat-messages" ref="chatMessagesRef">
    <div class="message-list">
      <!-- 自动判断是否显示骨架屏 -->
      <!-- {{ chat }} -->
      <div v-if="isLoading">
        <a-skeleton v-for="n in 5" :key="n" active title class="skeleton-message" />
      </div>
      <div class="message-piece">
        <!-- 非 Twins 模式：正常单栏显示 -->
        <div v-if="!isTwins">
          <template v-if="!isLoading">
            <div v-for="message in messages" :key="message.id" class="message-item" :class="message.role">
              <div style="display: flex; align-items: center; justify-content: flex-end" v-if="message?.meta?.screenshot || message?.meta?.json?.screenshot">
                <ChatReference :meta="message?.meta?.json || message?.meta" />
              </div>
              <div class="message-options" v-if="!isPlanOrUpdateStatus(message)">
                <div v-if="message.role === 'assistant'" class="message-title">
                  <img src="@/assets/image/lemon.jpg" alt="" />
                  <!-- LemonAI -->
                </div>
                <div v-else></div>

                <div style="display: flex; align-items: center; justify-content: flex-end">
                  <div class="message-time display-none">
                    {{ formatTimeWithHMS(message.timestamp, t) }}
                  </div>
                  <div class="copy-button display-none" @click="copyMessage(message)" v-if="message.role === 'user'">
                    <CopyOutlined />
                  </div>
                </div>
              </div>
              <Message :message="message" />
            </div>
          </template>
        </div>

        <!-- Twins 模式：双栏水平展示 -->
        <template v-else-if="!isLoading">
          <!-- 双栏模式 -->
          <div v-if="isLeftColumnVisible && isRightColumnVisible" class="twins-container both-visible">
            <!-- 左栏：Chat 消息 -->
            <div class="twins-column-wrapper">
              <div class="twins-column chat-column" ref="chatColumnRef">
                <div class="column-header">
                  <span><strong>Chat</strong> <span class="description">get an answer from LLM</span></span>
                  <a-switch :checked="isLeftColumnVisible" @change="toggleLeftColumn" size="small" />
                </div>
                <div class="column-content">
                  <!-- {{ twinsChatMessages }} -->
                  <div v-for="chatMessage in twinsChatMessages" :key="chatMessage.id" class="message-item" :class="chatMessage.role">
                    <div style="display: flex; align-items: center; justify-content: flex-end" v-if="chatMessage?.meta?.screenshot || chatMessage?.meta?.json?.screenshot">
                      <ChatReference :meta="chatMessage?.meta?.json || chatMessage?.meta" />
                    </div>
                    <div class="message-options" v-if="!isPlanOrUpdateStatus(chatMessage)">
                      <div v-if="chatMessage.role === 'assistant'" class="message-title">
                        <img src="@/assets/image/lemon.jpg" alt="" />
                      </div>
                      <div v-else></div>

                      <div style="display: flex; align-items: center; justify-content: flex-end">
                        <div class="message-time display-none">
                          {{ formatTimeWithHMS(chatMessage.timestamp, t) }}
                        </div>
                        <div class="copy-button display-none" @click="copyMessage(chatMessage)" v-if="chatMessage.role === 'user'">
                          <CopyOutlined />
                        </div>
                      </div>
                    </div>
                    <Message :message="chatMessage" />
                  </div>
                </div>
              </div>
              <!-- 单栏模式左栏 Token consumption display -->
              <div v-if="chatTokenCount && chatTokenCount.total > 0" class="token-consumption twins-token-left">
                <a-tag>
                  <span>Chat Tokens: {{ chatTokenCount.total }}</span>
                  <span> <ArrowUpOutlined /> {{ chatTokenCount.input_tokens }} </span>
                  <span> <ArrowDownOutlined /> {{ chatTokenCount.output_tokens }} </span>
                </a-tag>
              </div>
              <!-- 左栏滚动到底部按钮 -->
              <div class="column-scroll-to-bottom" @click="scrollToBottomLeft" v-if="isLeftColumnVisible">
                <Down />
              </div>
            </div>

            <!-- 右栏：Agent 消息 -->
            <div class="twins-column-wrapper">
              <div class="twins-column agent-column" ref="agentColumnRef">
                <div class="column-header">
                  <span><strong>Agent</strong> <span class="description">get an answer from agentic with tools</span></span>
                  <a-switch :checked="isRightColumnVisible" @change="toggleRightColumn" size="small" />
                </div>
                <!-- {{ messages }} -->
                <div class="column-content">
                  <div v-for="message in messages" :key="message.id" class="message-item" :class="message.role">
                    <div style="display: flex; align-items: center; justify-content: flex-end" v-if="message?.meta?.screenshot || message?.meta?.json?.screenshot">
                      <ChatReference :meta="message?.meta?.json || message?.meta" />
                    </div>
                    <div class="message-options" v-if="!isPlanOrUpdateStatus(message)">
                      <div v-if="message.role === 'assistant'" class="message-title">
                        <img src="@/assets/image/lemon.jpg" alt="" />
                      </div>
                      <div v-else></div>

                      <div style="display: flex; align-items: center; justify-content: flex-end">
                        <div class="message-time display-none">
                          {{ formatTimeWithHMS(message.timestamp, t) }}
                        </div>
                        <div class="copy-button display-none" @click="copyMessage(message)" v-if="message.role === 'user'">
                          <CopyOutlined />
                        </div>
                      </div>
                    </div>
                    <Message :message="message" />
                  </div>
                </div>
              </div>
              <!-- 单栏模式右栏 Token consumption display -->
              <div v-if="agentTokenCount && agentTokenCount.total > 0" class="token-consumption twins-token-right">
                <a-tag>
                  <span v-if="chatStore.chat.model_name">Model: {{ chatStore.chat.model_name }}</span>
                  <span>Agent Tokens: {{ agentTokenCount.total }}</span>
                  <span> <ArrowUpOutlined /> {{ agentTokenCount.input_tokens }} </span>
                  <span> <ArrowDownOutlined /> {{ agentTokenCount.output_tokens }} </span>
                </a-tag>
              </div>
              <!-- 右栏滚动到底部按钮 -->
              <div class="column-scroll-to-bottom" @click="scrollToBottomRight" v-if="isRightColumnVisible">
                <Down />
              </div>
            </div>
          </div>

          <!-- 单栏模式：只显示左栏 (Chat) -->
          <div v-else-if="isLeftColumnVisible" class="twins-container single-column">
            <div class="twins-column-wrapper">
              <div class="twins-column chat-column" ref="chatColumnRef">
                <div class="column-header merged-header">
                  <div class="header-section">
                    <span><strong>Chat</strong> <span class="description">get an answer from LLM</span></span>
                    <a-switch :checked="isLeftColumnVisible" @change="toggleLeftColumn" size="small" />
                  </div>
                  <div class="header-section">
                    <span class="inactive-title"><strong>Agent</strong> <span class="description">get an answer from agentic with tools</span></span>
                    <a-switch :checked="isRightColumnVisible" @change="toggleRightColumn" size="small" />
                  </div>
                </div>
                <div class="column-content">
                  <!-- {{ twinsChatMessages }} -->
                  <div v-for="chatMessage in twinsChatMessages" :key="chatMessage.id" class="message-item" :class="chatMessage.role">
                    <div style="display: flex; align-items: center; justify-content: flex-end" v-if="chatMessage?.meta?.screenshot || chatMessage?.meta?.json?.screenshot">
                      <ChatReference :meta="chatMessage?.meta?.json || chatMessage?.meta" />
                    </div>
                    <div class="message-options" v-if="!isPlanOrUpdateStatus(chatMessage)">
                      <div v-if="chatMessage.role === 'assistant'" class="message-title">
                        <img src="@/assets/image/lemon.jpg" alt="" />
                      </div>
                      <div v-else></div>

                      <div style="display: flex; align-items: center; justify-content: flex-end">
                        <div class="message-time display-none">
                          {{ formatTimeWithHMS(chatMessage.timestamp, t) }}
                        </div>
                        <div class="copy-button display-none" @click="copyMessage(chatMessage)" v-if="chatMessage.role === 'user'">
                          <CopyOutlined />
                        </div>
                      </div>
                    </div>
                    <Message :message="chatMessage" />
                  </div>
                </div>
              </div>
              <!-- 左栏 Token consumption display -->
              <div v-if="chatTokenCount && chatTokenCount.total > 0" class="token-consumption twins-token-left">
                <a-tag>
                  <span>Chat Tokens: {{ chatTokenCount.total }}</span>
                  <span> <ArrowUpOutlined /> {{ chatTokenCount.input_tokens }} </span>
                  <span> <ArrowDownOutlined /> {{ chatTokenCount.output_tokens }} </span>
                </a-tag>
              </div>
              <!-- 左栏滚动到底部按钮 -->
              <div class="column-scroll-to-bottom" @click="scrollToBottomLeft" v-if="isLeftColumnVisible">
                <Down />
              </div>
            </div>
          </div>

          <!-- 单栏模式：只显示右栏 (Agent) -->
          <div v-else class="twins-container single-column">
            <div class="twins-column-wrapper">
              <div class="twins-column agent-column" ref="agentColumnRef">
                <div class="column-header merged-header">
                  <div class="header-section">
                    <span class="inactive-title"><strong>Chat</strong> <span class="description">get an answer from LLM</span></span>
                    <a-switch :checked="isLeftColumnVisible" @change="toggleLeftColumn" size="small" />
                  </div>
                  <div class="header-section">
                    <span><strong>Agent</strong> <span class="description">get an answer from agentic with tools</span></span>
                    <a-switch :checked="isRightColumnVisible" @change="toggleRightColumn" size="small" />
                  </div>
                </div>
                <div class="column-content">
                  <div v-for="message in messages" :key="message.id" class="message-item" :class="message.role">
                    <div style="display: flex; align-items: center; justify-content: flex-end" v-if="message?.meta?.screenshot || message?.meta?.json?.screenshot">
                      <ChatReference :meta="message?.meta?.json || message?.meta" />
                    </div>
                    <div class="message-options" v-if="!isPlanOrUpdateStatus(message)">
                      <div v-if="message.role === 'assistant'" class="message-title">
                        <img src="@/assets/image/lemon.jpg" alt="" />
                      </div>
                      <div v-else></div>

                      <div style="display: flex; align-items: center; justify-content: flex-end">
                        <div class="message-time display-none">
                          {{ formatTimeWithHMS(message.timestamp, t) }}
                        </div>
                        <div class="copy-button display-none" @click="copyMessage(message)" v-if="message.role === 'user'">
                          <CopyOutlined />
                        </div>
                      </div>
                    </div>
                    <Message :message="message" />
                  </div>
                </div>
              </div>
              <!-- 右栏 Token consumption display -->
              <div v-if="agentTokenCount && agentTokenCount.total > 0" class="token-consumption twins-token-right">
                <a-tag>
                  <span v-if="chatStore.chat.model_name">Model: {{ chatStore.chat.model_name }}</span>
                  <span>Agent Tokens: {{ agentTokenCount.total }}</span>
                  <span> <ArrowUpOutlined /> {{ agentTokenCount.input_tokens }} </span>
                  <span> <ArrowDownOutlined /> {{ agentTokenCount.output_tokens }} </span>
                </a-tag>
              </div>
              <!-- 右栏滚动到底部按钮 -->
              <div class="column-scroll-to-bottom" @click="scrollToBottomRight" v-if="isRightColumnVisible">
                <Down />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Token consumption display - 非 twins 模式 -->
    <div v-if="!isTwins && tokenCount && tokenCount.total > 0" class="token-consumption">
      <a-tag>
        <span v-if="chatStore.chat.model_name">Model: {{ chatStore.chat.model_name }}</span>
        <span>Tokens: {{ tokenCount.total }}</span>
        <span> <ArrowUpOutlined /> {{ tokenCount.input_tokens }} </span>
        <span> <ArrowDownOutlined /> {{ tokenCount.output_tokens }} </span>
      </a-tag>
    </div>
  </div>
</template>

<script setup>
import Message from "../message/index.vue";
import { CopyOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons-vue";
import Down from "@/assets/svg/down.svg";
import { message as messageUtil } from "ant-design-vue";
import { useChatStore } from "@/store/modules/chat";
import { useI18n } from "vue-i18n";
import { onMounted, onBeforeUnmount, computed, ref, nextTick, watch } from "vue";
import { formatTimeWithHMS } from "@/utils/time";
import ChatReference from "./ChatReference.vue";
import { storeToRefs } from "pinia";
import emitter from "@/utils/emitter";
const { t } = useI18n();
const chatStore = useChatStore();
const { chat } = storeToRefs(chatStore);

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  twinsChatMessages: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: "task",
  },
});

//判断当前是不是 twins 模式
const isTwins = computed(() => {
  try {
    // 优先根据 twinsChatMessages 判断，因为 twins_id 可能更新不及时
    return (props.twinsChatMessages && props.twinsChatMessages.length > 0) || (chat.value?.twins_id !== null && chat.value?.twins_id !== "" && chat.value?.twins_id);
  } catch (error) {
    console.warn("Error in isTwins computed:", error);
    return false;
  }
});

const chatMessagesRef = ref(null);
const chatColumnRef = ref(null);
const agentColumnRef = ref(null);

// 自动滚动状态管理
const leftAutoScrollEnabled = ref(true);
const rightAutoScrollEnabled = ref(true);

// 暴露到window对象以便store访问
if (typeof window !== "undefined") {
  window.twinsAutoScrollState = {
    isLeftEnabled: () => leftAutoScrollEnabled.value,
    isRightEnabled: () => rightAutoScrollEnabled.value,
    setLeftScrolling: (value) => {
      isAutoScrollingLeft.value = value;
    },
    setRightScrolling: (value) => {
      isAutoScrollingRight.value = value;
    },
  };
}

// 记录上一次滚动位置，用于检测滚动方向
let lastLeftScrollTop = 0;
let lastRightScrollTop = 0;

// 自动滚动标记，避免把自动滚动误判为用户滚动
const isAutoScrollingLeft = ref(false);
const isAutoScrollingRight = ref(false);

// 栏目显示开关状态
const isLeftColumnVisible = ref(true); // AI LLM 栏目开关
const isRightColumnVisible = ref(true); // AI Agent 栏目开关

// 存储事件监听器的引用，用于清理
const scrollListeners = {
  left: null,
  right: null,
};

// 开关切换函数，确保至少有一个栏目可见
const toggleLeftColumn = (value) => {
  if (value) {
    // 开启左栏
    isLeftColumnVisible.value = true;
  } else {
    // 关闭左栏，自动开启右栏
    isLeftColumnVisible.value = false;
    isRightColumnVisible.value = true;
  }
};

// 关闭其他窗口的函数
const closeOtherWindows = () => {
  emitter.emit("preview-close", false);
  emitter.emit("terminal-visible", false);
  emitter.emit("fullPreviewVisable-close");
};

const toggleRightColumn = (value) => {
  if (value) {
    // 开启右栏
    isRightColumnVisible.value = true;
  } else {
    // 关闭右栏，自动开启左栏
    isRightColumnVisible.value = false;
    isLeftColumnVisible.value = true;
    // 在twins模式下关闭Agent栏时，关闭预览弹窗
    if (isTwins.value) {
      closeOtherWindows();
    }
  }
};

const isTimedOut = ref(false);
// 自动判断是否加载中
const isLoading = computed(() => {
  return props.mode === "task" && props.messages.length === 0 && !isTimedOut.value;
});

// Agent 模式的 tokenCount (原有逻辑)
const agentTokenCount = computed(() => {
  const { input_tokens = 0, output_tokens = 0 } = chatStore.chat || {};
  return {
    input_tokens,
    output_tokens,
    total: input_tokens + output_tokens,
  };
});

// Chat 模式的 tokenCount (从 twinsConversationList 获取)
const chatTokenCount = computed(() => {
  if (!isTwins.value || !chatStore.chat.twins_id) {
    return { input_tokens: 0, output_tokens: 0, total: 0 };
  }

  const twinsInfo = chatStore.twinsConversationList[chatStore.chat.twins_id];
  return twinsInfo
    ? {
        input_tokens: twinsInfo.input_tokens,
        output_tokens: twinsInfo.output_tokens,
        total: twinsInfo.total,
      }
    : { input_tokens: 0, output_tokens: 0, total: 0 };
});

// 非 twins 模式使用原有逻辑
const tokenCount = computed(() => agentTokenCount.value);

const isPlanOrUpdateStatus = (message) => {
  return ["plan", "update_status", "stop", "error", "coding", "progress"].includes(message.meta?.action_type);
};

const copyMessage = (message) => {
  navigator.clipboard
    .writeText(message.content)
    .then(() => {
      messageUtil.success(t("lemon.message.copySuccess"));
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      messageUtil.error(t("lemon.message.copyError"));
    });
};

// 滚动到底部函数
const scrollToBottomLeft = () => {
  const leftColumn = chatColumnRef.value;
  if (!leftColumn) return;

  const columnContent = leftColumn.querySelector('.column-content');
  if (!columnContent) return;

  columnContent.scrollTop = columnContent.scrollHeight - columnContent.clientHeight;

  // 手动滚动到底部后启用自动滚动
  leftAutoScrollEnabled.value = true;
  console.log("Left auto scroll enabled - manual scroll to bottom");
};

const scrollToBottomRight = () => {
  const rightColumn = agentColumnRef.value;
  if (!rightColumn) return;

  const columnContent = rightColumn.querySelector('.column-content');
  if (!columnContent) return;

  columnContent.scrollTop = columnContent.scrollHeight - columnContent.clientHeight;

  // 手动滚动到底部后启用自动滚动
  rightAutoScrollEnabled.value = true;
  console.log("Right auto scroll enabled - manual scroll to bottom");
};

let debounceTimer;
const handleScroll = () => {
  const container = chatMessagesRef.value;
  if (!container) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 5;
    chatStore.isScrolledToBottom = isNearBottom;
  }, 100);
};

// 清理滚动监听器
const cleanupScrollListeners = () => {
  if (scrollListeners.left) {
    const leftColumn = document.querySelector('.twins-column.chat-column .column-content');
    if (leftColumn) {
      leftColumn.removeEventListener("scroll", scrollListeners.left);
    }
    scrollListeners.left = null;
  }
  if (scrollListeners.right) {
    const rightColumn = document.querySelector('.twins-column.agent-column .column-content');
    if (rightColumn) {
      rightColumn.removeEventListener("scroll", scrollListeners.right);
    }
    scrollListeners.right = null;
  }
};

// 设置 Twins 模式的滚动监听
const setupTwinsScrollListeners = () => {
    if (!isTwins.value) return;
    
    // 先清理旧的监听器
    cleanupScrollListeners();
    
    // 等待 DOM 更新后再查找元素
    nextTick(() => {
      try {
        const leftColumn = document.querySelector('.twins-column.chat-column .column-content');
        const rightColumn = document.querySelector('.twins-column.agent-column .column-content');

        console.log('setupTwinsScrollListeners', {
          leftColumn,
          rightColumn,
          isLeftVisible: isLeftColumnVisible.value,
          isRightVisible: isRightColumnVisible.value
        });


        if (leftColumn && isLeftColumnVisible.value) {
          const handleLeftScroll = () => {
            try {
              const currentScrollTop = leftColumn.scrollTop;
              const distanceFromBottom = leftColumn.scrollHeight - leftColumn.scrollTop - leftColumn.clientHeight;

              // 检测滚动方向 - 如果往上滚动就停止自动滚动
              if (currentScrollTop < lastLeftScrollTop && !isAutoScrollingLeft.value) {
                console.log('🔺 用户往上滚动了 (Left) - 禁用自动滚动');
                // 用户往上滚动，立即禁用自动滚动
                if (leftAutoScrollEnabled.value) {
                  leftAutoScrollEnabled.value = false;
                  console.log('Left auto scroll disabled - user scrolled up');
                }
              }

              // 更新上一次滚动位置
              lastLeftScrollTop = currentScrollTop;

              // 检查是否在底部，如果在底部则重新启用自动滚动
              if (distanceFromBottom <= 10 && !leftAutoScrollEnabled.value) {
                leftAutoScrollEnabled.value = true;
                console.log("Left auto scroll enabled - user at bottom");
              }
            } catch (error) {
              console.warn("Left scroll handler error:", error);
            }
          };

        scrollListeners.left = handleLeftScroll;
        leftColumn.addEventListener("scroll", handleLeftScroll, { passive: true });
        // 初始检查
        setTimeout(handleLeftScroll, 100);
      }

      if (rightColumn && isRightColumnVisible.value) {
        const handleRightScroll = () => {
          try {
            const currentScrollTop = rightColumn.scrollTop;
            const distanceFromBottom = rightColumn.scrollHeight - rightColumn.scrollTop - rightColumn.clientHeight;

            // 检测滚动方向 - 如果往上滚动就停止自动滚动
            if (currentScrollTop < lastRightScrollTop && !isAutoScrollingRight.value) {
              console.log("🔺 用户往上滚动了 (Right) - 禁用自动滚动");
              // 用户往上滚动，立即禁用自动滚动
              if (rightAutoScrollEnabled.value) {
                rightAutoScrollEnabled.value = false;
                console.log("Right auto scroll disabled - user scrolled up");
              }
            }

            // 更新上一次滚动位置
            lastRightScrollTop = currentScrollTop;

            // 检查是否在底部，如果在底部则重新启用自动滚动
            if (distanceFromBottom <= 10 && !rightAutoScrollEnabled.value) {
              rightAutoScrollEnabled.value = true;
              console.log("Right auto scroll enabled - user at bottom");
            }
          } catch (error) {
            console.warn("Right scroll handler error:", error);
          }
        };

        scrollListeners.right = handleRightScroll;
        rightColumn.addEventListener("scroll", handleRightScroll, { passive: true });
        // 初始检查
        setTimeout(handleRightScroll, 100);
      }
    } catch (error) {
      console.warn("setupTwinsScrollListeners error:", error);
    }
  });
};

onMounted(() => {
  setTimeout(() => {
    isTimedOut.value = true;
  }, 5000); // 5秒

  const container = chatMessagesRef.value;
  if (container) {
    container.addEventListener("scroll", handleScroll);
  }

  // 延迟设置监听器，确保 DOM 已渲染
  setTimeout(setupTwinsScrollListeners, 500);

  // 监听栏目显示状态变化，重新设置滚动监听
  watch([isLeftColumnVisible, isRightColumnVisible], () => {
    if (isTwins.value) {
      console.log("Column visibility changed, re-setting scroll listeners");
      setTimeout(setupTwinsScrollListeners, 100);
    }
  });

  // 监听会话变化，重置栏目显示状态
  watch(
    () => chat.value?.conversation_id,
    (newConversationId, oldConversationId) => {
      if (newConversationId !== oldConversationId && newConversationId) {
        console.log("Conversation changed, resetting column visibility");
        // 重置为默认状态
        isLeftColumnVisible.value = true;
        isRightColumnVisible.value = true;
      }
    }
  );
});

onBeforeUnmount(() => {
  const container = chatMessagesRef.value;
  if (container) {
    container.removeEventListener("scroll", handleScroll);
  }

  // 清理 twins 模式的滚动监听器
  cleanupScrollListeners();
});
</script>

<style lang="scss" scoped>
.message-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  display: flex;

  img {
    width: 24px;
    height: 24px;
    margin-right: 8px;
  }
}

.chat-messages {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 非 twins 模式下，message-list 需要滚动 */
.chat-messages:not(:has(.twins-container)) {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 20px;
}

.chat-messages:not(:has(.twins-container))::-webkit-scrollbar {
  display: none;
}

/* twins 模式下，overflow 由各个 column-content 控制 */
.chat-messages:has(.twins-container) {
  overflow: visible;
}

.message-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.message-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
.message-piece {
  display: flex;
  flex-direction: column;
  width: 100%;

  > div {
    width: 100%;
  }
}

/* Twins 双栏布局样式 */
.twins-container {
  display: flex;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.twins-column-wrapper {
  position: relative;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 0;
}

/* 当两个栏目都显示时，各占50% */
.twins-container.both-visible .twins-column-wrapper {
  flex: 1;
}

/* 单栏模式：占用全部空间 */
.twins-container.single-column .twins-column-wrapper {
  flex: 1;
  width: 100%;
}

/* 合并标题栏样式 */
.merged-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center;
  background: #f8f9fa;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  z-index: 1;
}

.header-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inactive-title {
  color: #999 !important;
  font-weight: 400 !important;
}

.description {
  font-weight: 400;
  color: #888;
  font-size: 12px;
  margin-left: 4px;
}

/* 移除旧的折叠样式，因为不再需要 */

.twins-column {
  width: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  max-height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.twins-column::-webkit-scrollbar {
  display: none; /* Chrome、Safari 和 Opera */
}

.column-header {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  z-index: 11;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 和 Edge */
}

.column-content::-webkit-scrollbar {
  display: none; /* Chrome、Safari 和 Opera */
}

.twins-column .message-item {
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.twins-column .message-item:last-child {
  border-bottom: none;
}

.column-scroll-to-bottom {
  position: absolute;
  bottom: 80px; /* 调整位置避免遮挡 tokens */
  right: 16px;
  border: 1px solid #0000000f;
  background: #fff;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0px 5px 16px 0px #00000014,
    0px 0px 1.25px 0px #00000014;
  z-index: 10;
}

.message-item {
  display: flex;
  flex-direction: column !important;
  gap: 2px;

  &.assistant {
    align-self: flex-start;
    width: 100%;
  }

  &.user {
    width: 100%;
    align-self: flex-end;
    align-items: flex-end;

    .message-content {
      background: #fff;
      border: 1px solid #0000000f;
      border-radius: 12px;
      color: #34322d;
      font-size: 16px;
      width: fit-content;
      max-width: 100%;
    }
  }

  &:hover {
    .message-options {
      .display-none {
        display: flex;
      }
    }
  }
}

.message-options {
  display: flex;
  flex-direction: row;
  color: #858481;
  font-size: 12px;
  align-items: center;
  gap: 2px;
  padding: 0px 12px;
  justify-content: space-between;
  height: 24px;

  .display-none {
    display: none;
  }

  .copy-button {
    right: 8px;
    bottom: 8px;
    width: 24px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #999;
    transition: color 0.2s;

    &:hover {
      color: #666;
    }

    .icon-copy {
      font-size: 16px;
    }
  }
}

.token-consumption {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
  color: #858481;
  background-color: #f9f9f9;
  margin: 8px 0;
}

:deep(.token-consumption .ant-tag) {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  font-family: "Courier New", Courier, monospace;
}

.skeleton-message {
  margin-bottom: 16px;
}

.reference {
  border: 1px solid #0000000f;
  border-radius: 8px;
  padding: 10px;
  display: inline-block;
  margin-bottom: 8px;
  max-width: 80%;
}
</style>
