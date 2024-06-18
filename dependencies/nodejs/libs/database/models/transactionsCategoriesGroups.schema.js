const mongoose = require('mongoose');

let TransactionsCategoriesGroupsSchema =  new mongoose.Schema({
  name: String,
  description: String,
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
TransactionsCategoriesGroupsSchema.index({
  name: 1,
  economy: 1
});

module.exports = TransactionsCategoriesGroupsSchema;
