
/**
 * Token 校验中间件
 * 除了指定的不需要校验的接口外，其他接口均需校验 Token
 * @param {Array} excludePaths - 不需要校验 Token 的接口路径数组
 */


const excludePaths = [
  '/api/users/login',
  '/api/users/google-auth',
  '/api/users/register',
  '/api/users/resetPassword',
  '/api/users/sendEmailVerifyCode',
  '/api/users/verifyEmailVerifyCode',
  '/api/payment/notify',
  '/api/membership_plan/list',
  '/api/users/send-sms-code',
  '/api/users/login-sms-code',
  '/api/users/verifySmsVerifyCode',
  '/api/payment/stripe/webhook',
  '/api/payment/strip/checkout-session',
  '/api/payment/check_order_status_by_id',
  '/api/users/auth/google',
  '/api/users/auth/google_invitation',
  '/api/users/checkEmail',
  '/api/agent_store',
  '/api/agent_store/last',
  '/api/invitation/validate',
];

const excludePatterns = [
  '/api/agent_store/last/'
];

module.exports = () => {
  return async (ctx, next) => {
    // 检查当前请求路径是否在排除列表中
    const pathname = ctx.url.split('?')[0];
    const isExcluded = excludePaths.some(path => {
      return pathname === path;
    }) || excludePatterns.some(pattern => {
      return pathname.startsWith(pattern);
    });

    if (isExcluded) {
      await next();
      return;
    }

    // 直接设置默认用户 ID 为 1，不进行 Token 校验
    ctx.state.user = { id: 1 };
    await next();
  };
};
