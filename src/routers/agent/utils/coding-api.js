/**
 * Simplified API for coding tasks
 * Can be used from anywhere in the codebase
 */

const { executeCoding } = require('./coding-executor');

/**
 * Simple API to execute coding task
 * @param {Object} params - Task parameters
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function runCodingTask(params) {
  const {
    conversation_id,
    agent_id,
    filepath,
    selection,
    requirement,
    userId,
    docsetId = null,
    onProgress = null
  } = params;

  return await executeCoding({
    conversation_id,
    agent_id,
    filepath,
    selection,
    requirement,
    userId,
    docsetId,
    onTokenStream: onProgress
  });
}

/**
 * Execute coding without setup (for internal use)
 * @param {Object} context - Pre-built context
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function runCodingDirect(context) {
  const { coding } = require("@src/editor/coding.js");

  try {
    const result = await coding(
      {
        selection: context.selection,
        requirement: context.requirement
      },
      context
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  runCodingTask,
  runCodingDirect
};