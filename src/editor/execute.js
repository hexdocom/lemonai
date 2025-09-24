const fs = require('fs');

/**
 * 重写文件内容
 * @param {*} filepath 文件路径
 * @param {*} content 文件内容
 */
const rewrite = async (filepath, content) => {
  fs.writeFileSync(filepath, content);
  return true;
}

/**
 * 替换文件中的内容
 * @param {*} filepath 文件路径
 * @param {*} find 要查找的内容
 * @param {*} with_content 替换后的内容
 */
const replace = async (filepath, find, with_content) => {
  const content = fs.readFileSync(filepath, 'utf-8');
  console.log('filepath', filepath)
  console.log('\n=== find_content ===\n', find)
  console.log('\n=== with_content ===\n', with_content)

  const is_in = content.indexOf(find) > -1;
  if (!is_in) {
    throw new Error(`Cannot find ${find} in ${filepath}`);
  }

  const newContent = content.replace(find, with_content);
  fs.writeFileSync(filepath, newContent);
  return true;
}

const execute = async (action, context = {}) => {
  const filepath = context.filepath;
  if (action.type === 'rewrite') {
    const { content } = action.params;
    return await rewrite(filepath, content);
  }

  if (action.type === 'replace') {
    const { find, with: with_content } = action.params;
    return await replace(filepath, find, with_content);
  }

  return 'action type error';
}

module.exports = {
  execute
}