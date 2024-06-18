const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {getAll} = require('./stashes.validations');


exports.lambdaHandler = async (event, context) => {
    let pId = generateRandomString();
    try {
        if (event && event.ping) {
            return {
                'statusCode': 200
            }
        }
        await db.connect();
        let models = db.registerModels();

        // save log to cloudwatch
        await logs.saveLog([{
              "message": `${pId} - Stashes GetAll request received`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        let user = event.requestContext.authorizer["user"];

        // get use economies
        user = await models['Users'].findOne({_id: user}).select('economies');

        // find stashes
        let stashes = await models['Stashes'].find({economy: {$in: user.economies}});

        if (stashes.length) {
            stashes = stashes.map(item => {
                try {
                    item.currentBalance = Math.round( ( item.currentBalance + Number.EPSILON ) * 100 ) / 100;
                } catch (e) {
                    console.log(e);
                }
                return item;
            })
        }

        let message = stashes.length ? `${stashes.length} stashes found` : `No stashes found`;

        await logs.saveLog([{
              "message": `${pId} - Stashes GetAll - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: stashes
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Stashes GetAll - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'stashes');

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
