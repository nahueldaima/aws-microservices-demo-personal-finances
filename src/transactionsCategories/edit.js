const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {edit} = require('./transactionsCategories.validations');

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
              "message": `${pId} - Transactions Categories Edit - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        let validationResult = edit.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Categories Edit - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        let userReceived = event.requestContext.authorizer["user"];

        // validations
        let [transactionCategory, user] = await Promise.all([
            models['TransactionsCategories'].findOne({_id: body._id, isSystem: false}),
            models['Users'].findOne({_id: userReceived}).select('economies'),
        ]);

        // validate sent references
        if (!transactionCategory) {
            throw 'Transaction Category provided does not exist'
        }

        if (body.transactionCategoryGroup) {
            let transactionCategoryGroup = await models['TransactionsCategoriesGroups'].findOne({_id: body.transactionCategoryGroup});
            if (!transactionCategoryGroup) {
                throw 'Transaction Category Group provided does not exist'
            }
            body.group = body.transactionCategoryGroup;
            delete body.transactionCategoryGroup;
        }

        let existAndCanAccess = false;

        if (user.economies.length) {
            existAndCanAccess = !!(user.economies.find(item => item.toString() === transactionCategory.economy.toString()));
        }

        if (!existAndCanAccess) {
            throw 'User does not have access to edit the provided Transaction Category';
        }

        delete body._id;

        if (!Object.keys(body).length) {
            throw 'Nothing to update';
        }

        let updated = await models['TransactionsCategories'].findOneAndUpdate({_id: transactionCategory._id}, body, {new: true});

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Categories Edit - Transaction category successfully edited: ${updated.name}`,
              "timestamp": new Date().getTime(),
          }],
          'transactionsCategories');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transaction category successfully edited: ${updated.name}`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Categories Edit - ${errorMsj}`,
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
