const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const mongoose = require("mongoose");
let response;
const {transactionsValidation} = require('./balances.validations');

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
              "message": `${pId} - Balance transactions - query received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let validationResult = transactionsValidation.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        let limit = body.limit ? body.limit : 100;
        let sk

        await logs.saveLog([{
              "message": `${pId} - Balance transactions - query validated`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let query = {
            'economy': new mongoose.Types.ObjectId(body.economy),
        };

        if (body.categoryGroup || body.category) {
            // base query
            let transactionCategoriesQuery = {
                economy: body.economy
            };

            // if  a group was sent, get all categories in the group
            if (body.categoryGroup) {
                transactionCategoriesQuery['group'] = body.categoryGroup;
            }
            // if category id sent, search only that one
            if (body.category) {
                transactionCategoriesQuery['_id'] = body.category;
            }

            await logs.saveLog([{
                  "message": `${pId} - Balance transactions - TransactionsCategories query: ${JSON.stringify(transactionCategoriesQuery, null, 2)}`,
                  "timestamp": new Date().getTime(),
              }],
              'balances');

            let categories = await models['TransactionsCategories']
              .find(transactionCategoriesQuery).select('_id');

            if (!categories.length) {
                throw 'No categories found on for the given group'
            }
            // leave only array of ids
            categories = categories.map(item => item._id);

            query['category'] = {$in: categories};
        }

        // filter by stash if sent
        if (body.stash) {
            query['stash'] = new mongoose.Types.ObjectId(body.stash);
        }

        if (body.dateFrom && body.dateTo) {
            if (new Date(body.dateFrom).getTime() > new Date(body.dateTo).getTime()) {
                throw 'dateFrom sent can not be higher than date to'
            }
            query = {
                ...query,
                'date': {
                    '$gte': new Date(body.dateFrom),
                    '$lte': new Date(body.dateTo)
                }
            }
        }

        await logs.saveLog([{
              "message": `${pId} - Balance transactions - Transactions query: ${JSON.stringify(query, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let [balances, transactions] = await Promise.all([
            models['Transactions'].aggregate([
                {
                    $match: query
                },
                {
                    $group: {
                        _id: "$coin",
                        total: {
                            $sum: "$amount"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        coin: "$_id",
                        total: 1,
                    }
                }
            ]).allowDiskUse(true),
            models['Transactions'].aggregate([
                {
                    $match: query
                },
                {
                    '$facet': {
                        'total': [{
                            '$count': 'count'
                        }],
                        'results': [
                            {
                                '$sort': {
                                    'date': -1
                                }
                            },
                            {
                                '$skip': body.page ? ((Math.max(0, body.page) - 1) * limit) : 0
                            },
                            {
                                '$limit': limit
                            }
                        ]
                    }
                },
                {
                    '$addFields': {
                        'total': {
                            '$ifNull': [{ '$arrayElemAt': ['$total.count', 0] }, 0]
                        }
                    }
                }
            ]).allowDiskUse(true)
        ]);


        let message = 'Balance calculated successfully';

        await logs.saveLog([{
              "message": `${pId} - Balance transactions - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: {
                    balances,
                    total: transactions[0].total,
                    transactions: transactions[0].results
                }
            })
        }

    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Balance transactions - ${errorMsj}`,
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
