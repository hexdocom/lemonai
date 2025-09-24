const { resolveTemplate, loadTemplate } = require("@src/utils/template");
const { resolvePlanningKnowledge } = require("@src/knowledge/index");

const describeUploadFiles = files => {
  let content = ''
  for (let file of files) {
    content += 'upload/' + file.name + "\n"
  }
  return content;
}

const resolveTemplateFilename = (planning_mode) => {
  if (planning_mode === 'base') {
    return 'planning.txt'
  }
  return `planning.${planning_mode}.txt`
}

const resolvePlanningPrompt = async (goal, options) => {
  const { files, previousResult, agent_id, planning_mode } = options;

  const templateFilename = resolveTemplateFilename(planning_mode);
  const promptTemplate = await loadTemplate(templateFilename);
  const system = `Current Time: ${new Date().toLocaleString()}`
  const uploadFileDescription = describeUploadFiles(files);
  // 尝试不使用experience
  // const experiencePrompt = await resolveExperiencePrompt(goal, conversation_id)
  const experiencePrompt = ''
  const best_practice_knowledge = await resolvePlanningKnowledge({ agent_id });
  const prompt = await resolveTemplate(promptTemplate, {
    goal,
    files: uploadFileDescription,
    previous: previousResult,
    system,
    experiencePrompt,
    best_practice_knowledge,
  })
  return prompt;
}

module.exports = exports = resolvePlanningPrompt;