const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class ModelTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Model ID'
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Logo URL'
  },
  platform_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Platform ID'
  },
  model_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Model ID'
  },
  model_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Model Name'
  },
  group_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Group Name'
  },
  model_types: {
    type: DataTypes.JSON,
    comment: 'Model Types'
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

ModelTable.init(fields, {
  sequelize,
  modelName: 'model'
});

module.exports = exports = ModelTable;