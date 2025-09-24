require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveChatPrompt = require('@src/agent/prompt/chat.js');
const sub_server_request = require('@src/utils/sub_server_request')
const chat = async (goal, conversation_id,messages,onTokenStream) => {
  let model_info = await getDefaultModel(conversation_id)
  if (model_info.is_subscribe) {
    let replay = await chat_server(goal, conversation_id,messages,onTokenStream)
    return replay
  }
  let replay = await chat_local(goal, conversation_id,messages,onTokenStream)
  return replay
}
// TODO saas interface
const chat_server = async (goal, conversation_id,messages) => {
  // let [res, token_usage] = await sub_server_request('/api/sub_server/auto_reply', {
  let res = await sub_server_request('/api/sub_server/auto_reply', {
    goal,
    conversation_id,
    //messages
  })
  // await conversation_token_usage(token_usage, conversation_id)
  return res
};

const chat_local = async (goal, conversation_id, messages = [],onTokenStream) => {
  // Call the model to get a response in English based on the goal
  let prompt = goal
  if (messages.length == 0) {
    prompt = await resolveChatPrompt(goal)
  }else{
    // let first message add prompt
    messages[0].content = await resolveChatPrompt(messages[0].content)
  }
  const auto_reply = await call(prompt, conversation_id, 'assistant', {messages},onTokenStream);
  return auto_reply
}



module.exports = exports = chat;
