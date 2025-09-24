// utils/point.js

const { Op } = require('sequelize');
const Model = require('@src/models/Model')
const Conversation = require('@src/models/Conversation')

const POINT_COEFFICIENT = process.env.POINT_COEFFICIENT || 1;

// 积分类型优先级
const POINT_PRIORITY = [
  'daily_gift', // 会员每日赠送积分
  'monthly',    // 月度积分
  'gift',       // 赠送附加积分
  'purchased_addon',   // 购买附加积分
  'feedback',   // 反馈的附加积分
  'free',       // 免费积分
];


// token转积分
function tokensToPoints({ input_tokens = 0, output_tokens = 0 }, { input_price_per_million, output_price_per_million }) {
  // 1美元=1000积分，1美元=7.2元人民币
  const USD_TO_POINTS = 1000;
  // 从环境变量读取积分系数，默认为1
  const pointCoefficient = parseFloat(String(POINT_COEFFICIENT)) || 1.0;
  // 从配置读取价格
  const inputUsd = (input_tokens / 1_000_000) * input_price_per_million;
  const outputUsd = (output_tokens / 1_000_000) * output_price_per_million;
  const inputPoints = parseFloat((inputUsd * USD_TO_POINTS * pointCoefficient).toFixed(4));
  const outputPoints = parseFloat((outputUsd * USD_TO_POINTS * pointCoefficient).toFixed(4));
  return {
    inputPoints,
    outputPoints,
    totalPoints: parseFloat((inputPoints + outputPoints).toFixed(4)),
  };
}

async function deductPoints(user_id, token_usage, conversation_id) {
  const conversation = await Conversation.findOne({ where: { conversation_id } })
  const model = await Model.findOne({ where: { id: conversation.dataValues.model_id } })
  const { inputPoints, outputPoints, totalPoints } = tokensToPoints(token_usage, { input_price_per_million: model.dataValues.input_price_per_million, output_price_per_million: model.dataValues.output_price_per_million })
  // 扣费优先级 会员每日赠送的积分>月度积分>赠送附加积分>购买附加积分>反馈的附加积分>免费积分

  return deductPointsForPoint(user_id, inputPoints, outputPoints, conversation_id)
}

async function deductPointsForPoint(user_id, inputPoints, outputPoints, conversation_id, meta) {
  
  // 如果积分不足，remainCost>0，实际扣除的积分会小于cost
  return {  };
}

async function recordUsagePoint(cost, user_id, conversation_id) {
  if (user_id && conversation_id) {
    const [conversation, created] = await Conversation.findOrCreate({
      where: { conversation_id: conversation_id, user_id: user_id },
      defaults: {
        title: 'New Conversation',
        content: '',
        usage_point: 0
      }
    });
    await conversation.increment('usage_point', { by: cost });
  }
}

async function calRuntimePoint(second) {
  // 每小时消耗 0.3 元人民币
  const RMB_PER_HOUR = 0.3;
  const SECONDS_PER_HOUR = 3600;
  const USD_TO_POINTS = 1000; // 1美元=1000积分
  const USD_TO_RMB = 7.2; // 1美元=7.2元人民币

  // 每秒消耗的人民币
  const rmbPerSecond = RMB_PER_HOUR / SECONDS_PER_HOUR;
  // 总消耗人民币
  const totalRmb = second * rmbPerSecond;
  // 换算成美元
  const totalUsd = totalRmb / USD_TO_RMB;
  // 换算成积分
  const totalPoints = totalUsd * USD_TO_POINTS;

  // 保留4位小数
  return parseFloat(totalPoints.toFixed(4));
}

module.exports = exports = {
  tokensToPoints,
  deductPoints,
  deductPointsForPoint,
  calRuntimePoint
};