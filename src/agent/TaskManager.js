const fs = require('fs');
const path = require('path');

const Task = require('@src/models/Task');
// 确保临时目录存在
const { getDirpath } = require('@src/utils/electron');
const cache_dir = getDirpath('Caches/task');
fs.mkdirSync(cache_dir, { recursive: true }); // 创建目录，如果已存在则不做任何操作

class TaskManager {
  constructor(logFilePath = 'task_log.md', conversation_id = null) {
    this.conversation_id = conversation_id;
    this.tasks = [];
    this.logFilePath = path.resolve(cache_dir, logFilePath);
  }

  async bulkCreate(tasks) {
    const tasksToSave = tasks.map(task => ({
      conversation_id: this.conversation_id,
      task_id: task.id,
      requirement: task.requirement,
      status: task.status,
      parent_id: task.parent_id,
    }));
    await Task.bulkCreate(tasksToSave);
  }

  async setTasks(tasks, sync = true) {
    const prefix = (Date.now() / 1000).toFixed(0);
    let index = 1;
    this.tasks = tasks.map(item => {
      item.requirement = item.description || item.requirement;
      item.id = item.id || `${prefix}_000${index++}`
      item.status = item.status || 'pending';
      return item
    })

    const tasksToSave = this.tasks.map(task => ({
      conversation_id: this.conversation_id,
      task_id: task.id,
      requirement: task.requirement,
      status: task.status,
    }));
    sync && await Task.bulkCreate(tasksToSave);
  }

  getTasks() {
    return this.tasks || [];
  }

  async loadTasks() {
    if (!this.conversation_id) {
      console.error("Error: Cannot load tasks without a conversation_id.");
      return [];
    }

    try {
      const tasks = await Task.findAll({
        where: { conversation_id: this.conversation_id, },
        order: [['id', 'ASC']]
      });

      if (!tasks || tasks.length === 0) {
        this.tasks = [];
        return [];
      }

      const taskMap = new Map();
      const rootTasks = [];

      for (const task of tasks) {
        const dataValues = task.dataValues;
        const value = {
          id: dataValues.task_id,
          requirement: dataValues.requirement,
          status: dataValues.status,
          error: dataValues.error,
          result: dataValues.result,
          memorized: dataValues.memorized,
          parent_id: dataValues.parent_id,
          children: []
        };
        taskMap.set(dataValues.task_id, value);
      }

      for (const task of taskMap.values()) {
        if (task.parent_id) {
          const parent = taskMap.get(task.parent_id);
          if (parent) {
            parent.children.push(task);
          } else {
            console.warn(`Warning: Task with ID ${task.id} has an invalid parent_id ${task.parent_id}. Treating as a root task.`);
            rootTasks.push(task);
          }
          continue;
        }
        rootTasks.push(task);
      }

      this.tasks = rootTasks;
      return this.tasks;

    } catch (error) {
      console.error("Failed to load tasks:", error);
      return [];
    }
  }

  /**
   * Finds a task or a sub-task by its ID.
   * The search is performed on top-level tasks and their direct children.
   *
   * @param {string | number} taskId The ID of the task or sub-task to find.
   * @returns {object | undefined} The found task object or undefined if not found.
   */
  getTaskById(taskId) {
    for (const task of this.tasks) {
      if (task.id === taskId) {
        return task;
      }
      if (task.children) {
        const subTask = task.children.find(c => c.id === taskId);
        if (subTask) {
          return subTask;
        }
      }
    }
    return undefined;
  }

  getTaskIndexById(taskId) {
    return this.tasks.findIndex(t => t.id === taskId);
  }

  async updateTaskStatus(taskId, status, details = {}) {
    const task = this.getTaskById(taskId);
    if (!task) {
      console.error(`Task with ID ${taskId} not found.`);
      return;
    }

    const oldStatus = task.status;
    task.status = status;

    if (status === 'revise_plan' && details.params) {
      await this.revisePlan(taskId, details.params || {});
    }

    const keys = ['content', 'memorized', 'comments'];
    for (const key of keys) {
      if (details[key]) {
        task[key] = details[key];
      }
    }

    await Task.update({
      status: task.status,
      content: task.content,
      memorized: task.memorized,
    }, {
      where: {
        task_id: taskId
      }
    });
  }

