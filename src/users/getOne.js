const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const { getOne } = require('./users.validations');
let response;

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
        let body = event.requestContext.authorizer;

        await logs.saveLog([{
              "message": `${pId} - Users GetOne - Request received - ${event.requestContext.authorizer}`,
              "timestamp": new Date().getTime(),
          }],
          'users');

        // validations
        // getOne.validate(body);


        let userId = body.user;


        let user = await models['Users'].findOne({_id: userId}).select('-password').populate([
            {
                path: 'economies',
                select: 'name'
            },
        ]);

        if (!user) {
            throw 'User not found';
        }

        await logs.saveLog([{
              "message": `${pId} -  Users GetOne - User successfully found: ${user.username}`,
              "timestamp": new Date().getTime(),
          }],
          'users');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `User successfully found: ${user.username}`,
                data: user
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Users GetOne - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'users');

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
