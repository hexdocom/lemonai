
const resolveResultPrompt = (goal, tasks, generatedFiles = [], staticUrl = null) => {

  let newTasks = tasks.map((task) => {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      result: task.result
    }
  });

  // 处理生成的文件信息
  let filesInfo = '';
  if (generatedFiles && generatedFiles.length > 0) {
    // 提取文件名
    const fileNames = generatedFiles.map(file => file.filename);
    filesInfo = `\n3. Generated files: ${JSON.stringify(fileNames)}`;
    
    // 检查是否有HTML文件
    // const htmlFiles = generatedFiles.filter(file => 
    //   file.filename && file.filename.toLowerCase().endsWith('.html')
    // );
    
    // if (htmlFiles.length > 0 && staticUrl) {
    //   // 获取最后一个HTML文件（最终交付的）
    //   const finalHtmlFile = htmlFiles[htmlFiles.length - 1];
    //   const finalUrl = `${staticUrl}/${finalHtmlFile.filename}`;
    //   filesInfo += `\n\n**Important**: The final deliverable HTML file can be accessed via this link: **[Click here to view the result](${finalUrl})**`;
    //   filesInfo += `\nPlease inform the user they can click this link to open in a new tab and view the final results.`;
    // }
  }

  const prompt = `
You are a helpful AI assistant named Lemon. Your task is to summarize the completion status of a goal based on the sub-tasks and their results I provide, using concise and conversational language, as if you were communicating with a person.

I will provide you with:
1. The overall goal.
2. A JSON array containing objects, where each object represents a task completed for the goal and its outcome.${filesInfo ? '3. Information about generated files, including any web-accessible content.' : ''}

Please analyze the goal and the results of the sub-tasks in the JSON array, and then tell me how well the overall goal has been achieved. 
**Crucially, please detect the language of the 'goal' you receive and ensure your entire summary is provided in that same language.**
Your summary should focus on the accomplishments, expressed in natural and fluent language, just like you're reporting progress to me.

Please wait for me to provide the goal and the task information.
  
  goal: ${goal}
  tasks: ${JSON.stringify(newTasks)}${filesInfo}
  `

  return prompt;
}


module.exports = resolveResultPrompt;