const fs = require('fs');
const path = require('path');
const { getDirpath } = require('@src/utils/electron');
const cache_dir = getDirpath('Caches/memory');
fs.mkdirSync(cache_dir, { recursive: true });

const Task = require('@src/models/Task');

const getTaskList = async (conversation_id) => {
  const tasks = await Task.findAll({
    where: {
      conversation_id
    }
  });
  return tasks;
}

const resolveConversation = async (conversation_id) => {
  const dir = path.join(cache_dir, conversation_id.substring(0, 6));
  if (!fs.existsSync(dir)) {
    return [];
  }
  const tasks = await getTaskList(conversation_id);
  for (const task of tasks) {
    const task_filepath = path.resolve(dir, `${task.dataValues.task_id}.json`)
    if (fs.existsSync(task_filepath)) {
      const content = fs.readFileSync(task_filepath, 'utf-8');
      task.dataValues.messages = JSON.parse(content);
    }
  }
  return tasks;
}

module.exports = resolveConversation;