// 支付相关工具函数
const UserMembershipTable = require('@src/models/UserMembership')
const PointAccountTable = require('@src/models/PointAccount')
const PointsTransactionTable = require('@src/models/PointsTransaction')
const PointsTransactionTotalTable = require('@src/models/PointsTransactionTotal')
const Order = require('@src/models/Order')
const MembershipPlanTable = require('@src/models/MembershipPlan')

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const wechatPayUtils = require('@src/utils/wechatpay')
const { Op } = require('sequelize')

// 处理订阅升级逻辑的函数
async function handleSubscriptionUpgrade(subscriptionId, oldPlan, newPlan, upgradeOrderId = null, userId = null) {
  try {
    console.log(`开始处理订阅升级: ${oldPlan.dataValues.plan_name} -> ${newPlan.dataValues.plan_name}`);

    // 第一步 查找当前用户的会员记录
    let whereCondition = {
      is_active: true,
      end_date: {
        [Op.gt]: new Date() // 会员未过期
      }
    };
    // 如果有订阅ID，使用订阅ID查询（Stripe支付）
    if (subscriptionId) {
      whereCondition.subscription_id = subscriptionId;
    }
    // 如果没有订阅ID但有用户ID，使用用户ID查询（微信支付）
    else if (userId) {
      whereCondition.user_id = userId;
    } else {
      console.log('缺少必要参数: subscriptionId 或 userId');
      return false;
    }
    const currentMembership = await UserMembershipTable.findOne({
      where: whereCondition
    });

    if (!currentMembership) {
      console.log(`未找到订阅ID ${subscriptionId} 对应的活跃会员记录`);
      return false;
    }
    // 第二步 将当前会员记录作废
    await currentMembership.update({
      is_active: false
    });
    console.log(`已作废原会员记录 ID: ${currentMembership.id}`);
    // 第三步 重新创建新的会员记录
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + newPlan.dataValues.duration_days);

    const newMembership = await UserMembershipTable.create({
      user_id: currentMembership.user_id,
      membership_plan_id: newPlan.dataValues.id,
      subscription_id: subscriptionId,
      start_date: new Date(),
      end_date: newEndDate,
      is_active: true,
      order_id: upgradeOrderId || currentMembership.order_id  // 优先使用升级订单ID
    });
    console.log(`已创建新会员记录 ID: ${newMembership.id}, 结束时间: ${newEndDate.toISOString()}`)

    // 第四步 重置用户积分类型为 MONTHLY 类型数据，按照新计划的积分计算
    // 获取用户当前MONTHLY类型积分余额
    const pointAccount = await PointAccountTable.findOne({
      where: {
        user_id: newMembership.user_id,
        point_type: 'MONTHLY'
      }
    });
    const newPlanPoints = newPlan.dataValues.monthly_points;

    console.log(`升级积分重置: 按新计划 ${newPlan.dataValues.plan_name} 重置积分为 ${newPlanPoints}`);
    console.log(`给用户${newMembership.user_id} 重置积分为: ${newPlanPoints}`);

    // 更新或创建积分账户
    if (pointAccount) {
      await pointAccount.update({
        balance: newPlanPoints,
        expiration_date: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
      });
      console.log(`会员积分余额已重置为: ${newPlanPoints}`);
    } else {
      await PointAccountTable.create({
        user_id: newMembership.user_id,
        point_type: 'MONTHLY',
        balance: newPlanPoints,
        expiration_date: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
      });
      console.log(`会员积分账户已创建: 积分余额为 ${newPlanPoints}`);
    }
    // 第五步 创建积分记录 备注是 升级会员 重置积分
    await PointsTransactionTable.create({
      user_id: newMembership.user_id,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newPlanPoints,
      source_type: 'membership_upgrade',
      source_id: newMembership.id,
      description: `Membership upgrade reset - ${newPlan.dataValues.plan_name} monthly points`,
      current_points_balance: newPlanPoints
    });
    await PointsTransactionTotalTable.create({
      user_id: newMembership.user_id,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newPlanPoints,
      source_type: 'membership_upgrade',
      source_id: newMembership.id,
      description: `Membership upgrade credits issued - ${newPlan.dataValues.plan_name}`,
      current_points_balance: newPlanPoints
    });
    console.log(`升级处理完成: 用户${newMembership.user_id} 积分已重置为 ${newPlanPoints}`);

    // // 清除升级相关的元数据，防止重复处理
    // action: "upgrade",
    // last_upgrade_plan_id: newPlan.dataValues.id,
    // last_upgrade_order_id: order.dataValues.id,
    // upgrade_status: "completed",
    // upgrade_method: "addon_discount",
    if (subscriptionId) {
      await clearSubscriptionMetadata(subscriptionId, [
        'action',
        'last_upgrade_plan_id',
        'last_upgrade_order_id',
        'upgrade_status',
        'upgrade_method'
      ]);
    }

    return true;

  } catch (error) {
    console.error('处理订阅升级时出错:', error);
    return false;
  }
}

