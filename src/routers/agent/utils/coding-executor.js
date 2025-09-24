const { coding } = require("@src/editor/coding.js");
const { getAgentContext, initializeAgent, executeAgentTask } = require('./coding-agent');
const { analyzeRequirementForAgent } = require('./coding-intent');

/**
 * Core coding execution logic
 * Step 1: Analyze if agent is needed
 * Step 2: Execute agent to gather information (if needed)
 * Step 3: Use agent results to execute coding
 */
async function executeCoding({
  conversation_id,
  agent_id,
  filepath,
  selection,
  screenshot,
  requirement,
  userId,
  onTokenStream,
  mcp_server_ids = []
}) {
  let agentResult = null;
  let agentContext = null;

  // Step 1: Analyze if agent is needed based on requirement
  let shouldUseAgent = false;
  let agentQuery = '';

  if (agent_id) {
    // Check if we should use agent based on requirement analysis
    const analysis = await analyzeRequirementForAgent(requirement, conversation_id);
    console.log('Agent requirement analysis:', analysis);

    shouldUseAgent = analysis.needsAgent;
    agentQuery = analysis.agentQuery;

    // Log decision for monitoring
    if (!shouldUseAgent) {
      console.log('Agent not needed for this requirement, proceeding directly with coding');
    }
  }

  // Step 2: Execute agent if needed
  if (agent_id && shouldUseAgent) {
    // Get agent context
    const { agent, messages } = await getAgentContext(agent_id, conversation_id);
    agentContext = agent;

    // Initialize and run agent to gather information
    const agentInstance = await initializeAgent({
      conversation_id,
      user_id: userId,
      agent_id,
      mcp_server_ids,
      onTokenStream
    });

    // Execute agent with the requirement to gather context
    const agent_goal = agentQuery || formatAgentGoal(requirement);
    console.log('coding pre agent goal:', agent_goal);
    const agentExecution = await executeAgentTask(agentInstance, agent_goal);

    if (agentExecution.success) {
      agentResult = agentExecution.result;
      console.log('Agent analysis completed:', agentResult);
    } else {
      console.warn('Agent execution failed:', agentExecution.error);
    }
  }

  // Step 3: Execute coding with agent results (if any)
  return await executeCodingWithRetry({
    filepath,
    selection,
    requirement,
    conversation_id,
    userId,
    agent: agentContext,
    agentResult,
    messages: [],
    onTokenStream
  });
}

/**
 * Format agent goal based on requirement
 */
function formatAgentGoal(requirement) {
  return `请根据下面的需求提供准确的内容信息返回, 不要写入到文件中, 请在总结中输出内容信息, 使用最少的步骤通过搜索/读取完成, 不要编造信息
需求是: ${requirement}`;
}

/**
 * Execute coding with retry wrapper
 */
async function executeCodingWithRetry(params = {}) {

  const { filepath, selection, requirement, conversation_id, userId, agent, agentResult, messages, onTokenStream } = params;

  const context = {
    filepath,
    conversation_id,
    user_id: userId,
    agent_context: agent,
    agent_result: agentResult,
    messages,
    onTokenStream
  };

  const information = agentResult?.summary || '';
  console.log('Information:', information);
  const options = { selection, requirement, information };
  return await coding(options, context);
}

module.exports = {
  executeCoding,
  executeCodingWithRetry,
  analyzeRequirementForAgent
};