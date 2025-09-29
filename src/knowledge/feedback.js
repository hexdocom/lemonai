require('module-alias/register')
require('dotenv').config();

const Agent = require('@src/models/Agent')

const { resolveUsedKnowledge, handleKnowledgeReflection } = require('./knowledge.util');
const chat_completion = require('@src/agent/chat-completion/index')

const handleReflection = async (reflection = {}, agent_id) => {
  try {
    const { reasoning, operations = [] } = reflection || {};
    console.log(reasoning);
    //更新迭代次数
    if (operations.some(op => op.action && op.action !== 'NO_ACTION')) {
      await Agent.increment('experience_iteration_count', { by: 1, where: { id: agent_id } });
    }
    for (const operation of operations) {
      await handleKnowledgeReflection(operation, agent_id)
    }
  } catch (error) {
    console.log(error);
  }
}

const { resolveTemplate, loadTemplate } = require("@src/utils/template");

const handle_feedback = async (options = {}) => {
  try {
    const { user_request, user_feedback, conversation_id, agent_id } = options;
    const knowledge = await resolveUsedKnowledge(agent_id);
    console.log("========knowledge==========", knowledge);

    const interaction = {
      user_request,
      user_feedback,
    }

    const template = await loadTemplate('knowledge.txt');
    const knowledge_prompt = await resolveTemplate(template, {
      knowledge: JSON.stringify(knowledge, null, 2),
      interaction: JSON.stringify(interaction, null, 2)
    })

    const reflection = await chat_completion(knowledge_prompt, { response_format: 'json' }, conversation_id);
    console.log(JSON.stringify(reflection, null, 2));
    await handleReflection(reflection, agent_id)
  } catch (error) {
    console.log(error);
  }
}

module.exports = handle_feedback;