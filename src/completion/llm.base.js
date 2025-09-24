const TYPE_ENUM = {
  SSE: 'SSE',
  STREAM: 'STREAM'
}

const axios = require('axios');

class LLM {

  constructor(onTokenStream = (chunk) => { }, model = '', options = {}) {
    this.onTokenStream = onTokenStream;
    // 设置默认接口处理逻辑
    this.responseType = TYPE_ENUM.SSE;
    this.splitter = '\n\n'
    if (model) { this.model = model }
    this.options = options;
  }

  /**
   * 提问大模型 && 记录日志
   * 依赖 start 实现提问逻辑
   * @param {*} prompt 
   * @param {*} context 
   * @param {*} options 
   * @returns 
   */
  async completion(prompt, context = {}, options = {}) {
    // 发起调用
    const content = await this.start(prompt, context, options);
    return content;
  }

  /**
   * 发起请求并对返回流式数据进行处理
   * 若非 SSE 标准处理逻辑, 覆盖 start 的实现
   * @param {*} prompt 
   */
  async start(prompt, context = {}, options = {}) {
    // 发起调用
    const response = await this.call(prompt, context, options);
    // 处理SSE
    if (this.responseType === TYPE_ENUM.SSE) {
      const content = await this.handleSSE(response)
      return content;
    }
    return ""
  }

  async message(messages = [], options = {}) {
    const response = await this.request(messages, options);
    // 处理SSE
    if (this.responseType === TYPE_ENUM.SSE) {
      const content = await this.handleSSE(response)
      return content;
    }
    return ""
  }

  resolveConfigHeaders = (config) => {
    if (this.API_KEY) {
      Object.assign(config.headers, {
        "Authorization": `Bearer ${this.API_KEY}`,
      });
      if (config.url && config.url.indexOf('azure') !== -1) {
        Object.assign(config.headers, {
          "api-key": this.API_KEY
        });
      }
      if (config.url && config.url.indexOf('baidu') !== -1) {
        Object.assign(config.headers, { "appid": this.appid });
      }
    }
  }

  async request(messages = [], options = {}) {
    const model = options.model || this.model;

    const body = {
      model,
      messages,
      stream: true,
    }

    /**
     * Supported options
     * - temperature: Controls the randomness of generated text. Higher values increase randomness, lower values decrease it
     * - top_p: Sampling probability threshold, controls the diversity of generated text. Higher values increase diversity
     * - max_tokens: Maximum length limit for generated text
     * - stop: Stop sequence markers for generation
     * - stream: Whether to enable streaming response
     * - assistant_id: Assistant ID, used to identify specific assistants in multi-turn conversations
     * - response_format: Response format, such as JSON
     * - tools: List of callable tool functions, used for advanced features like function calling
     * - enable_thinking: Whether to enable thinking mode, applicable to Qwen3 model
     */
    const supportOptions = ['temperature', 'top_p', 'max_tokens', 'stop', 'stream', 'assistant_id', 'response_format', 'tools', 'enable_thinking'];
    for (const key in options) {
      if (supportOptions.includes(key) && options[key] !== undefined) {
        body[key] = options[key];
        console.log('body.options', key, options[key]);
      }
    }
    // console.log('body', body);
    const config = {
      url: this.CHAT_COMPLETION_URL,
      method: "post",
      maxBodyLength: Infinity,
      headers: {
        "Content-Type": 'application/json'
      },
      data: body,
      responseType: "stream"
    };

    if (options.signal) {
      config.signal = options.signal;
    }

    if (config.url && config.url.indexOf('openrouter.ai') !== -1) {
      Object.assign(config.headers, {
        "HTTP-Referer": 'https://lemonai.cc',
        "X-Title": "LemonAI"
      })
    }
    // console.log('config', config);
    this.resolveConfigHeaders(config);
    // console.log('config', JSON.stringify(config, null, 2));
    const response = await axios.request(config).catch(err => {
      return err;
    });
    // console.log('response', response);
    return response;
  }

  // 发起 HTTP 请求
  async call(prompt = '', context = {}, options = {}) {
    console.log("prompt http call", prompt);
    const messages = context.messages || [];
    if (prompt) {
      const massageUser = { "role": "user", "content": prompt };
      messages.push(massageUser);
    }
    // console.log("发起请求.messages", messages);
    return this.request(messages, options);
  }

  resolveRequestMessages(input, context) {

  }

  // 处理流式请求
  async handleSSE(response) {
    if (response.code) {
      const content = response.code;
      this.onTokenStream(`${response.code}:${response.status}`);
      return content;
    }

    // 处理流式返回
    let fullContent = "";
    let reasoning = false;
    const fn = new Promise((resolve, reject) => {
      let content = "";
      response.data.on("data", (chunk) => {
        content += chunk;
        const splitter = this.splitter;
        while (content.indexOf(splitter) !== -1) {
          const index = content.indexOf(splitter);
          const message = content.slice(0, index);
          content = content.slice(index + splitter.length);
          const value = this.messageToValue(message);
          if (value.type === "text" || value.type === 'reasoning') {
            let ch = value.text;
            // 处理 reasoning
            if (value.type === 'reasoning' && fullContent === '') {
              ch = '<think>' + ch;
              reasoning = true;
            }
            if (value.type === 'text' && reasoning) {
              ch = '</think>' + ch;
              reasoning = false;
            }
            if (ch) {
              // process.stdout.write(ch);
              fullContent += ch;
              this.onTokenStream(ch);
            }
          } else { }
        }
      });
      response.data.on("end", () => {
        resolve(fullContent);
      });
      response.data.on("error", (err) => {
        if (err.code === 'ERR_CANCELED' || err.message === 'canceled') {
          console.log('请求被中断');
          resolve(fullContent);
        } else {
          reject(err)
        }

      });

    });

    const content = await fn;
    return content;
  }

  /**
   * 标准 chat/completions message 处理解析逻辑
   * 1. 截取 data: 后并 JSON.parse
   * 2. 读取 json.choices[0].delta.content
   * 
   * 适用服务 openai | minimax | kimi | deepseek | zhipu(智谱) | qwen 开源
   * @param {*} message 
   * @returns { type: 'text', text: '' }
   */
  messageToValue(message) {
    // console.log('message', message);
    if (message == "data: [DONE]" || message.startsWith("data: [DONE]")) {
      return { type: "done" };
    }
    let data = message.split("data:")[1];
    let value = {}
    try {
      value = JSON.parse(data)
    } catch (error) {
      return { type: "done" };
    }

    // token 消耗消息
    if (value.usage) {
      // console.log('\nToken.Usage', value.usage);
      // return { type: "done" };
    }

    const choices = value.choices || [];
    const choice = choices[0] || {};
    if (Object.keys(choice).length === 0) {
      return { type: "text", text: "" }
    }
    // 工具使用处理
    if (choice.delta && choice.delta.tool_calls && choice.delta.tool_calls.length > 0) {
      this.tools = choice.delta.tool_calls;
    }

    // reasoning thinking
    if (choice.delta && choice.delta.reasoning_content) {
      return { type: "reasoning", text: choice.delta.reasoning_content };
    }

    if (choice.delta && choice.delta.content) {
      return { type: "text", text: choice.delta.content };
    }
    return {};
  }
}

module.exports = exports = LLM;