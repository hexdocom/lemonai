const thinking = require("./thinking");

const LocalMemory = require("@src/agent/memory/LocalMemory");
const { isPauseRequiredError } = require("@src/utils/errors");

// Reflection module
const reflection = require("@src/agent/reflection/index");
const MAX_RETRY_TIMES = 3;
const MAX_TOTAL_RETRIES = 10; // add：max retries times 
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { resolveActions } = require("@src/xml/index");

const { finish_action, retryHandle } = require("./code-act.common");

const { checkActionToBeContinue, completeMessagesContent } = require("./message");

// const MAX_CONTENT_LENGTH = 1e5;
const MAX_CONTENT_LENGTH = 5 * 1e4;

/**
 * Execute code behavior until task completion or maximum retry times reached
 * @param {Object} task - Task object containing requirement and id
 * @param {Object} context - Context object
 * @returns {Promise<Object>} - Task execution result
 */
const completeCodeAct = async (task = {}, context = {}) => {
  // Initialize parameters and environment
  const { requirement, id = 1, depth = 1 } = task;
  if (depth > 1) {
    // const task_manager = context.task_manager;
    // process.exit(0);
  }
  const maxRetries = context.max_retry_times || MAX_RETRY_TIMES;
  const maxTotalRetries = context.max_total_retries || MAX_TOTAL_RETRIES; // use context or default value

  // Initialize memory and runtime
  const memory_dir = context.conversation_id.slice(0, 6);
  const memory = new LocalMemory({ memory_dir: memory_dir, key: id });
  context.memory = memory;
  memory._loadMemory();
  // @ts-ignore

  let retryCount = 0;
  let totalRetryAttempts = 0; // add：total retries times counter

  const handleRetry = async () => {
    retryCount++;
    totalRetryAttempts++;
    context.retryCount = retryCount;
    await delay(500);
  }

  // Main execution loop
  while (true) {
    try {
      // 1. LLM thinking
      context.depth = depth || 1;
      let content = await thinking(requirement, context);
      // console.log("thinking.result", content);

      // 2. Parse Action
      // try to parse action directly avoid llm don't continue
      const actions = await resolveActions(content);
      let action = actions[0];
      const messages = await memory.getMessages();
      if (!action) {
        // Try to parse action again with all previous assistant messages
        content = completeMessagesContent(messages);
        const actions = resolveActions(content);
        action = actions[0];
      }
      console.log("action", action);

      if (action && action.type === 'parse_error') {
        await memory.addMessage('user', action.params?.message || 'resolve action failed, Please only generate valid xml format content');
        await handleRetry();
        continue;
      }

      /**
       * 任务处理
       */
      if (action && action.type === 'revise_plan') {
        return {
          status: 'revise_plan',
          params: action.params
        }
      }


      if (action && action.type === 'pause_for_user_input') {
        return {
          status: 'pause_for_user_input',
          params: action.params
        }
      }

      /**
       * 3. Action parse failed
       * ①. The max_tokens length is not enough, need to continue to supplement and improve
       * ②. The model return format is incorrect, parse action again
       */
      if (!action) {

        // Exceeded maximum length
        console.log("content.length", content.length, MAX_CONTENT_LENGTH);
        if (content.length > MAX_CONTENT_LENGTH) {
          return {
            status: "failure",
            comments: `Model output exception, stopping task`,
          }
        }

        // use retryHandle to handle retry logic
        const { shouldContinue, result } = retryHandle(retryCount, totalRetryAttempts, maxRetries, maxTotalRetries);
        if (!shouldContinue) {
          return result;
        }

        // Feedback invalid format
        await memory.addMessage('user', "resolve action failed, Please only generate valid xml format content");

        await handleRetry();
        continue;
      }

      // 4. Check if action is 'finish' (task completed)
      if (action.type === "finish") {
        const result = await finish_action(action, context, task.id);
        return result;
      }

      // Check if action is 'to be continue' to completion content
      const actionToBeContinue = checkActionToBeContinue(action);
      if (actionToBeContinue === 'to be continue') {
        continue;
      }

      // 5. Execute action
      const action_result = await context.runtime.execute_action(action, context, task.id);
      if (!context.generate_files) {
        context.generate_files = [];
      }
      if (action_result.meta && action_result.meta.filepath) {
        context.generate_files.push(action_result.meta.filepath);
      }
      // console.log("action_result", action_result);

      // 6. Reflection and evaluation
      const reflection_result = await reflection(requirement, action_result, context.conversation_id);
      const { status, comments } = reflection_result;

      // 7. Handle execution result
      if (status === "success") {
        retryCount = 0; // reset retryCount
        const { content } = action_result;
        const task_tool = task.tools && task.tools[0];
        if (action.type === task_tool) {
          const finish_result = { params: { message: content } }
          const result = await finish_action(finish_result, context, task.id);
          return result;
        }
        continue;
      } else if (status === "failure") {
        // use retryHandle to handle retry logic
        const { shouldContinue, result } = retryHandle(retryCount, totalRetryAttempts, maxRetries, maxTotalRetries, comments);
        if (!shouldContinue) {
          return result;
        }
        retryCount++;
        totalRetryAttempts++;
        // log reflection result to memory and context for further evaluation and refinement
        context.reflection = comments;
        console.log("code-act.memory logging user prompt");
        await memory.addMessage("user", comments);
        await delay(500);
        console.log(`Retrying (${retryCount}/${maxRetries}). Total attempts: ${totalRetryAttempts}/${maxTotalRetries}...`);
      }
    } catch (error) {
      // 8. Exception handling
      console.error("An error occurred:", error);

      // 检查是否为需要暂停的错误类型: 积分不足 | LLM 调用失败
      if (isPauseRequiredError(error)) {
        return {
          status: "failure",
          comments: error.message,
          error: error
        };
      }

      // 普通错误处理逻辑
      // use retryHandle to handle retry logic, pass in error message
      await memory.addMessage("user", error.message);
      const { shouldContinue, result } = retryHandle(retryCount, totalRetryAttempts, maxRetries, maxTotalRetries, error.message);
      if (!shouldContinue) {
        return result;
      }
      retryCount++;
      totalRetryAttempts++;
      console.log(`Retrying (${retryCount}/${maxRetries}). Total attempts: ${totalRetryAttempts}/${maxTotalRetries}...`);
    }
  }
};

module.exports = exports = completeCodeAct;
