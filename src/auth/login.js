const db = require('locallibs').db;
const logs = require('locallibs').logs;
const secrets = require('locallibs').secrets;
const {generateRandomString} = require('locallibs').utils;
const {login} = require('./auth.validations');
let response;
const nJwt = require('njwt');
const utils = require('locallibs').utils;

exports.lambdaHandler = async (event, context) => {
    let pId = generateRandomString();
    try {
      if (event && event.ping) {
        return {
          'statusCode': 200
        }
      }
      let body = process.env.ISLOCAL === false ? JSON.parse(event.body) : event;

      await db.connect();
      let models = db.registerModels();
      // let body = JSON.parse(event.body);

      await logs.saveLog([{
            "message": `${pId} - Login attempt by ${body.username}`,
            "timestamp": new Date().getTime(),
        }],
        'auth');

      // validate request
      let validationResult = login.validate(body);

      if (validationResult.error) {
        throw validationResult.error.message;
      }

      // find user
      let findUser = await models['Users'].findOne({username: body.username, enabled: true});
      if (!findUser) {
          throw 'The user provided does not exist or is not enabled'
      }

      await logs.saveLog([{
            "message": `${pId} - User found: ${body.username}`,
            "timestamp": new Date().getTime(),
        }],
        'auth');

      // compare passwords Todo: decode pasword before comparing
      if (!utils.crypto.comparePasswords(findUser.password, body.password)) {
          throw 'The password provided is wrong'
      }

      await logs.saveLog([{
            "message": `${pId} - Successful login by ${body.username}`,
            "timestamp": new Date().getTime(),
        }],
        'auth');

      // generate token
      let signingKey = await secrets.get('auth');
      signingKey = Buffer.from(signingKey, 'base64');

      var claims = {
        iss: "",  // The URL of your service
        sub: findUser.username,    // The UID of the user in your system
        scope: "self",
        timestamp: new Date().getTime()
      }

      var jwt = nJwt.create(claims,signingKey);
      var token = jwt.compact();

      response = {
        'statusCode': 200,
        'body': JSON.stringify({
          message: `Successful login`,
          data: {
            'access-token': token
          }
        })
      };
    } catch (err) {
      let errorMsj = JSON.stringify({
          message: err && err.message ? err.message : err
      });
      await logs.saveLog([{
            "message": `${pId} - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'auth');

      response = {
          'statusCode': 401,
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
