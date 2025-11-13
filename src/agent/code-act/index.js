const completeCodeAct = require("./code-act.js");

const CODE_ACT_VERSION = process.env.CODE_ACT_VERSION || 'base';

const hash = {
  'base': completeCodeAct,
}

module.exports = exports = hash[CODE_ACT_VERSION];

