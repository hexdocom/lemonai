const FileStorage = require('@src/knowledge/FileStorage');
const Knowledge = require('@src/models/Knowledge');
const Agent = require('@src/models/Agent')
const { Op } = require('sequelize'); // 需要引入 Op
const resolveStorage = (storage_type = 'planning') => {
  const storage = new FileStorage({
    directory: storage_type
  });
  return storage;
}

const resolveMemory = (memory, category = 'planning') => {
  return {
    id: memory.id,
    content: memory.content,
    category: category,
  }
}

const resolveUsedKnowledge = async (agent_id) => {
  // const planning_storage = resolveStorage('planning');
  // const planning_memories = await planning_storage.getAll();
  // const planning_knowledge = planning_memories.map(item => resolveMemory(item, 'planning'));
  // const coding_storage = resolveStorage('coding');
  // const coding_memories = await coding_storage.getAll();
  // const coding_knowledge = coding_memories.map(item => resolveMemory(item, 'coding'));
  // return [...planning_knowledge, ...coding_knowledge];

  let konwlages = await Knowledge.findAll({ where: { agent_id } })
  let resolveKonwlages = konwlages.map(item => {
    return {
      id: item.dataValues.id,
      content: item.dataValues.content,
      category: item.dataValues.category
    }
  })
  return resolveKonwlages
}

const resolveUsedKnowledgeForCategory = async (agent_id, categories) => {
  let konwlages = await Knowledge.findAll({
    where: {
      agent_id,
      category: { [Op.in]: categories }
    }
  });
  let resolveKonwlages = konwlages.map(item => {
    return {
      id: item.dataValues.id,
      content: item.dataValues.content,
      category: item.dataValues.category
    }
  });
  return resolveKonwlages;
}

const handleKnowledgeReflection = async (reflection = {}, agent_id) => {
  const agent = await Agent.findOne({ where: { id: agent_id } })
  const { category, action, target_knowledge_id, new_knowledge } = reflection;
  // const storage = resolveStorage(category);
  switch (action) {
    case "ADD":
      // await storage.save({
      //   content: new_knowledge,
      // });
      await Knowledge.create({
        user_id: agent.dataValues.user_id,
        agent_id,
        content: new_knowledge,
        category: category
      })
      break;
    case "MODIFY":
      const updates = { content: new_knowledge };
      // await storage.update(target_knowledge_id, updates);
      await Knowledge.update(updates, { where: { id: target_knowledge_id, agent_id } })
      break;
    case "DELETE":
      // await storage.delete(target_knowledge_id);
      await Knowledge.destroy({ where: { id: target_knowledge_id, agent_id } })
      break;
  }
}

module.exports = {
  resolveUsedKnowledge,
  handleKnowledgeReflection,
  resolveUsedKnowledgeForCategory
}