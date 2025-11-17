const LLMResponseLog = require("@src/models/LLMResponseLog");


const resolveMessages = (messages = []) => {
  return messages.map((message) => {
    return {
      role: message.role,
      content: message.content
    }
  })
}

const handleLLMResponseLog = async (llm, prompt, conversation_id, messages = []) => {

  const usage = llm.usage;
  const { input_tokens, output_tokens, total_tokens, input_tokens_details = {}, output_tokens_details = {} } = usage;
  const cached_tokens = input_tokens_details.cached_tokens || 0;
  const reasoning_tokens = output_tokens_details.reasoning_tokens || 0;

  // @ts-ignore
  try {
    await LLMResponseLog.create({
      conversation_id: conversation_id,
      model: llm.model,
      prompt: prompt,
      messages: resolveMessages(messages),
      content: llm.fullContent,
      thinking: llm.reasoningContent,
      usage: usage,
      input_tokens: input_tokens,
      output_tokens: output_tokens,
      total_tokens: total_tokens,
      cached_tokens: cached_tokens,
      reasoning_tokens: reasoning_tokens,
    });
  } catch (error) {
    console.error('Failed to create LLMResponseLog:', error);
  }
}

module.exports = exports = handleLLMResponseLog;
