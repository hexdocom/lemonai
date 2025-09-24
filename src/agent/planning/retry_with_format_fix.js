const call = require("@src/utils/llm");

/**
 * 带重试的 LLM 调用
 */
const retryWithFormatFix = async (
  prompt,
  resultProcessor,
  validateFn,
  conversation_id,
  maxRetries = 3
) => {
  const messages = [];

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 第一次直接用原始 prompt，后续用消息历史
      const currentPrompt = i === 0 ? prompt : '';

      const response = await call(currentPrompt, conversation_id, 'assistant', {
        temperature: 0.1 * i,
        messages
      });

      // 处理结果
      const result = await resultProcessor(response);
      console.log("\n==== planning result ====");
      console.log(result);

      // 验证成功
      if (validateFn(result)) {
        return result;
      }

      // 失败，记录对话
      if (i === 0) {
        messages.push({ role: 'user', content: prompt });
      }
      messages.push({ role: 'assistant', content: response });
      messages.push({ role: 'user', content: `输出格式错误，请严格按照要求重新生成 markdown 格式任务计划` });

    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // 异常也记录
      messages.push({
        role: 'user',
        content: `生成失败: ${error.message}, 请重试`
      });
    }
  }
  return [];
};

module.exports = retryWithFormatFix;