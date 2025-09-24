const Message = require("@src/utils/message");
const MessageModel = require("@src/models/Message");
const calcToken = require('@src/completion/calc.token.js');

// Send progress message
async function sendProgressMessage(onTokenStream, conversation_id, content, action_type = 'progress') {
  const msg = Message.format({
    role: 'system',
    status: 'success',
    content,
    action_type,
    task_id: conversation_id
  });
  onTokenStream(msg);
  await Message.saveToDB(msg, conversation_id);
  return msg;
}

const sendCodingMessage = async (onTokenStream, conversation_id, content, action_type = 'coding', json = {}) => {
  const msg = Message.format({
    role: 'system',
    status: 'success',
    content,
    action_type,
    task_id: conversation_id,
    json
  });
  onTokenStream(msg);
  await Message.saveToDB(msg, conversation_id);
  return msg;
}


// Save user message
async function saveUserMessage(conversation_id, requirement, filepath, selection, files, screenshot) {
  const msg = Message.format({
    role: 'user',
    status: 'success',
    content: requirement,
    action_type: 'question',
    task_id: conversation_id,
    json: { filepath, selection, files, screenshot }
  });
  await Message.saveToDB(msg, conversation_id);
  return msg;
}

// Save coding result message
const saveCodingResult = async (onTokenStream, conversation_id, content, files) => {
  const msg = Message.format({
    role: 'assistant',
    status: 'success',
    content,
    action_type: 'progress',
    task_id: conversation_id,
    json: files
  });
  onTokenStream(msg);
  await Message.saveToDB(msg, conversation_id);
  return msg;
}

// Get message history with token limit
async function getMessageHistory(conversation_id, maxTokens = 131072) {
  const messages = await MessageModel.findAll({
    where: { conversation_id },
    order: [['create_at', 'ASC']]
  });

  if (messages.length === 0) return [];

  // Reverse to count from newest
  const reversed = messages.slice().reverse();

  let totalTokens = 0;
  const limited = [];

  for (const msg of reversed) {
    const tokens = calcToken(msg.content || "");
    if (totalTokens + tokens > maxTokens) break;
    limited.push(msg);
    totalTokens += tokens;
  }

  // Reverse back to chronological order
  return limited.reverse().map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

module.exports = {
  sendProgressMessage,
  sendCodingMessage,
  saveUserMessage,
  saveCodingResult,
  getMessageHistory
};