const BaseLLM = require('./llm.base');
const axios = require('axios');

const fs = require('node:fs');
const net = require('node:net');

const PROXY_PORT = 7890;
const PROXY_PROTOCOL = 'http';
const PROXY_CONNECT_TIMEOUT = 1500;

/**
 * 检查当前环境是否在 Docker 容器内。
 * @returns {boolean} 如果在 Docker 内则返回 true，否则返回 false。
 */
function amInDockerEnvironment() {
  try {
    fs.accessSync('/.dockerenv');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 异步检查指定的代理服务器是否可连接。
 * @param {string} host 代理服务器主机名。
 * @param {number} port 代理服务器端口。
 * @returns {Promise<boolean>} 如果可连接则返回 true，否则返回 false。
 */
async function checkProxyConnectivity(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', (/* err */) => { // 捕获错误，但对于此函数只需返回 false
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(PROXY_CONNECT_TIMEOUT);
  });
}

const axiosInstancePromise = (async () => {
  const isInDocker = amInDockerEnvironment();
  const proxyHost = isInDocker ? 'host.docker.internal' : '127.0.0.1';

  console.log(`[Axios Init] ENV: ${isInDocker ? 'Docker' : '宿主机'}. 代理主机: ${proxyHost}:${PROXY_PORT}`);

  const isProxyReachable = await checkProxyConnectivity(proxyHost, PROXY_PORT);

  if (isProxyReachable) {
    const proxyConfig = {
      protocol: PROXY_PROTOCOL,
      host: proxyHost,
      port: PROXY_PORT,
    };
    console.log(`[Axios 初始化] 代理 ${proxyHost}:${PROXY_PORT} 可连接。创建带代理的 Axios 实例。`);
    return axios.create({ proxy: proxyConfig });
  } else {
    console.warn(`[Axios 初始化] 代理 ${proxyHost}:${PROXY_PORT} 不可连接。创建不带代理的 Axios 实例。`);
    return axios.create();
  }
})();

class GeminiLLM extends BaseLLM {

  /**
   * 
   * @param {*} onTokenStream 
   * @param {*} model gemini-1.0-pro | gemini-1.5-pro | gemini-1.5-flash-latest
   */
  constructor(onTokenStream, model, options = {}) {
    console.log('GeminiLLM', model, options);
    super(onTokenStream, model, options)
    this.GOOGLE_AI_KEY = options.config.API_KEY;
    this.splitter = '\n\r\n';
  }

  async request(messages, options = {}) {
    // gemini-1.5-pro-latest
    // const { model = 'gemini-pro' } = options;
    const model = this.model;

    const instance = await axiosInstancePromise;

    // reference: https://ai.google.dev/gemini-api/docs/get-started/tutorial?lang=rest#stream_generate_content
    //如果message第一条是system 推出messages里的第一条为systemPrompt
    let systemPrompt = null
    if (messages[0] && messages[0].role === 'system') {
      systemPrompt = messages.shift()
    }
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      headers: {
        "Content-Type": 'application/json',
        "x-goog-api-key": this.GOOGLE_AI_KEY
      },
      transformResponse: [],
      data: {
        "contents": messages,
        "generationConfig": {
          "temperature": options.temperature || 0,
        },
        "systemInstruction": systemPrompt
      },
      responseType: "stream",
    };
    console.log("config", JSON.stringify(config, null, 2));

    // @ts-ignore
    const response = await instance.request(config).catch(err => {
      return err;
    });
    console.log(response.status);
    return response;
  }

  async call(prompt, context = {}) {
    const massageUser = [{ "role": "user", "parts": [{ "text": prompt }] }]
    const newContextMessage = context.messages.map(item => {
      //如果role是assistent，改成model
      return {
        "role": item.role === 'assistant' ? 'model' : item.role,
        "parts": [{ "text": item.content }]
      }
    })
    const messages = (newContextMessage || []).concat(massageUser);
    return this.request(messages);
  }

  messageToValue(message) {
    // console.log("message", message);
    if (message == "data: [DONE]" || message.startsWith("data: [DONE]")) {
      return { type: "done" };
    }
    const data = message.split("data:")[1];
    let value = {}
    try {
      value = JSON.parse(data)
    } catch (error) {
      return { type: "done" };
    }
    const candidates = value.candidates || []
    if (!candidates.length) {
      return { type: "assistant" };
    }
    const candidate = candidates[0];
    const content = candidate.content;
    if (content && content.parts) {
      const part = content.parts[0];
      const text = part.text;
      return { type: 'text', text };
    }
    return { type: "assistant" };
  }
}

module.exports = exports = GeminiLLM;