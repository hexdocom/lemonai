require('module-alias/register');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function syncAllModels() {
  try {
    // Get all model files in the current directory
    const modelFiles = fs.readdirSync(__dirname)
      .filter(file => file !== 'index.js' && file !== 'sync.js' && file.endsWith('.js'));
    console.log('modelFiles', modelFiles);


    // Import all models
    for (const file of modelFiles) {
      if (file === 'BaseModel.js') continue;
      const modelPath = path.join(__dirname, file);
      // console.log('modelPath', modelPath);
      const model = require(modelPath);

      // If the model is a function (like a model definition), initialize it
      if (typeof model === 'function') {
        try {
          await model.sync({ alter: true });
        } catch (error) {
          console.error(`Error syncing model ${file}:`, error);
        }
      }
    }

    console.log('All models were synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing models:', error);
    process.exit(1);
  }
}

// Execute the sync
syncAllModels();