// 处理订阅降级逻辑的函数
async function handleSubscriptionDowngrade(subscriptionInfo, invoice) {
  try {
    console.log("开始处理降级逻辑...");

    // 开始事务处理
    const sequelize = Order.sequelize;
    const transaction = await sequelize.transaction();

    try {
      // 根据目标价格ID查找新计划
      const targetPlan = await MembershipPlanTable.findOne({
        where: { stripe_price_id: subscriptionInfo.metadata.target_price_id }
      });

      if (!targetPlan) {
        throw new Error('Target downgrade plan not found');
      }

      console.log(`降级到新计划: ${targetPlan.plan_name}`);

      // 查找用户ID（通过现有的会员记录）
      const existingMembership = await UserMembershipTable.findOne({
        where: {
          subscription_id: subscriptionInfo.id,
          is_active: true,
          end_date: {
            [Op.gt]: new Date() // 会员未过期
          }
        }
      });

      if (!existingMembership) {
        throw new Error('No active membership found for subscription');
      }

      const userId = existingMembership.user_id;

      // 计算时间周期
      let plan = subscriptionInfo.items.data[0].price;
      const interval = plan.recurring.interval;
      const intervalCount = plan.recurring.interval_count || 1;
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);

      switch (interval) {
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + intervalCount);
          break;
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7 * intervalCount);
          break;
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
          break;
        case 'year':
          periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
          break;
        default:
          throw new Error(`Unsupported interval: ${interval}`);
      }

      const orderSn = `WC${Date.now()}${wechatPayUtils.generateNonceStr().substring(0, 10)}`;

      // 创建降级订单记录
      const downgradeOrder = await Order.create({
        user_id: userId,
        product_id: targetPlan.id,
        order_type: 'membership',
        amount: targetPlan.price,
        currency: 'USD',
        status: 'paid',
        paid_at: new Date(),
        order_sn: orderSn,
        transaction_id: invoice.id,
        payment_method: 'stripe'
      }, { transaction });

      console.log(`创建降级订单: ${downgradeOrder.id}`);

      // 停用旧的会员记录
      await existingMembership.update({
        is_active: false,
        end_date: new Date()
      }, { transaction });

      console.log(`停用旧会员记录: ${existingMembership.id}`);

      // 创建新的会员记录
      const newMembership = await UserMembershipTable.create({
        user_id: userId,
        membership_plan_id: targetPlan.id,
        subscription_id: subscriptionInfo.id,
        start_date: periodStart,
        end_date: periodEnd,
        is_active: true,
        order_id: downgradeOrder.id
      }, { transaction });

      console.log(`创建新会员记录: ${newMembership.id}`);

      // 处理积分重置逻辑
      if (targetPlan.monthly_points > 0) {
        // 查找用户现有的月度积分账户
        const existingMonthlyAccount = await PointAccountTable.findOne({
          where: {
            user_id: userId,
            point_type: 'MONTHLY'
          }
        });

        // 计算新的月度积分余额
        const newMonthlyBalance = targetPlan.monthly_points;

        if (existingMonthlyAccount) {
          // 更新现有账户
          const oldBalance = Number(existingMonthlyAccount.balance);
          await existingMonthlyAccount.update({
            balance: newMonthlyBalance,
            expiration_date: periodEnd
          }, { transaction });

          // 记录积分调整交易
          const adjustmentAmount = newMonthlyBalance - oldBalance;
          await PointsTransactionTable.create({
            user_id: userId,
            point_type: 'MONTHLY',
            type: adjustmentAmount >= 0 ? 'credit' : 'debit',
            amount: Math.abs(adjustmentAmount),
            source_type: 'membership_downgrade',
            source_id: downgradeOrder.id,
            description: `Downgrade to ${targetPlan.plan_name} - Monthly points reset`,
            current_points_balance: newMonthlyBalance
          }, { transaction });

          await PointsTransactionTotalTable.create({
            user_id: userId,
            point_type: 'MONTHLY',
            type: adjustmentAmount >= 0 ? 'credit' : 'debit',
            amount: Math.abs(adjustmentAmount),
            source_type: 'membership_downgrade',
            source_id: downgradeOrder.id,
            description: `Downgrade monthly points adjustment`,
            current_points_balance: newMonthlyBalance
          }, { transaction });

          console.log(`调整月度积分: ${oldBalance} -> ${newMonthlyBalance} (变化: ${adjustmentAmount})`);
        } else {
          // 创建新的月度积分账户
          await PointAccountTable.create({
            user_id: userId,
            point_type: 'MONTHLY',
            balance: newMonthlyBalance,
            expiration_date: periodEnd
          }, { transaction });

          // 记录积分发放交易
          await PointsTransactionTable.create({
            user_id: userId,
            point_type: 'MONTHLY',
            type: 'credit',
            amount: newMonthlyBalance,
            source_type: 'membership_downgrade',
            source_id: downgradeOrder.id,
            description: `Downgrade to ${targetPlan.plan_name} - Monthly points granted`,
            current_points_balance: newMonthlyBalance
          }, { transaction });

          await PointsTransactionTotalTable.create({
            user_id: userId,
            point_type: 'MONTHLY',
            type: 'credit',
            amount: newMonthlyBalance,
            source_type: 'membership_downgrade',
            source_id: downgradeOrder.id,
            description: `Downgrade monthly points issued`,
            current_points_balance: newMonthlyBalance
          }, { transaction });

          console.log(`创建月度积分账户，余额: ${newMonthlyBalance}`);
        }
      }

      // 清除降级相关的元数据，防止重复处理
      await clearSubscriptionMetadata(subscriptionInfo.id, ['action', 'target_price_id']);

      // 提交事务
      await transaction.commit();
      console.log("降级处理完成");

      return { success: true, message: 'Downgrade processed successfully' };

    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      console.error('Error processing downgrade:', error);
      return { success: false, error: 'Downgrade processing failed', details: error.message };
    }

  } catch (error) {
    console.error('处理订阅降级时出错:', error);
    return { success: false, error: 'Downgrade processing failed', details: error.message };
  }
}

