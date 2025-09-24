const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class DefaultModelSettingTable extends Model { }

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
  setting_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Setting Type'
  },
  model_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Model ID'
  },
  config: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Configuration Information'
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

DefaultModelSettingTable.init(fields, {
  sequelize,
  modelName: 'default_model_setting'
});

module.exports = exports = DefaultModelSettingTable;