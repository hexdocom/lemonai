const resolveIntentDetectionPrompt = async (message, messagesContext = []) => {
  
  // 构建上下文字符串
  let contextStr = '';
  if (messagesContext && messagesContext.length > 0) {
    contextStr = '\nConversation History:\n' + 
      messagesContext.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\n';
  }

  const prompt = `
Role: You are a top-tier intent recognition specialist, an expert at accurately determining the core intent of a user's input based on the current message and conversation context.

Task: Analyze the user's current input and the conversation history to determine whether their core intent is to have you use external tools or perform multi-step operations to complete a data-driven, complex task, or simply to use the large language model's inherent capabilities for conversation, role-playing, or answering.

Criteria:
If the user's input is a direct follow-up to a previously established multi-step task, or if it provides data and information necessary for the execution of a complex task (e.g., planning, analysis), the intent is "agent". This also includes tasks requiring external tools (e.g., web search, file I/O). The execution of such tasks involves a series of sequential, data-driven steps.
Examples: "Check the weather in New York today," "Write a Python script to analyze this file," or, in a planning context, "I lift weights, want to lose fat, and go to the gym 2-3 times a week."

If the user's input is a greeting, casual conversation, a simple one-off request that can be fulfilled without multi-step processing, or a request to adopt a role or persona, the intent is "chat". The execution of these tasks does not require multi-step, data-driven operations.
Examples: "Hello," "Translate 'Hello' to English for me," "Summarize the main points of this text," "Tell me a joke," or "You act as my fitness coach."

Consider the conversation context to make more accurate decisions. If a conversation has shifted from casual chat or role-playing setup to providing specific data for a multi-step task, the intent should be classified as "agent."

Conversation History:
${contextStr}

Current User Message:
${message}

Output Format:
Return a JSON object with the following structure. The reasoning field should contain a concise explanation for the chosen intent, referencing the specific criteria and user input.

{
  "intent": "agent" | "chat",
  "reasoning": "Brief explanation of why this intent was chosen"
}
  `

  return prompt;
}


module.exports = resolveIntentDetectionPrompt;