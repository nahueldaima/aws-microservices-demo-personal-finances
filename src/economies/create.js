const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {create} = require('economies.validations');
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


        await logs.saveLog([{
              "message": `${pId} - Economies Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        // validate request
        let validationResult = create.validate(body);
        if (validationResult.error) {
          throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Economies Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        let user = event.requestContext.authorizer["user"];

        // create economy document
        let economy = await models['Economies'].create({...body, owner:  user});

        await logs.saveLog([{
              "message": `${pId} - Economies Create - Economy successfully created: ${body.name}`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        // add economy to user
        await models['Users'].findOneAndUpdate({_id: user},
        {'$push': {
            'economies': economy._id
        }});

        await logs.saveLog([{
              "message": `${pId} - Economies Create - Economy successfully added to user: ${user}`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Economy successfully created: ${body.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Economies Create - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'economies');

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
