const { evaluate } = require('mathjs');

/** @type {import('types/Tool').Tool} */
const CalculatorTool = {
  name: "calculator",
  description: "Evaluates a mathematical expression and returns the result. Supports standard arithmetic operations, functions (e.g., sqrt, sin, cos), and constants (e.g., pi, e).",
  params: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "The mathematical expression to evaluate (e.g., \"2 + 2 * sqrt(9)\").",
      },
    },
    required: ["expression"],
  },
  memorized: false, // Typically, a single calculation result isn't needed for long-term memory.
  getActionDescription: async ({ expression }) => {
    return `Calculate: ${expression}`;
  },
  execute: async ({ expression }) => {
    if (typeof expression !== 'string' || expression.trim() === '') {
      return {
        status: "failure",
        content: "Expression cannot be empty.",
        error: "Expression cannot be empty.",
      };
    }
    try {
      const result = evaluate(expression);
      // Ensure result is a string for consistent ActionResult content type
      const resultString = String(result);
      return {
        status: "success",
        content: resultString,
      };
    } catch (e) {
      console.error(`[CalculatorTool] Error evaluating expression "${expression}":`, e);
      return {
        status: "failure",
        content: `Error evaluating expression: ${e.message}`,
        error: String(e), // Send string representation of error
      };
    }
  },
};

module.exports = CalculatorTool;
