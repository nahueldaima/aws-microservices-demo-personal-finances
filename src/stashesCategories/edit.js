const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {edit} = require('./stashesCategories.validations');

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
              "message": `${pId} - StashesCategories Edit - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        // validate request
        let validationResult = edit.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - StashesCategories Edit - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'stashesCategories');

        let userReceived = event.requestContext.authorizer["user"];

        // DB validations
        let [user, stashCategory] = await Promise.all([
            models['Users'].findOne({_id: userReceived}).select('economies'),
            models['StashesCategories'].findOne({_id: body._id}),
        ])

        // validate sent references
        if (!stashCategory) {
            throw 'stashCategory received does not exist';
        }

        let existAndCanAccess = false;
        if (user.economies.length) {
            existAndCanAccess = !!(user.economies.find(item => item.toString() === stashCategory.economy.toString()));
        }

        if (!existAndCanAccess) {
            throw 'User does not have access to edit the provided stashCategory';
        }

        delete body._id;

        if (!Object.keys(body).length) {
            throw 'Nothing to update';
        }

        let updated = await models['StashesCategories'].findOneAndUpdate({_id: stashCategory._id}, body, {new: true});

        await logs.saveLog([{
              "message": `${pId} - StashesCategories Edit - Stash Category successfully edited: ${updated.name}`,
              "timestamp": new Date().getTime(),
          }],
          'stashes');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Stash Category successfully edited: ${updated.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - StashesCategories Edit - ${errorMsj}`,
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
