const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {getAll} = require('./stashesCategories.validations');


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

        // validations
        // getAll.validate(body)

        await logs.saveLog([{
              "message": `${pId} - StashesCategories GetAll request received`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        let userReceived = event.requestContext.authorizer["user"];

        let user = await models['Users'].findOne({_id: userReceived});

        let stashesCategories = await models['StashesCategories'].find({economy: {$in: user.economies}});
        let message = stashesCategories.length ? `${stashesCategories.length} stashes categories found` : `No stashes categories found`;

        await logs.saveLog([{
              "message": `${pId} - StashesCategories GetAll - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: stashesCategories
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - StashesCategories GetAll - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'stashesCategories');

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
