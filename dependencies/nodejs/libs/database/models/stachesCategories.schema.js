const mongoose = require('mongoose');

let StashesCategoriesSchema =  new mongoose.Schema({
  name: String,
  description: String,
  economy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  enabled: {
    type: Boolean,
    default: true
  },
}, {timestamps: true});

// indexDefinitions
StashesCategoriesSchema.index({
  name: 1,
});

StashesCategoriesSchema.index({
  economy: 1,
});

module.exports = StashesCategoriesSchema;