  async revisePlan(task_id, options = {}) {
    const { mode, tasks } = options;

    const resolveRequirement = task => {
      return `### ${task.title}
<goal>${task.goal}</goal>
<context>${task.context}</context>
<acceptance_criteria>${task.acceptance_criteria}</acceptance_criteria>`
    }
    const prefix = (Date.now() / 1000).toFixed(0);
    let index = 1;
    tasks.map(task => {
      task.conversation_id = this.conversation_id;
      task.id = task.id || `${prefix}_000${index++}`
      task.requirement = resolveRequirement(task)
      return task
    })

    if (mode === 'decompose') {
      // 将任务分解到指定任务的 children 下
      const task = this.getTaskById(task_id);
      if (!task) {
        console.error(`Task with ID ${task_id} not found.`);
        return;
      }
      task.children = task.children || [];
      const children = tasks.map(item => {
        item.status = 'pending';
        item.depth = (task.depth || 1) + 1;
        item.parent_id = task_id;
        return item
      });
      task.children.push(...children);

      await this.bulkCreate(children);
    }

    if (mode === 'overwrite') {
      // 保存已完成任务的状态
      const completedTasks = new Map();
      this.tasks.forEach(task => {
        if (task.status === 'completed') {
          completedTasks.set(task.id, task);
        }
      });

      // 创建新的任务列表，保持已完成任务的状态
      const newTasks = tasks.map(newTask => {
        const completedTask = completedTasks.get(newTask.id);
        if (completedTask) {
          // 保持已完成任务的状态，但更新其他属性
          return { ...newTask, status: completedTask.status };
        }
        // 新任务默认为 pending 状态
        return { ...newTask, status: 'pending' };
      });

      // 替换任务列表
      await this.setTasks(newTasks, false);
    }
  }

  async resolvePendingTask() {
    const getFirstPendingTask = (tasks = []) => {
      for (const task of tasks) {
        if (task.status !== 'pending' && task.status !== 'revise_plan' && task.status !== 'pause_for_user_input') {
          continue;
        }
        if (task.children && task.children.length > 0) {
          const pendingChild = getFirstPendingTask(task.children);
          if (pendingChild) {
            return pendingChild;
          }
          continue;
        }
        return task;
      }
      return null;
    };

    const tasks = this.getTasks();
    return getFirstPendingTask(tasks);
  }

  resolveTasksDescription(current_task_id) {
    const tasks = this.getTasks();
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return '<tasks></tasks>';
    }

    const resolveTaskStatus = (task = {}) => {
      const status = task.status;
      if (task.id === current_task_id) {
        return 'in_progress';
      }
      if (status === 'completed') {
        return 'completed';
      }
      return 'paused';
    }
    /**
     * 递归处理单个任务节点
     */
    function formatTask(task = {}, depth = 0) {
      const indent = '  '.repeat(depth + 1);
      const isCurrent = task.id === current_task_id;
      const status = resolveTaskStatus(task);
      let result = `${indent}<task id="${task.id}" status="${status}"${isCurrent ? ' current="true"' : ''}>\n`;
      if (task.requirement) {
        result += `${indent}  <requirement><![CDATA[${task.requirement}]]></requirement>\n`;
      }
      // 处理子任务
      if (task.children && task.children.length > 0) {
        result += `${indent}  <subtasks>\n`;
        for (const child of task.children) {
          result += formatTask(child, depth + 2);
        }
        result += `${indent}  </subtasks>\n`;
      }

      result += `${indent}</task>\n`;
      return result;
    }
    let xml = '<tasks>\n';
    for (const task of tasks) {
      xml += formatTask(task);
    }
    xml += '</tasks>';
    return xml;
  }

}

module.exports = TaskManager;