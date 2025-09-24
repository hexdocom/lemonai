// logger/cache.js
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const loggerMap = {};

// ensure the temporary directory exists
const { getDirpath } = require('@src/utils/electron');
const logger_cache_dir = getDirpath('Caches/logger');
fs.mkdirSync(logger_cache_dir, { recursive: true });

function getLogger(conversation, module) {
  const logger_key = `${conversation}_${module}`;
  if (!loggerMap[logger_key]) {
    const dir = path.resolve(logger_cache_dir, conversation);
    fs.mkdirSync(dir, { recursive: true });
    const module_filepath = path.join(dir, `${module}.log`);
    loggerMap[logger_key] = createLogger({
      level: 'info',
      format: format.combine(
        format.label({ label: module }),
        format.timestamp(),
        format.printf(({ timestamp, level, message, label }) =>
          `${timestamp} [${label}] ${level}: ${message}`
        )
      ),
      transports: [
        new transports.File({
          filename: module_filepath,
          handleExceptions: true
        })
      ]
    });
  }
  return loggerMap[logger_key];
}


const logging = (context = {}, module = '', message = '') => {
  if (typeof message === 'object') {
    message = JSON.stringify(message, null, 2);
  }
  // 获取调用栈信息
  const stack = new Error().stack;
  const stackLines = stack.split('\n');

  let callerInfo = '未知位置';
  if (stackLines.length > 2) {
    const callerLine = stackLines[2];
    const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/);

    if (match) {
      const fullPath = match[1];
      const lineNumber = match[2];
      const columnNumber = match[3];
      const filepath = path.relative(process.cwd(), fullPath);
      callerInfo = `${filepath}:${lineNumber}:${columnNumber}`;
    }
  }
  const formattedMessage = `[${callerInfo}] ${message}`;

  const logger = getLogger(context.conversation_id, module);
  logger.info(formattedMessage);
}

module.exports = {
  getLogger,
  logging
};