// 清除订阅元数据的函数
async function clearSubscriptionMetadata(subscriptionId, metadataKeys) {

  return false;
}


// 处理正常到期后续费成功的逻辑
async function handleSubscriptionRenewal(subscriptionId, membershipPlanId, periodEnd, invoiceInfo, userId = null, transaction = null) {
  try {
    console.log(`开始处理订阅续费: 订阅ID ${subscriptionId}, 会员计划ID ${membershipPlanId}`);

    // 查找会员计划
    const membershipPlan = await MembershipPlanTable.findOne({
      where: { id: membershipPlanId }
    });

    if (!membershipPlan) {
      throw new Error('Membership plan not found');
    }

    console.log(`找到会员计划: ${membershipPlan.plan_name}`);

    // 查找当前活跃的会员记录
    let whereCondition = {
      is_active: true,
      membership_plan_id: membershipPlan.id,
      end_date: {
        [Op.gt]: new Date() // 会员未过期
      }
    };

    // 根据订阅ID或用户ID查找会员记录
    if (subscriptionId) {
      whereCondition.subscription_id = subscriptionId;
    } else if (userId) {
      whereCondition.user_id = userId;
    } else {
      console.log('缺少必要参数: subscriptionId 或 userId');
      return false;
    }

    const currentMembership = await UserMembershipTable.findOne({
      where: whereCondition
    });

    if (!currentMembership) {
      console.log(`未找到对应的活跃会员记录`);
      return false;
    }

    // 第一步：创建续费订单记录
    console.log('第一步：创建订单');
    const orderSn = `WC${Date.now()}${wechatPayUtils.generateNonceStr().substring(0, 10)}`;

    const renewalOrderData = {
      user_id: currentMembership.user_id,
      product_id: membershipPlan.id,
      order_type: 'membership',
      amount: membershipPlan.price,
      currency: invoiceInfo.currency || 'USD',
      status: 'paid',
      paid_at: new Date(),
      order_sn: orderSn,
      transaction_id: invoiceInfo.id,
      payment_method: 'stripe'
    };

    const createOrderOptions = transaction ? { transaction } : {};
    const renewalOrder = await Order.create(renewalOrderData, createOrderOptions);

    console.log(`✅ 第一步完成 - 创建续费订单: ID ${renewalOrder.id}, 订单号 ${orderSn}`);

    // 第二步：更新会员状态
    console.log('第二步：更新会员状态');
    const updateData = {
      end_date: periodEnd,
      order_id: renewalOrder.id  // 更新为新的订单ID
    };

    const updateOptions = {
      where: {
        id: currentMembership.id,
        is_active: true
      }
    };

    // 如果传入了事务，使用事务
    if (transaction) {
      updateOptions.transaction = transaction;
    }

    await UserMembershipTable.update(updateData, updateOptions);

    console.log(`✅ 第二步完成 - 会员记录已更新: ID ${currentMembership.id}, 新到期时间: ${periodEnd.toISOString()}`);

    // 第三步：更新会员积分
    // 第四步：增加积分流水记录
    if (membershipPlan.monthly_points > 0) {
      console.log('第三步：更新会员积分');
      console.log('第四步：增加积分流水记录');
      await resetMonthlyPointsWithSteps(currentMembership.user_id, membershipPlan, renewalOrder, periodEnd, transaction);
    } else {
      console.log('✅ 第三步跳过 - 该计划无月度积分');
      console.log('✅ 第四步跳过 - 该计划无月度积分');
    }

    // 第五步：更新subscription的元数据中的order_id
    console.log('第五步：更新subscription元数据');
    if (subscriptionId) {
      await updateSubscriptionMetadata(subscriptionId, renewalOrder.id);
    }

    console.log(`🎉 续费处理完成: 用户 ${currentMembership.user_id} 会员已续费至 ${periodEnd.toISOString()}`);

    return {
      success: true,
      renewalOrder: renewalOrder,
      membership: currentMembership
    };

  } catch (error) {
    console.error('处理订阅续费时出错:', error);
    throw error;
  }
}

