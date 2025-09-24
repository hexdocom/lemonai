const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class UserSearchSettingTable extends Model { }

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
  include_date: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether to automatically include date range filter in search results'
  },
  cover_provider_search: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether to cover the original search logic of the service provider'
  },
  enable_enhanced_mode: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether to enable AI enhanced search mode'
  },
  result_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: 'Number of search results'
  },
  blacklist: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Blacklist'
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

UserSearchSettingTable.init(fields, {
  sequelize,
  modelName: 'user_search_setting',
});

module.exports = exports = UserSearchSettingTable;