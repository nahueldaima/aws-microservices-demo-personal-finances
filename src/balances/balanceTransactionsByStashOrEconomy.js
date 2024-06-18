const db = require('locallibs').db;
const logs = require('locallibs').logs;
const mongoose = require("mongoose");
const {generateRandomString} = require('locallibs').utils;
let response;
const {transactionsByStashOrEconomy, transactionsByCategories} = require('./balances.validations');

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
              "message": `${pId} - BalanceByStashOrEconomy - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let validationResult = transactionsByStashOrEconomy.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - BalanceByStashOrEconomy - query validated`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let query = {
            'economy': new mongoose.Types.ObjectId(body.economy)
        };

        // calculate amounts and group them by coin
        let groupStage =  {
            $group: {
                _id: "$coin",
                total: {
                    $sum: "$amount"
                },
                transactions: { $push: "$$ROOT" }
            }
        };
        let projectStage = {
            $project: {
                _id: 0,
                coin: "$_id",
                total: 1,
                transactions: 1
            }
        }

        // filter by stash if sent
        if (body.stash) {
            query['stash'] = new mongoose.Types.ObjectId(body.stash);

            // only show total, no need for coin grouping
            groupStage = {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$amount"
                    },
                    transactions: { $push: "$$ROOT" }
                }
            };
            projectStage = {
                $project: {
                    _id: 0,
                    total: 1,
                    transactions: 1
                }
            }
        }

        if (body.dateFrom && body.dateTo) {
            if (new Date(body.dateFrom).getTime() > new Date(body.dateTo).getTime()) {
                throw 'dateFrom sent can not be higher than date to'
            }
            query = {
                'date': {
                    '$gte': body.dateFrom,
                    '$lte': body.dateTo
                }
            }
        }

        await logs.saveLog([{
              "message": `${pId} - BalanceByStashOrEconomy - Transactions query: ${JSON.stringify(query, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let balance = await models['Transactions'].aggregate([
            {
                $match: query
            },
            groupStage,
            projectStage
        ]).allowDiskUse(true);

        let message = 'Balance calculated successfully';

        await logs.saveLog([{
              "message": `${pId} - BalanceByStashOrEconomy - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: balance
            })
        }

    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - BalanceByStashOrEconomy - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'balances');

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
