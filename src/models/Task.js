const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class TaskTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Task ID'
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Conversation ID'
  },
  task_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Task ID'
  },
  requirement: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  result: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  memorized: {
    type: DataTypes.TEXT,
    allowNull: true,
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

TaskTable.init(fields, {
  sequelize,
  modelName: 'task'
});


module.exports = exports = TaskTable;