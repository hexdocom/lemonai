// utils/dailyPoints.js

const { Op } = require('sequelize');
const PointAccount = require('@src/models/PointAccount');
const PointsTransaction = require('@src/models/PointsTransaction');
const PointsTransactionTotal = require('@src/models/PointsTransactionTotal');
const UserMembership = require('@src/models/UserMembership');

/**
 * 为会员用户每日赠送1000积分
 * @param {number} userId - 用户ID
 * @returns {Promise<boolean>} 是否赠送成功
 */
async function grantDailyPoints(userId) {
  try {
    // 检查用户是否是会员
    const membership = await UserMembership.findOne({
      where: {
        user_id: userId,
        is_active: true,
        end_date: { [Op.gt]: new Date() }
      }
    });

    if (!membership) {
      return false; // 非会员用户不赠送积分
    }

    const DAILY_POINTS = 1000;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 设置为当天的23:59:59作为过期时间

    // 查找或创建会员每日积分账户
    let dailyAccount = await PointAccount.findOne({
      where: {
        user_id: userId,
        point_type: 'DAILY_GIFT'
      }
    });

    if (dailyAccount) {
      // 如果账户存在，更新余额和过期时间
      await dailyAccount.update({
        balance: DAILY_POINTS,
        expiration_date: today
      });
    } else {
      // 如果账户不存在，创建新账户
      dailyAccount = await PointAccount.create({
        user_id: userId,
        point_type: 'DAILY_GIFT',
        balance: DAILY_POINTS,
        expiration_date: today
      });
    }

    // 记录积分赠送交易
    await PointsTransaction.create({
      user_id: userId,
      point_type: 'DAILY_GIFT',
      type: 'credit',
      amount: DAILY_POINTS,
      source_type: 'daily_gift',
      source_id: null,
      description: 'Daily membership points grant',
      current_points_balance: DAILY_POINTS
    });

    // 记录积分赠送到总交易表
    await PointsTransactionTotal.create({
      user_id: userId,
      point_type: 'DAILY_GIFT',
      type: 'credit',
      amount: DAILY_POINTS,
      source_type: 'daily_gift',
      source_id: null,
      description: 'Daily membership points grant',
      current_points_balance: DAILY_POINTS
    });

    return true;
  } catch (error) {
    console.error('Grant daily points error:', error);
    return false;
  }
}

/**
 * 清零所有过期的每日积分
 * @returns {Promise<number>} 清零的用户数量
 */
async function clearExpiredDailyPoints() {
  try {
    const now = new Date();
    
    // 查找所有过期的每日积分账户
    const expiredAccounts = await PointAccount.findAll({
      where: {
        point_type: 'DAILY_GIFT',
        balance: { [Op.gt]: 0 },
        expiration_date: { [Op.lt]: now }
      }
    });

    let clearedCount = 0;
    
    for (const account of expiredAccounts) {
      const oldBalance = account.balance;
      
      // 清零余额
      await account.update({ balance: 0 });
      
      // 记录清零交易
      await PointsTransaction.create({
        user_id: account.user_id,
        point_type: 'DAILY_GIFT',
        type: 'debit',
        amount: oldBalance,
        source_type: 'daily_expiration',
        source_id: null,
        description: 'Daily membership points expiration cleanup',
        current_points_balance: 0
      });

      // 记录清零交易到总交易表
      await PointsTransactionTotal.create({
        user_id: account.user_id,
        point_type: 'DAILY_GIFT',
        type: 'debit',
        amount: oldBalance,
        source_type: 'daily_expiration',
        source_id: null,
        description: 'Daily membership points expiration cleanup',
        current_points_balance: 0
      });
      
      clearedCount++;
    }

    return clearedCount;
  } catch (error) {
    console.error('Clear expired daily points error:', error);
    return 0;
  }
}

/**
 * 为所有会员用户批量赠送每日积分
 * @returns {Promise<number>} 赠送成功的用户数量
 */
async function grantDailyPointsForAllMembers() {
  try {
    // 获取所有活跃的会员用户
    const activeMembers = await UserMembership.findAll({
      where: {
        is_active: true,
        end_date: { [Op.gt]: new Date() }
      },
      attributes: ['user_id']
    });

    let successCount = 0;
    
    for (const member of activeMembers) {
      const success = await grantDailyPoints(member.user_id);
      if (success) {
        successCount++;
      }
    }

    return successCount;
  } catch (error) {
    console.error('Grant daily points for all members error:', error);
    return 0;
  }
}

/**
 * 每日积分处理任务
 * 先清零过期积分，然后赠送新的积分
 */
async function processDailyPoints() {
  try {
    console.log('开始处理每日积分任务...');
    
    // 先清零过期的积分
    const clearedCount = await clearExpiredDailyPoints();
    console.log(`已清零 ${clearedCount} 个用户的过期每日积分`);
    
    // 然后为所有会员赠送新的每日积分
    const grantedCount = await grantDailyPointsForAllMembers();
    console.log(`已为 ${grantedCount} 个会员用户赠送每日积分`);
    
    return { clearedCount, grantedCount };
  } catch (error) {
    console.error('Process daily points error:', error);
    return { clearedCount: 0, grantedCount: 0 };
  }
}

module.exports = {
  grantDailyPoints,
  clearExpiredDailyPoints,
  grantDailyPointsForAllMembers,
  processDailyPoints
};