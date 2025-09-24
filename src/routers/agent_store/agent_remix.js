const Agent = require("@src/models/Agent");
const Knowledge = require('@src/models/Knowledge')
const { Op } = require("sequelize");

const agent_remix = async (agent_id,user_id) => { 
    try {
        await Agent.increment('direct_reference_count', { by: 1, where: { id: agent_id } });
        await Agent.increment('total_reference_count', { by: 1, where: { id: agent_id } });
    
        const agent = await Agent.findOne({ where: { id: agent_id } })
    
        const knowledges = await Knowledge.findAll({
          where: {
            agent_id,
            category: { [Op.in]: ['planning', 'execution', 'core_directive'] }
          }
        });
    
        const new_agent = await Agent.create({
          user_id,
          name: agent.dataValues.name,
          describe: agent.dataValues.describe,
          screen_shot_url:agent.dataValues.screen_shot_url,
          is_public: true,
          knowledge_count: knowledges.length,
          source_agent_ids: [agent_id]
        })
    
    
        let insert_knowledges = knowledges.map(item => {
          return {
            'user_id': user_id,
            'agent_id': new_agent.dataValues.id,
            'category': item.dataValues.category,
            'content': item.dataValues.content,
            'is_learned': true
          }
        })
    
        await Knowledge.bulkCreate(insert_knowledges)
    
        return new_agent
      } catch (e) {
        console.log(e)
        return null
      }
}

module.exports = exports = agent_remix