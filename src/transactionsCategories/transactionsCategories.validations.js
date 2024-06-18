const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'name': Joi.string().min(1).max(50).required(),
    'operation': Joi.string().required().valid('add', 'subtract'),
    'description': Joi.string().max(200).optional().allow(''),
    'transactionCategoryGroup': Joi.string().min(24).max(24).required(),
    'economy': Joi.string().min(24).max(24).required()
  }),
  'filter': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'group': Joi.string().min(24).max(24).optional()
  }),
  'edit': Joi.object({
    '_id': Joi.string().min(24).max(24).required(),
    'enabled': Joi.boolean().optional(),
    'name': Joi.string().min(1).max(50).optional(),
    'description': Joi.string().max(200).optional().allow(''),
    'transactionCategoryGroup': Joi.string().min(24).max(24).optional()
  }),
}
