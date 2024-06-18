const db = require('locallibs').db;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;
const { firstTime } = require('./users.validations');
// TODO: Create roll back function in case of error

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
            "message": `${pId} - Users FirstTime`,
            "timestamp": new Date().getTime(),
        }],
        'users');

      // validations
      let validationResult = firstTime.validate(body);
      if (validationResult.error) {
        throw validationResult.error.message;
      }

      await logs.saveLog([{
            "message": `${pId} - Users FirstTime - Query validated`,
            "timestamp": new Date().getTime(),
        }],
        'users');

      let user = event.requestContext.authorizer["user"];

      // Create Economy
      let economy = await models['Economies'].create({...body.economy, owner:  user});

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Economy successfully created`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      // Save it into User
      await models['Users'].findOneAndUpdate(
        {_id: user},
    {
        '$push': { 'economies': economy._id },
        defaultEconomy: economy._id
      });

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Economy successfully added to user`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      // Create Stash Category
      let stashCategory = await models['StashesCategories'].create({
        ...body.stashCategory,
        economy: economy._id
      });

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Stashes Categories successfully created`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      // Create Stash
      await models['Stashes'].create({
        ...body.stash,
        economy: economy._id,
        type: stashCategory._id
      });

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Stash successfully created`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      // Create Transaction Category Group
      let transactionCategoryGroup = await models['TransactionsCategoriesGroups'].create({
        ...body.transactionCategoryGroup,
        economy: economy._id,
      });

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Transactions Category Group successfully created`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      // Create Transaction Category
      await models['TransactionsCategories'].create({
        ...body.transactionCategory,
        group: transactionCategoryGroup._id,
        economy: economy._id
      });

      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - Transactions Category successfully created`,
          "timestamp": new Date().getTime(),
        }],
        'users');

      response = {
          'statusCode': 200,
          'body': JSON.stringify({
              message: `First time batch create successfully executed`
          })
      }
    } catch (err) {
      let errorMsj = JSON.stringify({
          message: err && err.message ? err.message : err
      });
      await logs.saveLog([{
          "message": `${pId} - Users FirstTime - ${errorMsj}`,
          "timestamp": new Date().getTime(),
      }],
      'users');

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
