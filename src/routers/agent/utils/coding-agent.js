const AgenticAgent = require("@src/agent/AgenticAgent");
const Agent = require('@src/models/Agent');
const { getMessageHistory } = require('./coding-messages');

// Get agent information and context
async function getAgentContext(agent_id, conversation_id) {
  if (!agent_id) {
    return {
      agent: null,
      messages: []
    };
  }

  try {
    // Get agent configuration
    const agent = await Agent.findOne({ where: { id: agent_id } });
    if (!agent) {
      console.warn(`Agent ${agent_id} not found`);
      return { agent: null, messages: [] };
    }

    // Get conversation history
    const messages = await getMessageHistory(conversation_id);

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        model_id: agent.model_id,
        mcp_server_ids: agent.mcp_server_ids || [],
        settings: agent.settings || {},
        knowledge_count: agent.knowledge_count || 0
      },
      messages
    };
  } catch (error) {
    console.error('Failed to get agent context:', error);
    return { agent: null, messages: [] };
  }
}

// Create and initialize agent instance
async function initializeAgent(params) {
  const {
    conversation_id,
    user_id,
    agent_id,
    mcp_server_ids = [],
    onTokenStream
  } = params;

  // Build context for AgenticAgent
  const context = {
    onTokenStream,
    conversation_id,
    user_id,
    mcp_server_ids,
    agent_id,
    planning_mode: 'search'
  };

  const agent = new AgenticAgent(context);
  return agent;
}

// Execute agent task
async function executeAgentTask(agent, question) {
  try {
    const result = await agent.run(question);
    return { success: true, result };
  } catch (error) {
    console.error('Agent execution failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAgentContext,
  initializeAgent,
  executeAgentTask
};