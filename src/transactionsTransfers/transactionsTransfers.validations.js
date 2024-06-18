const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'date': Joi.string().isoDate(),
    'stashFrom': Joi.string().min(24).max(24).required(),
    'amountFrom': Joi.number().precision(2).required(),
    'stashTo': Joi.string().min(24).max(24).required(),
    'amountTo': Joi.number().precision(2).required(),
    'economy': Joi.string().min(24).max(24).required(),
    'observations': Joi.string().optional(),
    'reference': Joi.string().optional(),
    'isFuture': Joi.boolean().optional(),
  }),
  'filter': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
  })
}
