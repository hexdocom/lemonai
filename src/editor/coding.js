const { resolveActions, extractDescription } = require('./resolve');
const { execute: execute_action } = require('./execute.js');
const { withLLMRetry } = require('./withRetry');
const { createAIVersion } = require('@src/utils/versionManager');
const { sendProgressMessage, sendCodingMessage } = require("@src/routers/agent/utils/coding-messages");

const fs = require('fs');
const path = require('path');

const chat_completion = require('@src/agent/chat-completion/index')

const { resolveTemplate } = require("@src/utils/template");

const template_path = path.join(__dirname, 'template.txt');
const template = fs.readFileSync(template_path, 'utf-8');

const load_prompt = async (params = {}) => {

  const { filepath, selection, requirement, information } = params;
  const full_code = fs.readFileSync(filepath, 'utf-8');

  const template_options = { full_code, selection, requirement, information };
  const prompt = await resolveTemplate(template, template_options);
  return prompt;
}

const coding = async (params = {}, context = {}) => {

  const { filepath } = context;
  const { conversation_id = '', user_id, onTokenStream } = context;

  // 使用带重试机制的 LLM 调用
  const callWithRetry = withLLMRetry(
    async () => {
      const prompt = await load_prompt({
        filepath,
        selection: params.selection,
        requirement: params.requirement,
        information: params.information,
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
    const description = extractDescription(content);
    const actions = resolveActions(content);

    if (!actions || actions.length === 0) {
      throw new Error('Failed to resolve actions after all retries');
    }

    console.log(`[Coding] Executing ${actions.length} action(s)`);

    if (description && onTokenStream) {
      await sendProgressMessage(onTokenStream, conversation_id, description);
    }

    // Execute all actions in sequence
    for (const action of actions) {
      await execute_action(action, context);
      if (onTokenStream) {
        const json = {
          filepath,
          ...action.params,
        }
        await sendCodingMessage(onTokenStream, conversation_id, action.params.message, 'coding', json);
      }
    }

    if (conversation_id && filepath) {
      try {
        await createAIVersion(filepath, conversation_id, {
          requirement: params.requirement || '',
          selection: params.selection ? 'partial' : 'full',
          actionType: actions.map(a => a.type).join(','),
          actionCount: actions.length
        });
      } catch (versionError) {
        console.error('[Coding] Failed to create version:', versionError);
      }
    }

    return true;
  } catch (error) {
    console.error('Coding operation failed:', error);
    throw error;
  }
}

module.exports = { coding }