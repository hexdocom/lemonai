const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class UserProviderConfigTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '用户ID'
  },
  provider_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Search Engine ID'
  },
  base_config: {
    type: DataTypes.JSON,
    comment: 'User Custom Configuration'
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

UserProviderConfigTable.init(fields, {
  sequelize,
  modelName: 'user_provider_config',
});

module.exports = exports = UserProviderConfigTable;