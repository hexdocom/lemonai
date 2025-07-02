const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const Docker = require('dockerode');
const os = require('os');
const DOCKER_HOST_ADDR = process.env.DOCKER_HOST_ADDR;
const { write_code: util_write_code } = require('./utils/tools');
const { getDefaultModel } = require('@src/utils/default_model')

let dockerOptions = {};
if (os.platform() === 'win32') {
  // Windows: 使用 named pipe
  dockerOptions.socketPath = '//./pipe/docker_engine';
} else {
  // Linux/macOS: 使用默认的 Unix socket
  dockerOptions.socketPath = '/var/run/docker.sock';
}
const docker = new Docker(dockerOptions);

const Message = require('@src/utils/message');

const tools = require("../tools/index.js");
const mcp_tool = require("@src/mcp/tool");
// @ts-ignore
tools['mcp_tool'] = mcp_tool;

const { v4: uuidv4 } = require("uuid");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { find_available_tcp_port } = require('./utils/system');

const read_file = require('./read_file');

const { restrictFilepath } = require('./runtime.util');


EXECUTION_SERVER_PORT_RANGE = [30000, 39999]
VSCODE_PORT_RANGE = [40000, 49999]
APP_PORT_RANGE_1 = [50000, 54999]
APP_PORT_RANGE_2 = [55000, 59999]

/**
 * @typedef {import('./DockerRuntime').DockerRuntime} LocalRuntimeInterface
 * @typedef {import('./DockerRuntime').Action} Action
 * @typedef {import('./DockerRuntime').ActionResult} ActionResult
 * @typedef {import('./DockerRuntime').Memory} Memory
 */

class DockerRuntime {

  /**
   * 创建一个docker运行时实例
   * @param {Object} [options={}] - 配置选项
   * @param {Memory} options.memory - 记忆管理实例
   */
  constructor(options) {

    const { getDirpath } = require('@src/utils/electron');
    let workspace_dir = getDirpath(process.env.WORKSPACE_DIR || 'workspace');
    if (DOCKER_HOST_ADDR) {
      workspace_dir = process.env.ACTUAL_HOST_WORKSPACE_PATH;
    }
    this.workspace_dir = workspace_dir;
    this.host_port = null;
    this.vscode_port = null;
    this.app_port_1 = null;
    this.app_port_2 = null;
  }

  // 要操作容器必须先执行connect_container
  async connect_container() {
    // 查看容器是否存在，如果不存在，初始化容器，如果存在但是没启动，start容器
    let container;
    try {
      container = docker.getContainer('lemon-runtime-sandbox')
      const container_info = await container.inspect();
      if (container_info.State.Status === 'exited') {
        console.log('DockerRuntime.connect_container.container exited, start container');
        await container.start();
      } else if (container_info.State.Status === 'running') {
        console.log('DockerRuntime.connect_container.container is running');
      }
    } catch (err) {
      console.log('DockerRuntime.connect_container.getContainer', err.message);
      container = await this.init_container();
    }

    let container_info = await container.inspect()
    this.host_port = Object.keys(container_info.NetworkSettings.Ports)[0].split('/')[0]
    this.vscode_port = Object.keys(container_info.NetworkSettings.Ports)[1].split('/')[0]
    this.app_port_1 = Object.keys(container_info.NetworkSettings.Ports)[2].split('/')[0]
    this.app_port_2 = Object.keys(container_info.NetworkSettings.Ports)[3].split('/')[0]

    // const cmdArgs = container_info.Config.Cmd;
    // // 遍历命令行参数，找到对应的端口值
    // for (let i = 0; i < cmdArgs.length; i++) {
    //   if (cmdArgs[i] === '--port') {
    //     this.host_port = cmdArgs[i + 1];
    //   } else if (cmdArgs[i] === '--vscode_port') {
    //     this.vscode_port = cmdArgs[i + 1];
    //   }
    // }

    return container;
  }

  async find_available_port(port_range) {
    const port = await find_available_tcp_port(port_range[0], port_range[1]);
    return port
  }

