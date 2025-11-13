const checkActionToBeContinue = (action) => {
  const { type, params } = action;
  if (type === 'write_code' && !params?.content) {
    return 'to be continue';
  }
  return 'invalid';
}

const completeMessagesContent = (messages) => {
  const assistantContents = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === 'assistant' && typeof message.content === 'string') {
      // Add to the beginning to maintain order for join
      assistantContents.unshift(message.content);
    } else {
      // Stop if not an assistant message or if content is missing/not a string
      break;
    }
  }
  const completion = assistantContents.join('').trim();
  return completion
}

module.exports = {
  checkActionToBeContinue,
  completeMessagesContent
};