const {latestExchange} = require("./coins.validations");
const db = require('locallibs').db;
const exchanges = require('locallibs').exchanges;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;


exports.lambdaHandler = async (event) => {
  let pId = generateRandomString();
  try {
    if (event && event.ping) {
      return {
        'statusCode': 200
      }
    }

    await db.connect();
    let models = db.registerModels();


    // save log to cloudwatch
    await logs.saveLog([{
        "message": `${pId} - Coins Latest Exchange - Process started`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

    let coins = await models['Coins'].find().select('-rates');

    let coinsToUpdate = [];

    for (let coin of coins) {
      if (!coin.currentRatesDate || coin.currentRatesDate.getTime() < Date.now() - 864000000) {
        coinsToUpdate.push(coin.uuid);
      }
    }

    if (coinsToUpdate.length > 0) {
      for (let uuid of coinsToUpdate) {
        let symbols = coins.map(coin => coin.uuid).filter(symbol => symbol !== uuid).join(',');

        let conversionRates;

        try {
          conversionRates = await exchanges.latest({
            base: uuid,
            symbols: symbols
          });
        } catch (e) {
          await logs.saveLog([{
              "message": `${pId} - Coins Latest Exchange - Error received with ${uuid} coin - ${e}`,
              "timestamp": new Date().getTime(),
            }],
            'coins');
        }

        if (conversionRates && conversionRates.rates) {
          // log response
          await logs.saveLog([{
              "message": `${pId} - Coins Latest Exchange - New Rates received ${JSON.stringify(conversionRates.rates, null, 2)}`,
              "timestamp": new Date().getTime(),
            }],
            'coins');

          // update coin with new rates
          await models['Coins'].findOneAndUpdate({uuid}, {
            currentRates: conversionRates.rates,
            currentRatesDate: new Date().toISOString()
          });

          // log response
          await logs.saveLog([{
              "message": `${pId} - Coins Latest Exchange - Rates for ${uuid} saved on database`,
              "timestamp": new Date().getTime(),
            }],
            'coins');
        }
      }
    }

    response = {
      'statusCode': 200,
      'body': JSON.stringify({
        message: `Coins Latest Exchange retrieved`,
        data: ""
      })
    }
  } catch (err) {
    let errorMsj = JSON.stringify({
      message: err && err.message ? err.message : err
    });
    await logs.saveLog([{
        "message": `${pId} - Coins Latest Exchange - ${errorMsj}`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

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