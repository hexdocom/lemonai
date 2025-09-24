const { loadTemplate } = require("@src/utils/template");
const MAX_REVISE_DEPTH = Number(process.env.MAX_REVISE_DEPTH || 0);

const resolveCorePrinciple = async (mode = 'static') => {
  const filepath = `./core_principle.${mode}.txt`
  const template = await loadTemplate(filepath);
  if (!template) {
    return ''
  }
  return template;
}

const evaluate_tool = `<tool revise_plan>
{
  "name": "revise_plan",
  "description": "动态调整、优化或分解当前的任务计划。通过 mode 参数来指定是“完全覆盖”整个计划，还是“分解”某一个具体的任务。",
  "params": {
    "type": "object",
    "properties": {
      "mode": {
        "type": "string",
        "description": "指定操作模式：'overwrite' (完全覆盖 N->1, N->M) 或 'decompose' (分解任务 1->N)。",
        "enum": [
          "overwrite",
          "decompose"
        ]
      },
      "reason": {
        "type": "string",
        "description": "解释为什么需要修改计划，陈述理由。"
      },
      "tasks": {
        "type": "array",
        "description": "一个包含所有新任务或子任务的列表。每个任务都必须是一个拥有复杂结构的对象。",
        "items": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "description": "任务的简洁标题，用于展示，如“【第一章】新的坐标”。"
            },
            "goal": {
              "type": "string",
              "description": "对该任务目标的清晰、可执行的描述。"
            },
            "context": {
              "type": "string",
              "description": "执行此任务所需的所有关键上下文信息，如前情提要、人物当前状态、场景氛围等。"
            },
            "acceptance_criteria": {
              "type": "string",
              "description": "任务完成的验收标准，一个明确的、可验证的结果。"
            }
          },
          "required": [
            "id",
            "title",
            "goal",
            "context",
            "acceptance_criteria"
          ]
        }
      }
    },
    "required": [
      "mode",
      "reason",
      "tasks"
    ]
  }
}
</tool>`

const resolveCurrentPlan = (context) => {
  const task_manager = context.task_manager;
  if (!task_manager) {
    return ''
  }
  try {
    return task_manager.resolveTasksDescription(context.task?.id);
  } catch (error) {
    console.error(error);
    return ''
  }
}

const resolveEvaluateOptions = async (context) => {
  const depth = context.depth || 1;

  // 超过最大深度，使用静态模式
  const mode = depth > MAX_REVISE_DEPTH ? 'static' : 'dynamic';
  const core_principle = await resolveCorePrinciple(mode);
  if (mode === 'static') {
    return { core_principle }
  }

  const current_plan = resolveCurrentPlan(context);
  return {
    core_principle, // 任务处理核心原则
    evaluate_tool, // 任务评估工具定义
    current_plan, // 当前任务计划
  }
}

module.exports = exports = {
  evaluate_tool,
  resolveCorePrinciple,
  resolveCurrentPlan,
  resolveEvaluateOptions
}
