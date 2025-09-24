// @ts-ignore
const router = require("koa-router")();
const handleStream = require("@src/utils/stream.util");

const uuid = require("uuid");
const Conversation = require("@src/models/Conversation");
const Message = require("@src/utils/message");
const MessageTable = require("@src/models/Message");
const call = require("@src/utils/llm");
const calcToken = require('@src/completion/calc.token.js')


const activeChatAbortControllers = new Map(); // conversation_id -> AbortController


router.post("/chat", async (ctx, next) => {
  const { request, response } = ctx;
  const body = request.body || {};
  let { question, conversation_id, pid, model_id = 48 } = body;
  await Conversation.update({ model_id }, { where: { conversation_id } })


  if (!conversation_id) {
    conversation_id = uuid.v4();
    const title = question.slice(0, 20);
    const newConversation = await Conversation.create({
      user_id: ctx.state.user.id,
      conversation_id: conversation_id,
      content: question,
      title: title,
      status: 'done'
    });
  }

  body.responseType = body.responseType || "sse";
  const { stream, onTokenStream } = handleStream(body.responseType, response);

  // 新增：为本次会话创建 AbortController
  const abortController = new AbortController();
  activeChatAbortControllers.set(conversation_id, abortController);

  // 修改 onCompleted，接收 message_id 并 base64 编码
  const onCompleted = (message_id, new_pid) => {
    // 1. 构造原始字符串
    const raw = `__lemon_out_end__{"message_id":"${message_id}","pid":"${new_pid}"}\n\n`;
    // 2. base64 编码
    const base64_content = Buffer.from(raw).toString('base64');
    // 3. 写入流
    onTokenStream(raw);
    stream.end();
  };

  let messagesContext = []
  if (pid != -1) {
    // 寻找上下文
    const messages = await MessageTable.findAll({
      where: {
        conversation_id: conversation_id
      }
    })
    messagesContext = getMessagesContext(messages, pid)
  }


  let sysPromptMessage = {
    role: 'system',
    content: `
    You are a friendly and helpful chatbot named Lemon. 
    Your role is to assist users by providing concise and accurate responses to their questions or messages. 
    Politely and friendly acknowledge the user's message and provide a clear and relevant answer.
    `
  }
  messagesContext.unshift(sysPromptMessage)

  const msg = Message.format({
    role: 'user',
    status: 'success',
    content: question,
    action_type: 'chat',
    task_id: conversation_id,
    type: 'chat',
    pid: pid
  });
  let message = await Message.saveToDB(msg, conversation_id);
  let new_pid = message.id

  // 调用大模型
  let content

  call(question, conversation_id, 'assistant', { temperature: 0.7, messages: messagesContext, signal: abortController.signal }, onTokenStream).then(async (content) => {
    const assistant_msg = Message.format({
      role: 'assistant',
      status: 'success',
      content: content,
      action_type: 'chat',
      task_id: conversation_id,
      type: 'chat',
      pid: new_pid
    });
    let new_message = await Message.saveToDB(assistant_msg, conversation_id);

    // 在这里调用 onCompleted
    onCompleted(new_message.id, new_pid);

    await Conversation.update({ status: 'done' }, { where: { conversation_id } })
  }).catch(async (error) => {
    content = error.message
    const assistant_msg = Message.format({
      role: 'assistant',
      status: 'success',
      content: content,
      action_type: 'chat',
      task_id: conversation_id,
      type: 'chat',
      pid: new_pid
    });
    let new_message = await Message.saveToDB(assistant_msg, conversation_id);

    // 在这里调用 onCompleted
    onCompleted(new_message.id, new_pid);
  }).finally(() => {
    activeChatAbortControllers.delete(conversation_id);
  })

  // completeCodeAct(task, context).then(async content => {
  //   console.log('content', content);
  //   onCompleted();
  // });
  ctx.body = stream;
  ctx.status = 200;
});

