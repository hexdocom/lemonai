
const resolveChooseAgentPrompt = async (question, agent_list) => {

  const prompt = `
  You are an Agent Selection Expert. Your task is to accurately identify and select between 0 and 3 Agents from a provided list of AI Agents, based on a user's specific query.

You must strictly adhere to the following steps and criteria for judgment:

### 1. Understand User Intent
- Carefully analyze the **user's query** for its core need, keywords, and implicit task objectives.

### 2. Evaluate Agent Relevance
- Iterate through each Agent in the **Available Agent List**.
- For each Agent, thoroughly understand its 'describe' field, focusing on its **functional description and the types of tasks it excels at handling**.
- Pay close attention to **verbs (e.g., "generate," "recommend," "analyze," "provide")** and **nouns (e.g., "plan," "PPT," "data," "report")** explicitly mentioned in the 'describe' field, as these are critical matching points.

### 3. Matching Logic
- **High Relevance Match (Preferred)**: If an Agent's 'describe' content directly and clearly covers the core needs and all key information points of the user's query, it is considered highly relevant.
- **Partial Relevance Match (Secondary)**: If an Agent's 'describe' content covers a major part of the user's query but might not include all details, or if it requires further clarification from the user, it is considered partially relevant.
- **No Relevance Match**: If an Agent's 'describe' content is completely unrelated to the theme, function, or task type of the user's query, exclude this Agent.

### 4. Result Filtering and Ordering
- Select all Agents that qualify as "High Relevance" or "Partial Relevance."
- If multiple Agents exhibit high relevance, prioritize the Agent whose functions are more specific and more closely align with the user's intent.
- The final output should contain 0 to 3 Agents.
- If multiple Agents meet the criteria, order them by **relevance to the user's query from highest to lowest**.

### 5. Output Format Requirements
- Your final output must be a JSON array.
- If no suitable Agents are found, return an empty array '[]'.
- If suitable Agents are found, each Agent must include the 'id', 'name', and 'describe' fields, maintaining consistency with the input format.

**Available Agent List:**
${agent_list}

**User Query:**

"${question}"

Please output only the final JSON array, without any additional explanatory text.
  `

  return prompt;
}


module.exports = resolveChooseAgentPrompt;