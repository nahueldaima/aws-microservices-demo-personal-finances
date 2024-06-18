const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {filter} = require('./transactionsCategoriesGroups.validations');

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
              "message": `${pId} - Transactions Categories Group Filter - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');

        // validations
        let validationResult = filter.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Group Filter - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');

        let query = {
            economy: body.economy
        }

        if (body.name) {
            query['name'] = body.name;
        }

        query['isSystem'] = false;

        let [transactionsCategoriesGroups, system] = await Promise.all([
            models['TransactionsCategoriesGroups'].find(query),
            models['TransactionsCategoriesGroups'].find({isSystem: true}),
        ]);

        let message = transactionsCategoriesGroups.length
          ? `${transactionsCategoriesGroups.length} transactions categories groups found`
          : `No transactions categories groups found`;

        transactionsCategoriesGroups = transactionsCategoriesGroups.concat(system);

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Group Filter - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategoriesGroups');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: transactionsCategoriesGroups
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Categories Group Filter - ${errorMsj}`,
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
