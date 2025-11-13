const Message = require("@src/utils/message");

const finish_action = async (action, context, task_id) => {
  const { memory, onTokenStream } = context;
  const memorized_content = await memory.getMemorizedContent();
  const result = {
    status: "success",
    comments: "Task Success !",
    content: action.params.message,
    memorized: memorized_content,
    meta: {
      action_type: "finish",
    },
    timestamp: new Date().valueOf()
  };
  const msg = Message.format({ status: "success", task_id: task_id, action_type: 'finish', content: result.content, comments: result.comments, memorized: result.memorized });
  onTokenStream && onTokenStream(msg);
  await Message.saveToDB(msg, context.conversation_id);
  return result;
}

/**
 * Helper function to handle retry logic
 * @param {number} retryCount - Current consecutive retry count
 * @param {number} totalRetryAttempts - Current total retry attempts
 * @param {number} maxRetries - Maximum consecutive retry count
 * @param {number} maxTotalRetries - Maximum total retry attempts
 * @param {string} errorMessage - Error message (optional)
 * @returns {Object} - Contains whether to continue retrying and error result (if termination is needed)
 */
const retryHandle = (retryCount, totalRetryAttempts, maxRetries, maxTotalRetries, errorMessage = "") => {
  // check if max consecutive retry times is reached
  if (retryCount >= maxRetries) {
    return {
      shouldContinue: false,
      result: {
        status: "failure",
        comments: `Reached the maximum number of consecutive ${errorMessage ? "exceptions" : "execution failures"} (${maxRetries})${errorMessage ? ": " + errorMessage : ""}`,
      },
    };
  }
  // check if max total retry times is reached
  if (totalRetryAttempts >= maxTotalRetries) {
    return {
      shouldContinue: false,
      result: {
        status: "failure",
        comments: `Reached the maximum total retry attempts (${maxTotalRetries})${errorMessage ? ": " + errorMessage : ""}`,
      },
    };
  }
  // can continue retry
  return { shouldContinue: true };
};

module.exports = exports = {
  finish_action,
  retryHandle,
};
