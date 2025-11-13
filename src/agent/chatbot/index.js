require("module-alias/register");
require("dotenv").config();

const call = require("@src/utils/llm");
const searchIntentPrompt = require("@src/agent/prompt/chatbot-intent");

const search_intent =  async (messagesContext, question, document_list_str, conversation_id) => {
    const prompt = await searchIntentPrompt(messagesContext, question, document_list_str);
    const content = await call(prompt, conversation_id, '', { response_format: 'json' });
    return content;
}


module.exports = exports = { search_intent };
