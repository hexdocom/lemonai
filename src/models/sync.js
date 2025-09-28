require("module-alias/register");
require('dotenv').config();

const Conversation = require('./Conversation');
const File = require('./File');
const Platform = require('./Platform');
const Model = require('./Model');
const DefaultModelSettingTable = require('./DefaultModelSetting');
const SearchProviderTable = require('./SearchProvider');
const UserProviderConfigTable = require('./UserProviderConfig');
const UserSearchSettingTable = require('./UserSearchSetting');
const LLMLogs = require('./LLMLogs');
const Task = require('./Task');
const Message = require('./Message');
const McpServer = require('./McpServer');
const Agent = require('./Agent');
const FileVersion = require('./FileVersion');
const Knowledge = require('./Knowledge');
const User = require('./User');

const tableSync = async () => {
  await Conversation.sync({ alter: true });
  await File.sync({ alter: true });
  await Platform.sync({ alter: true });
  await Model.sync({ alter: true });
  await DefaultModelSettingTable.sync({ alter: true });
  await SearchProviderTable.sync({ alter: true });
  await UserProviderConfigTable.sync({ alter: true });
  await UserSearchSettingTable.sync({ alter: true });
  await LLMLogs.sync({ alter: true });
  await Task.sync({ alter: true });
  await Message.sync({ alter: true });
  await McpServer.sync({ alter: true });
  await Agent.sync({ alter: true });
  await FileVersion.sync({ alter: true });
  await Knowledge.sync({ alter: true });
  await User.sync({ alter: true });
}

const dataSync = async () => {
  const count = await Platform.count();
  if (count === 0) {
    const defaultData = require('../../public/default_data/default_platform.json');
    for (const item of defaultData) {
      const platformData = {
        name: item.name,
        logo_url: item.logo_url,
        source_type: 'system',
        api_key: item.api_key,
        api_url: item.api_url,
        api_version: item.api_version,
        key_obtain_url: item.key_obtain_url,
        is_subscribe: item.is_subscribe || false
      };
      const platform = await Platform.create(platformData);

      const modelsData = item.models.map(model => ({
        // @ts-ignore
        platform_id: platform.id,
        logo_url: model.logo_url,
        model_id: model.model_id,
        model_name: model.model_name,
        group_name: model.group_name,
        model_types: model.model_types,
      }));
      await Model.bulkCreate(modelsData);
    }
  }

  const searchProviderCount = await SearchProviderTable.count();
  if (searchProviderCount === 0) {
    const defaultSearchProviderData = require('../../public/default_data/default_search_provider.json');
    for (const item of defaultSearchProviderData) {
      const searchProviderData = {
        name: item.name,
        logo_url: item.logo_url,
        base_config_schema: item.base_config_schema,
      };
      await SearchProviderTable.create(searchProviderData);
    }
  }

  const userCount = await User.count();
  if (userCount === 0) {
    await User.create({
      id: 1,
      user_salt: 'default123'
    });
  }
}

const dataUpdate = async () => {
  const defaultData = require('../../public/default_data/default_platform.json');

  // v0.1 => v0.1.1
  await Platform.update({
    api_url: 'https://ark.cn-beijing.volces.com/api/v3'
  }, {
    where: {
      name: 'Volcengine'
    }
  })
  const platform = await Platform.findOne({ where: { name: 'Gemini' } })
  if (!platform) {
    const geminiPlatform = defaultData.find(item => item.name === 'Gemini')
    console.log(geminiPlatform)
    const platformData = {
      name: geminiPlatform.name,
      logo_url: geminiPlatform.logo_url,
      source_type: 'system',
      api_key: geminiPlatform.api_key,
      api_url: geminiPlatform.api_url,
      api_version: geminiPlatform.api_version,
      key_obtain_url: geminiPlatform.key_obtain_url,
    };
    const platform = await Platform.create(platformData);
    const modelsData = geminiPlatform.models.map(model => ({
      // @ts-ignore
      platform_id: platform.id,
      logo_url: model.logo_url,
      model_id: model.model_id,
      model_name: model.model_name,
      group_name: model.group_name,
      model_types: model.model_types,
    }));
    await Model.bulkCreate(modelsData);
  }

  // v0.1.1 => v0.1.2
  const defaultSearchProviderData = require('../../public/default_data/default_search_provider.json');
  const CloudswaySearchProvider = defaultSearchProviderData.find(item => item.name === 'Cloudsway');
  const searchProvider = await SearchProviderTable.findOne({ where: { name: CloudswaySearchProvider.name } });
  if (!searchProvider) {
    const searchProviderData = {
      name: CloudswaySearchProvider.name,
      logo_url: CloudswaySearchProvider.logo_url,
      base_config_schema: CloudswaySearchProvider.base_config_schema,
    };
    await SearchProviderTable.create(searchProviderData);
  }

  const cloudswayPlatform = await Platform.findOne({ where: { name: 'Cloudsway' } })
  if (!cloudswayPlatform) {
    const cloudswayPlatform = defaultData.find(item => item.name === 'Cloudsway')
    const platformData = {
      name: cloudswayPlatform.name,
      logo_url: cloudswayPlatform.logo_url,
      source_type: 'system',
      api_key: cloudswayPlatform.api_key,
      api_url: cloudswayPlatform.api_url,
      api_version: cloudswayPlatform.api_version,
      key_obtain_url: cloudswayPlatform.key_obtain_url,
    };
    const platform = await Platform.create(platformData);
    const modelsData = cloudswayPlatform.models.map(model => ({
      // @ts-ignore
      platform_id: platform.id,
      logo_url: model.logo_url,
      model_id: model.model_id,
      model_name: model.model_name,
      group_name: model.group_name,
      model_types: model.model_types,
    }));
    await Model.bulkCreate(modelsData);
  }
  // v0.1.2 => v0.1.3
  const platform_lemon = await Platform.findOne({ where: { name: 'Lemon' } })
  if (!platform_lemon) {
    const lemonPlatform = defaultData.find(item => item.name === 'Lemon')
    const platformData = {
      name: lemonPlatform.name,
      logo_url: lemonPlatform.logo_url,
      source_type: 'system',
      api_key: lemonPlatform.api_key,
      api_url: lemonPlatform.api_url,
      api_version: lemonPlatform.api_version,
      key_obtain_url: lemonPlatform.key_obtain_url,
      is_subscribe: true,
      is_enabled: true
    };
    const platform = await Platform.create(platformData);
    const modelsData = lemonPlatform.models.map(model => ({
      // @ts-ignore
      platform_id: platform.id,
      logo_url: model.logo_url,
      model_id: model.model_id,
      model_name: model.model_name,
      group_name: model.group_name,
      model_types: model.model_types,
    }));
    await Model.bulkCreate(modelsData);
  }

  // v0.1.3 => v0.1.4
  await Platform.update({ is_enabled: true }, { where: { name: 'Lemon' } })
  SearchProviderTable.destroy({ where: { name: 'Baidu' } });
  SearchProviderTable.destroy({ where: { name: 'Bing' } });
}

const sync = async () => {
  try {
    await tableSync();
    await dataSync();
    await dataUpdate();
  } catch (error) {
    console.error('Error during sync:', error);
  }
}

sync()

module.exports = exports = sync;