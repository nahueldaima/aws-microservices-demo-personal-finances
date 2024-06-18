const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'firstName': Joi.string().min(1).max(50).required(),
    'lastName': Joi.string().min(1).max(50).required(),
    'fullName': Joi.string().optional(),
    'username': Joi.string().min(4).max(50).required(),
    'enabled': Joi.boolean().optional(),
    'password': Joi.string().min(8).max(50).required(),
    'defaultEconomy': Joi.string().min(24).max(24).optional(),
    'economies': Joi.array().items(Joi.string().min(24).max(24)).optional(),
    'permissions': Joi.array().items(Joi.string().min(24).max(24)).optional(),
    'defaultStash': Joi.string().min(24).max(24).optional()
  }),
  'getOne': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'name': Joi.string().min(1).max(50).required(),
  }),
  'firstTime': Joi.object({
    'economy': Joi.object({
      'name': Joi.string().allow('').max(50),
      'description': Joi.string().allow('').max(500)
    }).required(),
    'stash': Joi.object({
      'coin': Joi.string().min(24).max(24).required(),
      'name': Joi.string().required()
    }).required(),
    'stashCategory': Joi.object({
      'name': Joi.string().min(3).required(),
      'description': Joi.string().optional(),
    }).required(),
    'transactionCategory': Joi.object({
      'name': Joi.string().min(1).max(50).required(),
      'operation': Joi.string().required().valid('add', 'subtract'),
      'description': Joi.string().max(200)
    }).required(),
    'transactionCategoryGroup': Joi.object({
      'name': Joi.string().min(1).max(50).required(),
      'description': Joi.string().max(200)
    }).required()
  })
}
