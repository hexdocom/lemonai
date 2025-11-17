/**
 * 流式 XML 解析器
 * action 标签以及对应的 params 字段
 */

const defaultActions = [
  ['finish', ['message']],
  ['write_code', ['path', 'content']],
  ['write_file', ['path', 'content']],
  ['read_file', ['path']],
  ['revise_plan', ['mode', 'reason', 'tasks']],
  ['terminal_run', ['command', 'args']],
  ['web_search', ['topic', 'query', 'num_results']],
  ['browser', ['question']],
  ['mcp_tool', ['name', 'arguments']],
  ['evaluation', ['status', 'comments']],
  ['document_query', ['query', 'conversation_id']],
  ['document_upload', ['file_path', 'conversation_id', 'file_name']]
];

class StreamingXMLParser {
  constructor(onChunk, actions = defaultActions, options = {}) {
    this.actions = new Map(actions.map(([name, fields]) => [name, new Set(fields)]));
    this.onChunk = onChunk;
    this.result = {};

    this.currentAction = null;
    this.currentField = null;
    this.fieldStartPos = -1;
    this.buffer = '';
    this.streamedLength = 0; // 已经流式输出的长度
    this.debug = options.debug || false; // 调试选项
  }

  /**
   * 获取位置前后的文本预览
   */
  _getContextPreview(pos, prefix = 30, suffix = 30) {
    const start = Math.max(0, pos - prefix);
    const end = Math.min(this.buffer.length, pos + suffix);
    const before = this.buffer.substring(start, pos).replace(/\n/g, '\\n');
    const after = this.buffer.substring(pos, end).replace(/\n/g, '\\n');
    return `...${before}█${after}...`;
  }

  /**
   * 调试日志
   */
  _log(message, data = {}) {
    if (!this.debug) return;
    console.log(`[XML Parser] ${message}`);
    if (Object.keys(data).length > 0) {
      console.log('  ', JSON.stringify(data, null, 2).replace(/\n/g, '\n  '));
    }
  }

  /**
   * 流式输入
   * @param {*} chunk 
   */
  feed(chunk) {
    this.buffer += chunk;
    this.parse();
  }

  /**
   * 处理 field 闭合标签
   */
  _handleFieldClose(closePos) {
    const content = this.buffer.substring(this.fieldStartPos, closePos);
    const closeTag = `</${this.currentField}>`;
    const newPos = closePos + closeTag.length;

    this._log(`✅ Field 闭合: ${this.currentAction}.${this.currentField}`, {
      pos: closePos,
      newPos: newPos,
      contentLength: content.length,
      contentPreview: content.substring(0, 100).replace(/\n/g, '\\n'),
      context: this._getContextPreview(closePos)
    });

    // 流式输出剩余内容
    this._streamRemainingContent(content, true);

    // 保存结果
    this.result[this.currentAction] = this.result[this.currentAction] || {};
    this.result[this.currentAction][this.currentField] = content;

    this.currentField = null;
    this.fieldStartPos = -1;
    this.streamedLength = 0;

    return newPos;
  }

  /**
   * 流式输出内容
   */
  _streamRemainingContent(content, isComplete) {
    if (!this.onChunk) return;

    const newContent = content.substring(this.streamedLength);
    if (newContent) {
      this.onChunk({
        action: this.currentAction,
        field: this.currentField,
        chunk: newContent,
        isComplete
      });

      if (!isComplete) {
        this.streamedLength = content.length;
      }
    }
  }

  /**
   * 解析 field 内部内容
   */
  _parseInsideField(pos) {
    const closeTag = `</${this.currentField}>`;
    const closePos = this.buffer.indexOf(closeTag, pos);

    if (closePos !== -1) {
      // 找到闭合标签
      return this._handleFieldClose(closePos);
    }

    // 未找到闭合标签，输出增量内容
    const currentContent = this.buffer.substring(this.fieldStartPos);
    this._streamRemainingContent(currentContent, false);

    this._log(`⏸️  等待更多数据 (field: ${this.currentField})`, {
      pos: pos,
      searchingFor: closeTag,
      bufferedContentLength: currentContent.length,
      streamedLength: this.streamedLength,
      bufferEnd: this.buffer.length
    });

    return -1; // 表示需要等待更多数据
  }

  /**
   * 处理 action 闭合标签
   */
  _handleActionClose(pos) {
    const closeTag = `</${this.currentAction}>`;
    const newPos = pos + closeTag.length;

    this._log(`✅ Action 闭合: ${this.currentAction}`, {
      pos: pos,
      newPos: newPos,
      closeTag: closeTag,
      context: this._getContextPreview(pos)
    });

    this.currentAction = null;
    return newPos;
  }

  /**
   * 处理 field 开始标签
   */
  _handleFieldStart(tagName, tagLength, pos) {
    const newPos = pos + tagLength;

    this._log(`🆕 Field 开始: ${this.currentAction}.${tagName}`, {
      pos: pos,
      newPos: newPos,
      tag: `<${tagName}>`,
      context: this._getContextPreview(pos)
    });

    this.currentField = tagName;
    this.fieldStartPos = newPos;
    this.streamedLength = 0;
    return newPos;
  }

