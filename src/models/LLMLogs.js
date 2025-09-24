const sequelize = require('./index.js');
const { DataTypes } = require("sequelize");
const BaseModel = require('./BaseModel.js');

class LLMLogs extends BaseModel { }

LLMLogs.init({
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Conversation ID'
  },
  model: {
    type: DataTypes.STRING(100),
    comment: 'Model'
  },
  prompt: {
    type: DataTypes.TEXT('long'),
    comment: 'Prompt'
  },
  messages: {
    type: DataTypes.JSON,
    comment: 'Messages'
  },
  content: {
    type: DataTypes.TEXT('long'),
    comment: 'Content'
  },
  json: {
    type: DataTypes.JSON,
    comment: 'JSON'
  },
}, {
  sequelize,
  tableName: 'llm_logs',
  timestamps: false,
  comment: 'LLM Logs'
});

module.exports = exports = LLMLogs;