const {db} = require('locallibs');
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const {create} = require('./transactions.validations');
const ratesUtils = require("./ratesUtils");
let response;

exports.lambdaHandler = async (event, context) => {
    let pId = generateRandomString();
    try {
        if (event && event.ping) {
            return {
                'statusCode': 200
            }
        }
        let body = event;
        if (event && event.body) {
            JSON.parse(event.body);
        }

        await db.connect();
        let models = db.registerModels();

        await logs.saveLog([{
              "message": `${pId} - Transactions Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let validationResult = create.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        body = validationResult.value;

        await logs.saveLog([{
              "message": `${pId} - Transactions Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let userId = event.requestContext.authorizer["user"];

        // validations
        let [economy, transactionCategory, stash] = await Promise.all([
            models['Economies'].findOne({_id: body.economy}),
            models['TransactionsCategories'].findOne({_id: body.category}),
            models['Stashes'].findOne({_id: body.stash})
        ]);

        // validate sent references
        if (!economy || !transactionCategory || !stash) {
            let message = '';
            message += !economy ? 'Economy, ' : '';
            message += !transactionCategory ? 'Transaction category, ' : '';
            message += !stash ? 'Stash, ' : '';
            throw `${message} provided does not exist`
        }

        // add user to Body
        body.user = userId;

        // add coin to transaction
        body.coin = stash.coin;

        // validate child
        if (body.childs && body.childs.length) {
            let child = await models['Transactions'].find({
                _id: {$in: body.childs}
            });
            if (!child || !child.length || child.length !== body.childs.length) {
                throw 'Not all childs sent exists'
            }
        }
        // validate parent
        if (body.parent) {
            let parent = await models['Transactions'].findOne({
                _id: body.parent
            });
            if (!parent) {
                throw 'Parent sent does not exists'
            }
        }

        // validate transaction sign
        let amount;
        if (transactionCategory.operation === 'add') {
            amount = Math.sign(body.amount) === -1 ? body.amount * -1 : body.amount;
        } else {
            amount = Math.sign(body.amount) === 1 ? body.amount * -1 : body.amount;
        }

        // special cases for refunds
        if (body.isRefund) {
            await logs.saveLog([{
                  "message": `${pId} -  Transactions Create - Transaction refund for ${amount * (-1)}`,
                  "timestamp": new Date().getTime(),
              }],
              'transactions');

            amount = amount * (-1);
            delete body.isRefund;
        }

        // round amount
        amount = Math.round((amount + Number.EPSILON) * 100) / 100;

        // rates
        let exchangeRates;

        try {
            exchangeRates = await ratesUtils.getRateFromCoin({
              coinId: body.coin,
              date: body.date,
              models,
              pId
            });
        } catch (e) {
            await logs.saveLog([{
                  "message": `${pId} -  Transactions Create - Error getting rates for ${body.coin} on ${body.date}`,
                  "timestamp": new Date().getTime(),
              }],
              'transactions');
        }

        let rates = {};
        // check if date is current month
        if (exchangeRates) {
            rates = ratesUtils.convertExchangeRatesFromAmount(amount, exchangeRates);
        }
        let statistics = {
            stashCategory: stash.type,
            categoryGroup: transactionCategory.group,
            rates
        }

        // save transaction
        await models['Transactions'].create({
            ...body,
            amount,
            statistics
        });

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Create - Transaction successfully created`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        //update balance
        // TODO: Round up the $inc so it does not have many decimals
        await models["Stashes"].findOneAndUpdate(
        {
            _id: body.stash
        },
          {
            $inc:  {
                'currentBalance': amount
            }
          }, {upsert: true, new: true});

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Create - Transaction successfully added to stash balance`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transaction successfully created`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Create - ${errorMsj}`,
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
