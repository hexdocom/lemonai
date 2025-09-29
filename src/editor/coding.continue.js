const { resolveAction } = require('./resolve');
const { execute: execute_action } = require('./execute.js');
const { withLLMRetry } = require('./withRetry');
const chat_completion = require('@src/agent/chat-completion/index')
const fs = require('fs');
const path = require('path');

const { resolveTemplate } = require("@src/utils/template");

const template_path = path.join(__dirname, 'template.txt');
const template = fs.readFileSync(template_path, 'utf-8');

const load_prompt = async (params = {}) => {

  const { filepath, selection, requirement } = params;
  const full_code = fs.readFileSync(filepath, 'utf-8');

  const template_options = { full_code, selection, requirement };
  const prompt = await resolveTemplate(template, template_options);
  return prompt;
}

const coding = async (params = {}, context = {}) => {

  const { filepath } = context;
  const { conversation_id = '' } = context;

  // 使用带重试机制的 LLM 调用
  const callWithRetry = withLLMRetry(
    async () => {
      const prompt = await load_prompt({
        filepath,
        selection: params.selection,
        requirement: params.requirement,
      });

      const content = await chat_completion(prompt,{},conversation_id)

      return content;
    },
    {
      maxRetries: 3,
      delay: 1500,
      onRetry: (error, attempt) => {
        console.log(`[Retry ${attempt}/3] LLM response parsing failed:`, error.message);
        console.log(`[Retry ${attempt}/3] Retrying with format correction...`);
      }
    }
  );

  try {
    const content = await callWithRetry();

    const action = resolveAction(content);
    if (!action) {
      throw new Error('Failed to resolve action after all retries');
    }

    const result = await execute_action(action, context);
    console.log('result', result);
    return result;
  } catch (error) {
    console.error('Coding operation failed:', error);
    throw error;
  }
}

module.exports = {
  coding
}