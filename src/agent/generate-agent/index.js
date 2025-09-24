require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const resolveGenerateAgentPrompt = require("@src/agent/prompt/generate_agent");
const resolveThinking = require("@src/utils/thinking");


const generate_agent = async (question, conversation_id) => {
  const prompt = await resolveGenerateAgentPrompt(question);
  const content = await call(prompt, conversation_id, '', { response_format: 'json' });
  // handle thinking model result
  // if (content && content.startsWith('<think>')) {
  //   const { thinking: _, content: title } = resolveThinking(content);
  //   return title;
  // }
  return content;
}



module.exports = exports = generate_agent;
