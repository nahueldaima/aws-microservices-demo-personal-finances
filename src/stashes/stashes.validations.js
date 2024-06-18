const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'coin': Joi.string().min(24).max(24).required(),
    'type': Joi.string().min(24).max(24).required(),
    'name': Joi.string().required(),
    'limit': Joi.number().optional(),
    'paymentDate': Joi.string().optional(),
  }),
  'edit': Joi.object({
    'name': Joi.string().min(3).optional(),
    'enabled': Joi.boolean().optional(),
    'type': Joi.string().min(24).max(24).optional(),
    '_id': Joi.string().min(24).max(24).required()
  }),
}