  async init_container() {
    // 初始化容器
    console.log('DockerRuntime.init_container');

    const host_port = await this.find_available_port(EXECUTION_SERVER_PORT_RANGE);
    this.host_port = host_port
    const vscode_port = await this.find_available_port(VSCODE_PORT_RANGE);
    const app_port_1 = await this.find_available_port(APP_PORT_RANGE_1);
    const app_port_2 = await this.find_available_port(APP_PORT_RANGE_2);

    const PortBindingsMap = {}
    PortBindingsMap[`${host_port}/tcp`] = [{ HostPort: `${host_port}` }]
    PortBindingsMap[`${vscode_port}/tcp`] = [{ HostPort: `${vscode_port}` }]
    PortBindingsMap[`${app_port_1}/tcp`] = [{ HostPort: `${app_port_1}` }]
    PortBindingsMap[`${app_port_2}/tcp`] = [{ HostPort: `${app_port_2}` }]


    const exposedPortsMap = {}
    exposedPortsMap[`${host_port}/tcp`] = {}
    exposedPortsMap[`${vscode_port}/tcp`] = {}
    exposedPortsMap[`${app_port_1}/tcp`] = {}
    exposedPortsMap[`${app_port_2}/tcp`] = {}

    const imageName = 'hexdolemonai/lemon-runtime-sandbox:latest';
    await this.ensureImageExists(docker, imageName);

    const container = await docker.createContainer({
      Image: imageName,
      name: 'lemon-runtime-sandbox',                // 容器名称
      Cmd: ['node', 'chataa/action_execution_server.js', '--port', `${host_port}`, '--vscode_port', `${vscode_port}`],  // 启动命令
      WorkingDir: '/chataa/code',                // 容器内工作目录
      ExposedPorts: exposedPortsMap,
      HostConfig: {
        Binds: [
          // 本地目录 : 容器目录 : 模式（rw 可读写 / ro 只读）
          `${this.workspace_dir}:/workspace:rw`
        ],
        PortBindings: PortBindingsMap,
        AutoRemove: false,  // 如需容器退出后自动删除，可改为 true
        // NetworkMode: 'host',
      },
    });
    // 2. 启动容器
    await container.start();
    return container;
  }

  async ensureImageExists(docker, imageName) {
    try {
      await docker.getImage(imageName).inspect();
      console.log(`[Docker] Image ${imageName} already exists`);
    } catch (err) {
      if (err.statusCode === 404) {
        console.log(`[Docker] Image ${imageName} not found locally, pulling from registry...`);
        await new Promise((resolve, reject) => {
          docker.pull(imageName, (err, stream) => {
            if (err) {
              return reject(new Error(`[Docker] Failed to pull image: ${err.message}`));
            }
            docker.modem.followProgress(stream, (err, res) => {
              if (err) return reject(new Error(`[Docker] Pull image progress error: ${err.message}`));
              resolve(res);
            });
          });
        });
        console.log(`[Docker] Image ${imageName} pulled successfully`);
      } else {
        throw new Error(`[Docker] Failed to inspect image: ${err.message}`);
      }
    }
  }

  async handle_memory(result, action, memory) {
    const type = action.type;
    const tool = tools[type];
    const memorized_type = new Set(['read_file', "write_code", "terminal_run"]);
    if (result.status === 'success') {
      const content = result.content || result.stderr;
      // handle memory
      const memorized = memorized_type.has(type)
      let action_memory = ""
      if (memorized && tool && tool.resolveMemory) {
        action_memory = tool.resolveMemory(action, content);
      }
      const meta = {
        action,
        action_memory,
        status: 'success'
      }
      await memory.addMessage('user', content, action.type, memorized, meta);
    }
    return memory;
  }

