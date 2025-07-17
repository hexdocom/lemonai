const { json2xml } = require('@src/utils/format');
const { read_file } = require('@src/runtime/read_file'); // Assuming read_file can be used by tools
const { write_code: util_write_code } = require('@src/runtime/utils/tools'); // Assuming this can be adapted or used

const GenerateTestStubs = {
  name: "generate_test_stubs",
  description: "Generates basic unit test stubs for a given function or class in a file. Helps in creating initial test coverage.",
  params: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "The path to the source code file."
      },
      target_identifier: {
        type: "string",
        description: "(Optional) The specific function or class name to generate tests for. If omitted, attempts to generate for all top-level functions/classes."
      },
      test_framework: {
        type: "string",
        description: "(Optional) Specify the test framework (e.g., 'pytest', 'jest'). If omitted, the AI will try to infer or use a default."
      }
    },
    required: ["filepath"]
  },
  async getActionDescription({ filepath, target_identifier }) {
    if (target_identifier) {
      return `Generating test stubs for ${target_identifier} in ${filepath}`;
    }
    return `Generating test stubs for ${filepath}`;
  },
  async execute(params, uuid, context) {
    const { filepath, target_identifier, test_framework } = params;
    const { runtime, memory, onTokenStream, conversation_id } = context; // Assuming context provides these

    try {
      // 1. Read the source file content
      // Note: runtime.read_file is designed for DockerRuntime. Tools might need a direct way or an adapted interface.
      // For now, let's assume a way to call a simplified read_file or that runtime.read_file can be used by tools.
      let source_code_content;
      try {
        // This is a simplification. In DockerRuntime, read_file is a method of the instance.
        // A real implementation might need to pass `runtime` and have it call its `read_file` method.
        // Or provide a utility function that tools can use.
        const { getDirpath } = require('@src/utils/electron');
        const baseWorkspaceDir = getDirpath(process.env.WORKSPACE_DIR || 'workspace');
        const conversationDir = 'Conversation_' + conversation_id.slice(0, 6);
        const fullPath = require('path').join(baseWorkspaceDir, conversationDir, filepath);

        source_code_content = await require('fs').promises.readFile(fullPath, 'utf-8');

      } catch (e) {
        console.error(`GenerateTestStubs: Error reading file ${filepath}: ${e.message}`);
        return { uuid, status: 'failure', content: `Error reading file ${filepath}: ${e.message}`, memorized: false };
      }

      // 2. Construct a prompt for the LLM
      let prompt = `Given the following code from "${filepath}":\n\n\`\`\`\n${source_code_content}\n\`\`\`\n\n`;
      if (target_identifier) {
        prompt += `Please generate unit test stubs for the function/class: "${target_identifier}".\n`;
      } else {
        prompt += `Please generate unit test stubs for the top-level functions and classes in this file.\n`;
      }
      if (test_framework) {
        prompt += `The tests should be written for the "${test_framework}" framework.\n`;
      } else {
        prompt += `Please infer the appropriate testing framework or use a common one for the language.\n`;
      }
      prompt += "Ensure the generated test code is complete and runnable (even if tests initially fail). Output only the test code.\n";

      // 3. Invoke the LLM (via context.llm.complete or similar mechanism)
      // This part is highly dependent on how LLM calls are made from tools.
      // Assuming context.llm.complete(prompt) exists.
      if (!context.llm || !context.llm.complete) {
          throw new Error("LLM completion service not available in context.");
      }
      const test_code_content = await context.llm.complete(prompt); // Simplified

      // 4. Determine test file path
      const path = require('path');
      const dir = path.dirname(filepath);
      const ext = path.extname(filepath);
      const base = path.basename(filepath, ext);
      const test_filepath = path.join(dir, `test_${base}${ext}`); // Basic convention

      // 5. Write the generated test code to the new file
      // Similar to read_file, write_code is a runtime method.
      // Using a simplified util_write_code for now.
      // util_write_code expects action format.
      const writeAction = {
        params: {
          path: test_filepath,
          origin_path: test_filepath, // Assuming origin_path is for user-facing path
          content: test_code_content
        }
      };
      await util_write_code(writeAction, uuid); // This also needs proper context if it uses runtime features.

      const success_message = `Successfully generated test stubs for ${filepath}. Saved to ${test_filepath}.`;
      return { uuid, status: 'success', content: success_message, memorized: true, meta: { filepath: test_filepath } };

    } catch (error) {
      console.error(`GenerateTestStubs: Error - ${error.message}`, error);
      return { uuid, status: 'failure', content: `Error generating test stubs: ${error.message}`, memorized: false };
    }
  },
  memorized: true, // This tool's result should be memorized
  resolveMemory(action = {}, content) {
    const test_filepath = action.meta && action.meta.filepath ? action.meta.filepath : "unknown_test_file.test";
    const memory = {
      type: this.name,
      status: 'success',
      filepath_tested: action.params.filepath,
      test_stubs_generated_at: test_filepath
    }
    return json2xml(memory);
  }
};

module.exports = GenerateTestStubs;
