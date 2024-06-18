const mongoose = require('mongoose');

let AuditsSchema =  new mongoose.Schema({
  date: Date,
  stashTotalBefore: Number,
  amountOFTransaction: Number,
  stashTotalAfter: Number,
  toStashTotalBefore: Number,
  toAmountOFTransaction: Number,
  toStashTotalAfter: Number,
  status: Boolean,
  stash: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stashes'
  },
  toStash: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stashes'
  },
  coin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coins'
  },
  toCoin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coins'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  payload: Object,
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transactions'
    },
  ]
}, {timestamps: true});


module.exports = AuditsSchema;
