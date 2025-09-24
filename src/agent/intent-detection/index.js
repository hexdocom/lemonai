require("module-alias/register");
require("dotenv").config();

const sub_server_request = require('@src/utils/sub_server_request')
const conversation_token_usage = require('@src/utils/get_sub_server_token_usage')

const call = require("@src/utils/llm");
const { getDefaultModel } = require('@src/utils/default_model')
const resolveIntentDetectionPrompt = require("@src/agent/prompt/intent_detection");
const resolveThinking = require("@src/utils/thinking");

const detect_intent = async (question, conversation_id, messagesContext = []) => {
    let model_info = await getDefaultModel(conversation_id)
    if (model_info.is_subscribe) {
        let intent = await detect_intent_server(question, conversation_id, messagesContext)
        return intent
    }
    let intent = await detect_intent_local(question, conversation_id, messagesContext)
    return intent
}

const detect_intent_server = async (question, conversation_id, messagesContext = []) => {
    const res = await sub_server_request('/api/sub_server/detect_intent', {
        question,
        conversation_id,
        messagesContext
    })

    return res
};

const detect_intent_local = async (question, conversation_id, messagesContext = []) => {
    const prompt = await resolveIntentDetectionPrompt(question, messagesContext);
    const content = await call(prompt, conversation_id, '', { response_format: 'json' });
    
    console.log('Intent detection content type:', typeof content);
    console.log('Intent detection content value:', content);
    
    try {
        // 如果 content 已经是对象，直接使用
        if (typeof content === 'object' && content !== null) {
            return content.intent ? content.intent.trim().toLowerCase() : 'agent';
        }
        
        // 如果是字符串，尝试解析为 JSON
        if (typeof content === 'string') {
            // handle thinking model result first
            if (content.startsWith('<think>')) {
                const { thinking: _, content: intent } = resolveThinking(content);
                return intent.trim().toLowerCase();
            }
            
            const result = JSON.parse(content);
            return result.intent ? result.intent.trim().toLowerCase() : 'agent';
        }
        
        // 其他情况默认返回 agent
        return 'agent';
    } catch (error) {
        console.error('Intent detection error:', error);
        console.error('Content type:', typeof content);
        console.error('Content value:', content);
        
        // 如果是字符串且解析失败，尝试从字符串中提取 intent
        if (typeof content === 'string') {
            const lowerContent = content.toLowerCase().trim();
            if (lowerContent.includes('chat')) {
                return 'chat';
            } else if (lowerContent.includes('agent')) {
                return 'agent';
            }
        }
        
        // 默认返回 agent
        return 'agent';
    }
}

module.exports = exports = detect_intent;