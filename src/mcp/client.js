const os = require('node:os');
const path = require('node:path');

const resolveToolID = (server, tool) => {
  return `${server}__${tool}`;
}

const { CacheService, withCache } = require('./cache');
const { initTransport } = require('./transport');

class McpClient {
  clients = new Map();
  pendingClients = new Map();

  constructor() {
    this.initClient = this.initClient.bind(this);
    this.listTools = this.listTools.bind(this);
    this.callTool = this.callTool.bind(this);
    this.listPrompts = this.listPrompts.bind(this);
    this.getPrompt = this.getPrompt.bind(this);
    this.listResources = this.listResources.bind(this);
    this.getResource = this.getResource.bind(this);
    this.closeClient = this.closeClient.bind(this);
    this.removeServer = this.removeServer.bind(this);
    this.restartServer = this.restartServer.bind(this);
    this.stopServer = this.stopServer.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  getServerKey(server) {
    return JSON.stringify({
      url: server.url,
      command: server.command,
      args: Array.isArray(server.args) ? server.args : [],
      registryUrl: server.registryUrl,
      env: server.env,
      id: server.id,
    });
  }

  async initClient(server) {
    const serverKey = this.getServerKey(server);

    const pendingClient = this.pendingClients.get(serverKey);
    if (pendingClient) {
      return pendingClient;
    }

    const existingClient = this.clients.get(serverKey);
    if (existingClient) {
      try {
        const pingResult = await existingClient.ping();
        console.log(`[MCP] Ping result for ${server.name}:`, pingResult);
        if (!pingResult) {
          this.clients.delete(serverKey);
        } else {
          return existingClient;
        }
      } catch (error) {
        console.error(`[MCP] Error pinging server ${server.name}:`, error?.message);
        this.clients.delete(serverKey);
      }
    }

    const initPromise = (async () => {
      try {
        const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
        const client = new Client({ name: 'LemonAI MCP Client', version: '1.0.0' }, { capabilities: {} });

        try {
          const transport = await initTransport(server);
          try {
            await client.connect(transport);
          } catch (error) {
            console.log('error', error);
          }
          this.clients.set(serverKey, client);
          console.log(`[MCP] Activated server: ${server.name}`);
          return client;
        } catch (error) {
          console.error(`[MCP] Error activating server ${server.name}:`, error?.message);
          throw new Error(`[MCP] Error activating server ${server.name}: ${error.message}`);
        }
      } finally {
        this.pendingClients.delete(serverKey);
      }
    })();

    this.pendingClients.set(serverKey, initPromise);
    return initPromise;
  }

  async closeClient(serverKey) {
    const client = this.clients.get(serverKey);
    if (client) {
      await client.close();
      console.log(`[MCP] Closed server: ${serverKey}`);
      this.clients.delete(serverKey);
      CacheService.remove(`mcp:list_tool:${serverKey}`);
      console.log(`[MCP] Cleared cache for server: ${serverKey}`);
    } else {
      console.warn(`[MCP] No client found for server: ${serverKey}`);
    }
  }

  async stopServer(server) {
    const serverKey = this.getServerKey(server);
    console.log(`[MCP] Stopping server: ${server.name}`);
    await this.closeClient(serverKey);
  }

  async removeServer(server) {
    const serverKey = this.getServerKey(server);
    if (this.clients.has(serverKey)) {
      await this.closeClient(serverKey);
    }
  }

  async restartServer(server) {
    console.log(`[MCP] Restarting server: ${server.name}`);
    const serverKey = this.getServerKey(server);
    await this.closeClient(serverKey);
    await this.initClient(server);
  }

  async cleanup() {
    for (const [key] of this.clients) {
      try {
        await this.closeClient(key);
      } catch (error) {
        console.error(`[MCP] Failed to close client: ${error?.message}`);
      }
    }
  }

  async checkMcpConnectivity(server) {
    console.log(`[MCP] Checking connectivity for server: ${server.name}`);
    try {
      const client = await this.initClient(server);
      await client.listTools();
      console.log(`[MCP] Connectivity check successful for server: ${server.name}`);
      return true;
    } catch (error) {
      console.error(`[MCP] Connectivity check failed for server: ${server.name}`, error);
      const serverKey = this.getServerKey(server);
      await this.closeClient(serverKey);
      return false;
    }
  }

  async listToolsImpl(server) {
    console.log(`[MCP] Listing tools for server: ${server.name}`);
    const client = await this.initClient(server);
    try {
      const { tools } = await client.listTools();
      return tools.map((tool) => ({
        ...tool,
        id: resolveToolID(server.name, tool.name),
        serverId: server.id,
        serverName: server.name,
      }));
    } catch (error) {
      console.error(`[MCP] Failed to list tools for server: ${server.name}`, error?.message);
      return [];
    }
  }

  async listTools(server) {
    const cachedListTools = withCache(
      this.listToolsImpl.bind(this),
      (server) => `mcp:list_tool:${this.getServerKey(server)}`,
      5 * 60 * 1000, // 5 minutes TTL
      `[MCP] Tools from ${server.name}`
    );
    return cachedListTools(server);
  }

  async callTool({ server, name, args }) {
    try {
      console.log('[MCP] Calling:', server.name, name, args);
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (e) {
          console.error('[MCP] args parse error', args);
        }
      }
      const client = await this.initClient(server);
      return await client.callTool({ name, arguments: args }, undefined, {
        timeout: server.timeout ? server.timeout * 1000 : 60000, // Default timeout of 1 minute
      });
    } catch (error) {
      console.error(`[MCP] Error calling tool ${name} on ${server.name}:`, error);
      throw error;
    }
  }

