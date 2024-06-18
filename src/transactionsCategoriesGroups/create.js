const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {create} = require('./transactionsCategoriesGroups.validations');

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
              "message": `${pId} - Transactions Categories Group Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');

        // validations
        let validationResult = create.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Group Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');


        let economy = await models['Economies'].findOne({_id: body.economy});

        // validate sent references
        if (!economy) {
            throw `The economy provided does not exist`
        }

        await models['TransactionsCategoriesGroups'].create({
            ...body
        });

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Group Create - Transaction category group successfully created: ${body.name}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transaction category group successfully created: ${body.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Categories Group Create - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'transactionsCategoriesGroups');

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
