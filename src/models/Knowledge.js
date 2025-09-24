const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class KnowledgeTable extends Model { }

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
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_learned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否通过学习其他agent的knowledge而来'
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

KnowledgeTable.init(fields, {
  sequelize,
  modelName: 'knowledge'
});

module.exports = exports = KnowledgeTable;