  async listPromptsImpl(server) {
    const client = await this.initClient(server);
    console.log(`[MCP] Listing prompts for server: ${server.name}`);
    try {
      const { prompts } = await client.listPrompts();
      return prompts.map((prompt) => ({
        ...prompt,
        id: `p${Math.random()}`,
        serverId: server.id,
        serverName: server.name,
      }));
    } catch (error) {
      if (error?.code !== -32601) { // -32601 is method not found
        console.error(`[MCP] Failed to list prompts for server: ${server.name}`, error?.message);
      }
      return [];
    }
  }

  async listPrompts(server) {
    const cachedListPrompts = withCache(
      this.listPromptsImpl.bind(this),
      (server) => `mcp:list_prompts:${this.getServerKey(server)}`,
      60 * 60 * 1000, // 60 minutes TTL
      `[MCP] Prompts from ${server.name}`
    );
    return cachedListPrompts(server);
  }

  async getPromptImpl(server, name, args) {
    console.log(`[MCP] Getting prompt ${name} from server: ${server.name}`);
    const client = await this.initClient(server);
    return await client.getPrompt({ name, arguments: args });
  }

  async getPrompt({ server, name, args }) {
    const cachedGetPrompt = withCache(
      this.getPromptImpl.bind(this),
      (server, name, args) => {
        const serverKey = this.getServerKey(server);
        const argsKey = args ? JSON.stringify(args) : 'no-args';
        return `mcp:get_prompt:${serverKey}:${name}:${argsKey}`;
      },
      30 * 60 * 1000, // 30 minutes TTL
      `[MCP] Prompt ${name} from ${server.name}`
    );
    return await cachedGetPrompt(server, name, args);
  }

  async listResourcesImpl(server) {
    const client = await this.initClient(server);
    console.log(`[MCP] Listing resources for server: ${server.name}`);
    try {
      const result = await client.listResources();
      const resources = result.resources || [];
      return (Array.isArray(resources) ? resources : []).map((resource) => ({
        ...resource,
        serverId: server.id,
        serverName: server.name,
      }));
    } catch (error) {
      if (error?.code !== -32601) { // -32601 is method not found
        console.error(`[MCP] Failed to list resources for server: ${server.name}`, error?.message);
      }
      return [];
    }
  }

  async listResources(server) {
    const cachedListResources = withCache(
      this.listResourcesImpl.bind(this),
      (server) => `mcp:list_resources:${this.getServerKey(server)}`,
      60 * 60 * 1000, // 60 minutes TTL
      `[MCP] Resources from ${server.name}`
    );
    return cachedListResources(server);
  }

  async getResourceImpl(server, uri) {
    console.log(`[MCP] Getting resource ${uri} from server: ${server.name}`);
    const client = await this.initClient(server);
    try {
      const result = await client.readResource({ uri: uri });
      const contents = [];
      if (result.contents && result.contents.length > 0) {
        result.contents.forEach((content) => {
          contents.push({
            ...content,
            serverId: server.id,
            serverName: server.name,
          });
        });
      }
      return { contents: contents };
    } catch (error) {
      console.error(`[MCP] Failed to get resource ${uri} from server: ${server.name}`, error.message);
      throw new Error(`Failed to get resource ${uri} from server: ${server.name}: ${error.message}`);
    }
  }

  async getResource({ server, uri }) {
    const cachedGetResource = withCache(
      this.getResourceImpl.bind(this),
      (server, uri) => `mcp:get_resource:${this.getServerKey(server)}:${uri}`,
      30 * 60 * 1000, // 30 minutes TTL
      `[MCP] Resource ${uri} from ${server.name}`
    );
    return await cachedGetResource(server, uri);
  }

  removeProxyEnv(env) {
    delete env.HTTPS_PROXY;
    delete env.HTTP_PROXY;
    delete env.grpc_proxy;
    delete env.http_proxy;
    delete env.https_proxy;
  }
}

module.exports = new McpClient();