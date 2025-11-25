const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const store = require('../db/store');
const { signToken } = require('../auth/jwt');

module.exports = {
  Query: {
    users: () => store.users,
    user: (_, { id }) => store.users.find(u => u.id === id),
    me: (_, __, ctx) => ctx?.user ? store.users.find(u => u.id === ctx.user.id) : null
  },

  Mutation: {
    login: async (_, { username, password }) => {
      const user = store.users.find(u => u.username === username);
      if (!user) {
        throw new Error('User not found');
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }

      return { token: signToken(user), user };
    },

    register: async (_, { username, password, email }) => {
      const newUser = {
        id: uuidv4(),
        username,
        password: await bcrypt.hash(password, 10),
        email,
        role: 'PATIENT'
      };
      store.users.push(newUser);
      return { token: signToken(newUser), user: newUser };
    }
  }
};
