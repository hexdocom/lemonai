
/**
 * Token 校验中间件
 * 除了指定的不需要校验的接口外，其他接口均需校验 Token
 * @param {Array} excludePaths - 不需要校验 Token 的接口路径数组
 */

const { encodeToken, decodeToken } = require('@src/utils/jwt');

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
    // 获取不包含查询参数的路径部分
    const pathname = ctx.url.split('?')[0];
    const isExcluded = excludePaths.some(path => {
      // 精确匹配：只匹配完全相同的路径，不匹配子路径
      return pathname === path;
    }) || excludePatterns.some(pattern => {
      // 模式匹配：匹配以 pattern 开头的路径
      return pathname.startsWith(pattern);
    });

    if (isExcluded) {
      // 如果在排除列表中，直接跳过 Token 校验
      console.log(`路径 "${ctx.url}" 在排除列表中，跳过 Token 校验。`);
      await next();
      return;
    }

    // 从请求头中获取 Token
    const token = ctx.headers.authorization;

    if (!token) {
      // 如果没有 Token，返回 401 Unauthorized
      console.warn(`路径 "${ctx.url}"：缺少 Authorization Token。`);
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: 'Unauthorized: Missing Token'
      };
      return;
    }

    try {
      // 假设 Token 格式为 "Bearer your_token_string"
      const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;

      // 使用 decodeToken 方法验证 Token
      const decodedPayload = decodeToken(tokenString);

      if (decodedPayload) {
        // Token 有效，将解码后的用户信息存储到 ctx.state 以便后续路由使用
        ctx.state.user = decodedPayload; // 假设 decodeToken 返回的是用户信息对象
        console.log(`路径 "${ctx.url}"：Token 校验成功。`);
        await next();
      } else {
        // Token 无效或解码失败
        console.warn(`路径 "${ctx.url}"：Token 无效或解码失败。`);
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: 'Unauthorized: Invalid Token'
        };
      }
    } catch (error) {
      // 捕获 decodeToken 过程中可能发生的错误（例如 Token 过期、签名无效等）
      console.error(`路径 "${ctx.url}"：Token 校验过程中发生错误：`, error);
      ctx.status = 401; // Token 验证失败通常返回 401
      ctx.body = {
        code: 401,
        message: `Unauthorized: Token validation failed - ${error.message}`
      };
    }
  };
};
