const { json2xml } = require('@src/utils/format');

const WriteCode = {
  name: "write_code",
  description: "1. When the requirement is to create a program, script, or web page that can be run directly, you should directly provide complete and usable code. 2. When the requirement is to plan, design, analyze, or write a report, you should use Markdown to generate a clearly structured document. 3. When read pdf file, use python3 code with PyPDF2. After successful execution, the written filepath can be accessed by subsequent tools using the \"$LAST_WRITTEN_FILE_PATH\" placeholder.",
  params: {
    type: "object",
    properties: {
      path: {
        description: "The path of the file to write.",
        type: "string"
      },
      content: {
        description: "The code content to write.",
        type: "string"
      }
    },
    required: ["path", "content"]
  },
  getActionDescription({ path }) {
    return path;
  },
  /**
   * 自定义记忆内容
   * @param {*} action 
   * @param {*} content 
   * @returns 
   */
  resolveMemory(action = {}, content) {
    const filepath = action.params.origin_path || action.params.path;
    const memory = {
      type: 'write_code',
      status: 'success',
      path: filepath
    }
    return json2xml(memory);
  }
};

module.exports = WriteCode;