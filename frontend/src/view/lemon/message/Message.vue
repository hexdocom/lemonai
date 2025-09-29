<template>
  <!-- <div>{{ message }}</div> -->
  <div style="display: flex; align-items: center" v-if="message.role === 'assistant' && message.is_temp && !message.meta">{{ content }} <LoadingDots /></div>
  <div v-else-if="message?.meta?.action_type === 'plan'">
    <Markdown :content="content" />
    <Planing :planing="message?.meta?.json" />
  </div>
  <div v-else-if="message?.meta?.action_type === 'update_status'">
    <LoadingOutlined />
    <span style="margin-left: 5px">{{ content }}</span>
  </div>
  <!-- 代码编辑 -->
  <div v-else-if="message?.meta?.action_type === 'coding'">
    <CodingMessage :message="message" />
  </div>
  <!-- 停止 -->
  <div v-else-if="message?.meta?.action_type === 'stop'" class="stop">
    <Stop /> <span>LemonAI {{ $t("stop_task") }}</span>
  </div>
  <!-- 任务异常 暂无积分-->
  <div v-else-if="message?.meta?.action_type === 'error' && message?.content.includes('Insufficient credits balance')" class="credits">
    <div style="display: flex; align-items: center">
      <ShoppingCartOutlined class="icon" />
      <span>The task has been paused. Please upgrade plan or buy credits to continue.</span>
    </div>
    <a-button type="primary" v-if="route.name != 'share'" @click="handleUpgrade">Upgrade</a-button>
  </div>
  <!-- 任务异常 完成 -->
  <div v-else-if="message?.meta?.action_type === 'error'" class="error">
    <Failure /> <span>{{ $t("task_error") }}:{{ message?.content }}</span>
  </div>
  <Markdown v-else-if="message.role === 'assistant'" :content="content" />
  <span v-else>{{ content }}</span>
  <div class="file-list" v-if="showFiles">
    <MessageFileList :message="message" :role="message.role" :action_type="message?.meta?.action_type" />
  </div>
  <!-- <div v-if="message?.meta?.action_type === 'finish_summery'">
    <MessageRating :message="message" />
  </div> -->
</template>

<script setup>
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Markdown from "@/components/markdown/index.vue";
import LoadingDots from "@/view/lemon/components/LoadingDots.vue";
import { LoadingOutlined, ShoppingCartOutlined } from "@ant-design/icons-vue";
import Planing from "@/view/lemon/message/Planing.vue";
// import MessageRating from "@/view/lemon/components/MessageRating.vue";
import CodingMessage from "@/view/lemon/message/CodingMessage.vue";
import MessageFileList from "@/components/MessageFileList/index.vue";
import Stop from "@/assets/message/stop.svg";
import Failure from "@/assets/message/failure.svg";
import emitter from "@/utils/emitter";

const router = useRouter();
const route = useRoute();

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

const showFiles = computed(() => {
  const actions = new Set(["finish_summery", "question", "progress", "chat"]);
  return actions.has(props.message?.meta?.action_type);
});

const content = computed(() => {
  return props.message.content;
});

// 安全的JSON解析函数
const parseJsonSafely = (jsonString) => {
  try {
    if (!jsonString || typeof jsonString !== "string") {
      return null;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("JSON parse error:", error);
    return null;
  }
};

// 检查是否应该显示文件列表 props.message?.meta?.action_type
const shouldShowFileList = () => {
  const actionType = props.message?.meta?.action_type;
  const isValidActionType = actionType === "finish_summery" || actionType === "question";
  console.log("isValidActionType", isValidActionType);
  if (!isValidActionType) {
    return false;
  }
  const jsonData = props.message?.meta?.json;
  console.log("jsonData", jsonData);
  return jsonData && Array.isArray(jsonData) && jsonData.length > 0;
};

//升级 emitter
const handleUpgrade = () => {
  emitter.emit("showUpgrade");
};
</script>

<style lang="scss" scoped>
code {
  max-width: 600px;
}

.stop {
  display: flex;
  width: 100%;
  color: #efa201;
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 100px;
  gap: 0.375rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  background-color: #efa2011f;
  line-height: 18px;
  font-size: 13px;
  align-items: center;
  svg {
    min-width: 16px;
    min-height: 16px;
  }
}

.file-list {
  line-height: 0px !important;
}

.error {
  svg {
    min-width: 16px;
    min-height: 16px;
  }
  display: flex;
  width: 100%;
  color: #f25a5a;
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 100px;
  gap: 0.375rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  background-color: #efa2011f;
  line-height: 18px;
  font-size: 13px;
  align-items: center;
}

.credits {
  display: flex;
  align-items: center;
  color: #1a1a19;
  background-color: #fff; /* 更浅的黄色背景 */
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(55, 53, 47, 0.0392156863); /* 添加边框 */
  font-size: 13px;
  line-height: 1.5;
  gap: 8px;
  width: 100%;
  justify-content: space-between;
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.icon {
  font-size: 21px;
  color: #1a1a19;
  flex-shrink: 0;
  border-radius: 21px;
  padding: 5px;
}
</style>
