// utils/message.js
const MessageTable = require('@src/models/Message');
const Conversation = require('@src/models/Conversation')
class Message {
  /**
   * 构建消息格式
   * @param {Object} params 参数对象
   * @param {('success'|'failure'|'running')} params.status 成功或失败
   * @param {string} [params.content] 文本内容
   * @param {string} [params.task_id]
   * @param {('plan'|'task'|'auto_reply'|'finish'|'search'|'file'|'terminal'|'todo'|'browser'|'question'|'finish_summery'|'progress')} [params.action_type]
   * @param {string} [params.filepath]
   * @param {string} [params.url]
   * @param {Array} [params.json]
   * @param {string} [params.comments]
   * @param {boolean} [params.memorized]
   * @param {string} [params.role]
   * @param {string} [params.uuid] 
   * @param {string} [params.meta_content]
   * @returns {Object}
   */
  static format({ status, content = '', task_id = '', action_type = '', filepath = '', url = '', json = [], comments = '', memorized = '', uuid = '', role = 'assistant', meta_content = '', pid = '', type = '', is_active = true }) {
    return {
      role,
      uuid,
      status,
      content,
      comments,
      memorized,
      timestamp: new Date().valueOf(),
      type,
      meta: {
        pid,
        task_id,
        action_type,
        filepath,
        url,
        json,
        content: meta_content,
        is_active
      }
    };
  }

  /**
   * 存储消息到数据库
   * @param {Object} messageData 消息数据（与 format 返回结构相同）
   * @returns {Promise<MessageTable>}
   */
  static async saveToDB(messageData, conversation_id) {
    try {
      const conversation = await Conversation.findOne({ where: { conversation_id } })
      return await MessageTable.create({
        role: messageData.role,
        uuid: messageData.uuid,
        conversation_id: conversation_id,
        timestamp: messageData.timestamp,
        status: messageData.status,
        content: messageData.content,
        meta: JSON.stringify(messageData.meta),
        comments: messageData.comments,
        memorized: messageData.memorized,
        user_id: conversation.dataValues.user_id,
      });
    } catch (err) {
      console.error('保存消息失败:', err);
      throw err;
    }
  }
  static async updateToDB(messageData, conversation_id) {
  }
}

module.exports = Message;
