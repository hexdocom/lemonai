const extractTemplateVariables = (template) => {
  const regex = /(?<!\\)\{([^}]+)\}/g; // 使用负向回溯断言来匹配非转义的大括号
  const set = new Set();
  const variables = [];
  let match;

  while ((match = regex.exec(template))) {
    const variable = match[1].trim();
    if (variable.startsWith('\\')) {
      // 如果变量以转义符\开头，则去掉转义符
      variables.push(variable.substring(1));
    } else {
      variables.push(variable);
      set.add(variable);
    }
  }
  return Array.from(set);
}

const preprocessValue = (value, variables) => {
  for (const variable of variables) {
    if (value[variable] === undefined) {
      value[variable] = '';
    }
    if (typeof value[variable] !== 'string') {
      value[variable] = JSON.stringify(value[variable]);
    }
  }
  return value;
}

const parseTemplate = (template, data) => {
  return template.replace(/\{([^}]+)\}/g, (match, variable) => {
    const trimmedVariable = variable.trim();
    if (data.hasOwnProperty(trimmedVariable)) {
      return data[trimmedVariable];
    } else {
      // 如果变量未在数据对象中找到，保留原始模板变量
      return match;
    }
  });
}

const resolveTemplate = async (template, value = {}) => {
  const variables = extractTemplateVariables(template);
  preprocessValue(value, variables);
  const prompt = parseTemplate(template, value);
  return prompt;
}

const fs = require('fs');
const path = require('path');
// 确保临时目录存在
const { getDirpath } = require('@src/utils/electron');
const cache_dir = getDirpath('Caches/template');
fs.mkdirSync(cache_dir, { recursive: true }); // 创建目录，如果已存在则不做任何操作

const loadTemplate = async (filename) => {
  try {
    const cache_file = path.resolve(cache_dir, filename);
    console.log('cache_file', cache_file);
    if (fs.existsSync(cache_file)) {
      return fs.readFileSync(cache_file, 'utf8');
    }
    const filepath = path.resolve(__dirname, '../template', filename);
    const template = fs.readFileSync(filepath, 'utf8');
    return template
  } catch (error) {
    return ''
  }
}

module.exports = exports = {
  extractTemplateVariables,
  resolveTemplate,
  loadTemplate
}