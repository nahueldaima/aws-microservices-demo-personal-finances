const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {filter, create} = require('./transactionsCategories.validations');

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
              "message": `${pId} - Transactions Categories Filter - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        // validations
        let validationResult = filter.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Filter - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        let query = {
            economy: body.economy
        }

        if (body.group) {
            query['group'] = body.group;
        }

        query['isSystem'] = false;

        let [categories, system] = await Promise.all([
            models['TransactionsCategories'].find(query),
            models['TransactionsCategories'].find({isSystem: true})
        ]);
        let message = categories.length ? `${categories.length} categories found` : `No categories found`;

        categories = categories.concat(system);

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Filter - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: categories
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Categories Filter - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'transactionsCategories');

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
