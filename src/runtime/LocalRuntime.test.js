require('module-alias/register');
require('dotenv').config();
const { params } = require('../agent/tools/browser_use');
const LocalRuntime = require('./LocalRuntime');
const LocalMemory = require('@src/agent/memory/LocalMemory');

const { resolveActions } = require("@src/utils/resolve");

const run = async () => {
  const memory = new LocalMemory({ taskId: 'demo' });
  const runtime = new LocalRuntime({ memory })
  // const content = `<terminal_run>
  // <cwd>.</cwd>
  // <command>ls</command>
  // <args></args>
  // </terminal_run>`
  // const content = "I will analyze the Excel file content and create a webpage to display the statistics of large model applications. First, I need to read the Excel file content, then generate the corresponding webpage code.\n\n<read_file>\n<path>LLM Large Model Dialogue Applications.xlsx</path>\n</read_file>\n\nPlease confirm if the Excel file content is correct, then I will continue to generate the webpage display code.";
  const content = `<terminal_run>
  <cwd>./</cwd>
  <command>ls</command>
  <args></args>
  </terminal_run>`
  // const content = `<terminal_run> <cwd>./</cwd> <command>nohup</command> <args>python3 -m http.server 8000 &</args> </terminal_run>`

  const actions = resolveActions(content);
  const action = actions[0];
  console.log(action);
  const r = await runtime.execute_action(action);
  console.log(r);
}

run();