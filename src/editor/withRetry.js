const { resolveAction } = require('./resolve');

/**
 * 带重试机制的高阶函数
 * @param {Function} fn - 需要重试的异步函数
 * @param {Object} options - 重试配置选项
 * @param {number} options.maxRetries - 最大重试次数，默认3次
 * @param {number} options.delay - 重试延迟（毫秒），默认1000ms
 * @param {Function} options.shouldRetry - 判断是否需要重试的函数
 * @param {Function} options.onRetry - 重试时的回调函数
 * @param {Function} options.validateResult - 验证结果的函数
 * @returns {Function} 包装后的函数
 */
const withRetry = (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = () => true,
    onRetry = () => { },
    validateResult = () => true
  } = options;

  return async (...args) => {
    let lastError;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await fn(...args);

        // 验证结果是否有效
        if (!validateResult(result)) {
          throw new Error('Result validation failed');
        }

        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt > maxRetries || !shouldRetry(error, attempt)) {
          throw error;
        }

        // 触发重试回调
        await onRetry(error, attempt, ...args);

        // 延迟后重试
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  };
};

/**
 * 专门用于处理 LLM 响应解析的重试包装器
 * @param {Function} llmCall - LLM 调用函数
 * @param {Object} retryOptions - 重试配置
 */
const withLLMRetry = (llmCall, retryOptions = {}) => {
  const defaultOptions = {
    maxRetries: 3,
    delay: 1500,
    shouldRetry: (error, attempt) => {
      // 只在解析错误或格式错误时重试
      const retryableErrors = [
        'XML内容必须是非空字符串',
        'Result validation failed',
        'Invalid XML format',
        'Action resolution failed'
      ];

      const shouldRetry = retryableErrors.some(msg =>
        error.message?.includes(msg)
      ) || !error.message;

      return shouldRetry && attempt <= 3;
    },
    onRetry: (error, attempt, ...args) => {
      console.log(`[Retry ${attempt}] LLM response parsing failed:`, error.message);
      console.log(`[Retry ${attempt}] Attempting to regenerate response...`);
    },
    validateResult: (result) => {
      // 验证 LLM 返回的内容是否可以被正确解析
      if (!result || typeof result !== 'string') {
        return false;
      }

      try {
        const action = resolveAction(result);
        return action !== null && action !== undefined;
      } catch {
        return false;
      }
    },
    ...retryOptions
  };

  return withRetry(llmCall, defaultOptions);
};


/**
 * 增强的 coding 函数包装器
 * 用于替换原有的 coding 函数，添加重试机制
 */
const enhancedCoding = (originalCoding) => {
  return async (params = {}, context = {}) => {
    const { filepath } = context;
    const { conversation_id = '' } = context;

    // 包装 LLM 调用部分
    const callLLMWithRetry = withLLMRetry(
      async () => {
        const chat_completion = require('@src/agent/chat-completion/index')
        const { resolveTemplate } = require("@src/utils/template");
        const fs = require('fs');
        const path = require('path');

        const template_path = path.join(__dirname, 'template.txt');
        const template = fs.readFileSync(template_path, 'utf-8');

        const full_code = fs.readFileSync(filepath, 'utf-8');
        const template_options = {
          full_code,
          selection: params.selection,
          requirement: params.requirement
        };
        const prompt = await resolveTemplate(template, template_options);

        const content = await chat_completion(prompt, {}, conversation_id)

        return content;
      },
      {
        maxRetries: 3,
        delay: 2000,
        onRetry: async (error, attempt) => {
          console.log(`[Attempt ${attempt}] Retrying LLM call due to:`, error.message);
          // 可以在这里添加额外的提示词优化逻辑
        }
      }
    );

    try {
      const content = await callLLMWithRetry();

      const action = resolveAction(content);
      if (!action) {
        throw new Error('Failed to resolve action from LLM response');
      }

      const { execute: execute_action } = require('./execute.js');
      const result = await execute_action(action, context);
      console.log('result', result);

      return result;
    } catch (error) {
      console.error('Enhanced coding failed after all retries:', error);
      throw error;
    }
  };
};

module.exports = {
  withRetry,
  withLLMRetry,
  enhancedCoding
};