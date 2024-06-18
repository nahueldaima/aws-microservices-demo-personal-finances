const {db} = require('locallibs');
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const {batchCreate} = require('./transactions.validations');
const ratesUtils = require('./ratesUtils');
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
            body = JSON.parse(event.body);
        }

        let commonBody = {};

        await db.connect();
        let models = db.registerModels();

        await logs.saveLog([{
              "message": `${pId} - Transactions Batch Create - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let validationResult = batchCreate.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        body = validationResult.value;

        await logs.saveLog([{
              "message": `${pId} - Transactions Batch Create - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let userId = event.requestContext.authorizer["user"];

        // validations
        let [economy, stash] = await Promise.all([
            models['Economies'].findOne({_id: body.economy}),
            models['Stashes'].findOne({_id: body.stash})
        ]);

        // validate sent references
        if (!economy || !stash) {
            let message = '';
            message += !economy ? 'Economy, ' : '';
            message += !stash ? 'Stash, ' : '';
            throw `${message} provided does not exist`
        }

        // add user to Body
        commonBody.user = userId;

        // add coin to transaction
        commonBody.coin = stash.coin;

        // add stash and economy to body
        commonBody.stash = body.stash;
        commonBody.economy = body.economy;
        commonBody.date = body.date;


        // get stashCategory
        let stashCategory = await models["Stashes"].findOne({_id: body.stash}).select("type");

        // prepare statistics
        commonBody.statistics =  {
            stashCategory: stashCategory.type
        }

        // search all transactions categories

        let transactionsCategoriesDictionary = {};
        {
            let transactionsCategoriesIds = [];
            for (let transaction of body.transactions) {
                transactionsCategoriesIds.push(transaction.category);
            }

            // transactionCategory
            let transactionCategory = await models['TransactionsCategories'].find({_id: {$in: transactionsCategoriesIds}});

            if (!transactionCategory.length) {
                throw {
                    message: 'Transactions categories provided do not exist'
                }
            }
            for (let category of transactionCategory) {
                transactionsCategoriesDictionary[category._id] = category;
            }
        }


        let balanceToAdd = 0;
        let exchangeRates = null;
        try {
            exchangeRates = await ratesUtils.getRateFromCoin({
                coinId: commonBody.coin,
                date: commonBody.date,
                models,
                pId
            });
        }  catch (e) {
            await logs.saveLog([{
                  "message": `${pId} - Transactions Batch Create - Error retrieving rates: ${e}`,
                  "timestamp": new Date().getTime(),
              }],
              'transactions');
        }


        let createdTransactions = await Promise.all(body.transactions.map(async (transaction) => {
            let localBody = {...commonBody};
            let transactionCategory = transactionsCategoriesDictionary[transaction.category];
            // validate transaction sign
            let amount;
            if (transactionCategory.operation === 'add') {
                amount = Math.sign(transaction.amount) === -1 ? transaction.amount * -1 : transaction.amount;
            } else {
                amount = Math.sign(transaction.amount) === 1 ? transaction.amount * -1 : transaction.amount;
            }

            // special cases for refunds
            if (transaction.isRefund) {
                await logs.saveLog([{
                      "message": `${pId} -  Transactions Batch Create - Transaction refund for ${amount * (-1)}`,
                      "timestamp": new Date().getTime(),
                  }],
                  'transactions');

                amount = amount * (-1);
                delete transaction.isRefund;
            }

            // round amount
            amount = Math.round((amount + Number.EPSILON) * 100) / 100;



            let rates = {};
            // check if date is current month
            if (exchangeRates) {
                rates = ratesUtils.convertExchangeRatesFromAmount(amount, exchangeRates);
            }
            let transactionBody = {
                ...localBody,
                ...transaction,
                amount,
                statistics: {
                    ...localBody.statistics,
                    categoryGroup: transactionCategory.group,
                    rates
                }
            };

            // save transaction
            let tId = await models['Transactions'].create(transactionBody);

            return {tId, amount};
        }));

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Batch Create - ${createdTransactions.length} transactions successfully created`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');


        // update balance
        for (let transaction of createdTransactions) {
            balanceToAdd += transaction.amount;
        }

        // round balance two decimals
        balanceToAdd = Math.round((balanceToAdd + Number.EPSILON) * 100) / 100;


        // save auditory record
        let auditRecord;
        {
            auditRecord = await models["Audits"].create({
                date: new Date().toISOString(),
                user: userId,
                coin: stash.coin,
                economy: body.economy,
                stashTotalBefore: stash.currentBalance,
                amountOFTransaction: balanceToAdd,
                status: false,
                stash: stash._id,
                payload: body,
                transactions: createdTransactions.map((transaction) => transaction.tId)
            })
        }

        //update balance
        let updatedStash = await models["Stashes"].findOneAndUpdate(
        {
            _id: body.stash
        },
          {
            $inc:  {
                'currentBalance': balanceToAdd
            }
          }, {upsert: true, new: true});

        if (auditRecord) {
            await models["Audits"].findOneAndUpdate({ _id: auditRecord._id },
              {
                $set:  {
                    status: !!(updatedStash.currentBalance === auditRecord.stashTotalBefore + auditRecord.amountOFTransaction),
                    stashTotalAfter: updatedStash.currentBalance
                }
              }, {upsert: true, new: true});
        }

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Batch Create - Transactions successfully added to stash balance`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transactions successfully created`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Batch Create - ${errorMsj}`,
            "timestamp": new Date().getTime(),
        }],
        'transactions');

        response = {
            'statusCode': 417,
            'body': errorMsj
        }
    }

    // bd.disconnect();

    return {
        headers: {
            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
        },
        ...response
    }
};
