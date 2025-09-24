require("module-alias/register");
require("dotenv").config();

const call = require("@src/utils/llm");
const resolveGenerateAgentPrompt = require("@src/agent/prompt/generate_knowledge");
const { resolveUsedKnowledgeForCategory } = require('@src/knowledge/knowledge.util')

const generate_knowledge = async (question, agents, conversation_id) => {
  for (let agent of agents) {
    let knowledges = await resolveUsedKnowledgeForCategory(agent.id, ['planning', 'execution', 'core_directive'])
    agent.knowledges = knowledges
  }
  const prompt = await resolveGenerateAgentPrompt(question, JSON.stringify(agents));
  const content = await call(prompt, conversation_id, '', { response_format: 'json' });

  return content;
}

// generate_knowledge("我想带狗去苏州玩，帮我规划一下",[{"id":2,"name":"北京带狗出行","describe":"在北京带狗出行游玩的agent"}],'5b2e2df3-8788-44d3-8dd4-8549746e6266')

module.exports = exports = generate_knowledge;
