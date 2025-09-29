const chat_completion = require('@src/agent/chat-completion/index')

/**
 * Analyze requirement to determine if agent is needed for information gathering
 * Returns structured decision result for engineering use
 */
async function analyzeRequirementForAgent(requirement, conversation_id) {

  const prompt = `You are an AI assistant specializing in analyzing front-end web development requests. 
Your primary goal is to determine if a user's request can be completed with coding and general knowledge, or if it requires an agent to fetch external, real-time, or specific data.

If an agent is required, you must also translate the user's request into a clear, actionable search or data-fetching goal for that agent.

## Requirement
${requirement}

## Analysis Rules

Does the request need external data?

### YES (needsAgent: true) 

if it involves:
Real-time information: Stock prices, weather forecasts, news headlines, currency exchange rates.
Specific, non-common knowledge: Financial reports, technical specifications, data for a specific year/company not generally known.
Calling external APIs: Explicitly asking to fetch data from a URL.

### NO (needsAgent: false) 

if it's a self-contained task:
Styling, layout, or logic changes to the existing HTML, CSS, or JavaScript.
Adding content based on general knowledge (e.g., language translations, simple facts).
Code refactoring or formatting.

### If needsAgent: true, what is the agent's goal?

Rewrite the user's request into a precise goal. Be specific about the entity, time frame, and data points needed.

#### Examples
User Requirement: "帮s我加一个法语版本"
Analysis: This is a self-contained task based on general knowledge.
Result:

{
  "needsAgent": false,
  "agentQuery": null,
  "reason": "该任务仅需要通用的翻译知识，无需外部数据查询。"
}

User Requirement: "帮我在页面上补充 A 公司在2025年的股票走势折线图"

Analysis: This requires specific, external financial data for a particular company and year. The user's request must be translated into an actionable query.
Result:
{
  "needsAgent": true,
  "agentQuery": "查询 A 公司在2025年每个月的股票价格数据, 包含日期、开盘价、收盘价、最高价和最低价",
  "reason": "需要从外部查询精确的、历史性的股票数据来绘制图表"
}

User Requirement: "获取北京当前的天气，并显示在页面的一个卡片里"

Analysis: This requires fetching real-time data from an external weather service.
Result:
{
  "needsAgent": true,
  "agentQuery": "查询中国北京当前的天气信息, 包括温度、天气状况（如晴、多云）、湿度和风力等级",
  "reason": "需要调用外部API获取实时的天气数据"
}

## RESPONSE FORMAT (IMPORTANT - respond with ONLY this JSON):

{
  "needsAgent": true/false,
  "agentQuery": "The specific, actionable goal for the agent, or null if not needed.",
  "reason": "A brief explanation for your decision."
}
`;

  try {
    let response = await chat_completion(prompt, {
      temperature: 0.1,  // Low temperature for stable results
      response_format: 'json'
    }, conversation_id)

    // Parse JSON response with fallback
    try {
      console.log('Agent requirement analysis response:', response);
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      // Validate response structure
      if (typeof response.needsAgent !== 'boolean') {
        throw new Error('Invalid response structure');
      }

      return {
        needsAgent: response.needsAgent,
        agentQuery: response.agentQuery,
        reason: response.reason || '',
        confidence: response.confidence || 0.5
      };
    } catch (parseError) {
      // Fallback: look for keywords if JSON parsing fails
      const lowerResponse = response.toLowerCase();
      const needsAgent = lowerResponse.includes('true') ||
        lowerResponse.includes('需要') ||
        lowerResponse.includes('yes');

      console.warn('JSON parsing failed, using fallback detection:', needsAgent);
      return {
        needsAgent,
        reason: 'Fallback detection used',
        confidence: 0.3
      };
    }
  } catch (error) {
    console.error('Requirement analysis failed:', error);
    // Default to using agent on error for safety
    return {
      needsAgent: true,
      reason: 'Analysis failed, defaulting to safe option',
      confidence: 0.0
    };
  }
}

module.exports = {
  analyzeRequirementForAgent
};