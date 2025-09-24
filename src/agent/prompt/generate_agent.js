
const resolveGenerateAgentPrompt = async (question) => {
  const prompt = `You are an expert in defining AI Agent product requirements. Based on the user's request, abstract the **core name (name)** of the Agent they want to build and a **detailed functional description (describe)** of that Agent. **Return the result in the same language as the user's input.**

When defining "name":
* **Extract the Agent's most core, abstract purpose, removing specific modifiers and qualifiers to make it concise and general.** For example, if the user wants to plan a trip, the name should be "Travel Assistant" instead of "Trip Planning Assistant."
* The name should accurately reflect the Agent's primary role.

When defining "describe":
* Explain in as much detail as possible the Agent's main responsibilities, processing flow, expected output, or problems solved.
* If the user's request is unclear, make reasonable inferences and additions based on common sense or typical Agent functionalities.

Please return the output in JSON format, with fields "name" and "describe".

User Request: ${question}
  `

  return prompt;
}


module.exports = resolveGenerateAgentPrompt;