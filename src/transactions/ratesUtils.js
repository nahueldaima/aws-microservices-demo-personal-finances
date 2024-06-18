const exchanges = require('locallibs').exchanges;
const logs = require('locallibs').logs;
const {generateRandomString} = require('locallibs').utils;
let response;

// internal use
const getLatestRates = async (coin, models, pId) => {
  // check if coins.currentRatesDate is from less than 10 days
  if (coin.currentRatesDate && coin.currentRatesDate.getTime() > Date.now() - 864000000) {
    return coin.currentRates;
  }
  // retrieve the latest rate from api and save it on database
  else {
    let coins = await models['Coins'].find({uuid: {$ne: coin.uuid}}).lean();

    let symbols = coins.map(singleCoin => singleCoin.uuid).join(',');

    let conversionRates = await exchanges.latest({
      base: coin.uuid,
      symbols: symbols
    });

    let latestRates = conversionRates.rates;

    // log response
    await logs.saveLog([{
        "message": `${pId} - Coins Latest Exchange - New Rates received ${JSON.stringify(conversionRates, null, 2)}`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

    // update coin with new rates
    await models['Coins'].findOneAndUpdate({uuid: coin.uuid}, {
      currentRates: conversionRates.rates,
      currentRatesDate: new Date().toISOString()
    });

    // log response
    await logs.saveLog([{
        "message": `${pId} - Coins Latest Exchange - Rates saved on database`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

    return latestRates;
  }
}

const getRateFromPeriod = async (coin, date, models, pId) => {
    let coins = await models['Coins'].find({uuid: {$ne: coin.uuid}}).lean();

    let symbols = coins.map(singleCoin => singleCoin.uuid).join(',');

    // create a new date from param date, that is the first day of the month
    let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    firstDay = firstDay.toISOString().split('T')[0];

    // create a new date from param date, that is the last day of the month
    let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // get year
    let year = date.getFullYear();
    // get month
    let month = date.getMonth() + 1;

    lastDay = lastDay.toISOString().split('T')[0];
    // get the rates from the api
    let conversionRates = await exchanges.timeseries({
      base: coin.uuid,
      symbols: symbols,
      start_date: firstDay,
      end_date: lastDay
    });

    let periodRates = exchanges.getAverages(conversionRates.rates);

    // log response
    await logs.saveLog([{
        "message": `${pId} - Coins Date Exchange - New Rates received ${JSON.stringify(conversionRates, null, 2)}`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

    let updateBody = {rates: {
      ...coin.rates
    }};
    if (coin.rates && coin.rates[year]) {
      updateBody.rates[year]= {
        [month]: periodRates
      };
    } else {
      updateBody.rates = {
        [year]: {
          [month]: periodRates
        }
      };
    }

    // update coin with new rates
    await models['Coins'].findOneAndUpdate({uuid: coin.uuid}, updateBody);

    // log response
    await logs.saveLog([{
        "message": `${pId} - Coins Date Exchange - Rates saved on database`,
        "timestamp": new Date().getTime(),
      }],
      'coins');

    return periodRates;
}

const convertExchangeRatesFromAmount = (amount, rates) => {
  let convertedAmount = {};
  if (rates && Object.keys(rates).length) {
    for(let rate of Object.keys(rates)) {
      // round to 2 decimals
      let value = parseFloat((amount * rates[rate]).toFixed(2));
      if (isNaN(value)) {
        console.log('Error converting amount', amount, rates[rate])
      } else {
        convertedAmount[rate] = value;
      }
    }
  }
  return convertedAmount;
}


// exportable function
const getRateFromCoin = async (params) => {
  let {coinId, date, models, pId} = params;
  try {
    let coin = await models['Coins'].findOne({_id: coinId});
    let ratesToReturn = {};

    // check if date was provided and if it is from the current month
    if (!date || new Date(date).getMonth() === new Date().getMonth()) {
      ratesToReturn = await getLatestRates(coin, models, pId);
    }
    else {
      // find the rate for the provided date
      let year = new Date(date).getFullYear();
      let month = new Date(date).getMonth() + 1;
      if (coin.rates && coin.rates[year] && coin.rates[year][month]) {
        ratesToReturn = coin.rates[year][month];
      } else {
        // get from API
        ratesToReturn = await getRateFromPeriod(coin, new Date(date), models, pId);
      }
    }

    return ratesToReturn;
  } catch (err) {
    let errorMsj = JSON.stringify({
      message: err && err.message ? err.message : err
    });

    throw new Error(errorMsj);
  }
};

module.exports = {
  getRateFromCoin,
  convertExchangeRatesFromAmount
}
