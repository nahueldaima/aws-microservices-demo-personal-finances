const Joi = require('joi');

module.exports = {
  'transactionsValidation': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'stash': Joi.string().min(24).max(24).optional(),
    'categoryGroup': Joi.string().min(24).max(24),
    'category': Joi.string().min(24).max(24),
    'dateFrom': Joi.string().isoDate().optional(),
    'dateTo': Joi.string().isoDate().optional(),
    'limit': Joi.number().min(1).max(2000).optional(),
    'page': Joi.number().min(1).optional()
  }),
  'transactionsByCategories': Joi.object({
    'categoryGroup': Joi.string().min(24).max(24).optional(),
    'category': Joi.string().min(24).max(24).optional(),
    'economy': Joi.string().min(24).max(24).required(),
    'dateFrom': Joi.string().isoDate().optional(),
    'dateTo': Joi.string().isoDate().optional(),
  }),
  'transactionsByStashOrEconomy': Joi.object({
    'stash': Joi.string().min(24).max(24).optional(),
    'economy': Joi.string().min(24).max(24).required(),
    'dateFrom': Joi.string().isoDate().optional(),
    'dateTo': Joi.string().isoDate().optional(),
  })
}
