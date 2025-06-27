require('dotenv').config();

const resolveThinkingPrompt = require("./thinking.prompt");
const resolveThinking = require("@src/utils/thinking");
const { getDefaultModel } = require('@src/utils/default_model')

const call = require("@src/utils/llm");
const DEVELOP_MODEL = 'assistant';
const sub_server_request = require('@src/utils/sub_server_request')
const conversation_token_usage = require('@src/utils/get_sub_server_token_usage')

const thinking = async (requirement, context = {}) => {
  let model_info = await getDefaultModel()
  if (model_info.is_subscribe) {
    let content = await thinking_server(requirement, context)
    return content
  }
  let content = await thinking_local(requirement, context)
  return content
}

const thinking_server = async (requirement, context = {}) => {
  const { memory, retryCount } = context;
  // console.log('memory', memory);
  const summarize = false;
  const messages = await memory.getMessages(summarize);
  if (retryCount > 0) {
    // Retry with user reply
    console.log('retryCount', retryCount);
    // messages.pop();
  }

  // If last message is assistant, return directly, support quickly playback and run action
  const message = messages[messages.length - 1];
  if (message && message.role === 'assistant') {
    // return message.content;
  }

  // let [{ prompt, content }, token_usage] = await sub_server_request('/api/sub_server/thinking', {
  let { prompt, content } = await sub_server_request('/api/sub_server/thinking', {
    messages,
    requirement,
    context,
    conversation_id: context.conversation_id
  })
  // await conversation_token_usage(token_usage, context.conversation_id)

  if (prompt) {
    await memory.addMessage('user', prompt);
  }
  await memory.addMessage('assistant', content);

  return content;
}

const thinking_local = async (requirement, context = {}) => {
  const { memory, retryCount } = context;
  // console.log('memory', memory);
  const summarize = false;
  const messages = await memory.getMessages(summarize);
  if (retryCount > 0) {
    // Retry with user reply
    console.log('retryCount', retryCount);
    // messages.pop();
  }

  // If last message is assistant, return directly, support quickly playback and run action
  const message = messages[messages.length - 1];
  if (message && message.role === 'assistant') {
    // return message.content;
  }

  // Use LLM thinking to instruct next action
  let prompt = '';
  if (messages.length == 0) {
    prompt = await resolveThinkingPrompt(requirement, context);
  }
  const options = {
    messages: messages.map(item => {
      return { role: item.role, content: item.content }
    })
  }
  const content = await call(prompt, context.conversation_id, DEVELOP_MODEL, options);
  // console.log('content', content);
  if (prompt) {
    await memory.addMessage('user', prompt);
  }

  if (content && content.startsWith('<think>')) {
    const { thinking: _, content: output } = resolveThinking(content);
    await memory.addMessage('assistant', output);
    return output;
  }
  await memory.addMessage('assistant', content);
  return content;
}

module.exports = exports = thinking;