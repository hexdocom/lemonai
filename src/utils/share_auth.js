const Agent = require('@src/models/Agent')

async function auth_check(current_user_id, conversation_user_id, conversation) {
  if (current_user_id !== conversation_user_id) {
    const agent = await Agent.findOne({ where: { id: conversation.dataValues.agent_id } })
    if (agent.dataValues.is_public) {
      return true
    } else if (conversation.dataValues.is_share) {
      return true
    } else {
      return false
    }
  } else {
    return true
  }
}

module.exports = {
  auth_check
};

