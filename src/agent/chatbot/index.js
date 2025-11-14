require("module-alias/register");
require("dotenv").config();

const call = require("@src/utils/llm");
const searchIntentPrompt = require("@src/agent/prompt/chatbot-intent");
const chat_completion = require('@src/agent/chat-completion/index')

const search_intent =  async (messagesContext, question, document_list_str, conversation_id) => {
    const prompt = await searchIntentPrompt(messagesContext, question, document_list_str);
    const content = await chat_completion(prompt,  { response_format: 'json' }, conversation_id)
    return content;
}


module.exports = exports = { search_intent };
