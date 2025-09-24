const { Op } = require('sequelize');
const UserMembershipTable = require('@src/models/UserMembership');
const MembershipPlanTable = require('@src/models/MembershipPlan');
const PointAccountTable = require('@src/models/PointAccount');
const PointsTransactionTable = require('@src/models/PointsTransaction');
const PointsTransactionTotalTable = require('@src/models/PointsTransactionTotal');

module.exports = () => {
  return async (ctx, next) => {
    try {
      const { user } = ctx.state;

      if (!user) {
        await next();
        return;
      }

      // 检查用户是否是年度会员
      const currentMembership = await UserMembershipTable.findOne({
        where: {
          user_id: user.id,
          is_active: true,
          end_date: {
            [Op.gt]: new Date() // 会员未过期
          }
        }
      });

      if (currentMembership) {
        // 获取会员计划信息
        const membershipPlan = await MembershipPlanTable.findOne({
          where: {
            id: currentMembership.membership_plan_id,
            duration_days: {
              [Op.gte]: 365 // 年度会员（365天或更长）
            }
          }
        });

        if (membershipPlan && membershipPlan.monthly_points > 0) {
          // 检查月度积分账户是否已到期
          const monthlyPointAccount = await PointAccountTable.findOne({
            where: {
              user_id: user.id,
              point_type: 'MONTHLY'
            }
          });

          const now = new Date();
          const isExpired = !monthlyPointAccount ||
            !monthlyPointAccount.expiration_date ||
            monthlyPointAccount.expiration_date < now;

          if (isExpired) {
            // 计算新的到期时间（从上一次到期时间开始计算30天）
            const newExpirationDate = new Date(monthlyPointAccount?.expiration_date || new Date());
            newExpirationDate.setDate(newExpirationDate.getDate() + 30);

            // 开始事务
            const transaction = await PointAccountTable.sequelize.transaction();

            try {
              // 更新或创建月度积分账户
              if (monthlyPointAccount) {
                await monthlyPointAccount.update({
                  balance: membershipPlan.monthly_points,
                  expiration_date: newExpirationDate
                }, { transaction });
              } else {
                await PointAccountTable.create({
                  user_id: user.id,
                  point_type: 'MONTHLY',
                  balance: membershipPlan.monthly_points,
                  expiration_date: newExpirationDate
                }, { transaction });
              }

              // 记录积分交易
              await PointsTransactionTable.create({
                user_id: user.id,
                point_type: 'MONTHLY',
                type: 'credit',
                amount: membershipPlan.monthly_points,
                source_type: 'membership',
                source_id: currentMembership.id,
                description: `会员月度积分 - ${membershipPlan.plan_name}`,
                current_points_balance: membershipPlan.monthly_points
              }, { transaction });

              await PointsTransactionTotalTable.create({
                user_id: user.id,
                point_type: 'MONTHLY',
                type: 'credit',
                amount: membershipPlan.monthly_points,
                source_type: 'membership',
                source_id: currentMembership.id,
                description: `会员月度积分发放`,
                current_points_balance: membershipPlan.monthly_points
              }, { transaction });

              await transaction.commit();
            } catch (error) {
              await transaction.rollback();
              throw error;
            }
          }
        }
      }

      await next();
    } catch (error) {
      console.error('Point add middleware error:', error);
      // await next();
    }
  };
};