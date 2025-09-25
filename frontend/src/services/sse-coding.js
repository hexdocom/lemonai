//引用sse
import sse from '@/services/sse';
import fileServices from '@/services/files';
import messageFun from './message';
import userService from '@/services/auth'
import i18n from '@/locals';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();

import { useChatStore } from '@/store/modules/chat';
const chatStore = useChatStore();
const { chatInfo, mode, model_id, agent } = storeToRefs(chatStore)
const { membership, points } = storeToRefs(userStore);

import { useEditorStore } from '@/store/modules/editor';
const editorStore = useEditorStore();

import emitter from "@/utils/emitter";

// 获取用户信息 getUserInfo
async function getUserInfo() {
  // 获取缓存中的 model_info
  const model_info = localStorage.getItem('model_info');
  if (model_info) {
    const model = JSON.parse(model_info);
    if (!model.is_subscribe) {
      // 不调用接口
      return;
    }
  }
  let res = await userService.getUserInfo();
  // 设置缓存
  membership.value = res.membership;
  points.value = res.points;
}



// 处理files 的 conversation_id
const fileConversationId = async (files, conversation_id) => {
  // putFile
  files.forEach(async (file) => {
    await fileServices.putFile(file.id, conversation_id)
  });
};

const onOpenStream = (pending) => {
  pending = true;
};

const throttledScrollToBottom = () => {
  console.log('throttledScrollToBottom');
};

const sendMessage = async (question, conversationId, files, mcp_server_ids = [], workMode = "auto") => {
  const abortController = new AbortController();
  let fileIds = [];
  if (files && files.length > 0) {
    fileIds = files.map(file => file.id);
    // Modify files to include filepath
    files = files.map(file => {
      const filepath = `${file.workspace_dir}/Conversation_${conversationId.slice(0, 6)}/upload/${file.name}`;
      const filename = file.name;
      return { ...file, filepath, filename };
    });
    await fileConversationId(files, conversationId)
  }
  // 判断当前会话是否存在
  let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
  if (chat) {
    chat.status = 'running';
  }

  const selection = editorStore.selectedHtml;
  const filepath = editorStore.selectedPath;
  const screenshot = editorStore.selectedScreenshot;

  // 初始化第一条消息
  chatStore.handleInitMessage(question, files, screenshot, filepath);

  let uri = `/api/agent/coding/sse`;
  let options = {
    requirement: question,
    selection: selection,
    screenshot: screenshot,
    filepath: filepath,
    agent_id: agent.value.id,
    conversation_id: conversationId,
    fileIds,
    mcp_server_ids,
    model_id: model_id.value,
    mode: workMode
  };
  console.log("options", options)
  console.log("mode.value", mode.value)
  console.log("chatInfo.value", chatInfo.value)

  let pending = false;
  let currentMode = null; // 用于记录当前流的模式

  const onTokenStream = (answer, ch, conversationId) => {
    let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
    if (chat && chat.status === 'done') {
      return;
    }

    const currentConversationId = chatStore.conversationId
    console.log('onTokenStream', ch)

    // 检查是否是模式标识
    if (ch.startsWith('__lemon_mode__')) {
      try {
        const modeStr = ch.substring('__lemon_mode__'.length);
        const modeData = JSON.parse(modeStr);
        currentMode = modeData.mode;
        const lastTempAssistantIndex = chatStore.messages.findLastIndex(
          msg => msg.role === 'assistant' && msg.is_temp === true
        );
        if (lastTempAssistantIndex !== -1) {
          const lastTempMessage = chatStore.messages[lastTempAssistantIndex];
          if (currentMode == "chat") {
            lastTempMessage.meta = { "action_type": "chat" };
            lastTempMessage.content = "";
          } else {
            lastTempMessage.content = i18n.global.t('lemon.message.botInitialResponse');
          }
        } else {
          if (currentMode == "chat") {
            const bot_message = {
              content: "",
              role: 'assistant',
              meta: { "action_type": "chat" },
              is_temp: true,
            }
            chatStore.messages.push(bot_message);
          } else {
            const bot_message = {
              content: i18n.global.t('lemon.message.botInitialResponse'),
              role: 'assistant',
              is_temp: true,
            }
            chatStore.messages.push(bot_message);
          }
        }
        return;
      } catch (e) {
        console.error('Failed to parse mode data:', e);
        return;
      }
    }

    if (ch && ch.startsWith('{') && ch.endsWith('}')) {
      if (currentConversationId === conversationId) {
        update(ch, conversationId);
      }
    }
  }

  const answer = '';

  sse(uri, options, onTokenStream, onOpenStream(pending), answer, throttledScrollToBottom, abortController, conversationId).then((res) => {
    return res;
  }).catch((error) => {
    console.error(error);
    return '';
  }).finally(() => {
    emitter.emit("coding-message-sent", { conversationId });
    chatStore.list.find((c) => c.conversation_id == conversationId).status = 'done';
    getUserInfo();
  });
}

function update(ch, conversationId) {
  let json;
  try {
    json = JSON.parse(ch);
  } catch (e) {
    console.error('Failed to parse JSON:', ch);
    return;
  }
  console.log('=== ch === ', json);

  const messages = chatStore.messages;
  const tempMessageIndex = findTemporaryAssistantMessage(messages);

  if (tempMessageIndex !== -1) {
    // 删掉临时的助手消息
    messages.splice(tempMessageIndex, 1);
  }
  // messages.push(json);
  messageFun.handleMessage(json, messages);
  chatStore.scrollToBottom()
}


// 查找临时的助手消息
function findTemporaryAssistantMessage(messages) {
  return messages.findIndex(message => message.is_temp === true && message.role === 'assistant');
}

export default {
  sendMessage,
};
