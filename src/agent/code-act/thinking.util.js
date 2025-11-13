const Task = require('@src/models/Task');
const loadConversationMemory = async (conversation_id) => {
  const tasks = await Task.findAll({
    where: {
      conversation_id
    }
  })
  const memories = []
  for (const task of tasks) {
    if (task.dataValues.memorized) {
      memories.push(task.dataValues.memorized)
    }
  }
  return memories.join('\n');
}

const describeLocalMemory = async (context) => {
  global.logging(context, 'thinking.util', JSON.stringify(context.tasks || [], null, 2));
  const tasks = (context.tasks || []).filter(item => item.status === 'completed');
  if (tasks.length === 0) {
    return '';
  }
  const completedDescription = tasks.map(item => {
    const { id, requirement, result, memorized = '', content } = item;
    return `=== TaskID: ${id}
Task Goal: ${requirement}
Task Execute Memory: ${memorized}
Task Result: ${content}`
  }).join('\n');
  return `== Task Completion Status ==:
${completedDescription}`
}

const describeUploadFiles = files => {
  let content = ''
  for (let file of files) {
    content += 'upload/' + file.name + "\n"
  }
  return content;
}

const describeSystem = () => {
  return `
- Role: LemonAI
- Website: https://lemonai.ai
- Operating System: ${process.platform}
- Docker Environment OS (for terminal_run): linux
- Current Date: ${new Date().toLocaleDateString()}`
}

module.exports = exports = {
  loadConversationMemory,
  describeLocalMemory,
  describeUploadFiles,
  describeSystem
}