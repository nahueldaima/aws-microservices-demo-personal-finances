const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {edit} = require('./stashes.validations');

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
              "message": `${pId} - Stashes Edit - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        // validate request
        let validationResult = edit.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Stashes Edit - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        // let userReceived = "62093e282a33559107283014";
        let userReceived = event.requestContext.authorizer["user"];

        // DB validations
        let [stash, user] = await Promise.all([
            models['Stashes'].findOne({_id: body._id}),
            models['Users'].findOne({_id: userReceived}).select('economies')
        ]);

        // validate sent references
        if (!stash) {
            throw `Stash provided does not exist`
        }

        if (body.type) {
            let stashCategory = await models['StashesCategories'].findOne({_id: body.type});
            if (!stashCategory) {
                throw 'Type provided does not exist'
            }
        }

        let existAndCanAccess = false;
        if (user.economies.length) {
            existAndCanAccess = !!(user.economies.find(item => item.toString() === stash.economy.toString()));
        }

        if (!existAndCanAccess) {
            throw 'User does not have access to edit the provided stash';
        }

        delete body._id;

        if (!Object.keys(body).length) {
            throw 'Nothing to update';
        }

        let updated = await models['Stashes'].findOneAndUpdate({_id: stash._id}, body, {new: true});

        await logs.saveLog([{
              "message": `${pId} - Stashes Edit - Stash successfully edited: ${updated.name}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Stash successfully edited: ${updated.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Stashes Edit - ${errorMsj}`,
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
