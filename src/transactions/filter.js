const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const {filter} = require('./transactions.validations');

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
              "message": `${pId} - Transactions Filter - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let validationResult = filter.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        await logs.saveLog([{
              "message": `${pId} - Transactions Filter - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let query = {};
        let responseBody = {};
        let transactions;

        // case for searching a single transaction
        if (body.id) {
            query['_id'] = body.id;
            transactions =  await models['Transactions'].find({_id: body.id});
            responseBody = transactions[0];
        }
        // case for range filtering
        else if(body.economy && body.dateFrom && body.dateTo) {
            // add defaults
            body['limit'] = body.limit ? body.limit : 25;
            body['page'] = body.page ? body.page : 1;
            body['sort'] = body.sort ? body.sort : {
                key: 'date',
                value: -1
            };

            // validate dates
            if (new Date(body.dateFrom).getTime() > new Date(body.dateTo).getTime()) {
                throw 'dateFrom sent can not be higher than date to'
            }
            query = {
                'economy': body.economy,
                'date': {
                    '$gte': body.dateFrom,
                    '$lte': body.dateTo
                }
            }
            // case for further filtering
            if (body.categories) {
                query['category'] = {$in: body.categories};
            }
            if (body.coin) {
                query['coin'] = body.coin;
            }
            if (body.stash) {
                query['stash'] = body.stash;
            }

            // basic pagination and sort
            let sort = {};
            sort[body.sort && body.sort.key ? body.sort.key : 'date'] =  body.sort &&  body.sort.value ? body.sort.value : -1;
            let skip = body.page && body.page > 1 ? body.page * body.limit : 0;

            // get total results
            let totalResults = await models['Transactions'].countDocuments(query);

            let pages;

            // search documents if results
            if (totalResults > 0) {
                transactions = await models['Transactions'].find(query).sort(sort)
                .limit(body.limit).skip(skip).select('-childs -isFuture -updatedAt -__v');
                pages = Math.ceil(totalResults / Number(body.limit));
            } else {
                transactions = [];
                pages = 0;
            }

            // format response
            responseBody = {
                transactions,
                pages,
                totalResults
            }
        } else {
            throw 'mandatory parameters where not sent'
        }

        let message = transactions && transactions.length
            ? `${transactions.length} transactions found`
            : `No transactions found`;

        await logs.saveLog([{
              "message": `${pId} - Transactions Filter - ${message}`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message,
                data: responseBody
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Filter - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'transactions');

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
