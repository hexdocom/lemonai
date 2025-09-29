// @ts-ignore
const router = require("koa-router")();
const axios = require('axios')
const { PassThrough } = require("stream");

const calcToken = require('@src/completion/calc.token.js')

const OPENAI_API_KEY = process.env.API_KEY;
const OPENAI_BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME

router.post("/v1/chat/completions", async (ctx, next) => {
  const { request, response, state } = ctx;
  const body = request.body || {};
  const conversation_id = body.conversation_id

  // 检查 API Key 是否设置
  if (!OPENAI_API_KEY) {
    ctx.status = 500;
    ctx.body = {
      error: {
        message: "OpenAI API Key not configured. Please set OPENAI_API_KEY environment variable.",
        type: "server_error",
        code: "api_key_missing",
      },
    };
    return;
  }

  // 根据客户端请求判断是否需要流式响应
  const isStream = body.stream === true;

  // Koa 的 response body 可以直接是 stream
  const clientResponseStream = new PassThrough();
  ctx.body = clientResponseStream;
  ctx.status = 200;

  try {
    // 构建转发给 OpenAI 的请求体
    // 假设客户端发送的 body 结构与 OpenAI 的 Chat Completion API 相同
    const openaiRequestBody = { ...body };
    // 确保 stream 参数与我们期望的转发行为一致
    openaiRequestBody.model = MODEL_NAME;
    openaiRequestBody.stream = isStream;

    console.log("111111", JSON.stringify(openaiRequestBody))
    // 构建 OpenAI API 请求头
    const openaiHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };

    // 如果是流式请求，设置相应的响应头
    if (isStream) {
      response.type = "text/event-stream";
      response.set("Cache-Control", "no-cache");
      response.set("Connection", "keep-alive");
      response.set("X-Accel-Buffering", "no"); // 禁用 Nginx 缓冲
    } else {
      // 非流式请求，保持默认的 application/json 或由 OpenAI 返回决定
      response.type = "application/json";
    }

    // 发送请求到 OpenAI API
    const openaiResponse = await axios({
      method: "post",
      url: `${OPENAI_BASE_URL}/chat/completions`, // 使用 chat/completions 接口
      headers: openaiHeaders,
      data: openaiRequestBody,
      responseType: isStream ? "stream" : "json", // 根据是否流式决定响应类型
    });

    if (isStream) {
      // **流式转发：将 OpenAI 的响应流直接 pipe 到客户端响应流**
      let fullContent = "";

      // 计算输入 tokens
      const input_tokens = calcTokenInput('', openaiRequestBody.messages);

      openaiResponse.data.on('data', (chunk) => {
        // 收集完整响应内容
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                fullContent += parsed.choices[0].delta.content;
              }
              // 处理 tool_calls
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                const toolCalls = parsed.choices[0].delta.tool_calls;
                for (const toolCall of toolCalls) {
                  if (toolCall.function) {
                    if (toolCall.function.name) {
                      fullContent += `Function: ${toolCall.function.name}\n`;
                    }
                    if (toolCall.function.arguments) {
                      fullContent += `Arguments: ${toolCall.function.arguments}\n`;
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      });

      openaiResponse.data.pipe(clientResponseStream);

      // 监听 OpenAI 响应流的结束事件
      openaiResponse.data.on('end', async () => {
        // 计算输出 tokens
        const output_tokens = calcToken(fullContent);

        // 扣除积分
        console.log("===input_tokens, output_tokens======", input_tokens, output_tokens)

        clientResponseStream.end();
        console.log("OpenAI stream ended, client stream closed.");
      });

      // 监听 OpenAI 响应流的错误事件
      openaiResponse.data.on('error', (err) => {
        console.error("Error piping OpenAI stream:", err);
        // 尝试发送错误事件给客户端
        const errorData = JSON.stringify({
          error: {
            message: err.message || "An error occurred during streaming from OpenAI.",
            type: "openai_stream_error",
            code: null,
          },
        });
        clientResponseStream.write(`data: ${errorData}\n\n`);
        clientResponseStream.end();
        ctx.status = 500; // 设置状态码
      });

    } else {
      // 非流式转发：直接返回 OpenAI 的 JSON 响应
      const input_tokens = openaiResponse.data.usage.prompt_tokens
      const output_tokens = openaiResponse.data.usage.completion_tokens

      console.log("===input_tokens, output_tokens======nostream:", input_tokens, output_tokens)


      ctx.body = openaiResponse.data;
      ctx.status = openaiResponse.status;
    }

  } catch (error) {
    console.error("Error during OpenAI API proxy:", error);

    // 处理 Axios 错误
    if (axios.isAxiosError(error) && error.response) {
      // 如果 OpenAI 返回了错误响应
      console.error("OpenAI API error response:", error.response.data);
      ctx.status = error.response.status; // 使用 OpenAI 返回的状态码
      ctx.body = error.response.data; // 直接返回 OpenAI 的错误体
    } else {
      // 其他未知错误
      ctx.status = 500;
      ctx.body = {
        error: {
          message: error.message || "An unknown error occurred during proxying to OpenAI.",
          type: "proxy_server_error",
          code: null,
        },
      };
    }

    // 如果流已经打开，确保它被关闭
    if (isStream && !clientResponseStream.writableEnded) {
      clientResponseStream.end();
    }
  }
});

const calcTokenInput = (prompt, messages) => {
  let content = prompt;
  for (const message of messages) {
    // 添加 role 信息
    content += `role: ${message.role}\n`;

    // 处理 content
    if (message.content) {
      if (typeof message.content === 'string') {
        content += message.content;
      } else if (Array.isArray(message.content)) {
        // 处理数组形式的 content
        for (const item of message.content) {
          if (item.type === 'text') {
            content += item.text;
          }
        }
      }
    }

    // 处理 tool_calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        content += `tool_call: ${toolCall.type}\n`;
        if (toolCall.function) {
          content += `function: ${toolCall.function.name}\n`;
          if (toolCall.function.arguments) {
            content += `arguments: ${toolCall.function.arguments}\n`;
          }
        }
      }
    }

    // 添加消息分隔符
    content += '\n---\n';
  }
  return calcToken(content);
}

module.exports = exports = router.routes();