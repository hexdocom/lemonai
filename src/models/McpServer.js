const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class McpServerTable extends Model { }

const fields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'MCP Server ID'
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '用户ID'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'MCP Server Name'
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'MCP Server URL'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'MCP Server Description'
  },
  activate: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Is Active'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'stdio',
    comment: 'Server Type'
  },
  command: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Server Command'
  },
  registryUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Registry URL'
  },
  args: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Command Arguments'
  },
  env: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Environment Variables'
  },
  api_key: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'API Key'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
    comment: 'Is Default Server'
  },
  create_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: 'Created At'
  },
  update_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: 'Updated At'
  }
};

McpServerTable.init(fields, {
  sequelize,
  modelName: 'mcp_server',
  timestamps: false
});

module.exports = exports = McpServerTable;
