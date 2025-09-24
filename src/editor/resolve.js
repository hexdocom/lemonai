// https://github.com/NaturalIntelligence/fast-xml-parser
const { XMLParser, XMLBuilder, XMLValidator } = require("fast-xml-parser");
const parser = new XMLParser({
  stopNodes: ["write_code.content", "revise_plan.tasks"],
  ignoreAttributes: false,
});

const resolveXML = (content) => {
  // 输入验证
  if (!content || typeof content !== 'string') {
    throw new Error('XML内容必须是非空字符串');
  }

  // 解析XML内容
  const result = parser.parse(content);

  // 通用CDATA处理函数
  const processCDATA = (text) => {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (trimmed.startsWith('<![CDATA[') && trimmed.endsWith(']]>')) {
      return trimmed.slice(9, -3); // 移除 <![CDATA[ 和 ]]>
    }
    return text;
  };

  // 处理write_code.content的CDATA
  if (result.write_code?.content) {
    result.write_code.content = processCDATA(result.write_code.content);
  }

  return result;
}

/**
 * Extract description from content (text before XML content)
 * Handles both cases: with ```xml wrapper and without
 */
const extractDescription = content => {
  try {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const lines = content.split('\n');
    let xmlStartIndex = -1;

    // 查找XML内容的起始位置
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // XML内容可能以 ```xml 开始或直接以 < 标签开始
      if (line.startsWith('```xml') || line.startsWith('<')) {
        xmlStartIndex = i;
        break;
      }
    }

    // 如果找到XML起始位置，提取之前的描述文字
    if (xmlStartIndex > 0) {
      return lines.slice(0, xmlStartIndex)
        .filter(line => line.trim()) // 过滤空行
        .join(' ')
        .trim();
    }

    // 没有找到XML内容，返回空描述
    return '';
  } catch (err) {
    console.error('[extractDescription] Failed to extract description:', err);
    return '';
  }
}

/**
 * Parse XML to extract actions (single or multiple)
 */
const resolveActions = xml => {
  try {
    const resolved = resolveXML(xml);
    const actions = [];

    for (let key in resolved) {
      const value = resolved[key];

      // Handle array of same type operations
      if (Array.isArray(value)) {
        value.forEach(params => {
          actions.push({ type: key, params });
        });
      } else {
        actions.push({ type: key, params: value });
      }
    }

    return actions;
  } catch (err) {
    console.error('[resolveActions] Failed to parse XML:', err);
    return [];
  }
}

// Backward compatibility
const resolveAction = xml => {
  const actions = resolveActions(xml);
  return actions[0] || null;
}

module.exports = {
  resolveXML,
  resolveActions,
  resolveAction,  // Keep for backward compatibility
  extractDescription
};