// 重新回答
router.post("/re_chat", async (ctx, next) => {
  const { request, response } = ctx;
  const body = request.body || {};
  const user_id = ctx.state.user.id
  let { conversation_id, pid, model_id = 48 } = body;

  await Conversation.update({ status: 'running', model_id }, { where: { conversation_id } })

  body.responseType = body.responseType || "sse";
  const { stream, onTokenStream } = handleStream(body.responseType, response);

  const messages = await MessageTable.findAll({
    where: {
      conversation_id: conversation_id
    }
  })

  // 根据pid找到另一个message的is_active是true的，改成false
  // 只处理同一conversation下，除当前pid外的is_active为true的assistant消息
  for (const msg of messages) {
    if (msg.get('role') === 'assistant') {
      let meta = msg.get('meta');
      if (typeof meta === 'string') meta = JSON.parse(meta);
      if (meta && typeof meta === 'object' && 'is_active' in meta && meta.is_active && meta.pid == pid) {
        meta.is_active = false;
        console.log("====debug====", msg.id)
        await MessageTable.update({ meta: JSON.stringify(meta) }, { where: { id: msg.id } });
      }
    }
  }

  const abortController = new AbortController();
  activeChatAbortControllers.set(conversation_id, abortController);

  const onCompleted = (message_id, new_pid) => {
    // 1. 构造原始字符串
    const raw = `__lemon_out_end__{"message_id":"${message_id}","pid":"${new_pid}"}\n\n`;
    // 2. base64 编码
    const base64_content = Buffer.from(raw).toString('base64');
    // 3. 写入流
    onTokenStream(raw);
    stream.end();
  };

  const messagesContext = getMessagesContext(messages, pid)


  const message = getMessageByPid(messages, pid)
  const question = message.content
  console.log("messagesContext[messagesContext.length - 1]", message)
  const contextMessages = messagesContext.slice(0, -1)
  call(question, conversation_id, 'assistant', { temperature: 0.7, messages: contextMessages }, onTokenStream).then(async (content) => {
    const assistant_msg = Message.format({
      role: 'assistant',
      status: 'success',
      content: content,
      action_type: 'chat',
      task_id: conversation_id,
      type: 'chat',
      pid: message.id,
      is_active: true
    });
    let new_message = await Message.saveToDB(assistant_msg, conversation_id);

    onCompleted(new_message.id, message.id);

    await Conversation.update({ status: 'done' }, { where: { conversation_id } })
  }).catch(async (error) => {
    let content = error.message
    const assistant_msg = Message.format({
      role: 'assistant',
      status: 'success',
      content: content,
      action_type: 'chat',
      task_id: conversation_id,
      type: 'chat',
      pid: message.id,
      is_active: true
    });
    let new_message = await Message.saveToDB(assistant_msg, conversation_id);

    onCompleted(new_message.id, message.id);

    await Conversation.update({ status: 'done' }, { where: { conversation_id } })
  }).finally(() => {
    activeChatAbortControllers.delete(conversation_id);
  })




  ctx.body = stream;
  ctx.status = 200;
});

// 回答切换
router.post("/change", async (ctx, next) => {
  const { request, response } = ctx;
  const body = request.body || {};
  const user_id = ctx.state.user.id
  let { conversation_id, pid, old_message_id, new_message_id } = body;

  // 1. 查找所有 assistant 消息，筛选 meta.pid 相同的，设为 false
  const messages = await MessageTable.findAll({
    where: {
      conversation_id: conversation_id,
    }
  });
  for (const msg of messages) {
    let meta = msg.get('meta');
    if (typeof meta === 'string') meta = JSON.parse(meta);
    meta = meta || {};
    if (meta.pid === pid) {
      meta.is_active = false;
      await MessageTable.update({ meta: JSON.stringify(meta) }, { where: { id: msg.get('id') } });
    }
  }

  // 2. 设定 new_message_id 的 is_active 为 true
  const targetMsg = await MessageTable.findOne({ where: { id: new_message_id } });
  if (targetMsg) {
    let meta = targetMsg.get('meta');
    if (typeof meta === 'string') meta = JSON.parse(meta);
    meta = meta || {};
    meta.is_active = true;
    await MessageTable.update({ meta }, { where: { id: new_message_id } });
  }

  ctx.body = { success: true };
  ctx.status = 200;
})

// 停止回答
router.post("/stop_chat", async (ctx, next) => {
  const { conversation_id } = ctx.request.body || {};
  if (!conversation_id) {
    ctx.body = { success: false, message: "conversation_id is required" };
    ctx.status = 400;
    return;
  }
  const controller = activeChatAbortControllers.get(conversation_id);
  if (controller) {
    controller.abort();
    activeChatAbortControllers.delete(conversation_id);
    ctx.body = { success: true, message: "Chat stopped" };
    ctx.status = 200;
  } else {
    ctx.body = { success: false, message: "No active chat for this conversation_id" };
    ctx.status = 404;
  }
});

// 获取从根到pid的消息链，且总token不超过128k，从最新往旧累加
function getMessagesContext(messages, pid) {
  const idMap = {};
  messages.forEach(msg => {
    idMap[msg.id] = msg;
  });

  // 回溯链路，先收集完整链路
  const context = [];
  let cur = idMap[pid];
  const visited = new Set();
  while (cur) {
    if (visited.has(cur.id)) break; // 防止自环
    visited.add(cur.id);

    context.unshift(cur); // 先unshift，最后是从旧到新
    const meta = typeof cur.meta === 'string' ? JSON.parse(cur.meta) : cur.meta;
    if (!meta || meta.pid === undefined || meta.pid === -1) break;
    cur = idMap[meta.pid];
  }

  // 反转为从新到旧
  const reversed = context.slice().reverse();

  // 累加token，超过128k就丢弃更旧的
  let totalTokens = 0;
  const limited = [];
  for (const msg of reversed) {
    const tokens = calcToken(msg.content || "");
    if (totalTokens + tokens > 131072) break;
    limited.push(msg);
    totalTokens += tokens;
  }

  // 再反转回来，保持从旧到新
  const finalContext = limited.reverse();

  // 转换为 openai 标准格式
  return finalContext.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}


//根据pid 获取message
function getMessageByPid(messages, pid) {
  return messages.find(msg => msg.id === pid);
}

module.exports = exports = router.routes();