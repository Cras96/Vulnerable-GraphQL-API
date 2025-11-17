const store = require('../db/store');

module.exports = {
  Query: {
    users: () => store.users,
    user: (_, { id }) => store.users.find(u => u.id === id)
  }
};
