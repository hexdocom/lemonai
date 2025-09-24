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
  input_price_per_million: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '每百万token输入价格（美元）',
    default: 0
  },
  output_price_per_million: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '每百万token输出价格（美元）',
    default: 0
  },
  requires_membership: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否需要会员权限才能使用该模型'
  },
  membership_level: {
    type: DataTypes.ENUM('Pro', 'Business'),
    allowNull: true,
    comment: '需要的会员级别：Pro会员能用说明Business也能用，Business只有Business能用'
  },
  price_level_description: {
    type: DataTypes.ENUM('cheap', 'normal', 'expensive', 'very_expensive', 'ridiculous_expensive'),
    allowNull: false,
    defaultValue: 'normal',
    comment: 'Price level description (cheap, normal, expensive, very_expensive, ridiculous_expensive)'
  },
  price_level_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  sort_weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序权重，值越大越靠前'
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