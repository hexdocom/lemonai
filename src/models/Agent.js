const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class ConversationTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Model ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
    comment: 'name'
  },
  describe: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'describe'
  },
  mcp_server_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  direct_reference_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '此代理被用户直接引用的次数'
  },
  auto_reference_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '此代理被系统自动选择的次数'
  },
  // 新增字段：总的被引用次数
  total_reference_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '此代理被引用的总次数'
  },
  // 新增字段：knowledge条目数
  knowledge_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'knowledge条目数'
  },
  // 新增字段：经验迭代次数
  experience_iteration_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '经验迭代次数'
  },
  screen_shot_url:{
    type: DataTypes.STRING,
    allowNull: true,
    comment: '截屏url'
  },
  source_agent_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: '此代理来自于哪些agent_id的数组'
  },
  replay_conversation_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '用来展示的conversation_id，如果是空，展示最新的'
  },
  recommend:{
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '推荐次数'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Delete Time (for soft delete)'
  },
  create_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Create Time'
  },
  update_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Update Time'
  },
};

ConversationTable.init(fields, {
  sequelize,
  modelName: 'agent'
});

module.exports = exports = ConversationTable;