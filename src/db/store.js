const bcrypt = require('bcryptjs');

const users = [
  {
    id: '1',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@hospital.local',
    role: 'ADMIN'
  },
  {
    id: '2',
    username: 'drsmith',
    password: bcrypt.hashSync('doctor123', 10),
    email: 'smith@hospital.local',
    role: 'DOCTOR'
  },
  {
    id: '3',
    username: 'nurse_jane',
    password: bcrypt.hashSync('nurse123', 10),
    email: 'jane@hospital.local',
    role: 'NURSE'
  },
  {
    id: '4',
    username: 'patient_john',
    password: bcrypt.hashSync('patient123', 10),
    email: 'john@example.com',
    role: 'PATIENT'
  }
];

module.exports = {
  users
};
