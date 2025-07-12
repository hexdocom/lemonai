const { json2xml } = require('@src/utils/format');

const ExplainError = {
  name: "explain_error",
  description: "Explains a given error message and stack trace, providing potential causes and solutions. Useful for understanding unfamiliar errors.",
  params: {
    type: "object",
    properties: {
      error_text: {
        type: "string",
        description: "The full error message and stack trace to be explained."
      }
    },
    required: ["error_text"]
  },
  async getActionDescription({ error_text }) {
    // Return a snippet of the error text for brevity
    const snippet = error_text.length > 100 ? error_text.substring(0, 97) + "..." : error_text;
    return `Explaining error: "${snippet}"`;
  },
  async execute(params, uuid, context) {
    const { error_text } = params;
    // Assuming context.llm.complete(prompt) exists for LLM calls.
    if (!context.llm || !context.llm.complete) {
        return { uuid, status: 'failure', content: "LLM completion service not available in context.", memorized: false };
    }

    try {
      const prompt = `Please explain the following error message and stack trace. Provide potential causes, and suggest common solutions or debugging steps:\n\n\`\`\`\n${error_text}\n\`\`\`\n\nBe clear and concise.`;

      const explanation = await context.llm.complete(prompt); // Simplified LLM call

      return { uuid, status: 'success', content: explanation, memorized: true }; // Memorize the explanation

    } catch (error) {
      console.error(`ExplainError: Error - ${error.message}`, error);
      return { uuid, status: 'failure', content: `Error explaining error: ${error.message}`, memorized: false };
    }
  },
  memorized: true, // The explanation should be memorized
  resolveMemory(action = {}, content) {
    // Content here is the explanation itself.
    const memory = {
      type: this.name,
      status: 'success',
      error_explained: action.params.error_text.substring(0, 200) + "...", // Store a snippet of the explained error
      explanation_preview: content.substring(0, 200) + "..." // Store a snippet of the explanation
    }
    return json2xml(memory);
  }
};

module.exports = ExplainError;
