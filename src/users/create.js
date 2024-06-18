const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const { create } = require('./users.validations');
const secrets = require('locallibs').secrets;
const utils = require('locallibs').utils;

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
              "message": `${pId} - Users Create`,
              "timestamp": new Date().getTime(),
          }],
          'users');

        // validations
        let validationResult = create.validate(body);
        if (validationResult.error) {
          throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Users Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'users');

        //hash password before saving
        let uniqueSalt = utils.crypto.generateSalt();
        let hashedPassword =  utils.crypto.hashPassword(String(body.password), uniqueSalt);
        body.password = `${hashedPassword}.${uniqueSalt}`;

        // create user
        await models['Users'].create(body);

        await logs.saveLog([{
              "message": `${pId} - Users Create - User successfully created: ${body.username}`,
              "timestamp": new Date().getTime(),
          }],
          'users');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `User successfully created: ${body.username}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Users Create - ${errorMsj}`,
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
