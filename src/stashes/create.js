const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {create} = require('./stashes.validations');

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
              "message": `${pId} - Stashes Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        // validate request
        let validationResult = create.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Stashes Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        let userReceived = event.requestContext.authorizer["user"];

        // DB validations
        let [economy, coin, stashCategory] = await Promise.all([
            models['Economies'].findOne({_id: body.economy}),
            models['Coins'].findOne({_id: body.coin}),
            models['StashesCategories'].findOne({_id: body.type})
        ]);

        // validate sent references
        if (!economy || !coin || !stashCategory) {
            let message = '';
            message += !economy ? 'Economy, ' : '';
            message += !coin ? 'Coin, ' : '';
            message += !stashCategory ? 'Type ' : '';
            throw `${message} provided does not exist`
        }

        await models['Stashes'].create({
            ...body
        });

        await logs.saveLog([{
              "message": `${pId} - Stashes Create - Stash successfully created: ${body.name}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Stash successfully created: ${body.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Stashes Create - ${errorMsj}`,
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
