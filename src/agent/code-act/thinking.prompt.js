const resolveToolPrompt = require('@src/agent/prompt/tool');

// 提示词转换函数
const { describeLocalMemory, loadConversationMemory, describeUploadFiles, describeSystem } = require("./thinking.util");

const resolveServers = require("@src/mcp/server.js");
const { resolveMcpServerPrompt } = require("@src/mcp/prompt.js");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const { resolveThinkingKnowledge } = require("@src/knowledge/index");

// 模板加载解析
const { resolveTemplate, loadTemplate } = require("@src/utils/template");

const { resolveEvaluateOptions } = require("./evaluate.prompt");

const resolveThinkingPrompt = async (requirement = '', context = {}) => {

  const { reflection = '', goal = '', depth = 1 } = context;
  global.logging(context, 'thinking.prompt', `goal: ${goal}`);

  const memory = await describeLocalMemory(context);
  const tools = await resolveToolPrompt(); // system tools
  const servers = await resolveServers(context);
  const mcpToolsPrompt = await resolveMcpServerPrompt(servers); // mcp server tools
  // console.log("mcpToolsPrompt", mcpToolsPrompt);
  const uploadFileDescription = describeUploadFiles(context.files || []);
  const previousResult = await loadConversationMemory(context.conversation_id);
  const app_ports = JSON.stringify([context.runtime.app_port_1, context.runtime.app_port_2])
  const system = describeSystem();
  const knowledge = await resolveThinkingKnowledge(context);

  const thinking_options = {
    system, // 系统信息
    app_ports, // 端口信息
    previous: previousResult, // 前置记录结果
    memory, // 执行记录
    files: uploadFileDescription, // 上传文件信息
    goal, // 主任务目标
    requirement, // 当前需求
    reflection, // 反馈信息
    best_practices_knowledge: knowledge,
    tools: tools + '\n' + mcpToolsPrompt // 工具列表
  }

  // 动态评估提示词
  const evaluate_options = await resolveEvaluateOptions(context);
  Object.assign(thinking_options, evaluate_options)
  global.logging(context, 'thinking.prompt', `evaluate_options.current_plan: ${evaluate_options.current_plan}`);

  const promptTemplate = await loadTemplate('thinking.txt');
  const thinking_prompt = await resolveTemplate(promptTemplate, thinking_options)

  return thinking_prompt;
}

module.exports = resolveThinkingPrompt;