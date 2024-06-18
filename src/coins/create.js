const db = require('locallibs').db;
const {create} = require('coins.validations');
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;

exports.lambdaHandler = async (event, context) => {
    let pId = generateRandomString();
    try {
        if (event && event.ping) {
          return {
            'statusCode': 200
          }
        }
        let body = JSON.parse(event.body);
        await db.connect();
        let models = db.registerModels();


        // save log to cloudwatch
        await logs.saveLog([{
              "message": `${pId} - Coins Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        // validate request
        let validationResult = create.validate(body);
        if (validationResult.error) {
          throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Coins Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        // validate unique uuid
        let coin = await models['Coins'].findOne({uuid: body.uuid});
        if (coin) {
            throw `The uuid ${body.uuid} already exists`;
        }

        await logs.saveLog([{
              "message": `${pId} - Coins Create - New Coin received ${body.uuid}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');


        await models['Coins'].create(body);

        await logs.saveLog([{
              "message": `${pId} - Coins Create - Coin successfully created: ${body.uuid}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Coin successfully created: ${body.uuid}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Coins Create - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'coins');

        response = {
            'statusCode': 417,
            'body': errorMsj
        }
    }

    return {
        headers: {
            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
        },
        ...response
    }
};
