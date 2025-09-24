const sequelize = require('./index.js');
const { Model, DataTypes } = require("sequelize");

class SysUser extends Model { }

const fields = {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: '用户ID'
  },
  points: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
    defaultValue: '0.0000',
    comment: '用户当前积分余额'
  },
  user_name: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: '',
    comment: '用户名'
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '',
    comment: '中国手机不带国家代码，国际手机号格式为：国家代码-手机号'
  },
  user_nickname: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '',
    comment: '用户昵称'
  },
  birthday: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '生日'
  },
  user_password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '登录密码;cmf_password加密'
  },
  user_salt: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: '加密盐'
  },
  user_status: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
    comment: '用户状态;0:禁用,1:正常,2:未验证'
  },
  user_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '',
    comment: '用户登录邮箱'
  },
  sex: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '性别;0:保密,1:男,2:女'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '用户头像'
  },
  dept_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '部门id'
  },
  remark: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '备注'
  },
  is_admin: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '是否后台管理员 1 是 0 否'
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '联系地址'
  },
  describe: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '描述信息'
  },
  last_login_ip: {
    type: DataTypes.STRING(15),
    allowNull: false,
    defaultValue: '',
    comment: '最后登录ip'
  },
  last_login_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '删除时间'
  },
  open_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '',
    comment: '微信open id'
  },
  stripe_user_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '',
    comment: 'stripe_user_id'
  },
  e2b_sandbox_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '',
    comment: 'e2b 容器id'
  },
  invited_by_user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '邀请该用户的邀请人ID'
  },
  used_invite_code_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '注册时使用的邀请码ID'
  },
};

SysUser.init(fields, {
  sequelize,
  modelName: 'sys_user',
  tableName: 'sys_user', // 可选，确保映射到正确的表名
  timestamps: false, // 因为我们手动定义了 created_at / updated_at / deleted_at
});

module.exports = exports = SysUser;