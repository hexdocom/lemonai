require('dotenv').config();
require('module-alias/register')

const GoogleSearch = require('@src/tools/impl/web_search/GoogleSearch.js')

const run = async () => {
  const tool = new GoogleSearch({ 
    key: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_SEARCH_ENGINE_ID
  })
  const result = await tool.search('北京今日天气', { num: 3 })
  // console.log(JSON.stringify(result, null, 2))
  const formatted = await tool.formatContent()
  console.log(formatted)
}

run()