const mongoose = require('mongoose');

let CoinsSchema =  new mongoose.Schema({
  uuid: String,
  rates: Object,
  currentRates: Object,
  currentRatesDate: Date,
}, {timestamps: true});

// indexDefinitions
CoinsSchema.index({
  uuid: 1,
});

module.exports = CoinsSchema;
