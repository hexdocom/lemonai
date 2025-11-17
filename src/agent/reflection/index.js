// https://www.promptingguide.ai/zh/techniques/reflexion
const llmEvaluate = require('./llm.evaluate');
const { resolveXML } = require("@src/xml/index");

/**
 * 1. Evaluate based on environment execution
 * 2. Evaluate based on large language model
 */
const STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
}

const reflection = async (requirement, action_result = {}, conversation_id) => {

  // 1. evaluate action result
  const { status, content } = action_result;
  // If Action execute failed, return error message
  if (status === STATUS.FAILURE && action_result.error) {
    return {
      status: STATUS.FAILURE,
      comments: action_result.error,
    }
  }

  if (status === STATUS.SUCCESS) {
    return {
      status: STATUS.SUCCESS,
      comments: action_result.content,
    }
  }

  // 2. evaluate action result by llm [暂缓执行]
  const evaluation = await llmEvaluate(requirement, content, conversation_id);
  const result = resolveXML(evaluation);
  return result.evaluation;
}

module.exports = exports = reflection;