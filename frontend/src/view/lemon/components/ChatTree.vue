<template>
  <div v-if="messages.length > 0" :key="currentMessage.id" class="message-item">
    <div :class="currentMessage.role">
      <template v-if="currentMessage.role === 'user'">
        <div class="message-user">
          <template v-if="!isEditing">
            <p class="user-input">{{ currentMessage.content }}</p>
          </template>
          <template v-else>
            <a-textarea v-model:value="editedContent" :autosize="true" class="edit-input" />
          </template>
        </div>
      </template>

      <template v-else-if="currentMessage.role === 'assistant'">
        <div class="message-assistant">
          <Markdown
            :content="currentMessage.content"
            :class="{
              'result-streaming': currentMessage.id === chatInfo.cursorKey,
              'result-streaming-wait': currentMessage.id === chatInfo.cursorKey && currentMessage.content === '',
            }"
          />
        </div>
      </template>

      <div class="change-btns" :class="buttonGroupClass">
        <template v-if="!isEditing">
          <LeftRight :messages="messages" v-model:currentMessageIndex="currentMessageIndex" @changeChat="handleChangeChat" />
          <div class="message-options" v-if="currentMessage.id !== chatInfo.cursorKey">
            <circleSvg class="icon" v-if="currentMessage.role === 'assistant'" @click="handleRetryAnswer(currentMessage)" />
            <editSvg class="icon" v-if="currentMessage.role === 'user'" @click="startEdit" />
            <copySvg class="icon" @click="copyText(currentMessage.content)" />
          </div>
        </template>
        <template v-else>
          <div class="edit-actions">
            <button @click="cancelEdit" class="cancel-button">Cancel</button>
            <button type="primary" @click="submitEdit" class="submit-button">Send</button>
          </div>
        </template>
      </div>
    </div>

    <ChatTree v-model:messages="currentMessage.children" :parentPid="currentMessage.id" :parentMessageIndex="currentMessageIndex" :parentContent="currentMessage.content" />
  </div>
</template>
<script setup>
import { ref, computed, nextTick } from "vue";
import { v4 as uuid } from "uuid";
import Markdown from "@/components/markdown/index.vue";
import LeftRight from "@/components/menu/LeftRight.vue";
import editSvg from "@/assets/svg/edit.svg";
import copySvg from "@/assets/filePreview/copy.svg";
import circleSvg from "@/assets/svg/circle.svg";
import chatService from "@/services/chat";
import seeAgent from "@/services/see-agent";
import { message as ano } from "ant-design-vue";
import { storeToRefs } from "pinia";
import { useChatStore } from "@/store/modules/chat";

const chatStore = useChatStore();
const { chatInfo } = storeToRefs(chatStore);

const props = defineProps({
  messages: { type: Array, default: () => [] },
  parentMessageIndex: { type: Number, default: 0 },
  parentPid: { type: [String, Number], default: "" },
  parentContent: { type: String, default: "" },
});
const emit = defineEmits(["update:currentMessageIndex", "update:messages"]);

const currentMessageIndex = ref(0);
const editedContent = ref("");
const isEditing = ref(false);

const currentMessage = computed(() => {
  const activeIndex = props.messages.findIndex((msg) => msg.is_active);
  const index = activeIndex !== -1 ? activeIndex : 0;
  currentMessageIndex.value = index;
  chatInfo.value.pid = props.messages[index].id;
  return props.messages[index];
});

const buttonGroupClass = computed(() => (currentMessage.value.role === "user" ? "user-options" : "assistant-options"));

function copyText(text) {
  navigator.clipboard.writeText(text);
  ano.success("Copy success");
}

