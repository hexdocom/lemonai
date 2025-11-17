const { type } = require('os');
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
  agent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mode_type:{
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'task',
    comment: 'Task type' // current mode: task(default) , chat
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Conversation ID'
  },
  selected_repository: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Associated Code Repository'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Title'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Content'
  },
  input_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Input Tokens',
    defaultValue: 0
  },
  output_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Output Tokens',
    defaultValue: 0
  },
  usage_point: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
    comment: '消耗的积分',
    defaultValue: 0
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
  is_favorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is Favorite'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Delete Time (for soft delete)'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'done',
    comment: 'Status'
  },
  is_from_sub_server: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is From Sub Server'
  },
  model_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'model id',
  },
  docset_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Aryn Docset ID for document parsing',
  },
  twins_id:{
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'twins id',
  }
  // is_public: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: true
  // },
  // screen_shot_url:{
  //   type: DataTypes.STRING,
  //   allowNull: true,
  //   comment: '截屏url'
  // },
  // recommend:{
  //   type: DataTypes.INTEGER,
  //   defaultValue: 0,
  //   comment: '推荐次数'
  // },
};

ConversationTable.init(fields, {
  sequelize,
  modelName: 'conversation'
});


module.exports = exports = ConversationTable;