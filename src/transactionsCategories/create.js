const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {create} = require('./transactionsCategories.validations');

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
              "message": `${pId} - Transactions Categories Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        let validationResult = create.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        // validations
        let [transactionCategoryGroup, economy] = await Promise.all([
            models['TransactionsCategoriesGroups'].findOne({_id: body.transactionCategoryGroup}),
            models['Economies'].findOne({_id: body.economy})
        ]);

        // validate sent references
        if (!transactionCategoryGroup || !economy) {
            let message = '';
            message += !transactionCategoryGroup ? 'Transaction Category Group, ' : '';
            message += !economy ? 'Economy, ' : '';
            throw `${message} provided does not exist`
        }

        body.group = body.transactionCategoryGroup;
        delete body.transactionCategoryGroup;

        await models['TransactionsCategories'].create({
            ...body
        });

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Categories Create - Transaction category successfully created: ${body.name}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');


        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transaction category successfully created: ${body.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Categories Create - ${errorMsj}`,
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