  /**
   * 解析 action 内部内容
   */
  _parseInsideAction(pos) {
    const substr = this.buffer.substring(pos);
    const tagMatch = substr.match(/^<(\w+)>/);
    const closingTagMatch = substr.match(/^<\/(\w+)>/);

    if (!tagMatch && !closingTagMatch) {
      // 没有匹配到任何标签
      return pos + 1;
    }

    // 优先检查闭合标签
    if (closingTagMatch) {
      const closingTagName = closingTagMatch[1];
      if (closingTagName === this.currentAction) {
        this._log(`🔍 Action内部检测到闭合标签`, {
          pos: pos,
          closingTag: `</${closingTagName}>`,
          context: this._getContextPreview(pos)
        });
        return this._handleActionClose(pos);
      }
      // 闭合标签不匹配，跳过
      return pos + 1;
    }

    // 处理开始标签
    const tagName = tagMatch[1];

    this._log(`🔍 Action内部检测到开始标签`, {
      pos: pos,
      tagName: tagName,
      currentAction: this.currentAction,
      isValidField: this.actions.get(this.currentAction).has(tagName),
      context: this._getContextPreview(pos)
    });

    if (this.actions.get(this.currentAction).has(tagName)) {
      return this._handleFieldStart(tagName, tagMatch[0].length, pos);
    }

    this._log(`⏭️  跳过非field标签: <${tagName}>`, {
      pos: pos,
      expectedFields: Array.from(this.actions.get(this.currentAction))
    });

    return pos + 1;
  }

  /**
   * 处理 action 开始标签
   */
  _handleActionStart(tagName, tagLength, pos) {
    const newPos = pos + tagLength;

    this._log(`🆕 Action 开始: ${tagName}`, {
      pos: pos,
      newPos: newPos,
      match: this.buffer.substring(pos, newPos),
      tag: `<${tagName}>`,
      context: this._getContextPreview(pos)
    });

    this.currentAction = tagName;
    this.result[tagName] = this.result[tagName] || {};
    return newPos;
  }

  /**
   * 查找 action 开始标签
   */
  _findActionStart(pos) {
    const tagMatch = this.buffer.substring(pos).match(/^<(\w+)>/);

    if (!tagMatch) {
      return pos + 1;
    }

    const tagName = tagMatch[1];

    if (this.actions.has(tagName)) {
      return this._handleActionStart(tagName, tagMatch[0].length, pos);
    }

    return pos + 1;
  }

  /**
   * 清理已处理的 buffer
   */
  _cleanupBuffer(pos) {
    if (pos > 0 && !this.currentField) {
      const cleaned = pos;
      this.buffer = this.buffer.substring(pos);
      if (this.fieldStartPos !== -1) {
        this.fieldStartPos -= pos;
      }

      this._log(`🗑️  清理 buffer`, {
        cleanedBytes: cleaned,
        remainingBytes: this.buffer.length,
        remainingPreview: this.buffer.substring(0, 100).replace(/\n/g, '\\n')
      });
    }
  }

  /**
   * 主解析循环
   */
  parse() {
    let pos = 0;

    // 数据扫描
    while (pos < this.buffer.length) {
      if (this.currentField) {
        const newPos = this._parseInsideField(pos);
        if (newPos === -1) break; // 等待更多数据
        pos = newPos;
      } else if (this.currentAction) {
        // 在 action 内部, 解析 action 内部内容
        pos = this._parseInsideAction(pos);
      } else {
        // 查找 action 开始标签, 找到 action 开始标签后, 会触发 _handleActionStart
        pos = this._findActionStart(pos);
      }
    }

    this._cleanupBuffer(pos);
  }

  end() {
    // 处理剩余的 buffer
    if (this.buffer.length > 0) {
      this.parse();
    }

    return this.result;
  }

  getResult() {
    return this.result;
  }
}

/** 移除 CDATA 包裹 */
const stripCDATA = (text) => {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (trimmed.startsWith('<![CDATA[') && trimmed.endsWith(']]>')) {
    return trimmed.slice(9, -3);
  }
  return text;
};

/**
 * 解析完整的 XML 文档
 * @param {string} xml - XML 文档
 * @param {Array} actions - action 定义数组
 * @param {Object} options - 选项 { debug: boolean }
 * @returns {Object} - 解析结果
 */
const parseXML = (xml, actions, options) => {
  const parser = new StreamingXMLParser(null, actions, options);
  parser.feed(xml);
  const result = parser.end();
  if (result?.write_code?.content) {
    result.write_code.content = stripCDATA(result.write_code.content);
  }
  return result;
}

/**
 * 流式解析 XML
 * @param {Function} onChunk - 流式回调函数
 * @param {Array} actions - action 定义数组
 * @param {Object} options - 选项 { debug: boolean }
 * @returns {StreamingXMLParser} - 解析器实例
 */
const createStreamingParser = (onChunk, actions, options) => {
  return new StreamingXMLParser(onChunk, actions, options);
}

module.exports = {
  StreamingXMLParser,
  parseXML,
  createStreamingParser,
  stripCDATA
};