require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveAutoReplyPrompt = require('@src/agent/prompt/auto_reply.js');
const sub_server_request = require('@src/utils/sub_server_request')
const conversation_token_usage = require('@src/utils/get_sub_server_token_usage')
const chat_completion = async (question, options, conversation_id, onTokenStream) => {
  let model_info = await getDefaultModel(conversation_id)
  if (model_info.is_subscribe) {
    let replay = await chat_completion_server(question, options, conversation_id, onTokenStream)
    return replay
  }
  return chat_completion_local(question, options, conversation_id, onTokenStream)
}

const chat_completion_server = async (question, options, conversation_id, onTokenStream) => {
  // let [res, token_usage] = await sub_server_request('/api/sub_server/auto_reply', {
  let res = await sub_server_request('/api/sub_server/chat_completion', {
    question,
    options,
    conversation_id
  })
  if (onTokenStream) {
    onTokenStream(res)
  }
  return res
};

const chat_completion_local = async (question, options, conversation_id, onTokenStream) => {
  // Call the model to get a response in English based on the goal

  const abortController = new AbortController();
  const signal = abortController.signal;
  options.signal = signal;
  return call(question, conversation_id, 'assistant', options, onTokenStream);
}



module.exports = exports = chat_completion;
