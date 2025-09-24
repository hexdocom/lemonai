const path = require('path');
const axios = require('axios');
const ECI_SERVER_HOST = process.env.ECI_SERVER_HOST
const { write_code: util_write_code } = require('./utils/tools');
const { getDefaultModel, getCustomModel } = require('@src/utils/default_model')
const { createConf } = require('@src/utils/nginx')
const { status: e2bStatus, createCustomSandboxInstance, doAction } = require('@src/utils/e2b')

const Message = require('@src/utils/message');
const User = require('@src/models/User')

const tools = require("../tools/index.js");
const mcp_tool = require("@src/mcp/tool");
tools['mcp_tool'] = mcp_tool;

const { v4: uuidv4 } = require("uuid");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { find_available_tcp_port } = require('./utils/system');

const read_file = require('./read_file');

const { restrictFilepath } = require('./runtime.util');

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
    this.app_port_1 = null;
    this.app_port_2 = null;
    this.docker_url = null;
    this.vscode_url = null;

  }

  // 要操作容器必须先执行connect_container
  async connect_container() {
    // 查看容器是否存在，如果不存在，初始化容器，如果存在设置全局docker_host

    // 通过user_id查找容器的id
    const user = await User.findOne({ where: { id: this.user_id } })
    let e2b_sandbox_id
    if (user && user.dataValues.e2b_sandbox_id) {
      e2b_sandbox_id = user.dataValues.e2b_sandbox_id
    }
    if (e2b_sandbox_id) {
      const result = await e2bStatus(e2b_sandbox_id);
      if (result.exists) {
        this.docker_url = result.docker_url
        this.vscode_url = result.vscode_url
      } else {
        await this.init_container();
      }
    } else {
      await this.init_container();
    }
    return;
  }

  async init_container() {
    // 初始化容器
    console.log('E2bRuntime.init_container');
    try {
      const result = await createCustomSandboxInstance(this.user_id)
      const sandbox = result.sandbox
      const sandbox_info = await sandbox.getInfo()
      const sandboxId = sandbox_info.sandboxId
      await User.update({ e2b_sandbox_id: sandboxId }, { where: { id: this.user_id } })
      this.docker_url = result.docker_url
      this.vscode_url = result.vscode_url
    } catch (e) {
      throw e
    }
    return
  }

  get_vscode_url(dir_name) {
    return `https://${this.vscode_url}?folder=/workspace/${dir_name}`
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
          action.params.cwd = path.join("../../workspace", dir_name, action.params.cwd)
        } else {
          action.params.cwd = `../../workspace/${dir_name}`
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
        if (model_info.model_name == 'gpt-5-chat') {
          model_info = await getCustomModel('deepseek-v3-250324')
        }
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
          if (action.params.file_path) {
            action.params.file_path = path.join(__dirname, '../../workspace', `user_${this.user_id}`, dir_name, action.params.file_path)
          }
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
    let res = await doAction(this.docker_url, action, uuid)
    return res
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