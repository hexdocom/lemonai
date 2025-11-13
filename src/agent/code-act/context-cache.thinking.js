require('dotenv').config();

const resolveThinkingPrompt = require("./thinking.prompt");
const resolveThinking = require("@src/utils/thinking");
const handleLLMResponseLog = require("./context-cache.llm.message");
const { deductPoints } = require('@src/utils/point')
const { PauseRequiredError } = require("@src/utils/errors");

const call = async (llm, prompt, messages, context = {}) => {
  const { conversation_id, user_id } = context;
  if (!prompt && messages.length > 0) {
    const message = messages[messages.length - 1];
    prompt = message.role === 'user' ? message.content : 'continue';
  }
  const content = await llm.chat(prompt, {
    sessionId: conversation_id,
    stream: true,
  });
  await handleLLMResponseLog(llm, prompt, conversation_id, messages);

  const usage = llm.usage;
  if (user_id && usage.input_tokens > 0) {
    const { notEnough } = await deductPoints(user_id, usage, conversation_id);
    if (notEnough) {
      throw new PauseRequiredError('Insufficient credits balance');
    }
  }

  return content;
};

const thinking = async (requirement, context = {}, llm) => {
  const { memory, retryCount } = context;
  const summarize = false;
  const messages = await memory.getMessages(summarize);
  if (retryCount > 0) {
    console.log('retryCount', retryCount);
  }

  let prompt = '';
  if (messages.length == 0) {
    prompt = await resolveThinkingPrompt(requirement, context);
    global.logging(context, 'thinking', prompt);
  }

  global.logging(context, 'thinking', JSON.stringify(messages, null, 2));

  const content = await call(llm, prompt, messages, context);
  global.logging(context, 'thinking', content);
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