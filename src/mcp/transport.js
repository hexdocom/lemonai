const getBinaryPath = require('./binary');

const initStreamTransport = async (server = {}) => {
  const sse_url = server.url;
  if (server.type === 'streamableHttp') {
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp')
    const options = {
      requestInit: { headers: server.headers || {} },
    };
    return new StreamableHTTPClientTransport(new URL(sse_url), options);
  } else if (server.type === 'sse') {
    const options = {
      // eventSourceInit: {
      //   fetch: async (url, init) => {
      //     const headers = { ...(server.headers || {}), ...(init?.headers || {}) };
      //     return fetch(url, { ...init, headers });
      //   },
      // },
      requestInit: { headers: server.headers || {} },
    };
    const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
    console.log(sse_url);
    return new SSEClientTransport(new URL(sse_url), options);
  } else {
    throw new Error('Invalid server type');
  }
}

const initStdioTransport = async (server = {}) => {
  const args = [...(server.args || [])];
  let cmd = server.command;
  if (server.command === 'npx') {
    cmd = await getBinaryPath('bun');
    console.log(`[MCP] Using command: ${cmd}`);
    if (args && args.length > 0) {
      if (!args.includes('-y')) args.unshift('-y');
      if (!args.includes('x')) args.unshift('x');
    }
    if (server.registryUrl) {
      server.env = { ...server.env, NPM_CONFIG_REGISTRY: server.registryUrl };
    }
  } else if (server.command === 'uvx' || server.command === 'uv') {
    cmd = await getBinaryPath(server.command);
    if (server.registryUrl) {
      server.env = { ...server.env, UV_DEFAULT_INDEX: server.registryUrl, PIP_INDEX_URL: server.registryUrl };
    }
  }

  console.log(`[MCP] Starting server with command: ${cmd} ${args ? args.join(' ') : ''}`);
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const stdioTransport = new StdioClientTransport({
    command: cmd,
    args,
    env: { ...server.env },
    stderr: 'pipe',
  });
  stdioTransport.stderr?.on('data', (data) =>
    console.log(`[MCP] Stdio stderr for server: ${server.name} `, data.toString())
  );
  return stdioTransport;
}

const initTransport = async (server = {}) => {
  if (server.url) {
    const transport = await initStreamTransport(server);
    return transport
  }
  if (server.command) {
    const transport = await initStdioTransport(server);
    return transport;
  }
};

module.exports = exports = {
  initTransport
}