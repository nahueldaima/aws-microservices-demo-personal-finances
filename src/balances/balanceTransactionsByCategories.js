const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const mongoose = require("mongoose");
let response;
const {transactionsByCategories} = require('./balances.validations');

exports.lambdaHandler = async (event, context) => {
    let pId = generateRandomString();
    try {
        if (event && event.ping) {
            return {
                'statusCode': 200
            }
        }
        let body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        await db.connect();
        let models = db.registerModels();

        await logs.saveLog([{
              "message": `${pId} - Balance by category - query received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let validationResult = transactionsByCategories.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Balance by category - query validated`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        // base query
        let transactionCategoriesQuery = {
            economy: new mongoose.Types.ObjectId(body.economy)
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
              "message": `${pId} - Balance by category - query: ${JSON.stringify(transactionCategoriesQuery, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let categories = await models['TransactionsCategories']
            .find(transactionCategoriesQuery).select('_id');

        if (!categories.length) {
            throw 'No categories found on for the given group'
        }

        // retrieve coins
        let coins = await models['Coins']
          .find().select('_id uuid');

        // leave only array of ids
        categories = categories.map(item => item._id);

        let query = {
            'category': {$in: categories},// transaction category group
            'economy': new mongoose.Types.ObjectId(body.economy),
        };

        if (body.dateFrom && body.dateTo) {
            if (new Date(body.dateFrom).getTime() > new Date(body.dateTo).getTime()) {
                throw 'dateFrom sent can not be higher than date to'
            }
        }
        // let date begining of year
        let beginningOfYear = new Date();
        beginningOfYear.setMonth(0);
        beginningOfYear.setDate(1);
        beginningOfYear.setHours(0);
        beginningOfYear.setMinutes(0);

        let endOfYear = new Date();
        endOfYear.setMonth(11);
        endOfYear.setDate(31);
        endOfYear.setHours(23);
        endOfYear.setMinutes(59);


        query.date = {
            '$gte': body.dateFrom ? body.dateFrom : new Date(beginningOfYear).toISOString(),
            '$lte': body.dateTo ? body.dateTo : new Date(endOfYear).toISOString(),
        }

        await logs.saveLog([{
              "message": `${pId} - Balance by category - Transactions query: ${JSON.stringify(query, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'balances');

        let balance = await models['Transactions'].find(query);

        // iterate every value, and by key, organize the transactions by year and month on a hashtree
        if (balance && balance.length) {
            balance = organizeTransactionsByYearAndMonth(balance, coins);
        }

        let message = 'Balance calculated successfully';

        await logs.saveLog([{
              "message": `${pId} - Balance by category - ${message}`,
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
            "message": `${pId} - Balance by category - ${errorMsj}`,
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


const organizeTransactionsByYearAndMonth = (transactions, coins) => {
    const output = {};
    let coinsDefaultCounter = {};
    let coinsMap = {};
    for(let coin of coins) {
        coinsDefaultCounter[coin.uuid] = 0;
        coinsMap[coin._id] = coin.uuid;
    }

    transactions.forEach((transaction) => {
        const category = transaction.category;
        const year = new Date(transaction.date).getFullYear();
        const month = new Date(transaction.date).getMonth() + 1;
        const coin = transaction.coin;

        if (!output[category]) {
            output[category] = {};
        }
        if (!output[category][year]) {
            output[category][year] = {};
        }
        if (!output[category][year][month]) {
            output[category][year][month] = {
                transactions: [],
                totals: Object.assign({}, coinsDefaultCounter),
                unifiedTotals: Object.assign({}, coinsDefaultCounter),
            };
        }

        output[category][year][month].transactions.push(transaction._id);
        output[category][year][month].totals[coinsMap[coin]] += transaction.amount;
        output[category][year][month].unifiedTotals[coinsMap[coin]] += transaction.amount;
        if (transaction.statistics && transaction.statistics.rates) {
            for (let coin in transaction.statistics.rates) {
                output[category][year][month].unifiedTotals[coin] += transaction.statistics.rates[coin];
            }
        }
    });

    return output;
}
