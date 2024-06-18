const db = require('locallibs').db;
const exchanges = require('locallibs').exchanges;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;


exports.lambdaHandler = async (event, context) => {
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
              "message": `${pId} - Coins Update Rates - Process started`,
              "timestamp": new Date().getTime(),
          }],
          'coins');

        // get dates for filtering of month
        let date = new Date();

        //last month
        date.setMonth(date.getMonth() - 1);

        let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        firstDay = firstDay.toISOString().split('T')[0];

        let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        lastDay = lastDay.toISOString().split('T')[0];

        let month = date.getMonth() + 1;
        let year = date.getFullYear();

        let coins = await models['Coins'].find({});
        let symbols = coins.map(coin => coin.uuid);
        let errors = [];
        let success = [];

        let results = await Promise.allSettled(coins.map(async (coin) => {
          let localSymbols = symbols.filter(symbol => symbol !== coin.uuid).join(',');

          let conversionRates = await exchanges.timeseries({
            start_date: firstDay,
            end_date: lastDay,
            base: coin.uuid,
            symbols: localSymbols
          })

          // log response
          await logs.saveLog([{
            "message": `${pId} - Coins Update Rates - New Rates received ${JSON.stringify(conversionRates, null, 2)}`,
            "timestamp": new Date().getTime(),
          }],
          'coins');

          // save rates to db
          if (conversionRates.rates && Object.keys(conversionRates.rates).length) {
            // get average rate and use reduce
            let averageRate = getAverages(conversionRates.rates);
            let updatedCoin = await models['Coins'].findOneAndUpdate({
              _id: coin._id
            }, {
              [`rates.${year}.${month}`]: averageRate
            }, {new: true});
            return updatedCoin.uuid;
          }
        }));

        for (let promise of results) {
          if (promise.status === 'rejected') {
            errors.push(promise.reason);
          }
          if(promise.status === 'fulfilled') {
            success.push(promise.value);
          }
        }

        if (errors.length) {
          throw new Error(JSON.stringify(errors));
        }

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: `Coins successfully updated: ${success}`
            }, null, 2)
        }
    } catch (err) {
        let errorMsj = JSON.stringify({
            message: err && err.message ? err.message : err
        });
        await logs.saveLog([{
            "message": `${pId} - Coins Update Rates - ${errorMsj}`,
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


const getAverages = (rates) => {
  const reducedData = Object.values(rates).reduce((accumulator, current) => {
    for (let coin of Object.keys(current)) {
      if (!accumulator[coin]) {
        accumulator[coin] = [];
      }
      accumulator[coin].push(current[coin]);
    }
    return accumulator;
  }, {});

  let ratesToSave = {};

  for (let key of Object.keys(reducedData)) {
    const sum = reducedData[key].reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);
    ratesToSave[key] = sum / reducedData[key].length;
  }

  return ratesToSave;
}
