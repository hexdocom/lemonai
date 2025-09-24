require('dotenv').config()
const router = require("koa-router")();

const planning = require("@src/agent/planning/index.js");
const auto_reply = require("@src/agent/auto-reply/index")
const generate_title = require("@src/agent/generate-title/index")
const summary = require("@src/agent/summary/index")
const llmEvaluate = require('@src/agent/reflection/llm.evaluate');

const call = require("@src/utils/llm");
const resolveThinking = require("@src/utils/thinking");
const resolveThinkingPrompt = require("@src/agent/code-act/thinking.prompt");

const TalivySearch = require('@src/tools/impl/web_search/TalivySearch');

const { deductPoints, deductPointsForPoint } = require('@src/utils/point')

const Conversation = require('@src/models/Conversation')

const doLemonSearch = require('@src/utils/do_lemon_search')


//auto_reply
router.post('/auto_reply', async ({ state, request, response }) => {
  const { goal, conversation_id } = request.body;
  let conversation = await Conversation.findOne({ where: { user_id: state.user.id, conversation_id: conversation_id } })
  if (!conversation) {
    await Conversation.create({
      user_id: state.user.id,
      conversation_id: conversation_id,
      title: 'From local subscription',
      content: '',
      is_from_sub_server: true
    })
  }
  const reply = await auto_reply(goal, conversation_id) || [];
  // await deductPoints(state.user.id, token_usage, conversation_id)
  return response.success(reply)
});
//planning
router.post('/planning', async ({ state, request, response }) => {
  const { goal, files, previousResult, conversation_id } = request.body;
  try {
    const plannedTasks = await planning(goal, files, previousResult, conversation_id) || [];
    // await deductPoints(state.user.id, token_usage, conversation_id)

    return response.success(plannedTasks)
  } catch (e) {
    console.log("===", e)
  }

});

// generate_title
router.post('/generate_title', async ({ state, request, response }) => {
  const { question, conversation_id } = request.body;
  const title = await generate_title(question, conversation_id);
  // await deductPoints(state.user.id, token_usage, conversation_id)

  return response.success(title)
});

//thingking
router.post('/thinking', async ({ state, request, response }) => {
  const { messages, requirement, context, conversation_id } = request.body;
  let prompt = '';
  if (messages.length == 0) {
    prompt = await resolveThinkingPrompt(requirement, context);
  }
  const options = {
    messages: messages.map(item => {
      return { role: item.role, content: item.content }
    })
  }
  let content = await call(prompt, conversation_id, 'assistant', options);
  // console.log('content', content);
  // await deductPoints(state.user.id, token_usage, conversation_id)

  if (content && content.startsWith('<think>')) {
    const { thinking: _, content: output } = resolveThinking(content);
    content = output;
  }
  return response.success({ prompt, content })
});
//evaluate
router.post('/evaluate', async ({ state, request, response }) => {
  const { requirement, result, conversation_id } = request.body;
  const res = await llmEvaluate(requirement, result, conversation_id)
  // await deductPoints(state.user.id, token_usage)

  return response.success(res)
});
//summary
router.post('/summary', async ({ state, request, response }) => {
  const { goal, tasks, conversation_id } = request.body;
  const result = await summary(goal, conversation_id, tasks);
  // await deductPoints(state.user.id, token_usage, conversation_id)

  return response.success(result)
});

//search
router.post('/search', async ({ state, request, response }) => {
  const { query, num_results, conversation_id } = request.body;

  let obj = await doLemonSearch(query, num_results, conversation_id)

  return response.success(obj)
});


router.post('/get_browser_model', async ({ request, response }) => {

  return response.success(process.env.MODEL_NAME || 'deepseek-chat')
});

module.exports = exports = router.routes()