const {db} = require('locallibs');
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
const {create} = require('./transactionsTransfers.validations');
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

      await db.connect();
      let models = db.registerModels();

      await logs.saveLog([{
            "message": `${pId} - Transactions Transfers Create - Payload received: ${JSON.stringify(body, null, 2)}`,
            "timestamp": new Date().getTime(),
        }],
        'transactionsTransfers');

      let validationResult = create.validate(body);
      if (validationResult.error) {
          throw validationResult.error.message;
      }

      body = validationResult.value;


      await logs.saveLog([{
            "message": `${pId} - Transactions Transfers - Query validated`,
            "timestamp": new Date().getTime(),
        }],
        'transactionsTransfers');

      let userId = event.requestContext.authorizer["user"];

      // validations
      let [economy, stashFrom, stashTo] = await Promise.all([
          models['Economies'].findOne({_id: body.economy}),
          models['Stashes'].findOne({_id:  body.stashFrom}),
          models['Stashes'].findOne({_id:  body.stashTo}),
      ]);

      // validate sent references
      if (!economy || !stashFrom || !stashTo) {
          let message = '';
          message += !economy ? 'Economy, ' : '';
          message += !stashFrom ? 'Stash From, ' : '';
          message += !stashTo ? 'StashTo, ' : '';
          throw `${message} provided does not exist`
      }

      // validate amounts
      if (body.amountFrom === 0 || body.amountTo === 0) {
          throw `Neither amount from or to can be zero`
      }

      // get Transfer Category
      let transactionCategory = await models['TransactionsCategories'].findOne({_id: '62000eeee35937ccda445b32'});

      if (!transactionCategory) {
          throw 'System transactionCategory was not found'
      }


      // prepare transactions payloads
      let baseTransaction = {
          category: transactionCategory._id,
          user:  userId,
          economy: body.economy,
          date: body.date,
          observations: body.observations ? body.observations : '',
          reference: body.reference ? body.reference : '',
          isFuture: body.isFuture !== null && body.isFuture !== undefined ? body.isFuture : false,
      }

      // save auditory record
      let auditRecord;
      {
        auditRecord = await models["Audits"].create({
          date: new Date().toISOString(),
          user: userId,
          coin: stashFrom.coin,
          economy: body.economy,
          stashTotalBefore: stashFrom.currentBalance,
          amountOFTransaction: Math.sign(body.amountFrom) === 1 ? body.amountFrom * -1 : body.amountFrom,
          status: false,
          stash: body.stashFrom,
          toCoin: stashTo.coin,
          toStashTotalBefore: stashTo.currentBalance,
          toAmountOFTransaction: Math.sign(body.amountTo) === -1 ? body.amountTo * -1 : body.amountTo,
          toStash: body.stashTo,
          payload: body
        })
      }

      let savedTransactions = [];
      // Transaction From
      let updatedStashFrom;
      {
          let transactionFrom = {
              coin: stashFrom.coin,
              amount: Math.sign(body.amountFrom) === 1 ? body.amountFrom * -1 : body.amountFrom,
              stash: body.stashFrom,
              ...baseTransaction,
          }

          let transaction = await models['Transactions'].create(transactionFrom);
          savedTransactions.push(transaction._id);

          // save transaction log
          await logs.saveLog([{
                "message": `${pId} -  Transactions Transfers Create - Transaction From successfully created`,
                "timestamp": new Date().getTime(),
            }],
            'transactionsTransfers');

          //update balance
          updatedStashFrom = await models["Stashes"].findOneAndUpdate(
            {
                _id: body.stashFrom
            },
            {
                $inc:  {
                    'currentBalance': transactionFrom.amount
                }
            }, {upsert: true, new: true});

          // save transaction log
          await logs.saveLog([{
                "message": `${pId} -  Transactions Transfer Create - Transaction successfully added to stashFrom balance`,
                "timestamp": new Date().getTime(),
            }],
            'transactionsTransfers');
        }

      // Transaction To
      let updatedStashTo;
      {
          let transactionTo = {
              coin: stashTo.coin,
              amount: Math.sign(body.amountTo) === -1 ? body.amountTo * -1 : body.amountTo,
              stash: body.stashTo,
              ...baseTransaction,
          }

          let transaction = await models['Transactions'].create(transactionTo);
          savedTransactions.push(transaction._id);


          // save transaction log
          await logs.saveLog([{
                "message": `${pId} -  Transactions Transference Create - Transaction To successfully created`,
                "timestamp": new Date().getTime(),
            }],
            'transactionsTransfers');

          //update balance
          updatedStashTo = await models["Stashes"].findOneAndUpdate(
            {
                _id: body.stashTo
            },
            {
                $inc:  {
                    'currentBalance': transactionTo.amount
                }
            }, {upsert: true, new: true});

          // save transaction log
          await logs.saveLog([{
                "message": `${pId} -  Transactions Transfer Create - Transaction successfully added to stashTo balance`,
                "timestamp": new Date().getTime(),
            }],
            'transactionsTransfers');
      }

      if (auditRecord) {
        let fromStatus = !!(updatedStashFrom.currentBalance === auditRecord.stashTotalBefore + auditRecord.amountOFTransaction);
        let toStatus = !!(updatedStashTo.currentBalance === auditRecord.toStashTotalBefore + auditRecord.toAmountOFTransaction);
        let status =  !!(fromStatus && toStatus);
        await models["Audits"].findOneAndUpdate({ _id: auditRecord._id },
          {
            $set:  {
              status: status,
              stashTotalAfter: updatedStashFrom.currentBalance,
              toStashTotalAfter: updatedStashTo.currentBalance,
              transactions: savedTransactions
            }
          }, {upsert: true, new: true});
      }


      response = {
          'statusCode': 200,
          'body': JSON.stringify({
              message: `Transference successfully created`
          })
      }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
              "message": `${pId} - Transactions Transfer Create - ${errorMsj}`,
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
