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
    email: 'john.doe@email.com',
    role: 'PATIENT'
  }
];

const patients = [
  {
    id: '1',
    name: 'John Doe',
    dateOfBirth: '1985-03-15',
    ssn: '111-22-3333',
    address: '123 Main St, New York, NY',
    phone: '555-0100',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    insuranceNumber: 'INS-12345',
    balance: 1500.00,
    primaryDoctorId: '2',
    medicalHistory: 'Diabetes Type 2, diagnosed 2020'
  },
  {
    id: '2',
    name: 'Jane Smith',
    dateOfBirth: '1990-07-22',
    ssn: '444-55-6666',
    address: '456 Oak Ave, Los Angeles, CA',
    phone: '555-0200',
    bloodType: 'A-',
    allergies: [],
    insuranceNumber: 'INS-67890',
    balance: 0,
    primaryDoctorId: '2',
    medicalHistory: 'Appendectomy 2018'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    dateOfBirth: '1975-11-08',
    ssn: '777-88-9999',
    address: '789 Pine Rd, Chicago, IL',
    phone: '555-0300',
    bloodType: 'B+',
    allergies: ['Aspirin'],
    insuranceNumber: 'INS-11111',
    balance: 3200.50,
    primaryDoctorId: '2',
    medicalHistory: 'Hypertension, Heart surgery 2019'
  }
];

module.exports = {
  users,
  patients
};
