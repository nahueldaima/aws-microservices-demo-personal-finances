const mongoose = require('mongoose');
const transactionsSchema = require('./models/transactions.schema');
const stashesSchema = require('./models/stashes.schema');
const coinsSchema = require('./models/coins.schema');
const usersSchema = require('./models/users.schema');
const TransactionsCategoriesSchema = require('./models/transactionsCategories.schema');
const EconomiesSchema = require('./models/economies.schema');
const StashesCategoriesSchema = require('./models/stachesCategories.schema');
const PermissionsSchema = require('./models/permissions.schema');
const TransactionsCategoriesGroupsSchema = require('./models/transactionsCategoriesGroups.schema');
const BalancesSchema = require('./models/balances.schema');
const AuditsSchema = require('./models/audits.schema');

module.exports = {
  connect: async () => {
    try {
      let cachedPromise = null;
      if (!cachedPromise) {
        // connect to DB
        // TODO: Move database srv to secrets manager and then change credentials
        cachedPromise = mongoose.connect(process.env.MONGO_URI);
      }

      const db = await cachedPromise;
      return db;
    } catch (e) {
      throw `Error - Database Connection - ${JSON.stringify(e, null, 2)}`;
    }
  },
  registerModels: () => {
    try {
      // register Models
      mongoose.model('Transactions', transactionsSchema);
      mongoose.model('Stashes', stashesSchema);
      mongoose.model('Coins', coinsSchema);
      mongoose.model('Users', usersSchema);
      mongoose.model('TransactionsCategories', TransactionsCategoriesSchema);
      mongoose.model('Economies', EconomiesSchema);
      mongoose.model('StashesCategories', StashesCategoriesSchema);
      mongoose.model('Permissions', PermissionsSchema);
      mongoose.model('TransactionsCategoriesGroups', TransactionsCategoriesGroupsSchema);
      mongoose.model('Balances', BalancesSchema);
      mongoose.model('Audits', AuditsSchema);
      return mongoose.models;
    } catch (e) {
      throw `Error - Mongoose models - ${JSON.stringify(e, null, 2)}`;
    }
  },
  disconnect: () => {
    try {
      if (mongoose.connection) {
        mongoose.connection.close()
        console.log('Database Disconnected');
      }
    } catch (e) {}
  },
}
