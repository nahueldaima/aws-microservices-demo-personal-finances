const axios = require('axios');
const API_KEY = process.env.EXCHANGE_API_KEY;
const exchangeAPIURL = process.env.EXCHANGE_API_URL;


module.exports = {
  timeseries: async (payload) => {
    let { start_date, end_date, base, symbols } = payload;
    if (!start_date || !end_date || !base || !symbols) throw new Error('Missing mandatory parameters');
    try {
      let response = await axios.get(
        `${exchangeAPIURL}/timeseries?start_date=${start_date}&end_date=${end_date}&base=${base}&symbols=${symbols}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );
      return response.data;
    } catch (error) {
      throw (error.message)
    }
  },
  latest: async (payload) => {
    let { base, symbols } = payload;
    if (!base || !symbols) throw new Error('Missing mandatory parameters');
    try {
      let response = await axios.get(
        `${exchangeAPIURL}/latest?&symbols=${symbols}&base=${base}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );
      return response.data;
    } catch (error) {
      throw (error.message)
    }
  },
  getAverages: (rates) => {
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
}
