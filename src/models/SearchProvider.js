const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class SearchProviderTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Search Engine Name'
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Logo URL'
  },
  base_config_schema: {
    type: DataTypes.JSON,
    comment: 'Base Config Schema'
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

SearchProviderTable.init(fields, {
  sequelize,
  modelName: 'search_provider',
});

module.exports = exports = SearchProviderTable;