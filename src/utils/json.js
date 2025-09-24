const resolveThinking = require('@src/utils/thinking.js')

const parseJSON = (content) => {
  content = content.trim();
  if (content.startsWith('<think>')) {
    const { thinking: _, content: output } = resolveThinking(content);
    content = output;
  }

  const startIndex = content.indexOf('```json');
  const endIndex = content.lastIndexOf('```');
  if (startIndex !== -1 && endIndex > startIndex) {
    content = content.substring(startIndex + '```json'.length, endIndex).trim();
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    if (content === 'ERR_BAD_REQUEST') {
      throw new Error(`Large model call failed`);
    } else {
      console.log('JSON parse failed for content:', content);
      throw new Error(`parseJSON failed: ${err.message}`);
    }
  }
}

module.exports = exports = parseJSON;