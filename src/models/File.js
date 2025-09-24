const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class FileTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Model ID'
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '用户ID'
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Conversation ID'
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'url'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Title'
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
  }
};

FileTable.init(fields, {
  sequelize,
  modelName: 'file'
});


module.exports = exports = FileTable;