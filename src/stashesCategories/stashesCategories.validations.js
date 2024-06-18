const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'name': Joi.string().min(3).required(),
    'description': Joi.string().optional().allow(''),
  }),
  'edit': Joi.object({
    '_id': Joi.string().min(24).max(24).required(),
    'name': Joi.string().min(3).optional(),
    'enabled': Joi.boolean().optional(),
    'description': Joi.string().optional().allow(''),
  })
}
