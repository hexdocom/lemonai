require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveAutoReplyPrompt = require('@src/agent/prompt/auto_reply.js');
const sub_server_request = require('@src/utils/sub_server_request')
const conversation_token_usage = require('@src/utils/get_sub_server_token_usage')
const chat_completion = async (question, messagesContext, conversation_id, signal, onTokenStream) => {
  let model_info = await getDefaultModel(conversation_id)
  if (model_info.is_subscribe) {
    let replay = await chat_completion_server(question, messagesContext, conversation_id, signal, onTokenStream)
    return replay
  }
  return chat_completion_local(question, messagesContext, conversation_id, signal, onTokenStream)
}

const chat_completion_server = async (question, messagesContext, conversation_id, signal, onTokenStream) => {
  // let [res, token_usage] = await sub_server_request('/api/sub_server/auto_reply', {
  let res = await sub_server_request('/api/sub_server/chat_completion', {
    question,
    messagesContext,
    conversation_id
  })
  onTokenStream(res)

  return res
};

const chat_completion_local = async (question, messagesContext, conversation_id, signal, onTokenStream) => {
  // Call the model to get a response in English based on the goal
  return call(question, conversation_id, 'assistant', {
    temperature: 0.7,
    messages: messagesContext,
    signal: signal
  }, onTokenStream);
}



module.exports = exports = chat_completion;