  /**
   * @param {Action} action 
   * @param {*} context 
   * @returns {Promise<ActionResult>}
   */
  async execute_action(action, context = {}, task_id) {
    const { type, params } = action;
    // 根据 action.type 调用对应的方法
    console.log('action', action.type);
    const uuid = uuidv4();
    // action running message
    const tool = tools[type];
    if (tool && tool.getActionDescription) {
      const description = await tool.getActionDescription(params);
      const value = {
        uuid: uuid,
        content: description,
        status: 'running',
        meta: {
          task_id: task_id,
          action_type: type,
        },
        timestamp: new Date().valueOf()
      }
      const msg = Message.format({ uuid: uuid, status: 'running', content: description, action_type: type, task_id: task_id });
      // context.onTokenStream(msg)
      await this.callback(msg, context);
      Message.saveToDB(msg, context.conversation_id);
      await delay(500);
    }

    /**
     * @type {ActionResult}
     */
    let result;
    const dir_name = 'Conversation_' + context.conversation_id.slice(0, 6);
    switch (type) {
      case 'write_code':
        if (action.params.path) {
          action.params.origin_path = action.params.path;
          action.params.path = path.join(dir_name, action.params.path)
        }
        result = await this.write_code(action, uuid);
        break;
      case 'terminal_run':
        if (action.params.cwd) {
          action.params.cwd = path.join(dir_name, action.params.cwd)
        } else {
          action.params.cwd = `./${dir_name}`
        }
        result = await this._call_docker_action(action, uuid);
        break;
      case 'read_file':
        if (action.params.path) {
          action.params.path = path.join(dir_name, action.params.path)
        }
        result = await this.read_file(action, uuid);
        break;
      case 'browser':
        let model_info = await getDefaultModel()
        const llm_config = {
          model_name: model_info.model_name,
          api_url: model_info.base_url,
          api_key: model_info.api_key
        }
        // llm_config.api_url='http://host.docker.internal:3002/api/agent/v1'
        action.params.llm_config = llm_config
        action.params.conversation_id = context.conversation_id
        result = await this._call_docker_action(action, uuid)
        break;
      default:
        if (tool) {
          console.log('DockerRuntime.execute_action.tool', tool.name, params);
          const execute = tool.execute;
          params.conversation_id = context.conversation_id
          const execute_result = await execute(params, uuid, context);
          console.log(`${tool.name}.call.result`, execute_result);
          const { content, meta = {} } = execute_result;
          result = { uuid, status: 'success', content, memorized: tool.memorized || false, meta };
        } else {
          result = { status: 'failure', error: `Unknown action type: ${type}`, content: '', stderr: '' };
        }
    }
    // 保存 action 执行结果到 memory
    console.log('DockerRuntime.execute_action', result);
    await this.handle_memory(result, action, context.memory);
    // 回调处理
    let meta_url = ''
    let meta_json = []
    let meta_file_path = ''
    if (result.meta) {
      meta_url = result.meta.url || ''
      meta_json = result.meta.json || []
      meta_file_path = result.meta.filepath || ''
    }
    const msg = Message.format({ status: result.status, memorized: result.memorized || '', content: result.content || '', action_type: type, task_id: task_id, uuid: uuid || '', url: meta_url, json: meta_json, filepath: meta_file_path, comments: result.comments });
    await this.callback(msg, context);
    await Message.saveToDB(msg, context.conversation_id);
    return result;
  }

  async _call_docker_action(action, uuid) {
    const host = DOCKER_HOST_ADDR ? DOCKER_HOST_ADDR : 'localhost'
    const request = {
      method: 'POST',
      url: `http://${host}:${this.host_port}/execute_action`,
      data: { action: action, uuid: uuid },
    };
    try {
      const response = await axios(request);
      return response.data.data
    } catch (e) {
      let errorMsg = '';
      if (e.errors) {
        // 如果 e.errors 是对象或数组，转成字符串
        if (typeof e.errors === 'object') {
          errorMsg = JSON.stringify(e.errors);
        } else {
          errorMsg = e.errors.toString();
        }
      } else if (e.message) {
        errorMsg = e.message;
      } else {
        errorMsg = String(e);
      }

      return { uuid: uuid, status: 'failure', comments: `Failed to do ${action.type}: ${errorMsg}` };
    }
  }

  /**
   * @param {Action} action
   * @returns {Promise<ActionResult>}
   */
  async write_code(action, uuid) {
    return util_write_code(action, uuid);
  }

  /**
   * @param {Action} action
   * @returns {Promise<ActionResult>}
   */
  async read_file(action) {
    let { path: filepath } = action.params;
    filepath = await restrictFilepath(filepath);

    try {
      const content = await read_file(filepath);
      return { status: 'success', content, error: "", meta: { filepath: filepath } };
    } catch (error) {
      return { status: 'failure', content: "", error: `Failed to read file ${filepath}: ${error.message}` };
    }
  }

  async callback(result, context = {}) {
    const { onTokenStream } = context;
    if (onTokenStream) {
      onTokenStream(result);
    }
  }
}

module.exports = DockerRuntime;