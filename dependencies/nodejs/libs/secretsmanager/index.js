let AWS = require('aws-sdk');
const utils = require('../utils/index');
/**
 * Get the config values from the secret manager
 * @param configKey
 * @param ifValuesFromRoot to get the values from the root object, default is to take values from the environment
 * @returns {Promise<unknown>}
 */
const getSecretValuesFromManager = (configKey = null) => {
  return new Promise((resolve, reject) => {
    let awsSecretManagerClient = new AWS.SecretsManager();
    // get NODE_ENV from environment variables
    let environment = process.env.NODE_ENV || 'develop';

    let secretName = process.env.SECRETS_MANAGER_NAME;

    //get the the secret values from the AWS SM
    awsSecretManagerClient.getSecretValue({
      SecretId: secretName
    }, (err, data) => {

      //if error
      if (err) {
        return reject(err);
      }

      //full config value
      let config = JSON.parse(data.SecretString);
      config = config[environment]

      //if specific config value
      if (configKey) {
        resolve(utils.getValueOrNull(config, configKey));
      } else {
        reject('No value found');
      }
    });
  });
};

//exports
module.exports = {
  get: getSecretValuesFromManager
};

