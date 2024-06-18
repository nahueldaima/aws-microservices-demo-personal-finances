const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {create} = require('./stashesCategories.validations');

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

        await logs.saveLog([{
              "message": `${pId} - StashesCategories Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        // validate request
        let validationResult = create.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - StashesCategories Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        let userReceived = event.requestContext.authorizer["user"];

        // DB validations
        let economy = await models['Economies'].findOne({_id: body.economy});

        // validate sent references
        if (!economy) {
            throw `Economy provided does not exist`
        }

        await models['StashesCategories'].create(body);

        await logs.saveLog([{
              "message": `${pId} - StashesCategories Create - Stash Category successfully created: ${body.name}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Stash Category successfully created: ${body.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - StashesCategories Create - ${errorMsj}`,
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
