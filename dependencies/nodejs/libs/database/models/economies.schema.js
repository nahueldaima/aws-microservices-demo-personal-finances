const mongoose = require('mongoose');

let EconomiesSchema =  new mongoose.Schema({
  name: String,
  description: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  enabled: {
    type: Boolean,
    default: true
  },
}, {timestamps: true});

// indexDefinitions
EconomiesSchema.index({
  name: 1,
  owner: 1
});

module.exports = EconomiesSchema;
