const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class MessageTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'ID'
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '用户ID'
  },
  role: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Role'
  },
  uuid: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'UUID'
  },
  conversation_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Conversation ID'
  },
  status: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Status'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Content'
  },
  timestamp: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Timestamp'
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Meta'
  },
  comments: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Comments'
  },
  memorized: {
    type: DataTypes.TEXT,
    defaultValue: '',
    allowNull: true,
    comment: 'Memorized'
  },
  create_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Created At'
  },
  update_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Updated At'
  }
};

MessageTable.init(fields, {
  sequelize,
  modelName: 'message'
});

module.exports = exports = MessageTable;