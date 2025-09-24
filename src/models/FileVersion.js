const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class FileVersionTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Version ID'
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
  filepath: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '文件路径'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: '文件内容'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '版本号'
  },
  create_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Create Time'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否当前版本'
  }
};

FileVersionTable.init(fields, {
  sequelize,
  modelName: 'file_version',
  indexes: [
    {
      name: 'idx_conversation_filepath',
      fields: ['conversation_id', 'filepath']
    },
    {
      name: 'idx_user_conversation',
      fields: ['user_id', 'conversation_id']
    }
  ]
});

module.exports = exports = FileVersionTable;