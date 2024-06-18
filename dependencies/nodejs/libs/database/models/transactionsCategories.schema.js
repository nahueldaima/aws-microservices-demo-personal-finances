const mongoose = require('mongoose');

let TransactionsCategoriesSchema =  new mongoose.Schema({
  name: String,
  operation: {
    type: String,
    enum: ['add', 'subtract']
  },
  description: String,
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransactionsCategoriesGroups'
  },
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true
  },
}, {timestamps: true});

// indexDefinitions
TransactionsCategoriesSchema.index({
  name: 1,
  economy: 1
});
TransactionsCategoriesSchema.index({
  name: 1,
  economy: 1,
  group: 1
});

module.exports = TransactionsCategoriesSchema;
