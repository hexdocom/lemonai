require("module-alias/register");
require("dotenv").config();

const sub_server_request = require('@src/utils/sub_server_request')
const conversation_token_usage = require('@src/utils/get_sub_server_token_usage')

const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveResultPrompt = require('@src/agent/prompt/generate_result.js');


const summary = async (goal, conversation_id, tasks, generatedFiles = [], staticUrl = null) => {
  let model_info = await getDefaultModel(conversation_id)
  if (model_info.is_subscribe) {
    let replay = await summary_server(goal, conversation_id, tasks, generatedFiles, staticUrl)
    return replay
  }
  let replay = await summary_local(goal, conversation_id, tasks, generatedFiles, staticUrl)
  return replay
}

const summary_server = async (goal, conversation_id, tasks, generatedFiles = [], staticUrl = null) => {
  // let [res, token_usage] = await sub_server_request('/api/sub_server/summary', {
  let res = await sub_server_request('/api/sub_server/summary', {
    goal,
    conversation_id,
    tasks,
    generatedFiles,
    staticUrl
  })
  // await conversation_token_usage(token_usage, conversation_id)

  return res
};

const summary_local = async (goal, conversation_id, tasks, generatedFiles = [], staticUrl = null) => {
  const prompt = await resolveResultPrompt(goal, tasks, generatedFiles, staticUrl);
  const result = await call(prompt, conversation_id);

  return result
}

module.exports = exports = summary;
