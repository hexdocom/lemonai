require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveGenerateAgentPrompt = require("@src/agent/prompt/generate_agent");
const sub_server_request = require('@src/utils/sub_server_request')

const generate_agent = async (question, conversation_id) => {
  let model_info = await getDefaultModel(conversation_id)
  console.log
  if (model_info.is_subscribe) {
    let result = await generate_agent_server(question, conversation_id)
    return result
  }
  let result = await generate_agent_local(question, conversation_id)
  return result
}

const generate_agent_server = async (question, conversation_id) => {
  let res = await sub_server_request('/api/sub_server/generate_agent', {
    question,
    conversation_id
  })

  return res
};

const generate_agent_local = async (question, conversation_id) => {
  const prompt = await resolveGenerateAgentPrompt(question);
  const content = await call(prompt, conversation_id, '', { response_format: 'json' });
  return content;
}



module.exports = exports = generate_agent;
