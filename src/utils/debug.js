// utils/safeExit.js
const path = require('path');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getCallerInfo() {
  const stack = new Error().stack.split('\n').slice(2); // 跳过 Error 和 safeExit 自身
  const info = [];

  for (let i = 0; i < stack.length; i++) {
    const line = stack[i].trim();
    const match = line.match(/\(?(.+):(\d+):(\d+)\)?$/); // 解析文件、行号
    if (match) {
      const fullPath = match[1];
      const lineNumber = match[2];
      const columnNumber = match[3];
      info.push({
        file: path.relative(process.cwd(), fullPath),
        line: lineNumber,
        column: columnNumber,
        raw: line,
      });
    }
  }

  return info;
}

const safeExit = async (code = 0, message = '') => {
  const timestamp = new Date().toISOString();
  const callerStack = getCallerInfo();

  console.log('\n======== Safe Exit Triggered ========');
  console.log(`🕒 Time: ${timestamp}`);
  console.log(`💥 Exit Code: ${code}`);
  if (message) console.log(`📢 Message: ${message}`);

  if (callerStack.length) {
    console.log(`📍 Call Stack:`);
    callerStack.forEach((frame, index) => {
      console.log(`  ${index + 1}. ${frame.file}:${frame.line}:${frame.column}`);
    });
  } else {
    console.log(`⚠️ Stack trace not found`);
  }

  console.log('=====================================\n');
  await delay(1000);
  process.exit(code);
}

module.exports = {
  safeExit
};
