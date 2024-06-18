const mongoose = require('mongoose');

let PermissionsSchema =  new mongoose.Schema({
  name: String,
  description: String,
  entity: String,
  type: {
    type: String,
    enum: ['read', 'write', 'list', 'share']
  },
  enabled: {
    type: Boolean,
    default: true
  },
}, {timestamps: true});

// indexDefinitions
PermissionsSchema.index({
  type: 1,
  entity: 1
});

PermissionsSchema.index({
  name: 1,
  entity: 1
});

module.exports = PermissionsSchema;
