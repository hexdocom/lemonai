
const getTodoMd = async (taskData) => {
  const markdownOutput = convertArrayToMarkdownTodo(taskData);
  return markdownOutput
}

function convertArrayToMarkdownTodo(data) {
  let markdown = "## TODO List\n";

  /**
   * 解析任务的标题和描述
   * @param {Object} task - 任务对象
   * @returns {Object} 包含 title 和 description 的对象
   */
  function parseTaskTitleAndDescription(task) {
    let title = task.title || "";
    let description = task.description || "";

    // 如果没有 title 或 description，从 requirement 中拆分
    if ((!title || !description) && task.requirement) {
      const lines = task.requirement.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // 第一行作为 title
        if (!title) {
          title = lines[0].trim();
        }
        // 剩下的行作为 description
        if (!description && lines.length > 1) {
          description = lines.slice(1).join('\n').trim();
        }
      }
    }

    return { title, description };
  }

  /**
   * 递归处理单个任务节点，支持多层级子任务
   * @param {Object} task - 任务对象
   * @param {number} depth - 当前深度，用于控制缩进
   */
  function formatTask(task, depth = 0) {
    const indent = "  ".repeat(depth); // 每层缩进2个空格
    const checkbox = task.status === "pending" ? "[ ]" : "[x]";
    const { title, description } = parseTaskTitleAndDescription(task);

    // 构建任务描述
    let taskText = title;
    if (description && description !== title) {
      taskText += `: ${description}`;
    }

    let result = `${indent}- ${checkbox} ${taskText}\n`;

    // 递归处理子任务
    if (task.children && Array.isArray(task.children) && task.children.length > 0) {
      for (const child of task.children) {
        result += formatTask(child, depth + 1);
      }
    }

    return result;
  }

  // 处理所有顶级任务
  if (Array.isArray(data)) {
    data.forEach(item => {
      markdown += formatTask(item);
    });
  }

  return markdown;
}

module.exports = exports = {
  getTodoMd
}