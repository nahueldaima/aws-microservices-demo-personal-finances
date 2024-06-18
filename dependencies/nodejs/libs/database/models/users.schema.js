const mongoose = require('mongoose');

let UsersSchema =  new mongoose.Schema({
  firstName: String,
  lastName: String,
  fullName: String,
  username: String,
  enabled: {type: Boolean, default: true},
  password: String,
  defaultEconomy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  },
  economies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Economies'
  }],
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permissions'
  }],
  defaultStash: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stashes'
  }
}, {timestamps: true});

// indexDefinitions
UsersSchema.index({
  username: 1,
  permissions: 1
});

UsersSchema.index({
  username: 1,
  defaultStash: 1
});

UsersSchema.index({
  username: 1,
  defaultEconomy: 1
});

UsersSchema.index({
  username: 1,
  economies: 1
});

module.exports = UsersSchema;
