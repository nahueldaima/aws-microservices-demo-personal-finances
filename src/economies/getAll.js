const db = require('locallibs').db;
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

        // this allow us to retrieve values form the authorizer function
        // console.log('event.requestContext.authorizer', event.requestContext.authorizer);
        await db.connect();
        let models = db.registerModels();

        // save log to cloudwatch
        await logs.saveLog([{
              "message": `${pId} - Economies GetAll request received`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        let user = event.requestContext.authorizer["user"];
        // let body = JSON.parse(event.body);

        // validate request
        // getAll.validate(body);

        // validate
        let findUser
        if (user) {
            await logs.saveLog([{
                  "message": JSON.stringify(user),
                  "timestamp": new Date().getTime(),
              }],
              'economies');
            findUser = await models['Users'].findOne({_id: user});
            if (!findUser) {
                throw 'The user does not have economies enabled'
            }
        }

        await logs.saveLog([{
              "message": `${pId} - Economies GetAll - Retrieve economies of User: ${user}`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        let economies = await models['Economies'].find({
            _id: {$in: findUser.economies}
        }).lean();
        let message = economies.length ? `${economies.length} economies found` : `No economies found`;

        await logs.saveLog([{
              "message": `${pId} - Economies GetAll - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'economies');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: economies
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Economies GetAll - ${errorMsj}`,
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
