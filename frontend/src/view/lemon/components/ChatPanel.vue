<template>
  <div class="chat-panel">
    <!-- 通过 route.params.id来渲染聊天框-->
    <template v-if="!conversationId">
      <WelcomeView class="welcome" :agentId="agentId" />
    </template>
    <template v-else>
      <div class="chat-panel-content">
        <ChatHeader :title="currentChat?.title" :conversationId="conversationId" @share="handleShare" />
        <ChatMessages :messages="messages" :twinsChatMessages="twinsChatMessages" :mode="mode" />
        <ChatInput @send="handleSendMessage" />
        <!-- 非 Twins 模式的滚动到底部按钮 -->
        <div class="scroll-to-bottom" @click="scrollToBottom" v-if="isShowScrollToBottom && !isTwins">
          <Down />
        </div>

        <!-- Twins 模式的双栏滚动到底部按钮会在 ChatMessages 组件内部渲染 -->
        <!-- 拟态框  文件资源预览-->
        <!-- <fullPreview/> -->
      </div>
    </template>
    <fileClass />
  </div>
  <!-- 实时预览文件-->
  <Preview class="preview" />
  <!--本地预览文件-->
  <LocalPreview class="preview" />
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from "vue";
import ChatHeader from "./ChatHeader.vue";
import ChatMessages from "./ChatMessages.vue";
import Preview from "@/components/preview/index.vue";
import LocalPreview from "@/components/preview/fullPreview.vue";
import ChatInput from "./ChatInput.vue";
import seeAgent from "@/services/see-agent";
import { useChatStore } from "@/store/modules/chat";
import fullPreview from "@/components/preview/fullPreview.vue";
import Down from "@/assets/svg/down.svg";
import fileClass from "@/components/preview/fileClass.vue";
const chatStore = useChatStore();
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
const route = useRoute();
import WelcomeView from "@/view/welcome/WelcomeView.vue";
import chat from "@/utils/chat";
const { chatInfo, mode } = storeToRefs(chatStore);

// 编辑器 coding 模式
import { useEditorStore } from "@/store/modules/editor";
const editorStore = useEditorStore();
import sse_coding from "@/services/sse-coding";
import emitter from "@/utils/emitter";


// 发送消息
const handleSendMessage = async (value) => {
  const { text, mode, files, mcp_server_ids, workMode } = value;
  const preview = editorStore.showSelectionPreview;
  if (preview) {
    // 发送后关闭预览
    editorStore.setShowSelectionPreview(false);
    await sse_coding.sendMessage(text, chatStore.chat.conversation_id, files, mcp_server_ids, workMode);
    return;
  }
  // sendMessage
  await seeAgent.sendMessage(text, chatStore.chat.conversation_id, files, mcp_server_ids, workMode);
};

const conversationId = ref(route.params.id);
const agentId = computed(() => route.params.agentId);

// Watch for route changes and manage SSE subscriptions
watchEffect(() => {
  console.log("route.params", route.params);
  const newConversationId = route.params.id;

  conversationId.value = newConversationId;

  if (!newConversationId) {
    chatStore.conversationId = null;
    chatStore.chat = null;
    chatStore.messages = [];
    return;
  }
});

// src/context/ws-client-provider.tsx
const currentChat = computed(() => chatStore.chat);

const messages = computed(() => {
  return chatStore.messages;
});

const twinsChatMessages = computed(() => {
  return chatStore.twinsChatMessages;
});

// 判断是否为 Twins 模式
const isTwins = computed(() => {
  return chatStore.chat?.twins_id !== null && chatStore.chat?.twins_id != "";
});

const isShowScrollToBottom = ref(false);

onMounted(() => {
  // 添加滚动事件监听（仅用于非 Twins 模式）
  const chatMessages = document.querySelector(".message-list");
  console.log("chatMessages", chatMessages);
  if (chatMessages) {
    // 初始化 isShowScrollToBottom 的值
    const scrollDistance = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    isShowScrollToBottom.value = scrollDistance > 200;

    chatMessages.addEventListener("scroll", () => {
      if (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight > 200) {
        isShowScrollToBottom.value = true;
      } else {
        isShowScrollToBottom.value = false;
      }
    });
  }
});

const scrollToBottom = () => {
  const chatMessages = document.querySelector(".message-list");
  if (!chatMessages) return false;
  chatMessages.scrollTop = chatMessages.scrollHeight - chatMessages.clientHeight;
};

const handleShare = () => {
  // 处理分享逻辑
};
</script>

<style lang="scss" scoped>
.chat-panel::-webkit-scrollbar {
  display: none;
  /* 针对 Chrome、Safari 和 Opera */
}

.chat-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

@media (min-width: 640px) {
  .chat-panel-content {
    max-width: 768px !important;
    min-width: 390px !important;
    margin-left: auto;
    margin-right: auto;
  }

  /* 当存在 twins-columns 时，使用更大的宽度 */
  .chat-panel-content:has(.twins-container) {
    max-width: 1068px !important;
  }
}

.chat-panel {
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* IE 和 Edge */
}

.scroll-to-bottom {
  border: 1px solid #0000000f;
  background: #fff;
  position: absolute;
  bottom: 210px;
  z-index: 1000;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 9999999px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0px 5px 16px 0px #00000014,
    0px 0px 1.25px 0px #00000014;
}

.chat-panel {
  min-width: 50%;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
  max-width: 100%;
  width: 100%;
  overflow: hidden;
}

/* Twins 模式下且有预览显示时的三等分布局 */
/* 当存在twins容器且preview可见时，chat-panel占2/3宽度 */
body:has(.chat-panel .twins-container.both-visible):has(.preview:not([style*="display: none"])) .chat-panel {
  min-width: 66.666667%;
  max-width: 66.666667%;
  width: 66.666667%;
}

.chat-panel:has(.welcome) {
  padding: unset !important;
}

.preview {
  max-width: 50%;
  min-width: 50%;
}

/* Twins 模式下且预览可见时，预览区域占1/3 */
body:has(.chat-panel .twins-container.both-visible) .preview:not([style*="display: none"]) {
  max-width: 33.333333%;
  min-width: 33.333333%;
}

/* Twins 模式下收起chat会话时（single-column），agent页面和预览页面各占50% */
body:has(.chat-panel .twins-container.single-column):has(.preview:not([style*="display: none"])) .chat-panel {
  min-width: 50%;
  max-width: 50%;
  width: 50%;
}

body:has(.chat-panel .twins-container.single-column) .preview:not([style*="display: none"]) {
  max-width: 50%;
  min-width: 50%;
}

@media (max-width: 768px) {
  .preview {
    position: absolute !important;
    left: 0;
    top: 0;
    max-width: 100% !important;
    min-width: 100% !important;
    z-index: 9999 !important;
    height: 100% !important;
    margin: 0px !important;
  }
}
</style>
