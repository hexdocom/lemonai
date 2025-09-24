require('module-alias/register');
require("dotenv").config();

const path = require('path');
const fs = require('fs');
const xmlPath = path.join(__dirname, 'xml.txt');
const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

const { resolveActions, extractDescription } = require("@src/editor/resolve");
const { sendProgressMessage, sendCodingMessage } = require("@src/routers/agent/utils/coding-messages");

const actions = resolveActions(xmlContent);
const description = extractDescription(xmlContent);

// console.log(actions);
console.log(description);

const run = async () => {
  const conversation_id = '11977bf4-7c1f-4193-8c21-94e6011d1bd9';
  const onTokenStream = () => { };
  // await sendProgressMessage(onTokenStream, conversation_id, description);
  // console.log('sendProgressMessage success');
  console.log('actions', actions);

  for (const action of actions) {
    const { params = {} } = action;
    await sendCodingMessage(onTokenStream, conversation_id, '', 'coding', params);
  }
  process.exit(0);
}

run();

