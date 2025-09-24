const FileStorage = require('./FileStorage');

const { resolveUsedKnowledgeForCategory } = require('./knowledge.util')

const resolveThinkingKnowledge = async (context) => {
  // const agent_type = context.agent_type || 'coding';
  // const storage = new FileStorage({
  //   directory: agent_type
  // });
  const memories = await resolveUsedKnowledgeForCategory(context.agent_id, ['user_profile', 'execution', 'core_directive'])
  console.log('memories', memories);
  return memories.map(item => item.content).join('\n');
}

const resolvePlanningKnowledge = async (context) => {
  // const agent_type = context.agent_type || 'planning';
  // const storage = new FileStorage({
  //   directory: agent_type
  // });
  const memories = await resolveUsedKnowledgeForCategory(context.agent_id, ['user_profile', 'core_directive', 'planning'])
  return memories.map(item => item.content).join('\n');
}

module.exports = exports = {
  resolveThinkingKnowledge,
  resolvePlanningKnowledge
}
