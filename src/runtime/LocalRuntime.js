const fs = require('fs').promises;
const path = require('path');
const {write_code:util_write_code} = require('./utils/tools');
const tools = require("@src/tools/index.js");
const { v4: uuidv4 } = require("uuid");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Message = require('@src/utils/message');

const terminal_run = require('./terminal_run');
const read_file = require('./read_file');

const { restrictFilepath } = require('./runtime.util');

/**
 * @typedef {import('types/LocalRuntime').LocalRuntime} LocalRuntimeInterface
 * @typedef {import('types/LocalRuntime').Action} Action
 * @typedef {import('types/LocalRuntime').ActionResult} ActionResult
 * @typedef {import('types/LocalRuntime').Memory} Memory
 */

class LocalRuntime {

  /**
   * Create a local runtime instance
   * @param {Object} [options={}] - Configuration options
   * @param {Memory} options.memory - Memory management instance
   */
  constructor(options) {
    this.memory = null
  }

  async handle_memory(result, action, memory) {
    const type = action.type;
    const memorized_type = new Set(['read_file']);
    const { status, content, meta = {} } = result;
    if (status === 'success') {
      console.log('LocalRuntime.handle_memory.memory logging user prompt');
      const memorized = memorized_type.has(type) || (result.memorized || false);
      await memory.addMessage('user', content, type, memorized, meta);
    }
    return memory;
  }

  async callback(result, context = {}) {
    const { onTokenStream } = context;
    if (onTokenStream) {
      onTokenStream(result);
    }
  }

  /**
   * @param {Action} action 
   * @param {*} context 
   * @returns {Promise<ActionResult>}
   */
  async execute_action(action, context = {}, task_id) {
    const { type, params } = action;

    // Call the corresponding method based on action.type
    console.log('action', action.type);
    const uuid = uuidv4();

    // action running message
    const tool = tools[type];
    if (tool.getActionDescription) {
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
      context.onTokenStream(msg)
      await this.callback(msg, context);
      Message.saveToDB(msg, context.conversation_id);
      await delay(500);
    }

    /**
     * @type {ActionResult}
     */
    let result;
    switch (type) {
      case 'write_code':
        result = await this.write_code(action, uuid);
        break;
      case 'terminal_run':
        result = await terminal_run(action, uuid);
        break;
      case 'read_file':
        result = await this.read_file(action, uuid);
        break;
      default:
        if (tool) {
          console.log('LocalRuntime.execute_action.tool', tool.name, params);
          const execute = tool.execute;
          const execute_result = await execute(params);
          // console.log('LocalRuntime.execute_action.tool.execute', execute_result);
          const { content, meta = {} } = execute_result;
          result = { uuid, status: 'success', content, memorized: tool.memorized || false, meta };
        } else {
          result = { status: 'failure', error: `Unknown action type: ${type}`, content: '', stderr: '' };
        }
    }

    // Save action execution result to memory
    console.log('LocalRuntime.execute_action', result);
    await this.handle_memory(result, action, context.memory);
    // Callback processing
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
    const msg = Message.format({ status: result.status, memorized: result.memorized || '', content: result.content || '', action_type: type, task_id: task_id, uuid: uuid || '', url: meta_url, json: meta_json, filepath: meta_file_path, meta_content: meta_content });
    await this.callback(msg, context);
    await Message.saveToDB(msg, context.conversation_id);
    return result;
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
  async read_file(action, uuid) {
    let { path: filepath } = action.params;
    filepath = await restrictFilepath(filepath);

    try {
      const content = await read_file(filepath);
      return {
        uuid,
        status: 'success',
        content, error: "",
        meta: {
          action_type: action.type,
          filepath
        }
      };
    } catch (error) {
      return { status: 'failure', content: "", error: `Failed to read file ${filepath}: ${error.message}` };
    }
  }
}

module.exports = LocalRuntime;