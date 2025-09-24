/**
 * 需要暂停的错误类
 * 用于标识需要暂停而不是让LLM修复的错误
 */
class PauseRequiredError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.requiresPause = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 判断错误是否为需要暂停的错误类型
 * @param {Error} error - 要检查的错误对象
 * @returns {boolean} - 是否为需要暂停的错误
 */
function isPauseRequiredError(error) {
  if (error instanceof PauseRequiredError) {
    return true;
  }

  // 检查错误消息
  if (error && error.message) {
    // 积分不足错误
    if (error.message.includes('Insufficient credits balance')) {
      return true;
    }

    // LLM 调用错误 (400/429)
    if (error.message.startsWith('ERR_BAD_REQUEST')) {
      return true;
    }
  }

  return false;
}

module.exports = {
  PauseRequiredError,
  isPauseRequiredError
};
