const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const store = require('../db/store');
const { signToken } = require('../auth/jwt');

module.exports = {
  Query: {
    users: () => store.users,
    user: (_, { id }) => store.users.find(u => u.id === id),
    me: (_, __, ctx) => ctx?.user ? store.users.find(u => u.id === ctx.user.id) : null,

    patients: () => store.patients,
    patient: (_, { id }) => store.patients.find(p => p.id === id),
    patientBySSN: (_, { ssn }) => store.patients.find(p => p.ssn === ssn)
  },

  Mutation: {
    login: async (_, { username, password }) => {
      const user = store.users.find(u => u.username === username);
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid password');

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
    },

    createPatient: (_, { input }) => {
      const newPatient = {
        id: uuidv4(),
        ...input,
        allergies: input.allergies || [],
        balance: input.balance || 0
      };
      store.patients.push(newPatient);
      return newPatient;
    },

    updatePatient: (_, { id, input }) => {
      const patient = store.patients.find(p => p.id === id);
      if (!patient) throw new Error('Patient not found');
      Object.assign(patient, input);
      return patient;
    },

    deletePatient: (_, { id }) => {
      const idx = store.patients.findIndex(p => p.id === id);
      if (idx === -1) return false;
      store.patients.splice(idx, 1);
      return true;
    }
  },

  Patient: {
    primaryDoctor: (parent) => store.users.find(u => u.id === parent.primaryDoctorId)
  }
};
