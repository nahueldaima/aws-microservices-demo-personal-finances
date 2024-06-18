const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {filter} = require('./transactionsTransfers.validations');

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
              "message": `${pId} - Transactions Transfers Filter - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsTransfers');

        let validationResult = filter.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsTransfers');

        // get Transfer Category
        let transactionCategory = await models['TransactionsCategories'].findOne({_id: process.env.SYSTEM_TRANSFER_CATEGORY});

        if (!transactionCategory) {
            throw 'System transactionCategory was not found'
        }

        let transactions = await models['Transactions'].find({
            economy: body.economy,
            category: transactionCategory._id
        }).sort({date: -1}).limit(20);


        let message = transactions.length
            ? `${transactions.length} transactions transfers found`
            : `No transactions transfers found`;

        await logs.saveLog([{
              "message": `${pId} - Transactions Transfers Filter - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsTransfers');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: transactions
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Transfers Filter - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'transactionsTransfers');

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
