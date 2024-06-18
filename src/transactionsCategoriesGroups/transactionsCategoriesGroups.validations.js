const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'name': Joi.string().min(1).max(50).required(),
    'description': Joi.string().max(200).optional().allow(''),
    'economy': Joi.string().min(24).max(24).required()
  }),
  'filter': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'name': Joi.string().min(1).max(50).optional(),
  }),
  'edit': Joi.object({
    '_id': Joi.string().min(24).max(24).required(),
    'name': Joi.string().min(1).max(50).optional(),
    'description': Joi.string().max(200).optional().allow(''),
  }),
}
