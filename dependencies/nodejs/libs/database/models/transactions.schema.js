const mongoose = require('mongoose');

let TransactionSchema =  new mongoose.Schema({
  date: Date,
  stash: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stashes'
  },
  amount: Number,
  coin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coins'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransactionsCategories'
  },
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  observations: String,
  reference: String,
  childs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transactions'
    },
  ],
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transactions'
  },
  isFuture: {
    type: Boolean,
    default: false
  },
  statistics: {
    categoryGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransactionsCategoriesGroups'
    },
    stashCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StashesCategoriesSchema'
    },
    rates: {
      type: Object,
      _id: false
    }
  }
}, {timestamps: true});

// indexDefinitions
TransactionSchema.index({
  date: 1,
  economy: 1
});
TransactionSchema.index({
  date: 1,
  stash: 1,
  economy: 1
});
TransactionSchema.index({
  date: 1,
  category: 1,
  economy: 1
});
TransactionSchema.index({
  date: 1,
  reference: 1,
  economy: 1
});

module.exports = TransactionSchema;
