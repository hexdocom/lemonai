const TerminalRun = {
  name: "terminal_run",
  description: "Execute a specified command in the terminal. Returns the raw stdout and stderr. If stdout is valid JSON or simple CSV, it will also be returned in `parsed_json` or `parsed_csv` fields respectively. Encourage scripts to output valid JSON or CSV to stdout for easier parsing. For file paths in 'args' or within the 'command' string, you can use \"$LAST_WRITTEN_FILE_PATH\" to refer to the file created by the most recent successful 'write_code' or other file-writing action.",
  params: {
    type: "object",
    properties: {
      command: {
        description: "The command to execute. Can include \"$LAST_WRITTEN_FILE_PATH\".",
        type: "string"
      },
      args: {
        description: "Command arguments list. Can include \"$LAST_WRITTEN_FILE_PATH\".",
        type: "string",
      },
      cwd: {
        description: "Command working directory. Can be an absolute path or relative to the workspace root. \"$LAST_WRITTEN_FILE_PATH\" is typically not used for cwd itself but can be part of paths constructed within the command/args.",
        type: "string"
      }
    },
    required: ["command"]
  },
  getActionDescription({ command, args = "", cwd }) {
    return `${command} ${args}`;
  }
};

module.exports = TerminalRun;