const mongoose = require('mongoose');

let BalancesSchema =  new mongoose.Schema({
  total: Number,
  date: Date,
  stash: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stashes'
  },
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  }
}, {timestamps: true});

// indexDefinitions
BalancesSchema.index({
  stash: 1,
  economy: 1
});

module.exports = BalancesSchema;
