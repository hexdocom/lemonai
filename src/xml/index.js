const { parseXML } = require('./resolve.xml.optimize.js');

const resolveXML = (content) => {
  if (!content || typeof content !== 'string') {
    throw new Error('XML内容必须是非空字符串');
  }

  try {
    return parseXML(content, undefined, {});
  } catch (error) {
    console.error('[resolveXML] 解析失败:', error.message);
    throw new Error(`XML 解析失败: ${error.message}`);
  }
};

const resolveActions = xml => {
  try {
    const resolved = resolveXML(xml);
    const actions = []
    for (let key in resolved) {
      let value = resolved[key];
      const action = {
        type: key,
        params: value
      }
      actions.push(action);
    }
    return actions;
  } catch (err) {
    console.log(err);
    return [];
  }
}

module.exports = {
  resolveXML,
  resolveActions
};