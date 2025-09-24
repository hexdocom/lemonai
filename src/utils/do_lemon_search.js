require('dotenv').config()

const TalivySearch = require('@src/tools/impl/web_search/TalivySearch');
const GoogleSearch = require('@src/tools/impl/web_search/GoogleSearch');

const Conversation = require('@src/models/Conversation')

const { deductPointsForPoint } = require('@src/utils/point')

async function searchWithTavily(query, num_results) {
  try {
    const tavily_api_key = process.env.TAVILY_KEY;
    if (!tavily_api_key) {
      console.warn('Tavily API key not configured');
      return [];
    }

    const talivy = new TalivySearch({ key: tavily_api_key });
    await talivy.search(query, { max_results: num_results });
    const results = await talivy.formatJSON();
    return results.map(item => ({ ...item, source: 'Tavily' }));
  } catch (error) {
    console.error('Tavily search failed:', error.message);
    return [];
  }
}

async function searchWithGoogle(query, num_results) {
  try {
    const google_api_key = process.env.GOOGLE_API_KEY;
    const google_search_engine_id = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!google_api_key || !google_search_engine_id) {
      console.warn('Google search credentials not configured');
      return [];
    }

    const google = new GoogleSearch({ 
      key: google_api_key, 
      cx: google_search_engine_id 
    });
    await google.search(query, { num: num_results });
    const results = await google.formatJSON();
    return results.map(item => ({ ...item, source: 'Google' }));
  } catch (error) {
    console.error('Google search failed:', error.message);
    return [];
  }
}

async function doLemonSearch(query, num_results, conversation_id) {
  
  // Execute both searches in parallel
  const [talivyResults, googleResults] = await Promise.all([
    searchWithTavily(query, num_results),
    searchWithGoogle(query, num_results)
  ]);

  const combinedResults = [...talivyResults, ...googleResults];

  // Deduct points
  let conversation = await Conversation.findOne({ where: { conversation_id } });
  await deductPointsForPoint(conversation.dataValues.user_id, 0, 5, conversation_id);

  // Format combined results
  if (combinedResults.length === 0) {
    return { json: [], content: `No search results found for "${query}".` };
  }

  const formattedContent = combinedResults.map(item => 
    `[${item.source}] URL: ${item.url}\nTitle: ${item.title}\nSnippet: ${item.snippet}\n`
  ).join('======\n======');

  const content = `Combined web search results for "${query}":\n\n${formattedContent}`;

  return { json: combinedResults, content };
}

module.exports = exports = doLemonSearch;