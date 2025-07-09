const { exec, spawn } = require('child_process');
const { restrictFilepath } = require('./runtime.util');

// Helper function to parse simple CSV data
function parseSimpleCsv(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    return null;
  }
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length < 2) { // At least one header and one data line
    return null;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    } else {
      // Line does not match header length, CSV might be malformed or complex
      return null;
    }
  }
  return data;
}

const runCommand = (command, args, cwd) => {
  return new Promise((resolve, reject) => {
    if (Array.isArray(args)) {
      args = args.join(' ');
    }
    const fullCommand = `${command} ${args}`;
    console.log('fullCommand', fullCommand, 'cwd', cwd);

    // Handle nohup command
    if (command.includes('nohup')) {
      // Use shell to execute nohup command
      const child = spawn('sh', ['-c', fullCommand], {
        cwd,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'] // Ignore all standard input output
      });
      child.unref(); // Allow parent process to exit independently of child process
      resolve({
        stdout: `Background process started, PID: ${child.pid}, output redirected to nohup.out`,
        stderr: ''
      });
    } else {
      exec(fullCommand, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject({ error: error.message, stderr });
          return;
        }
        resolve({ stdout, stderr });
      });
    }
  });
}

const terminal_run = async (action, uuid) => {
  const { command, args = [], cwd = '.' } = action.params;
  const executionDir = await restrictFilepath(cwd);
  try {
    const cmdResult = await runCommand(command, args, executionDir);
    const outputContent = cmdResult.stdout || 'Execution result has no return content';

    let parsedJson = null;
    let parsedCsv = null;

    // Try to parse as JSON
    if (outputContent.startsWith('{') && outputContent.endsWith('}')) { // Basic check
        try {
            parsedJson = JSON.parse(outputContent);
        } catch (jsonError) {
            // Not valid JSON, ignore error
        }
    }

    // If not JSON, or if JSON parsing failed, try to parse as CSV
    if (!parsedJson) {
        try {
            parsedCsv = parseSimpleCsv(outputContent);
        } catch (csvError) {
            // Not valid CSV or complex CSV, ignore error
        }
    }

    const returnPayload = {
      uuid,
      status: 'success',
      content: outputContent,
      stderr: cmdResult.stderr,
      meta: {
        action_type: action.type,
      }
    };

    if (parsedJson) {
      returnPayload.parsed_json = parsedJson;
    }
    if (parsedCsv) {
      returnPayload.parsed_csv = parsedCsv;
    }

    return returnPayload;

  } catch (e) {
    console.error('Error executing command:', e);
    return { uuid, status: 'failure', error: e.stderr || e.message, content: '' };
  }
}

module.exports = terminal_run;

