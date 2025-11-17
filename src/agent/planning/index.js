require("module-alias/register");
require("dotenv").config();

const sub_server_request = require('@src/utils/sub_server_request')

const { getDefaultModel } = require('@src/utils/default_model')

const planning = async (goal, options) => {
  const { conversation_id } = options;
  let model_info = await getDefaultModel(conversation_id)
  if (model_info.is_subscribe) {
    let clean_tasks = await planning_server(goal, options)
    return clean_tasks
  }

  let clean_tasks = await planning_local(goal, options)
  return clean_tasks
};

const planning_server = async (goal, options) => {
  const { conversation_id, files, previousResult } = options;
  // const [res, token_usage] = await sub_server_request('/api/sub_server/planning', {
  const res = await sub_server_request('/api/sub_server/planning', {
    goal,
    options
  })

  return res
};

const resolvePlanningPromptBP = require("@src/agent/prompt/plan");
const { resolveMarkdown } = require("@src/utils/markdown");
const resolveThinking = require("@src/utils/thinking");
const retryWithFormatFix = require("./retry_with_format_fix");

const planning_local = async (goal, options = {}) => {
  const { conversation_id } = options;
  const prompt = await resolvePlanningPromptBP(goal, options);

  // 结果处理器
  const processResult = async (markdown) => {
    // 处理 thinking 标签
    if (markdown && markdown.startsWith('<think>')) {
      const { content: output } = resolveThinking(markdown);
      markdown = output;
    }
    const tasks = await resolveMarkdown(markdown);
    return tasks || [];
  };
  // 验证函数
  const validate = (tasks) => Array.isArray(tasks) && tasks.length > 0;

  return await retryWithFormatFix(prompt, processResult, validate, conversation_id);
}
module.exports = exports = planning;
