const path = require('path');
const axios = require('axios');
const Docker = require('dockerode');
const os = require('os');
const DOCKER_HOST_ADDR = process.env.DOCKER_HOST_ADDR;
const ECI_SERVER_HOST = process.env.ECI_SERVER_HOST
const { write_code: util_write_code } = require('./utils/tools');
const { getDefaultModel } = require('@src/utils/default_model')
// const { createConf } = require('@src/utils/nginx')


const Message = require('@src/utils/message');

const tools = require("../tools/index.js");
const mcp_tool = require("@src/mcp/tool");
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
  constructor(context) {
    this.user_id = context.user_id
    // this.workspace_dir = workspace_dir;
    this.host_port = null;
    this.vscode_port = null;
    this.app_port_1 = null;
    this.app_port_2 = null;
    this.docker_host = null;
  }

  // 要操作容器必须先执行connect_container
  async connect_container() {
    // 查看容器是否存在，如果不存在，初始化容器，如果存在设置全局docker_host

    // 先创建一个，todo检查是否存在

    const request = {
      method: 'POST',
      url: `${ECI_SERVER_HOST}/status`,
      data: { name: `user-${this.user_id}-lemon-runtime-sandbox` },
    };

    const response = await axios(request)

    if (response.data.TotalCount > 0) {
      this.docker_host = response.data.ContainerGroups[0].IntranetIp
    } else {
      await this.init_container();
    }

    this.host_port = 9001
    this.vscode_port = 9002
    this.app_port_1 = 10001
    this.app_port_2 = 10002

    return;
  }

  get_vscode_url(dir_name) {
    return `https://${this.user_id}-vscode.lemonai.ai?folder=/workspace/${dir_name}`
  }

  async find_available_port(port_range) {
    const port = await find_available_tcp_port(port_range[0], port_range[1]);
    return port
  }

  async init_container() {
    // 初始化容器
    console.log('DockerRuntime.init_container');
    const request = {
      method: 'POST',
      url: `${ECI_SERVER_HOST}/amd`,
      data: { name: `user-${this.user_id}-lemon-runtime-sandbox`, workspace: `user_${this.user_id}` },
    };
    try {
      const response = await axios(request);
      this.docker_host = response.data.IntranetIp
      // await createConf(this.docker_host, this.user_id)
    } catch (e) {
      throw e
    }

    return
  }

  async handle_memory(result, action, memory) {
    const type = action.type;
    const tool = tools[type];
    const memorized_type = new Set(['read_file', "write_code", "terminal_run"]);
    if (result.status === 'success') {
      const content = result.content || result.stderr;
      // handle memory
      const memorized = memorized_type.has(type) || (result.memorized || false);
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
        let model_info = await getDefaultModel(context.conversation_id)
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
          try {
            const execute = tool.execute;
            params.conversation_id = context.conversation_id
            const execute_result = await execute(params, uuid, context);
            console.log(`${tool.name}.call.result`, execute_result);
            // console.log('LocalRuntime.execute_action.tool.execute', execute_result);
            const { content, meta = {} } = execute_result;
            result = { uuid, status: 'success', content, memorized: tool.memorized || false, meta };
          } catch (error) {
            result = { status: 'failure', error: error.message, content: '', stderr: '' };
          }
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
    let meta_content = ''
    if (result.meta) {
      meta_url = result.meta.url || ''
      meta_json = result.meta.json || []
      meta_file_path = result.meta.filepath || ''
      meta_content = result.meta.content || ''
    }
    const msg = Message.format({ status: result.status, memorized: result.memorized || '', content: result.content || '', action_type: type, task_id: task_id, uuid: uuid || '', url: meta_url, json: meta_json, filepath: meta_file_path, meta_content: meta_content, comments: result.comments });
    await this.callback(msg, context);
    await Message.saveToDB(msg, context.conversation_id);
    return result;
  }

  async _call_docker_action(action, uuid) {
    const host = this.docker_host
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
    return util_write_code(action, uuid, this.user_id);
  }

  /**
   * @param {Action} action
   * @returns {Promise<ActionResult>}
   */
  async read_file(action) {
    let { path: filepath } = action.params;
    filepath = await restrictFilepath(filepath, this.user_id);

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