// 重置月度积分的辅助函数（带步骤标识）
async function resetMonthlyPointsWithSteps(userId, membershipPlan, order, periodEnd, transaction = null) {
  try {
    // 查找用户的月度积分账户
    const monthlyPointAccount = await PointAccountTable.findOne({
      where: {
        user_id: userId,
        point_type: 'MONTHLY'
      }
    });

    const newMonthlyPoints = membershipPlan.monthly_points;

    const updateOptions = transaction ? { transaction } : {};

    if (monthlyPointAccount) {
      // 更新现有积分账户
      await monthlyPointAccount.update({
        balance: newMonthlyPoints,
        expiration_date: periodEnd
      }, updateOptions);

      console.log(`✅ 第三步完成 - 月度积分已重置为: ${newMonthlyPoints}`);
    } else {
      // 创建新的积分账户
      await PointAccountTable.create({
        user_id: userId,
        point_type: 'MONTHLY',
        balance: newMonthlyPoints,
        expiration_date: periodEnd
      }, updateOptions);

      console.log(`✅ 第三步完成 - 创建月度积分账户，余额: ${newMonthlyPoints}`);
    }

    // 创建积分交易记录
    await PointsTransactionTable.create({
      user_id: userId,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newMonthlyPoints,
      source_type: 'membership_renewal',
      source_id: order.id,
      description: `Membership renewal - ${membershipPlan.plan_name} monthly points reset`,
      current_points_balance: newMonthlyPoints
    }, updateOptions);

    // 创建积分总计记录
    await PointsTransactionTotalTable.create({
      user_id: userId,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newMonthlyPoints,
      source_type: 'membership_renewal',
      source_id: order.id,
      description: `Membership renewal points issued - ${membershipPlan.plan_name}`,
      current_points_balance: newMonthlyPoints
    }, updateOptions);

    console.log(`✅ 第四步完成 - 积分流水记录已创建: 用户 ${userId} 获得 ${newMonthlyPoints} 月度积分`);

  } catch (error) {
    console.error('重置月度积分时出错:', error);
    throw error;
  }
}

