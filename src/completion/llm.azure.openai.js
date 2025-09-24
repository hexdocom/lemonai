const BaseLLM = require('./llm.base')
const axios = require('axios')

const OPENAI_AZURE_HOST = process.env.OPENAI_AZURE_HOST;
const OPENAI_AZURE_KEY = process.env.OPENAI_AZURE_KEY;

const deploymentHash = {
  'gpt-35-turbo-16k': 'gpt-35-turbo',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini'
}

const versionHash = {
  'gpt-35-turbo-16k': '2024-05-01-preview',
  'gpt-4o': '2024-02-15-preview',
  'gpt-4o-mini': '2024-02-15-preview',
  'gpt-5': '2025-04-01-preview',
  'gpt-5-chat': '2025-04-01-preview',
  'gpt-5-mini': '2025-04-01-preview'
}

const resolveAzureConfig = (model) => {
  const deployment = deploymentHash[model];
  const version = versionHash[model]
  const url = `${OPENAI_AZURE_HOST}/openai/responses?api-version=${version}`
  const headers = {
    'Authorization': `Bearer ${OPENAI_AZURE_KEY}`
  }
  return { url, headers }
}

const chatCompletion = async (options = {}) => {
  console.log('azure.options', options);
  let {
    model = "gpt-4o-mini",
    prompt,
    messages = [],
    streaming,
  } = options;
  if (!messages) {
    messages = []
  }

  const massageUser = [{ "role": "user", "content": prompt }];
  const { url, headers } = resolveAzureConfig(model);

  // console.log("url", url);
  // console.log("messages all", messages.concat(massageUser));
  // console.log('温度值', temperature);
  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url,
    headers: {
      // Authorization: `Bearer ${OPENAI_KEY || OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      ...headers
    },
    data: {
      model: model,
      // temperature,
      input: messages.concat(massageUser),
      stream: streaming,
    },
  };

  console.log('config', JSON.stringify(config, null, 2))
  // console.log('OPENAI', config.headers.Authorization)
  if (streaming) {
    config.responseType = "stream"
  }

  const result = await axios.request(config);
  return result;
};

class Azure extends BaseLLM {

  constructor(onTokenStream, model, llm_config) {
    super(onTokenStream)
    this.model = model
    this.llm_config = llm_config
    this.splitter = '\n\n';
  }

  async message(messages = [], options = {}) {
    const response = await chatCompletion({ messages, streaming: true, model: options.model })

    if (options.streaming == false) {
      const result = response.data;
      const choices = result.choices || [];
      const choice = choices[0] || {};
      const content = choice.message.content;
      return content;
    }
    // 处理 SSE
    const content = await this.handleSSE(response)
    return content;
  }

  async call(prompt, context, options = {}) {
    context.model = this.model
    context.prompt = prompt
    context.streaming = true
    if (options.temperature != undefined) {
      context.temperature = options.temperature
    }
    const response = await chatCompletion(context)
    return response;
  }

  // 处理流式请求
  async handleSSE(response) {
    // 处理流式返回
    let fullContent = "";
    const fn = new Promise((resolve, reject) => {
      let content = "";
      if (!response.data || typeof response.data.on !== 'function') {
        console.log("error", response.code, response.message)
        content = "The model you are currently using has exceeded its usage limit or exceeded its quota. You can try again, switch to another model, or contact the administrator to handle it."
        this.onTokenStream(content)
        return resolve(content);
      }
      response.data.on("data", (chunk) => {
        content += chunk;
        // console.log('content=====', JSON.stringify(content, null, 2))
        const splitter = this.splitter;
        while (content.indexOf(splitter) !== -1) {
          const index = content.indexOf(splitter);
          const message = content.slice(0, index);
          content = content.slice(index + splitter.length);
          const value = this.messageToValue(message);
          if (value.type === "text") {
            const ch = value.text;
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
    });

    const content = await fn;
    return content;
  }

  messageToValue(message) {
    if (message == "data: [DONE]") {
      return { type: "done" };
    }
    
    // Handle Azure OpenAI format
    if (message.includes("event: response.output_text.delta")) {
      const dataMatch = message.match(/data: (.+)/);
      if (dataMatch) {
        try {
          const value = JSON.parse(dataMatch[1]);
          if (value.error) {
            console.log(value.error.message);
            let errorMessage = JSON.stringify(value.error)
            return { type: "text", text: errorMessage }
          }
          
          // Azure format: delta is a string directly
          if (value.delta && typeof value.delta === 'string') {
            return { type: "text", text: value.delta };
          }
          
          // Check for finish reason
          if (value.finish_reason === "stop") {
            return { type: "stop" };
          }
          
          return { type: "text", text: "" };
        } catch (e) {
          console.log("Error parsing Azure SSE data:", e);
          return { type: "text", text: "" };
        }
      }
    }
    
    // Handle standard OpenAI format (fallback)
    const data = message.split("data:")[1];
    if (!data) return { type: "text", text: "" };
    
    try {
      const value = JSON.parse(data);
      if (value.error) {
        console.log(value.error.message);
        let errorMessage = JSON.stringify(value.error)
        return { type: "text", text: errorMessage }
      }
      const choices = value.choices || [];
      if (choices.length == 0) return { type: "text", text: "" };
      const choice = choices[0] || {};
      if (choice.finish_reason === "stop") {
        return { type: "stop" };
      }
      if (choice.delta && choice.delta.role == "assistant") {
        return { type: "assistant" };
      }
      return { type: "text", text: choice.delta?.content || "" };
    } catch (e) {
      console.log("Error parsing SSE data:", e);
      return { type: "text", text: "" };
    }
  }
}

module.exports = exports = Azure;