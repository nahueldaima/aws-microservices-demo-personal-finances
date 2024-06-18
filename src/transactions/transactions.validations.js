const Joi = require('joi');

module.exports = {
  'create': Joi.object({
    'date': Joi.string().isoDate(),
    'stash': Joi.string().min(24).max(24).required(),
    'amount': Joi.number().precision(2).required(),
    'category': Joi.string().min(24).max(24).required(),
    'economy': Joi.string().min(24).max(24).required(),
    'observations': Joi.string().optional().allow(''),
    'reference': Joi.string().optional().allow(''),
    'parent': Joi.string().min(24).max(24).optional(),
    'childs': Joi.array().items(Joi.string().min(24).max(24)).optional(),
    'isFuture': Joi.boolean().optional(),
    'isRefund': Joi.boolean().optional()
  }),
  'filter': Joi.object({
    'economy': Joi.string().min(24).max(24).required(),
    'dateFrom': Joi.string().isoDate().optional(),
    'dateTo': Joi.string().isoDate().optional(),
    'id': Joi.string().min(24).max(24).optional(),
    'stash': Joi.string().min(24).max(24).optional(),
    'coin': Joi.string().min(24).max(24).optional(),
    'categories': Joi.array().items(Joi.string().min(24).max(24)).min(1).optional(),
    'limit': Joi.number().min(1).optional(),
    'page': Joi.number().min(1).optional(),
    'sort': Joi.object({
      key: Joi.string().required(),
      value: Joi.number().required(),
    }).optional()
  }).or('economy', 'id', 'category')
    .with('economy', ['dateFrom', 'dateTo']),
  'update': Joi.object({
    '_id': Joi.string().min(24).max(24).required(),
    'date': Joi.string().isoDate().optional(),
    'stash': Joi.string().min(24).max(24).optional(),
    'amount': Joi.number().precision(2).optional(),
    'category': Joi.string().min(24).max(24).optional(),
    'observations': Joi.string().optional(),
    'reference': Joi.string().optional(),
    'isRefund': Joi.boolean().optional()
  }).or('date', 'stash', 'amount', 'category', 'observations', 'reference', 'isRefund'),
  'batchCreate': Joi.object({
    'date': Joi.string().isoDate(),
    'stash': Joi.string().min(24).max(24).required(),
    'economy': Joi.string().min(24).max(24).required(),
    'transactions': Joi.array().items(Joi.object({
      'amount': Joi.number().precision(2).required(),
      'category': Joi.string().min(24).max(24).required(),
      'observations': Joi.string().optional().allow(''),
      'reference': Joi.string().optional().allow(''),
      'isFuture': Joi.boolean().optional(),
      'isRefund': Joi.boolean().optional(),
    }).required()).min(1).required(),
  }),
}
