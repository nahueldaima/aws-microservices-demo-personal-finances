const Joi = require('joi');

module.exports = {
  'create':  Joi.object({
    'name': Joi.string().allow('').max(50),
    'description': Joi.string().allow('').max(500)
  })
}