function startEdit() {
  editedContent.value = currentMessage.value.content;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

async function submitEdit() {
  isEditing.value = false;
  const pid = currentMessage.value.pid === -1 ? -1 : props.parentPid;
  chatInfo.value.pid = pid;
  await seeAgent.sendMessage(editedContent.value, chatStore.chat.conversation_id, [], []);
  deactivateAllMessages();
  currentMessageIndex.value = props.messages.length - 1;
}

function handleChangeChat(index) {
  activateMessageAt(index);
  chatService.changeChat(chatStore.chat.conversation_id, props.messages[index].pid, props.messages[index].id);
}

function handleRetryAnswer(message) {
  deactivateAllMessages();
  const assistantKey = uuid();
  chatInfo.value.cursorKey = assistantKey;

  chatInfo.value.msgList.push({
    id: assistantKey,
    role: "assistant",
    content: "",
    status: "success",
    meta: JSON.stringify({ pid: message.pid, is_active: true }),
  });

  nextTick(async () => {
    currentMessageIndex.value = props.messages.length - 1;
    await seeAgent.reAnswer(message.pid, message.content, chatStore.chat.conversation_id, assistantKey);
  });
}

function deactivateAllMessages() {
  chatInfo.value.msgList.forEach((msg) => {
    msg.is_active = false;
    msg.meta = JSON.stringify({ ...JSON.parse(msg.meta || "{}"), is_active: false });
  });
}

function activateMessageAt(index) {
  deactivateAllMessages();
  const id = props.messages[index].id;
  chatInfo.value.msgList.forEach((msg) => {
    if (msg.id === id) {
      msg.is_active = true;
      msg.meta = JSON.stringify({ ...JSON.parse(msg.meta || "{}"), is_active: true });
    }
  });
  chatInfo.value.pid = id;
}
</script>
<style lang="scss" scoped>
.message-item {
  display: flex;
  flex-direction: column;

  .user,
  .assistant {
    width: 100%;
    margin-bottom: 20px;
  }

  .user {
    text-align: end;

    .message-user {
      display: flex;
      justify-content: flex-end;
      color: #34322d;
      font-size: 16px;

      .user-input {
        background: #fff;
        padding: 10px 20px;
        max-width: 500px;
        border: 1px solid #0000000f;
        border-radius: 12px;
        text-align: start;
      }
    }

    &:hover {
      .message-options {
        display: flex;
      }
    }
  }

  .assistant {
    .message-assistant {
      font-size: 16px;
      color: #34322d;
    }

    &:hover {
      .message-options {
        display: flex;
      }
    }
  }

  &:hover {
    .message-options .display-none {
      display: flex;
      gap: 10px;
      align-items: center;
    }
  }
}

.change-btns {
  display: flex;
  width: 100%;
  padding: 8px 0;
  align-items: center;
  min-height: 46px;

  .message-options {
    display: none;
    gap: 10px;
  }
}

.user-options {
  justify-content: flex-end;
  gap: 10px;
}

.icon {
  width: 24px;
  height: 24px;
  padding: 4px;

  &:hover {
    cursor: pointer;
    background-color: #eeeeec;
    border-radius: 6px;
  }
}

.result-streaming-wait:after,
.result-streaming > :not(ol):not(ul):not(pre):last-child:after,
.result-streaming > ol:last-child li:last-child:after,
.result-streaming > pre:last-child code:after,
.result-streaming > ul:last-child li:last-child:after {
  content: "|";
  vertical-align: baseline;
  margin-left: 0.25rem;
  font-weight: bold;
  color: #000;
  animation: smoothBlink 0.8s ease-in-out infinite;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

@keyframes smoothBlink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

@media (max-width: 768px) {
  .result-streaming-wait:after,
  .result-streaming > :not(ol):not(ul):not(pre):last-child:after,
  .result-streaming > ol:last-child li:last-child:after,
  .result-streaming > pre:last-child code:after,
  .result-streaming > ul:last-child li:last-child:after {
    font-size: 0.9em;
  }
}

.user-input-edit {
  background: #fff;
  border: 1px solid #0000000f;
  border-radius: 12px;
  color: #34322d;
  font-size: 16px;
  padding: 12px;
  max-width: 100%;
}

.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.cancel-button,
.submit-button {
  margin-right: 10px;
  background-color: #0000000f;
  border: 1px solid #0000000f;
  border-radius: 6px;
  padding: 4px 10px;
  color: #34322d;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}

.edit-input {
  display: flex;
  min-width: 600px;
  max-width: 600px;
  width: auto;
  font-size: 16px;
}
</style>
