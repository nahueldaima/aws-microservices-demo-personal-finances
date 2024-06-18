const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {get} = require('coins.validations');
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
        let body = event.body ? JSON.parse(event.body) : {};
        await db.connect();

        let returnRates = body.rates;

        let models = db.registerModels();
        let query = {};

        let params = event["queryStringParameters"];

        // save log to cloudwatch
        await logs.saveLog([{
              "message": `${pId} - Coins Get - Payload received: ${JSON.stringify(params, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        // if param sent =>  validate them
        if (params && params.uuid) {
            get.validate(params);
            query['uuid'] = params.uuid;
        }

        await logs.saveLog([{
              "message": `${pId} - Coins Get - query: ${JSON.stringify(query, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        let coins = await models['Coins'].find(query).select({rates: returnRates ? 1 : 0});

        let message;
        if (params && params.uuid) {
            message = coins.length ? `${params.uuid} - Coin found` : `${params.uuid} - No coin found`;
            coins = coins[0];
        } else {
            message = coins.length ? `${coins.length} coins found` : `No coins found`;
        }

        await logs.saveLog([{
              "message": `${pId} - Coins Get - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: coins
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Coins Get - ${errorMsj}`,
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
