//引用sse
import sse from '@/services/sse';
import fileServices from '@/services/files';
import { useChatStore } from '@/store/modules/chat';
import messageFun from './message';
import userService from '@/services/auth'
import chatService from '@/services/chat'

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);
import { v4 as uuid } from 'uuid';
import i18n from '@/locals';


// 获取用户信息 getUserInfo
async function getUserInfo() {
    // 检查 access_token，如果没有则不调用接口
    const access_token = localStorage.getItem('access_token');
    if (!access_token) {
        return;
    }

    // is_subscribe
    // 获取缓存中的 model_info
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
    console.log('sendMessage ======> 开始调用  run.js');
    if (workMode == "twins") {
        return await sendTwinsMessage(question, conversationId, files, mcp_server_ids);
    }
    const abortController = new AbortController();
    let fileIds = files.map(file => file.id);
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
    let pending = false;
    let currentMode = null; // 用于记录当前流的模式

    const onTokenStream = (answer, ch, conversationId) => {
        let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
        if (chat && chat.status === 'done') {
            return;
        }

        const currentConversationId = chatStore.conversationId
        // console.log('onTokenStream', ch)

        // 检查是否是模式标识
        if (ch.startsWith('__lemon_mode__')) {
            try {
                const modeStr = ch.substring('__lemon_mode__'.length);
                const modeData = JSON.parse(modeStr);
                currentMode = modeData.mode;
                // console.log('Stream mode detected:', currentMode);

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

// Chat 模式 sendMessage



async function sendChatMessage(question, conversationId, agentConversationId, files, mcp_server_ids = [], workMode = "chat", testMode = false, testDataStream = []) {
    const abortController = new AbortController();
    let  fileIds = files.map(file => file.id);
    // 直接更新 twinsConversationList 中的状态（conversationId 就是 twins_id）
    const twinsInfo = chatStore.twinsConversationList[conversationId] || { status: 'done', input_tokens: 0, output_tokens: 0, total: 0 };
    twinsInfo.status = 'running';
    chatStore.twinsConversationList[conversationId] = twinsInfo;
    //初始化第一条消息
    chatStore.handleInitTwinsMessage(question, files);
    let baseURL = ""
    //判断是不是开发环境
    if (import.meta.env.DEV) {
        baseURL = ""
    } else {
        baseURL = import.meta.env.VITE_SERVICE_URL || 'http://localhost:3000';
    }
    let uri = `${baseURL}/api/agent/run`;
    let options = {
        question: question,
        conversation_id: conversationId,
        fileIds,
        mcp_server_ids,
        agent_id: agent.value.id,
        model_id: model_id.value,
        mode: workMode
    };
    let pending = false;
    let currentMode = null; // 用于记录当前流的模式

    const onTokenStream = (answer, ch, conversationId, agentConversationId) => {
        // 检查 twinsConversationList 中的状态（conversationId 就是 twins_id）
        const twinsInfo = chatStore.twinsConversationList[conversationId];
        if (twinsInfo && twinsInfo.status === 'done') {
            return;
        }
        // 如果状态不存在，可能是新创建的 twins 会话，继续执行
        // console.log('onTokenStream', ch)

        // 解析模式
        if (ch.startsWith('__lemon_mode__')) {
            try {
                const modeStr = ch.substring('__lemon_mode__'.length);
                const modeData = JSON.parse(modeStr);
                currentMode = modeData.mode;
                console.log('Stream mode detected:', currentMode);

                // 找到最后一条 role: 'assistant' 且 is_temp: true 的消息
                const lastTempAssistantIndex = chatStore.twinsChatMessages.findLastIndex(
                    msg => msg.role === 'assistant' && msg.is_temp === true
                );
                console.log('lastTempAssistantIndex', lastTempAssistantIndex);
                if (lastTempAssistantIndex !== -1) {
                    const lastTempMessage = chatStore.twinsChatMessages[lastTempAssistantIndex];
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
                        chatStore.twinsChatMessages.push(bot_message);
                    }
                }
                return;
            } catch (e) {
                console.error('Failed to parse mode data:', e);
                return;
            }
        }
        console.log('Twins Chat Test Info ==> currentMode', currentMode)
        console.log('Twins Chat Test Info ==> chatStore.chat', chatStore.chat)
        console.log('Twins Chat Test Info ==> chatStore.chat.twins_id', chatStore.chat.twins_id)
        console.log('Twins Chat Test Info ==> conversationId', conversationId)
        console.log('Twins Chat Test Info ==> agentConversationId', agentConversationId)
        console.log('Twins Chat Test Info ==> chatStore.chat.conversation_id', chatStore.chat.conversation_id)
        // 根据当前模式处理数据
        if (currentMode === 'chat') {
            //conversationId 判断这个 conversationId 是不是当前  conversation 的 
            if (chatStore.chat.conversation_id !== agentConversationId) { return; }
            console.log("======> 渲染 <======= ch",ch);
            updateTwinsChatToken(ch);
        }
    }

    const answer = '';

    // 测试模式：使用预定义的数据流模拟流式响应
    if (testMode && testDataStream.length > 0) {
        console.log('=== 测试模式启动 ===');
        console.log('数据流列表:', testDataStream);

        // Base64 解码辅助函数 (与 sse.js 中的解码方式保持一致，支持 UTF-8 中文)
        const decodeBase64 = (encodedString) => {
            try {
                const decodedString = decodeURIComponent(
                    atob(encodedString)
                        .split("")
                        .map(function (char) {
                            return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
                        })
                        .join("")
                );
                return decodedString;
            } catch (e) {
                console.error('Base64解码失败:', e);
                return encodedString; // 如果解码失败，返回原字符串
            }
        };

        // 检测是否为 Base64 编码
        const isBase64 = (str) => {
            // Base64 字符串的特征：只包含 A-Z, a-z, 0-9, +, /, = 且长度是4的倍数
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            return base64Regex.test(str) && str.length % 4 === 0;
        };

        // 模拟流式返回
        const simulateStream = async () => {
            for (let i = 0; i < testDataStream.length; i++) {
                const data = testDataStream[i];
                // 模拟延迟（可以根据需要调整）
                await new Promise(resolve => setTimeout(resolve, data.delay || 50));

                // 处理内容：自动检测并解码 Base64
                let content = data.content;
                if (data.isBase64 || (typeof content === 'string' && isBase64(content) && content.length > 20)) {
                    const decoded = decodeBase64(content);
                    console.log(`[${i + 1}/${testDataStream.length}] Base64解码:`, content, '->', decoded);
                    content = decoded;
                }

                // 调用 onTokenStream 回调
                onTokenStream(answer, content, conversationId);
                console.log(`[${i + 1}/${testDataStream.length}] 已发送:`, content);
            }
        };

        simulateStream().then(() => {
            console.log('=== 测试模式完成 ===');
            return '';
        }).catch((error) => {
            console.error('测试模式错误:', error);
            return '';
        }).finally(async () => {
            // 更新 twins conversation 的 token 信息
            try {
                const tokenInfo = await chatService.getTwinsTokens(conversationId);
                if (tokenInfo) {
                    const twinsInfo = chatStore.twinsConversationList[conversationId] || { status: 'done', input_tokens: 0, output_tokens: 0, total: 0 };
                    twinsInfo.input_tokens = tokenInfo.input_tokens || 0;
                    twinsInfo.output_tokens = tokenInfo.output_tokens || 0;
                    twinsInfo.total = tokenInfo.total || 0;
                    twinsInfo.status = 'done';
                    chatStore.twinsConversationList[conversationId] = twinsInfo;
                    console.log('Updated twins token info:', conversationId, twinsInfo);
                }
            } catch (error) {
                console.error('Error updating twins token info:', error);
            }

            getUserInfo();
        });
        return;
    }

    // 正常模式：调用真实的 SSE 接口
    sse(uri, options, onTokenStream, onOpenStream(pending), answer, throttledScrollToBottom, abortController, conversationId, agentConversationId).then((res) => {
        return res;
    }).catch((error) => {
        console.error(error);
        return '';
    }).finally(async () => {
        // 更新 twins conversation 的 token 信息
        try {
            const tokenInfo = await chatService.getTwinsTokens(conversationId);
            if (tokenInfo) {
                const twinsInfo = chatStore.twinsConversationList[conversationId] || { status: 'done', input_tokens: 0, output_tokens: 0, total: 0 };
                twinsInfo.input_tokens = tokenInfo.input_tokens || 0;
                twinsInfo.output_tokens = tokenInfo.output_tokens || 0;
                twinsInfo.total = tokenInfo.total || 0;
                twinsInfo.status = 'done';
                chatStore.twinsConversationList[conversationId] = twinsInfo;
                console.log('Updated twins token info:', conversationId, twinsInfo);
            }
        } catch (error) {
            console.error('Error updating twins token info:', error);
        }

        getUserInfo();
    });
}

//Twins 模式 sendMessage
async function sendTwinsMessage(question, conversationId, files, mcp_server_ids = []) {
    try {
        // 第一步 根据 conversationId 查询当前 conversation 的 twins_id，如果没有则创建 twins conversation
        const twinsResult = await chatService.handleTwins(conversationId);

        if (twinsResult) {
            const chatConversationId = twinsResult.conversation_id;
            //更新 let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
            let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
            console.log('Twins Test Info => twinsResult :', chat);
            if (chat) {
                chat.twins_id = chatConversationId;
                if (chatStore.chat.conversation_id == conversationId) {
                    chatStore.chat.twins_id = chatConversationId;
                }
            }
            // 第二步 Twins 模式 下 会同时请求 agent 和 chat ,两个分别用自己的 conversationId
            // agent 的请求 参考 sendMessage - 使用传入的 conversationId
            const agentPromise = sendMessage(question, conversationId, files, mcp_server_ids, "task");

            // chat 的请求 使用封装的 sendChatMessage 方法 - 使用 twins conversation ID
            const chatPromise = sendChatMessage(question, chatConversationId, conversationId, files, mcp_server_ids, "chat");

            // 同时执行两个请求
            const [agentResult, chatResult] = await Promise.all([agentPromise, chatPromise]);

            return {
                agent: agentResult,
                chat: chatResult,
                agentConversationId: conversationId,
                chatConversationId: chatConversationId
            };
        } else {
            throw new Error('Failed to handle twins conversation');
        }
    } catch (error) {
        console.error('Error in sendTwinsMessage:', error);
        throw error;
    }
}

// 重新回答 re_chat

async function reAnswer(pid, content, conversationId, assistantKey) {
    console.log("reAnswer", pending)
    if (pending) return;
    pending = true;

    let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
    if (chat) {
        //修改状态
        chat.status = 'running';
    }

    const abortController = new AbortController();

    let baseURL = ""
    //判断是不是开发环境
    if (import.meta.env.DEV) {
        baseURL = ""
    } else {
        baseURL = import.meta.env.VITE_SERVICE_URL || 'http://localhost:3000';
    }

    let uri = `${baseURL}/api/agent/re_chat`;
    let options = {
        pid,
        conversation_id: conversationId,
        model_id: model_id.value
    };

    const onTokenStream = (answer, ch, conversationId) => {
        let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
        console.log("chat", chat)
        console.log("mode.value", mode.value)
        if (chat && chat.status === 'done') return;

        if (mode.value === 'task' && ch.startsWith('{') && ch.endsWith('}')) {
            if (chatStore.conversationId === conversationId) {
                update(ch, conversationId);
            }
        }
        if (mode.value === 'chat') {
            if (ch.startsWith('__lemon_out_end__')) {
                updateUserAndAssistantMessage(ch, pid, assistantKey);
                //会话停止
                chatStore.list.find((c) => c.conversation_id == conversationId).status = 'done';
                return true;
            }
            updateChatToken(ch, assistantKey);
        }
    };

    try {
        await sse(uri, options, onTokenStream, onOpenStream(pending), '', throttledScrollToBottom, abortController, conversationId);
    } catch (err) {
        console.error(err);
    } finally {
        pending = false;
    }
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
    processToken(token, chatStore.messages, () => chatStore.scrollToBottom());
}

// 处理搜索结果的共同逻辑
function processSearchResults(token, lastMessage) {
    console.log("<==== lastMessage ====>", lastMessage)
    try {
        const startMarker = '__lemon_chat_SEARCH_start__';
        const endMarker = '__lemon_chat_SEARCH_end__';

        const startIndex = token.indexOf(startMarker);
        const endIndex = token.indexOf(endMarker);

        if (startIndex == 0 && endIndex) {
            const jsonString = token.substring(startIndex + startMarker.length, endIndex).trim();
            console.log("chat jsonString:", jsonString);
            const searchResults = JSON.parse(jsonString);
            lastMessage.meta.json = searchResults.json;
            lastMessage.meta.content = searchResults.content;

            console.log("chat 搜索结果解析成功:", searchResults);
        } else {
            console.warn("无法找到有效的搜索结果数据");
        }
    } catch (error) {
        console.error("解析搜索结果JSON失败:", error);
    }
}

// 处理文档结果的共同逻辑
function processDocumentResults(token, lastMessage) {
    try {
        const startMarker = '__lemon_chat_DOCUMENT_start__';
        const endMarker = '__lemon_chat_DOCUMENT_end__';
        const startIndex = token.indexOf(startMarker);
        const endIndex = token.indexOf(endMarker);
        if (startIndex == 0 && endIndex) {
            const jsonString = token.substring(startIndex + startMarker.length, endIndex).trim();
            console.log("chat jsonString:", jsonString);
            const documentResults = JSON.parse(jsonString);
            lastMessage.meta.json = documentResults.json;
            lastMessage.meta.content = documentResults.content;

            console.log("chat 文档结果解析成功:", documentResults);
        }
    } catch (error) {
        console.error("解析搜索结果JSON失败:", error);
    }
}

// 通用的 token 处理逻辑
function processToken(token, messages, scrollFunction) {
    console.log("processToken", token)
    console.log("processToken messages", messages)
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];

        // 处理结束标记
        if (token.includes('__lemon_out_end__')) {
            lastMessage.is_temp = false;
            return;
        }

        // 处理搜索结果
        if (token.includes('__lemon_chat_SEARCH_start__') && token.includes('__lemon_chat_SEARCH_end__')) {
            processSearchResults(token, lastMessage);
            return;
        }

        // 处理文档结果
        if (token.includes('__lemon_chat_DOCUMENT_start__') && token.includes('__lemon_chat_DOCUMENT_end__')) {
            processDocumentResults(token, lastMessage);
            return;
        }

        // 追加普通内容
        if (lastMessage) {
            lastMessage.content = (lastMessage.content || '') + token;
        }
    }
    scrollFunction();
}

function updateTwinsChatToken(token) {
    // console.log("updateTwinsChatToken", token)
    // 特殊处理：在结束时添加额外的日志
    if (token.includes('__lemon_out_end__')) {
        console.log("chat 结束了")
    }
    processToken(token, chatStore.twinsChatMessages, () => chatStore.scrollToBottomLeft());
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
    sendMessage,
    sendChatMessage,
    sendTwinsMessage,
    reAnswer
};
