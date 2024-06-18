const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'uuid': Joi.string().min(1).required(),
    'conversionsRates': Joi.object().optional()
  }),
  'get': Joi.object({
    'uuid': Joi.string().min(1).required(),
    'rates': Joi.boolean().optional()
  }),
  'latestExchange': Joi.object({
    'uuid': Joi.string().min(1).required(),
    'symbols': Joi.string().min(3).required(),
  }),
}
