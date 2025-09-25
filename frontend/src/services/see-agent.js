//引用sse
import sse from '@/services/sse';
import fileServices from '@/services/files';
import { useChatStore } from '@/store/modules/chat';
import messageFun from './message';
import userService from '@/services/auth'

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);
import { v4 as uuid } from 'uuid';
import i18n from '@/locals';


//获取用户信息 getUserInfo
async function getUserInfo() {
    //is_subscribe
    //获取缓存中的 model_info
    const model_info = localStorage.getItem('model_info');
    if (model_info) {
        const model = JSON.parse(model_info);
        if (!model.is_subscribe) {
            //不调用接口
            return;
        }
    }
    let res = await userService.getUserInfo();
    //设置缓存
    membership.value = res.membership;
    points.value = res.points;
}

const chatStore = useChatStore();
const { chatInfo, messages, mode, model_id, agent } = storeToRefs(chatStore)
//处理files 的 conversation_id
const fileConversationId = async (files, conversation_id) => {
    //putFile
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

let pending = false;

async function sendMessage(question, conversationId, files, mcp_server_ids = [], workMode = "auto") {
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
        console.log('updatedFiles', files);
        await fileConversationId(files, conversationId)
    }
    //判断当前会话是否存在
    let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
    if (chat) {
        //修改状态
        chat.status = 'running';
    }
    //初始化第一条消息
    chatStore.handleInitMessage(question, files);
    let baseURL = ""
    //判断是不是开发环境
    if (import.meta.env.DEV) {
        baseURL = ""
    } else {
        baseURL = import.meta.env.VITE_SERVICE_URL || 'http://localhost:3000';
    }
    let uri = `${baseURL}/api/agent/run`;
    // if (mode.value === 'chat') {
    //     uri = `${baseURL}/api/agent/chat`;
    // }
    let options = {
        question: question,
        conversation_id: conversationId,
        fileIds,
        mcp_server_ids,
        agent_id: agent.value.id,
        model_id: model_id.value,
        mode: workMode
    };

    console.log("mode.value", mode.value)
    console.log("chatInfo.value", chatInfo.value)

    // if (mode.value == 'chat') {
    //     // add pid
    //     options.pid = chatInfo.value.pid;
    //     // the pid is the user?
    //     var userKey = updateChat(question, 'user', options.pid)
    //     var assistantKey = updateChat('', 'assistant', userKey)
    //     chatInfo.value.cursorKey = assistantKey // update cursor
    // }
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
                console.log('Stream mode detected:', currentMode);

                // 找到最后一条 role: 'assistant' 且 is_temp: true 的消息
                const lastTempAssistantIndex = chatStore.messages.findLastIndex(
                    msg => msg.role === 'assistant' && msg.is_temp === true
                );
                console.log('lastTempAssistantIndex', lastTempAssistantIndex);
                if (lastTempAssistantIndex !== -1) {
                    const lastTempMessage = chatStore.messages[lastTempAssistantIndex];
                    if (currentMode == "chat") {
                        lastTempMessage.meta = { "action_type": "chat" };
                        lastTempMessage.content = "";
                    } else {
                        lastTempMessage.content = i18n.global.t('lemon.message.botInitialResponse');
                    }
                } else {
                    // 如果没有找到，则创建新的消息
                    console.log('No temp assistant message found, creating a new one...');
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

        // 根据当前模式处理数据
        if (currentMode === 'chat') {
            updateChatToken(ch);
        } else if (currentMode === 'agent') {
            if (ch && ch.startsWith('{') && ch.endsWith('}')) {
                if (currentConversationId === conversationId) {
                    update(ch, conversationId);
                }
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
        //删掉临时的助手消息
        messages.splice(tempMessageIndex, 1);
    }
    // messages.push(json);
    messageFun.handleMessage(json, messages);

    //如果消息类型为 finish_summery 则初始化 消息 防止评分的时候 缺少ID
    if (json.meta && typeof json.meta === 'string') {
        json.meta = JSON.parse(message.meta);
    }
    //延迟 500ms
    // setTimeout(() => {
    //     if (json.meta.action_type === 'finish_summery') {
    //         chatStore.initConversation(conversationId);
    //     }
    // }, 500);
    chatStore.scrollToBottom()
}
function updateChatToken(token) {
    console.log("updateChatToken", token)
    // 如果 token 包含 __lemon_out_end__，则不追加

    const messages = chatStore.messages;
    if (messages.length > 0) {
        // 找到最后一条消息
        const lastMessage = messages[messages.length - 1];
        // 如果最后一条消息存在，则追加 token 到 content
        //is_temp
        if (token.includes('__lemon_out_end__')) {
            lastMessage.is_temp = false;
            console.log("chat 结束了")
            return;
        }
        if (lastMessage) {
            lastMessage.content = (lastMessage.content || '') + token;
        }
    }
    chatStore.scrollToBottom();
}
function updateChat(question, role, pid) {
    let userKey = uuid()
    if (pid == -1) {
        chatInfo.value.msgList.push({
            id: userKey,
            role: role,
            content: question,
            status: "success",
            meta: JSON.stringify({
                pid: -1,
                is_active: true
            })
        })
    } else {
        // 遍历，在挂载 child
        chatInfo.value.msgList.push({
            id: userKey,
            role: role,
            content: question,
            status: "success",
            meta: JSON.stringify({
                pid: pid,
                is_active: true
            })
        })
    }
    return userKey
}
function updateUserAndAssistantMessage(ch, userKey, assistantKey) {
    //__lemon_out_end__{"message_id":4985}

    try {
        // 使用正则表达式提取 uid 和 aid
        const match = ch.match(/__lemon_out_end__\{"message_id":"(\d+)","pid":"(\d+)"\}/);
        if (!match) {
            throw new Error("Invalid message format");
        }

        const jsonParse = {
            uid: parseInt(match[1]),
            pid: parseInt(match[2])
        };


        // 查找 user 和 assistant 消息的索引
        const userIndex = chatInfo.value.msgList.findIndex(item => item.id === userKey);
        const assistantIndex = chatInfo.value.msgList.findIndex(item => item.id === assistantKey);

        // 确保找到有效的索引
        if (userIndex === -1 || assistantIndex === -1) {
            console.error("User or Assistant message not found in msgList");
            return;
        }
        // 更新消息信息
        chatInfo.value.msgList[userIndex].id = jsonParse.pid;
        chatInfo.value.msgList[assistantIndex].id = jsonParse.uid;
        chatInfo.value.msgList[assistantIndex].meta = JSON.stringify({ pid: jsonParse.pid, is_active: true });
        chatInfo.value.cursorKey = ''; // reset cursor key
        chatInfo.value.pid = jsonParse.uid;
    } catch (error) {
        console.error("Failed to parse message or update messages:", error);
    }
}

// 查找临时的助手消息
function findTemporaryAssistantMessage(messages) {
    return messages.findIndex(message => message.is_temp === true && message.role === 'assistant');
}



export default {
    sendMessage
};
