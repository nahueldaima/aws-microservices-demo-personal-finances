const {db} = require('locallibs');
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const {update} = require('./transactions.validations');
let response;

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
              "message": `${pId} - Transactions Edit - Payload received: ${JSON.stringify(body, null, 2)}`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let validationResult = update.validate(body);
        if (validationResult.error) {
            throw validationResult.error.message;
        }

        body = validationResult.value;


        await logs.saveLog([{
              "message": `${pId} - Transactions Edit - Query validated`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        let userId = event.requestContext.authorizer["user"];

        // find user economies
        let user = await models['Users'].findOne({_id: userId}).select('economies');

        // Search received transaction
        let oldTransaction = await models['Transactions'].findOne({
            _id: body._id,
            economy: { $in: user.economies}
        }).populate('category stash');;

        if (!oldTransaction) {
            throw `The provided transaction _id ${body._id} does not exists or user does not have access to it`
        }

        let newStash;
        let transactionCategory;
        let amount;
        let coin;

        // prepare update payload
        let newTransactionBody = {
            user: userId,
            economy: oldTransaction.economy
        };

        newTransactionBody.date = body.date ? body.date : oldTransaction.date;
        newTransactionBody.observations = body.observations ? body.observations : oldTransaction.observations;
        newTransactionBody.reference = body.reference ? body.reference : oldTransaction.reference;

        // validate stash
        if (body.stash) {
            newStash = await models['Stashes'].findOne({
                _id: body.stash,
                economy: { $in: user.economies}
            });

            if (!newStash) {
                throw `The provided stash _id ${stash._id} does not exists or user does not have access to it`
            }
            // add stash to payload
            newTransactionBody.stash = newStash._id;

            // set coin
            coin = newStash.coin;
        } else {
            newTransactionBody.stash = oldTransaction.stash._id;
            coin = oldTransaction.stash.coin;
        }

        // set coin
        newTransactionBody.coin = coin;

        // validate categories
        if (body.category) {
            transactionCategory = await models['TransactionsCategories'].findOne({
                _id: body.category,
                economy: { $in: user.economies}
            });

            if (!transactionCategory) {
                throw `The provided category _id ${body.category} does not exists or user does not have access to it`
            }
        } else {
            transactionCategory = oldTransaction.category;
        }
        // add category to payload
        newTransactionBody.category = transactionCategory._id;

        if (body.amount) {
            // validate transaction sign
            if (transactionCategory.operation === 'add') {
                amount = Math.sign(body.amount) === -1 ? body.amount * -1 : body.amount;
            } else {
                amount = Math.sign(body.amount) === 1 ? body.amount * -1 : body.amount;
            }
        } else {
            // if was not a refund, leave value as it was, but if was a refund, revert the sign
            amount = !oldTransaction.isRefund ? oldTransaction.amount : oldTransaction.amount * (-1)
        }

        // refund
        if (body.isRefund) {
            await logs.saveLog([{
                  "message": `${pId} -  Transactions Edit - Transaction refund for ${amount * (-1)}`,
                  "timestamp": new Date().getTime(),
              }],
              'transactions');

            amount = amount * (-1);
        }
        newTransactionBody.isRefund = body.isRefund !== undefined ? body.isRefund : oldTransaction.isRefund;

        // add amount to payload rounded
        newTransactionBody.amount = Math.round((amount + Number.EPSILON) * 100) / 100;

        // replace old transaction for new one
        await models['Transactions'].findOneAndReplace({_id: body._id}, {...newTransactionBody});

        await logs.saveLog([{
              "message": `${pId} -  Transactions Edit - Transaction successfully edited`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        // revert previous transaction on the stash
        if (body.stash || body.category || body.amount || body.isRefund !== undefined) {
            // revert old amount from stash
            let amountToRevert = oldTransaction.amount * -1;
            await models["Stashes"].findOneAndUpdate(
              {
                  _id: oldTransaction.stash._id
              },
              {
                  $inc:  {
                      'currentBalance': amountToRevert
                  }
              }, {upsert: true});

            await logs.saveLog([{
                  "message": `${pId} - Transactions Edit - Old stash ${oldTransaction.stash._id} reverted on ${amountToRevert}`,
                  "timestamp": new Date().getTime(),
              }],
              'transactions');
        }

        //update balance of stash
        await models["Stashes"].findOneAndUpdate(
        {
            _id: newTransactionBody.stash
        },
          {
            $inc:  {
                'currentBalance': amount
            }
          }, {upsert: true});

        // save transaction log
        await logs.saveLog([{
              "message": `${pId} -  Transactions Edit - Transaction successfully added to stash balance`,
              "timestamp": new Date().getTime(),
          }],
          'transactions');

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Transaction successfully edited`
            })
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Transactions Edit - ${errorMsj}`,
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