// 重置月度积分的辅助函数（原版本，保持兼容性）
async function resetMonthlyPoints(userId, membershipPlan, order, periodEnd, transaction = null) {
  try {
    console.log(`开始重置用户 ${userId} 的月度积分`);

    // 查找用户的月度积分账户
    const monthlyPointAccount = await PointAccountTable.findOne({
      where: {
        user_id: userId,
        point_type: 'MONTHLY'
      }
    });

    const newMonthlyPoints = membershipPlan.monthly_points;

    const updateOptions = transaction ? { transaction } : {};

    if (monthlyPointAccount) {
      // 更新现有积分账户
      await monthlyPointAccount.update({
        balance: newMonthlyPoints,
        expiration_date: periodEnd
      }, updateOptions);

      console.log(`月度积分已重置为: ${newMonthlyPoints}`);
    } else {
      // 创建新的积分账户
      await PointAccountTable.create({
        user_id: userId,
        point_type: 'MONTHLY',
        balance: newMonthlyPoints,
        expiration_date: periodEnd
      }, updateOptions);

      console.log(`创建月度积分账户，余额: ${newMonthlyPoints}`);
    }

    // 创建积分交易记录
    await PointsTransactionTable.create({
      user_id: userId,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newMonthlyPoints,
      source_type: 'membership_renewal',
      source_id: order.id,
      description: `Membership renewal - ${membershipPlan.plan_name} monthly points reset`,
      current_points_balance: newMonthlyPoints
    }, updateOptions);

    // 创建积分总计记录
    await PointsTransactionTotalTable.create({
      user_id: userId,
      point_type: 'MONTHLY',
      type: 'credit',
      amount: newMonthlyPoints,
      source_type: 'membership_renewal',
      source_id: order.id,
      description: `Membership renewal points issued - ${membershipPlan.plan_name}`,
      current_points_balance: newMonthlyPoints
    }, updateOptions);

    console.log(`续费积分重置完成: 用户 ${userId} 获得 ${newMonthlyPoints} 月度积分`);

  } catch (error) {
    console.error('重置月度积分时出错:', error);
    throw error;
  }
}

// 更新subscription元数据中的order_id
async function updateSubscriptionMetadata(subscriptionId, orderId) {
  console.error('更新订阅元数据时出错:');
  throw new Error('更新订阅元数据时出错');

}

module.exports = {
  handleSubscriptionUpgrade,
  handleSubscriptionDowngrade,
  handleSubscriptionRenewal,
  clearSubscriptionMetadata
};