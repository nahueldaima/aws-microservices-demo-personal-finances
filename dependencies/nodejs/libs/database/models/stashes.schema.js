const mongoose = require('mongoose');

let StashSchema =  new mongoose.Schema({
  name: String,
  currentBalance: {
    type: Number,
    default: 0
  },
  coin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coins'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StashesCategories'
  },
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  enabled: {
    type: Boolean,
    default: true
  },
  limit: Number, //for TC category
  paymentDate: String, // is a string for processing a date like, 6th day of each month
}, {timestamps: true});

// indexDefinitions
StashSchema.index({
  name: 1,
  economy: 1
});
StashSchema.index({
  name: 1,
  user: 1
});

module.exports = StashSchema;
