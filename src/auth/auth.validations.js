const Joi = require('joi');

module.exports = {
  'login': Joi.object({
    'username': Joi.string().min(1).max(50),
    'password': Joi.string().min(1).max(300)
  }),
}
