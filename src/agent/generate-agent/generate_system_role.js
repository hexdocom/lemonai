require("module-alias/register");
require("dotenv").config();


const call = require("@src/utils/llm");
const resolveGenerateSystemRolePrompt = require("@src/agent/prompt/generate_system_role");
const resolveThinking = require("@src/utils/thinking");


const generate_system_role = async (userAgentData, conversation_id = null) => {
  try {
    const prompt = await resolveGenerateSystemRolePrompt(userAgentData);
    const content = await call(prompt, conversation_id, '', { response_format: 'json' });
    
    // handle thinking model result
    // if (content && content.startsWith('<think>')) {
    //   const { thinking: _, content: title } = resolveThinking(content);
    //   return title;
    // }
    
    if (!content) {
      throw new Error('LLM returned null or empty content');
    }
    
    // 检查返回的内容是否有必需的字段
    if (!content.name || !content.describe) {
      throw new Error(`Generated system role missing required fields. Got: ${JSON.stringify(content)}`);
    }
    
    return content;
  } catch (error) {
    console.error('Error in generate_system_role:', error);
    throw error;
  }
}



module.exports = exports = generate_system_role;